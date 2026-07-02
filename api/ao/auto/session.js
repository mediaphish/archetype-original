import { requireAoSession } from '../../../lib/ao/requireAoSession.js';
import { supabaseAdmin } from '../../../lib/supabase-admin.js';
import {
  getAutoThreadState,
  searchBundles,
  listGuardrails,
  fetchBundleByIdForOwner,
} from '../../../lib/ao/autoHub.js';

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
    let bundleList = bundles.slice(0, 8);
    const activeBundleId =
      state.thread?.state && typeof state.thread.state === 'object'
        ? state.thread.state.bundle_id
        : null;
    if (
      activeBundleId &&
      !bundleList.some((b) => String(b?.id) === String(activeBundleId))
    ) {
      const extra = await fetchBundleByIdForOwner(auth.email, activeBundleId);
      if (extra) bundleList = [extra, ...bundleList].slice(0, 8);
    }

    // Check LinkedIn token expiration
    let linkedinTokenStatus = null;
    try {
      const { data: tokenRow } = await supabaseAdmin
        .from('ao_linkedin_tokens')
        .select('expires_at, updated_at')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (tokenRow?.expires_at) {
        const expiresAt = new Date(tokenRow.expires_at);
        const now = new Date();
        const daysRemaining = Math.floor((expiresAt - now) / (1000 * 60 * 60 * 24));

        if (daysRemaining < 0) {
          linkedinTokenStatus = { status: 'expired', daysRemaining, expiresAt: tokenRow.expires_at };
        } else if (daysRemaining <= 14) {
          linkedinTokenStatus = { status: 'expiring_soon', daysRemaining, expiresAt: tokenRow.expires_at };
        } else {
          linkedinTokenStatus = { status: 'ok', daysRemaining, expiresAt: tokenRow.expires_at };
        }
      } else {
        linkedinTokenStatus = { status: 'unknown' };
      }
    } catch (_) {
      linkedinTokenStatus = { status: 'unknown' };
    }

    return res.status(200).json({
      ok: true,
      thread: state.thread,
      messages: state.messages,
      attachments: state.attachments,
      bundles: bundleList,
      guardrails: guardrails.slice(0, 12),
      linkedin_token_status: linkedinTokenStatus,
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
}
