/**
 * Shape Instagram Login (personal) connection status for Settings UI.
 * Reuses getInstagramLoginConnection — does not query the table directly.
 */

export const IG_PERSONAL_ACCOUNT_ID = 'ig_mediaphish';
export const TOKEN_EXPIRY_WARN_DAYS = 10;

/**
 * @param {{ token?: string, igUserId?: string, username?: string|null, expiresAt?: string|null } | null} conn
 * @param {{ nowMs?: number }} [opts]
 */
export function formatInstagramLoginStatus(conn, opts = {}) {
  if (!conn?.token || !conn?.igUserId) {
    return {
      connected: false,
      username: null,
      instagram_user_id: null,
      expires_at: null,
      state: 'not_connected',
      days_until_expiry: null,
      expiry_warning: null,
    };
  }

  const nowMs = Number.isFinite(opts.nowMs) ? opts.nowMs : Date.now();
  const expiresAt = conn.expiresAt || null;
  let daysUntil = null;
  let expiryWarning = null;
  let state = 'connected';

  if (expiresAt) {
    const ms = new Date(expiresAt).getTime() - nowMs;
    daysUntil = Math.ceil(ms / 86_400_000);
    if (ms <= 0) {
      state = 'needs_reconnect';
      expiryWarning = 'Token expired — refresh required before posting will work.';
    } else if (daysUntil <= TOKEN_EXPIRY_WARN_DAYS) {
      expiryWarning = `Token expires in ${daysUntil} day${daysUntil === 1 ? '' : 's'} — confirm the refresh workflow is running`;
    }
  }

  return {
    connected: true,
    username: conn.username || null,
    instagram_user_id: String(conn.igUserId),
    expires_at: expiresAt,
    state,
    days_until_expiry: daysUntil,
    expiry_warning: expiryWarning,
  };
}
