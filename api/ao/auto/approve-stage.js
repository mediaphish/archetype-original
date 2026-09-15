/**
 * POST /api/ao/auto/approve-stage
 *
 * Records Bart's approval of one step of a journal post.
 *
 * Nothing recorded approval of an image or captions, so the stage was guessed
 * from what existed, and the panel moved past steps Bart had not approved
 * (2026-09-15, "Your Tuesday"). Stored on the draft's existing metadata jsonb:
 *
 *   metadata.stage_approvals = { image: { approved_at }, captions: { approved_at } }
 *   metadata.approved_captions = { linkedin_personal: "...", ... }
 *
 * The order is enforced here, where the write happens: the image cannot be
 * approved before the post, nor captions before the image.
 *
 * Approving captions saves exactly the caption set Bart approved. Nothing is
 * scheduled; that is the next approval.
 *
 * Body: { slug, stage: "image" | "captions", captions?: { [channel]: text } }
 */
import { requireAoSession } from '../../../lib/ao/requireAoSession.js';
import { contentDrafts } from '../../../lib/db/contentDrafts.js';
import { canApproveGate } from '../../../lib/ao/draftStage.js';
import { buildCaptionsPanel } from '../../../lib/ao/journalPanelData.js';

const APPROVABLE = new Set(['image', 'captions']);
const CHANNEL_KEYS = new Set(buildCaptionsPanel({}).map((c) => c.key));

export default async function handler(req, res) {
  const auth = requireAoSession(req, res);
  if (!auth) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const slug = String(body.slug || '').trim();
    const stage = String(body.stage || '').trim();

    if (!slug) return res.status(400).json({ ok: false, error: 'slug is required' });
    if (!APPROVABLE.has(stage)) {
      return res.status(400).json({ ok: false, error: 'stage must be image or captions' });
    }

    const { data: draft, error: loadError } = await contentDrafts()
      .select('id, slug, status, approved_at, published_at, image_url, content, metadata')
      .eq('created_by_email', auth.email.toLowerCase().trim())
      .eq('kind', 'journal')
      .eq('slug', slug)
      .neq('status', 'abandoned')
      .maybeSingle();

    if (loadError) return res.status(500).json({ ok: false, error: loadError.message });
    if (!draft) return res.status(404).json({ ok: false, error: 'Draft not found' });

    const allowed = canApproveGate(draft, stage);
    if (!allowed.ok) return res.status(409).json({ ok: false, error: allowed.error });

    const metadata = draft.metadata && typeof draft.metadata === 'object' ? { ...draft.metadata } : {};
    const approvals = { ...(metadata.stage_approvals || {}) };

    if (stage === 'image') {
      if (!draft.image_url) {
        return res.status(409).json({ ok: false, error: 'There is no image saved on this draft to approve.' });
      }
      approvals.image = { approved_at: new Date().toISOString(), image_url: draft.image_url };
    }

    if (stage === 'captions') {
      const incoming = body.captions && typeof body.captions === 'object' ? body.captions : {};
      const approvedCaptions = {};
      for (const [key, text] of Object.entries(incoming)) {
        const t = String(text || '').trim();
        if (CHANNEL_KEYS.has(key) && t) approvedCaptions[key] = t;
      }
      if (!Object.keys(approvedCaptions).length) {
        return res.status(400).json({ ok: false, error: 'No captions were sent to approve.' });
      }
      metadata.approved_captions = approvedCaptions;
      approvals.captions = { approved_at: new Date().toISOString(), channels: Object.keys(approvedCaptions) };
    }

    metadata.stage_approvals = approvals;

    const { error: updateError } = await contentDrafts()
      .update({ metadata, updated_at: new Date().toISOString() })
      .eq('id', draft.id);

    if (updateError) return res.status(500).json({ ok: false, error: updateError.message });

    return res.status(200).json({ ok: true, stage, stage_approvals: approvals });
  } catch (err) {
    console.error('[approve-stage]', err?.message || err);
    return res.status(500).json({ ok: false, error: err?.message || 'Server error' });
  }
}
