/**
 * GET /api/ao/auto/draft-versions
 *
 * List or fetch draft version history for the review panel diff view.
 *
 * Query params:
 * - draft_id: preferred identity
 * - slug (+ optional kind): resolve draft then list versions
 * - version_id: when set, return that version's full content instead of the list
 *
 * Scoped by session email (same as other draft reads).
 */

import { requireAoSession } from '../../../lib/ao/requireAoSession.js';
import { canonicalizeSlug, getBySlug, contentDrafts } from '../../../lib/db/contentDrafts.js';
import { getVersion, listVersions } from '../../../lib/db/contentDraftVersions.js';

export default async function handler(req, res) {
  const auth = requireAoSession(req, res);
  if (!auth) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const email = auth.email.toLowerCase().trim();
  const draftIdRaw = String(req.query.draft_id || '').trim();
  const slugRaw = String(req.query.slug || '').trim();
  const kindRaw = String(req.query.kind || 'journal').trim() || 'journal';
  const versionId = String(req.query.version_id || '').trim();

  try {
    if (versionId) {
      const result = await getVersion({ versionId, email });
      if (!result.ok) {
        const status = result.error === 'Version not found' ? 404 : 400;
        return res.status(status).json({ ok: false, error: result.error });
      }
      return res.status(200).json({ ok: true, version: result.version });
    }

    let draftId = draftIdRaw;
    let draftMeta = null;

    if (!draftId && slugRaw) {
      const slug = canonicalizeSlug(slugRaw);
      const found = await getBySlug({
        email,
        slug,
        kind: kindRaw,
        select: 'id, slug, kind, title, status, updated_at',
      });
      if (!found.ok) {
        return res.status(500).json({ ok: false, error: found.error });
      }
      if (!found.data) {
        return res.status(404).json({ ok: false, error: 'Draft not found' });
      }
      draftId = found.data.id;
      draftMeta = found.data;
    } else if (draftId) {
      const { data, error } = await contentDrafts()
        .select('id, slug, kind, title, status, updated_at')
        .eq('id', draftId)
        .eq('created_by_email', email)
        .maybeSingle();
      if (error) {
        return res.status(500).json({ ok: false, error: error.message });
      }
      if (!data) {
        return res.status(404).json({ ok: false, error: 'Draft not found' });
      }
      draftMeta = data;
    } else {
      return res.status(400).json({ ok: false, error: 'draft_id or slug required' });
    }

    const listed = await listVersions({ draftId, email });
    if (!listed.ok) {
      return res.status(500).json({ ok: false, error: listed.error });
    }

    return res.status(200).json({
      ok: true,
      draft_id: draftId,
      draft: draftMeta,
      versions: (listed.versions || []).map((v) => ({
        id: v.id,
        title: v.title,
        created_at: v.created_at,
      })),
    });
  } catch (err) {
    console.error('[draft-versions]', err?.message || err);
    return res.status(500).json({ ok: false, error: err?.message || 'Server error' });
  }
}
