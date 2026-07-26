// Refresh all Instagram Login tokens (lib/social/instagramLoginConnection.js's backing
// table) that are within 10 days of expiring. Run on a schedule — see
// .github/workflows/refresh-instagram-login-tokens.yml.
import { createClient } from '@supabase/supabase-js';

const REFRESH_WINDOW_DAYS = 10;

async function main() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
    process.exit(1);
  }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  const cutoff = new Date(Date.now() + REFRESH_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { data: rows, error } = await supabase
    .from('ao_instagram_login_tokens')
    .select('id, account_id, access_token, expires_at')
    .lte('expires_at', cutoff);

  if (error) {
    console.error('Failed to fetch tokens due for refresh:', error.message);
    process.exit(1);
  }
  if (!rows || rows.length === 0) {
    console.log('No Instagram Login tokens due for refresh.');
    return;
  }

  for (const row of rows) {
    try {
      const url = `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(row.access_token)}`;
      const res = await fetch(url);
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.access_token) {
        console.error(`Refresh failed for ${row.account_id}:`, data.error?.message || res.status);
        continue;
      }
      const expiresAt = new Date(Date.now() + (data.expires_in || 5_184_000) * 1000).toISOString();
      const { error: updateError } = await supabase
        .from('ao_instagram_login_tokens')
        .update({ access_token: data.access_token, expires_at: expiresAt, updated_at: new Date().toISOString() })
        .eq('id', row.id);
      if (updateError) {
        console.error(`DB update failed for ${row.account_id}:`, updateError.message);
      } else {
        console.log(`Refreshed ${row.account_id}, new expiry ${expiresAt}`);
      }
    } catch (err) {
      console.error(`Refresh error for ${row.account_id}:`, err.message);
    }
  }
}

main();
