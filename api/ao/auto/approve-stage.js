/**
 * POST /api/ao/auto/approve-stage
 *
 * Records Bart's approval of one step of a journal post from the panel's
 * buttons. The write itself lives in lib/ao/stageApproval.js, shared with Auto's
 * approve_stage tool, so an approval given in chat and one given by button are
 * the same record.
 *
 * The order is enforced where the write happens: the image cannot be approved
 * before the post, nor captions before the image. Approving captions saves
 * exactly the caption set Bart approved. Nothing is scheduled; that is the next
 * approval.
 *
 * Body: { slug, stage: "image" | "captions", captions?: { [channel]: text } }
 */
import { requireAoSession } from '../../../lib/ao/requireAoSession.js';
import { recordStageApproval } from '../../../lib/ao/stageApproval.js';

export default async function handler(req, res) {
  const auth = requireAoSession(req, res);
  if (!auth) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const result = await recordStageApproval({
      email: auth.email,
      slug: body.slug,
      stage: body.stage,
      captions: body.captions,
    });
    const { status, ...out } = result;
    return res.status(status || (out.ok ? 200 : 500)).json(out);
  } catch (err) {
    console.error('[approve-stage]', err?.message || err);
    return res.status(500).json({ ok: false, error: err?.message || 'Server error' });
  }
}
