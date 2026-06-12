/**
 * Mint a single-use token to allow POST /api/ao/corpus/publish to commit
 * ao-knowledge-hq-kit/journal/<slug>.md as status:published on the live Journal.
 *
 * POST /api/ao/journal/publish-approval
 * Body: { slug: "my-post-slug" }
 */

import crypto from 'crypto';
import { supabaseAdmin } from '../../../lib/supabase-admin.js';
import { requireAoSession } from '../../../lib/ao/requireAoSession.js';

function slugify(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 120);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
  const auth = requireAoSession(req, res);
  if (!auth) return;

  try {
    const raw = typeof req.body === 'object' && req.body ? req.body : {};
    const slug = slugify(raw.slug || raw.slug_hint || '');
    const kind = String(raw.kind || raw.content_kind || 'journal').trim().toLowerCase();
    if (!slug) {
      return res.status(400).json({ ok: false, error: 'slug required (letters, numbers, hyphens).' });
    }

    const targetPath =
      kind === 'episode' || kind === 'podcast'
        ? `ao-knowledge-hq-kit/journal/podcast/${slug}.md`
        : `ao-knowledge-hq-kit/journal/${slug}.md`;
    const ttlMin = Math.min(
      60,
      Math.max(
        5,
        Number(process.env.AO_JOURNAL_APPROVAL_TTL_MINUTES || 15) || 15
      )
    );
    const expiresAt = new Date(Date.now() + ttlMin * 60 * 1000).toISOString();
    const token = crypto.randomBytes(32).toString('hex');

    const { data: row, error } = await supabaseAdmin
      .from('ao_journal_publish_approvals')
      .insert({
        token,
        created_by_email: auth.email || '',
        target_path: targetPath,
        expires_at: expiresAt,
      })
      .select('id, expires_at')
      .single();

    if (error) {
      if (String(error.message || '').includes('does not exist')) {
        return res.status(503).json({
          ok: false,
          error:
            'Approval table not installed. Run database/ao_journal_publish_approvals.sql in Supabase.',
        });
      }
      return res.status(500).json({ ok: false, error: error.message });
    }

    return res.status(200).json({
      ok: true,
      publish_approval_token: token,
      target_path: targetPath,
      slug,
      expires_at: row?.expires_at || expiresAt,
      ttl_minutes: ttlMin,
      instructions:
        kind === 'episode' || kind === 'podcast'
          ? 'Include publish_approval_token with POST /api/ao/auto/episode-publish when publishing this episode slug.'
          : 'Include publish_approval_token with POST /api/ao/corpus/publish and live_on_site: true when pushing this slug. Without that, the file commits as draft (hidden from public Journal until you approve).',
    });
  } catch (e) {
    console.error('[ao/journal/publish-approval]', e);
    return res.status(500).json({ ok: false, error: e.message });
  }
}
