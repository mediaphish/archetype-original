/**
 * POST /api/ao/auto/listen { text, title } -> { ok, url, minutes, cached }
 *
 * The Listen button on long-form work in Auto (Bart, 2026-11-16: "I would want
 * this on all long form work Auto does."). The audio for a version of the text
 * is made once and saved; the same text again returns the saved file, so a
 * replay costs nothing. See lib/ao/readAloud.js.
 */
import { requireAoSession } from '../../../lib/ao/requireAoSession.js';
import { supabaseAdmin } from '../../../lib/supabase-admin.js';
import { narrate, markdownToSpeech, audioKey } from '../../../lib/ao/readAloud.js';

const BUCKET = 'ao-auto-attachments';
const MAX_CHARS = 120000;

export default async function handler(req, res) {
  const auth = requireAoSession(req, res);
  if (!auth) return;
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  const body = typeof req.body === 'object' && req.body ? req.body : {};
  const markdown = String(body.text || '').slice(0, MAX_CHARS);
  const title = String(body.title || '').slice(0, 200).trim();
  if (!markdownToSpeech(markdown)) return res.status(400).json({ ok: false, error: 'There is nothing to read yet.' });

  const spoken = markdownToSpeech(markdown);
  const text = title && !spoken.startsWith(title) ? `${title}.\n\n${spoken}` : spoken;
  const path = `listen/${audioKey(text)}.mp3`;
  const publicUrl = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;

  // Already made for this exact text: hand back the saved file.
  const dir = await supabaseAdmin.storage.from(BUCKET).list('listen', { search: path.slice('listen/'.length) });
  if (!dir.error && (dir.data || []).some((f) => `listen/${f.name}` === path)) {
    return res.status(200).json({ ok: true, url: publicUrl, cached: true });
  }

  const out = await narrate(markdown, { title, concurrency: 6 });
  if (!out.ok) return res.status(502).json({ ok: false, error: out.error });

  const up = await supabaseAdmin.storage.from(BUCKET).upload(path, out.audio, { contentType: 'audio/mpeg', upsert: true });
  if (up.error) return res.status(500).json({ ok: false, error: 'The audio was made but could not be saved. Try again.' });
  return res.status(200).json({ ok: true, url: publicUrl, minutes: out.minutes, cached: false });
}
