/**
 * The daily repair pass's link to Bit and to Bart (2026-10-27).
 *
 * Bart: "Run the repair pass daily. Hold yourself accountable. If there is
 * risk, pause and ask me. If there is none go!" Once a day a scheduled Claude
 * session reads what Bit found, fixes what is safe to fix, and tells Bart.
 *
 *   node --env-file=.env.local scripts/bit-repair.mjs open
 *     Bit's open reports (saved by the live site every six hours), as JSON.
 *
 *   node --env-file=.env.local scripts/bit-repair.mjs tell <subject> <file>
 *     Emails Bart the report in <file> (plain text, one paragraph per blank
 *     line) and posts it in Auto's #team channel as Bit, so it is in chat too.
 */
import { readFileSync } from 'node:fs';

const [, , cmd, subject, file] = process.argv;

if (cmd === 'open') {
  const { openReports } = await import('../lib/ao/team/bit.js');
  const { supabaseAdmin } = await import('../lib/supabase-admin.js');
  const open = await openReports();
  const { data: last } = await supabaseAdmin.from('ao_bit_reports').select('last_checked_at').order('last_checked_at', { ascending: false }).limit(1).maybeSingle();
  console.log(JSON.stringify({ last_checked_at: last?.last_checked_at || null, open }, null, 2));
} else if (cmd === 'tell') {
  if (!subject || !file) throw new Error('usage: tell <subject> <file>');
  const text = readFileSync(file, 'utf8').trim();
  const paragraphs = text.split(/\n\s*\n/).map((p) => p.replace(/\s+/g, ' ').trim()).filter(Boolean);
  const [{ sendToBart }, { noticeHtml }] = await Promise.all([import('../lib/calendly/followups.js'), import('../lib/calendly/emailLayout.js')]);
  const site = process.env.SITE_URL || 'https://www.archetypeoriginal.com';
  const mail = await sendToBart({
    subject,
    html: noticeHtml({ title: subject.replace(/^Bit:\s*/, ''), lines: paragraphs, cta: { label: 'Open Auto', url: `${site}/ao/analyst` }, eyebrow: 'Auto · Bit · Daily repair' }),
  });
  // And in chat, where Bart works: Bit's message in the #team channel.
  let posted = false;
  try {
    const { supabaseAdmin } = await import('../lib/supabase-admin.js');
    const { addAutoMessage } = await import('../lib/ao/autoHub.js');
    const owner = (process.env.AO_OWNER_EMAIL || 'bart@archetypeoriginal.com').toLowerCase();
    const { data: thread } = await supabaseAdmin
      .from('ao_auto_threads')
      .select('id')
      .eq('created_by_email', owner)
      .eq('state->>channel', 'team')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();
    if (thread?.id) {
      await addAutoMessage({ threadId: thread.id, role: 'assistant', mode: 'plan', content: `Bit: ${text}`, meta: { auto_v2: true, agent: 'it', daily_repair: true } });
      posted = true;
    }
  } catch (err) {
    console.error('chat post failed:', err?.message || err);
  }
  console.log(JSON.stringify({ emailed: !!mail?.ok, email_error: mail?.ok ? null : mail?.error, posted_in_team_channel: posted }));
} else {
  console.log('usage: open | tell <subject> <file>');
  process.exitCode = 1;
}
