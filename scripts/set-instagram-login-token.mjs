/**
 * Store an Instagram Login token for the personal account.
 *
 *   node scripts/set-instagram-login-token.mjs
 *
 * It asks for the token, never echoes it, never writes it to a file, and never
 * puts it on the command line where a shell history would keep it. It exchanges
 * what Meta's dashboard gives you for a sixty day token, reads back which
 * account it belongs to so a wrong paste cannot pass silently, and stores it
 * where the posting adapters look.
 *
 * 2026-10-02. The previous token was stored by hand on July 26 and expired on
 * September 24, taking the channel down. The renewal that should have prevented
 * that had been failing every Monday since August because two secrets were never
 * added to the repository. Re-running this restores posting; the secrets are
 * what stop it happening again.
 *
 * Needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, which .env.local already has.
 */
import { createClient } from '@supabase/supabase-js';
import { createInterface } from 'node:readline';
import { readFileSync, existsSync } from 'node:fs';

const ACCOUNT_ID = 'ig_mediaphish';

/** .env.local, so the service key does not have to be exported by hand. */
function loadEnvLocal() {
  if (!existsSync('.env.local')) return;
  for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key]) continue;
    process.env[key] = rawValue.trim().replace(/^["']|["']$/g, '');
  }
}

/** Read one line without printing it back. */
function askHidden(question) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    const onData = (char) => {
      if (['\n', '\r', '\u0004'].includes(String(char))) process.stdin.removeListener('data', onData);
      else rl.output.write('\x1B[2K\x1B[200D' + question);
    };
    process.stdin.on('data', onData);
    rl.question(question, (answer) => {
      rl.output.write('\n');
      rl.close();
      resolve(String(answer).trim());
    });
  });
}

async function main() {
  loadEnvLocal();

  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, INSTAGRAM_APP_SECRET } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required (.env.local has both).');
    process.exit(1);
  }

  console.log('\nPaste the token from Meta, then press Return. It will not be shown.\n');
  const pasted = await askHidden('Token: ');
  if (!pasted) {
    console.error('No token given. Nothing changed.');
    process.exit(1);
  }

  // A dashboard token may be short lived. Trading it for a long lived one is
  // harmless if it is already long lived, and essential if it is not: a short
  // lived token would die in an hour and look like the same outage again.
  let token = pasted;
  let expiresAt = null;
  if (INSTAGRAM_APP_SECRET) {
    const params = new URLSearchParams({
      grant_type: 'ig_exchange_token',
      client_secret: INSTAGRAM_APP_SECRET,
      access_token: pasted,
    });
    const res = await fetch(`https://graph.instagram.com/access_token?${params}`);
    const data = await res.json().catch(() => ({}));
    if (res.ok && data?.access_token) {
      token = String(data.access_token);
      expiresAt = new Date(Date.now() + (Number(data.expires_in) || 5184000) * 1000).toISOString();
      console.log('Exchanged for a long lived token.');
    } else {
      console.log('Could not exchange it, so storing what you pasted as given.');
    }
  } else {
    console.log('No INSTAGRAM_APP_SECRET locally, so storing the token as given.');
  }

  // Who the token actually belongs to. A token for the wrong account would
  // otherwise store cleanly and fail at the first post.
  const meRes = await fetch(
    `https://graph.instagram.com/v21.0/me?fields=id,username&access_token=${encodeURIComponent(token)}`
  );
  const me = await meRes.json().catch(() => ({}));
  if (!meRes.ok || !me?.id) {
    console.error(`\nInstagram would not accept that token: ${me?.error?.message || meRes.status}`);
    console.error('Nothing was saved.');
    process.exit(1);
  }
  console.log(`Token belongs to @${me.username || me.id} (${me.id}).`);

  if (!expiresAt) {
    // Meta does not report an expiry on every path, and the renewal job reads
    // this column to decide what is due, so an unknown expiry is recorded as
    // sixty days out rather than left empty.
    expiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { error } = await supabase.from('ao_instagram_login_tokens').upsert(
    {
      account_id: ACCOUNT_ID,
      instagram_user_id: String(me.id),
      instagram_username: me.username ? String(me.username) : null,
      access_token: token,
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'account_id' }
  );

  if (error) {
    console.error(`\nCould not save it: ${error.message}`);
    process.exit(1);
  }

  console.log(`\nSaved. @${me.username || me.id} is connected until ${expiresAt.slice(0, 10)}.`);
  console.log('Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to the repository secrets');
  console.log('and the Monday job will keep extending it, so this expiry never arrives.\n');
}

main().catch((e) => {
  console.error(e?.message || e);
  process.exit(1);
});
