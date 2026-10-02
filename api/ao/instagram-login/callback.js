/**
 * AO Automation — finish connecting the personal Instagram account.
 * GET /api/ao/instagram-login/callback?code=...&state=...
 *
 * Instagram sends Bart back here. The code becomes a short lived token, which
 * becomes a sixty day token, which is stored where the posting adapters read it.
 * Then he lands back on Settings with the outcome in the address bar.
 *
 * No owner session is required, because Instagram redirects the browser here
 * without the site's cookies in some flows. The signed state from the start of
 * the flow is what proves this callback belongs to a request Bart made.
 */

import { supabaseAdmin } from '../../../lib/supabase-admin.js';
import {
  exchangeCodeForShortLivedToken,
  exchangeForLongLivedToken,
  fetchAccount,
} from '../../../lib/social/instagramLoginOAuth.js';
import { IG_PERSONAL_ACCOUNT_ID } from '../../../lib/ao/instagramLoginStatus.js';
import { verifyState, stateSecret } from './start.js';

const SETTINGS_PATH = '/ao/settings';

function backToSettings(res, params) {
  const qs = new URLSearchParams(params).toString();
  res.writeHead(302, { Location: `${SETTINGS_PATH}?${qs}` });
  return res.end();
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  // Instagram reports a refusal on the query string rather than by failing.
  const denied = req.query?.error || req.query?.error_reason;
  if (denied) {
    return backToSettings(res, {
      instagram: 'denied',
      message: String(req.query?.error_description || denied).slice(0, 200),
    });
  }

  const secret = stateSecret();
  if (!secret || !verifyState(req.query?.state, secret)) {
    return backToSettings(res, {
      instagram: 'error',
      message: 'That sign in link was not one this site started, or it sat too long. Try Connect again.',
    });
  }

  const code = req.query?.code;
  if (!code) {
    return backToSettings(res, { instagram: 'error', message: 'Instagram did not send back a sign in code.' });
  }

  try {
    const short = await exchangeCodeForShortLivedToken(code);
    if (!short.ok) return backToSettings(res, { instagram: 'error', message: short.error.slice(0, 200) });

    const long = await exchangeForLongLivedToken(short.token);
    if (!long.ok) return backToSettings(res, { instagram: 'error', message: long.error.slice(0, 200) });

    const account = await fetchAccount(long.token);
    if (!account.ok) return backToSettings(res, { instagram: 'error', message: account.error.slice(0, 200) });

    const { error } = await supabaseAdmin.from('ao_instagram_login_tokens').upsert(
      {
        account_id: IG_PERSONAL_ACCOUNT_ID,
        instagram_user_id: account.id,
        instagram_username: account.username,
        access_token: long.token,
        expires_at: long.expiresAt,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'account_id' }
    );
    if (error) {
      return backToSettings(res, { instagram: 'error', message: `Could not save the connection: ${error.message}`.slice(0, 200) });
    }

    return backToSettings(res, {
      instagram: 'connected',
      username: account.username || '',
      expires: String(long.expiresAt).slice(0, 10),
    });
  } catch (e) {
    return backToSettings(res, { instagram: 'error', message: String(e?.message || 'Connection failed').slice(0, 200) });
  }
}
