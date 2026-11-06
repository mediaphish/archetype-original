/**
 * What a Queue item looks like, put at the top of the chat opened about it
 * (2026-11-06).
 *
 * Bart: "If I click something in the queue ... and it opens a chat for me to
 * talk with the team, it needs to probably have the image in it so there's a
 * reference there for the image that I'm talking about. It needs to probably
 * have the captions that were written included in that same space. Context is
 * going to be critical." Des and Vox asked him to attach the Hunger iceberg
 * because the chat named it and nothing more. Now the chat opens with the
 * image, the captions, the source and the id, so Bart sees what he is talking
 * about and the team can find the exact file.
 */
import { supabaseAdmin } from '../supabase-admin.js';
import { scheduledPosts } from '../db/scheduledPosts.js';

const PLATFORM_NAMES = { instagram: 'Instagram', facebook: 'Facebook', linkedin: 'LinkedIn', twitter: 'X', x: 'X', threads: 'Threads' };

/** Pure: "infographic:<id>" or "resurface:<slug>" into { kind, key }, or null. */
export function parseQueueRef(ref) {
  const m = /^(infographic|resurface):(.+)$/.exec(String(ref || '').trim());
  if (!m) return null;
  const key = m[2].trim().slice(0, 200);
  return key ? { kind: m[1], key } : null;
}

/** Pure: the card's words. Plain, so Bart reads it and the team reads the same thing. */
export function contextCardText({ kind, title, status, sourceUrl, captions = [], imageUrl, id }) {
  const what = kind === 'infographic' ? 'the infographic' : 'the resurface';
  const where = status === 'pending' || status === 'pending_review' ? ', waiting in your Queue' : status ? ` (${status})` : '';
  const lines = [`Cam: Here's what we're talking about, so the whole team has it in front of us: ${what} for "${title}"${where}.`];
  if (sourceUrl) lines.push(`From: ${sourceUrl}`);
  for (const c of captions) {
    if (!String(c?.text || '').trim()) continue;
    lines.push('', `Caption (${c.label}):`, String(c.text).trim());
  }
  if (imageUrl) lines.push('', `Image: ${imageUrl}`);
  if (id) lines.push(`${kind === 'infographic' ? 'Infographic' : 'Resurface'} id: ${id}`);
  return lines.join('\n');
}

async function infographicCard(id) {
  const { data: row } = await supabaseAdmin
    .from('ao_infographics')
    .select('id, status, image_url, caption, caption_x, source_title, source_url')
    .eq('id', id)
    .maybeSingle();
  if (!row) return null;
  return {
    imageUrl: row.image_url || null,
    text: contextCardText({
      kind: 'infographic',
      title: row.source_title || 'this piece',
      status: row.status,
      sourceUrl: row.source_url,
      captions: [
        { label: 'Instagram, Facebook, LinkedIn', text: row.caption },
        { label: 'X', text: row.caption_x },
      ],
      imageUrl: row.image_url,
      id: row.id,
    }),
  };
}

async function resurfaceCard(slug) {
  const { data } = await scheduledPosts()
    .select('id, platform, caption, image_url, status, intent')
    .eq('source_kind', 'ao_journal_reshare')
    .eq('status', 'pending_review')
    .limit(50);
  const posts = (data || []).filter((p) => p?.intent?.slug === slug);
  if (!posts.length) return null;
  const imageUrl = posts.map((p) => p.image_url).find(Boolean) || null;
  const intent = posts[0].intent || {};
  return {
    imageUrl,
    text: contextCardText({
      kind: 'resurface',
      title: intent.title || slug,
      status: 'pending_review',
      sourceUrl: intent.journal_url || null,
      captions: [
        ...(intent.pull_quote ? [{ label: 'pull quote', text: intent.pull_quote }] : []),
        ...posts.map((p) => ({ label: PLATFORM_NAMES[p.platform] || p.platform, text: p.caption })),
      ],
      imageUrl,
      id: slug,
    }),
  };
}

/** { text, imageUrl } for the item, or null when it cannot be found. */
export async function loadQueueContext(ref) {
  const r = parseQueueRef(ref);
  if (!r) return null;
  if (r.kind === 'infographic') return infographicCard(r.key);
  return resurfaceCard(r.key);
}
