import { requireAoSession } from '../../../lib/ao/requireAoSession.js';
import { getAutoThreadState, searchBundles, listGuardrails } from '../../../lib/ao/autoHub.js';

export default async function handler(req, res) {
  const auth = requireAoSession(req, res);
  if (!auth) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const state = await getAutoThreadState(auth.email, req.query?.thread_id || '');
    const [bundles, guardrails] = await Promise.all([
      searchBundles(auth.email, ''),
      listGuardrails(auth.email),
    ]);
    return res.status(200).json({
      ok: true,
      thread: state.thread,
      messages: state.messages,
      attachments: state.attachments,
      bundles: bundles.slice(0, 8),
      guardrails: guardrails.slice(0, 12),
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
}
