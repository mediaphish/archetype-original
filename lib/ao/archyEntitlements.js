import { supabaseAdmin } from '../supabase-admin.js';
import { isArchyPaidSession as isPaidByEnv } from './archyAccess.js';

/**
 * Paid tier: env session list OR optional DB row (for future billing).
 */
export async function isArchyPaidSessionAsync(sessionId) {
  if (isPaidByEnv(sessionId)) return true;
  const sid = String(sessionId || '').trim();
  if (!sid) return false;
  try {
    const { data } = await supabaseAdmin.from('archy_chat_entitlements').select('tier').eq('session_id', sid).maybeSingle();
    return data?.tier === 'paid';
  } catch {
    return false;
  }
}
