import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
for (const l of readFileSync('.env.local','utf8').split('\n')) {
  const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g,'');
}
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const deadline = Date.now() + 5 * 60 * 60 * 1000;
while (Date.now() < deadline) {
  const { data } = await sb.from('ao_devotional_send_log').select('*').order('ran_at', { ascending: false }).limit(1);
  if (data && data.length) {
    const r = data[0];
    console.log(`CRON RAN ${r.ran_at} | source=${r.source} | date=${r.calendar_date} | found=${r.found} sent=${r.sent} skipped=${r.skipped_duplicates} | ${r.note || ''}`);
    process.exit(0);
  }
  await new Promise(r => setTimeout(r, 120000));
}
console.log('NO CRON RUN RECORDED within 5 hours');
