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
 *   node --env-file=.env.local scripts/bit-repair.mjs pending
 *     Requests Bart made through Bit ("send Claude a report"), as JSON. The
 *     15-minute pickup task runs the repair pass only when one is waiting.
 *
 *   node --env-file=.env.local scripts/bit-repair.mjs pick <id>
 *   node --env-file=.env.local scripts/bit-repair.mjs done <id> <file>
 *     Mark a request picked up, then done with the report in <file>.
 *
 *   node --env-file=.env.local scripts/bit-repair.mjs tell <subject> <file> [threadId]
 *     Emails Bart the report in <file> (plain text, one paragraph per blank
 *     line) and posts it in chat as Bit: in the chat Bart asked from when a
 *     request's thread_id is given, otherwise in his newest #team chat.
 */
import { readFileSync } from 'node:fs';

const [, , cmd, subject, file, threadArg] = process.argv;

if (cmd === 'open') {
  const { openReports } = await import('../lib/ao/team/bit.js');
  const { supabaseAdmin } = await import('../lib/supabase-admin.js');
  const open = await openReports();
  const { data: last } = await supabaseAdmin.from('ao_bit_reports').select('last_checked_at').order('last_checked_at', { ascending: false }).limit(1).maybeSingle();
  console.log(JSON.stringify({ last_checked_at: last?.last_checked_at || null, open }, null, 2));
} else if (cmd === 'pending') {
  const { pendingRequests } = await import('../lib/ao/team/bit.js');
  const waiting = await pendingRequests();
  console.log(JSON.stringify({ count: waiting.length, requests: waiting }, null, 2));
} else if (cmd === 'pick' || cmd === 'done') {
  const id = subject;
  if (!id) throw new Error(`usage: ${cmd} <id>${cmd === 'done' ? ' <file>' : ''}`);
  const { markRequest } = await import('../lib/ao/team/bit.js');
  const outcome = cmd === 'done' && file ? readFileSync(file, 'utf8').trim() : null;
  console.log(JSON.stringify(await markRequest(id, cmd === 'pick' ? 'picked' : 'done', outcome)));
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
    const { channelOfThread } = await import('../lib/ao/team/channels.js');
    // #team is not one stored chat; it is every chat whose channel works out
    // to team (2026-10-28: looking for a stored "team" channel found none, so
    // reports went by email only).
    let threadId = threadArg || null;
    if (!threadId) {
      const { data: rows } = await supabaseAdmin
        .from('ao_auto_threads')
        .select('id, state')
        .eq('created_by_email', owner)
        .order('updated_at', { ascending: false })
        .limit(200);
      threadId = (rows || []).find((t) => channelOfThread(t) === 'team' && !t.state?.user_archived)?.id || null;
    }
    if (threadId) {
      await addAutoMessage({ threadId, role: 'assistant', mode: 'plan', content: `Bit: ${text}`, meta: { auto_v2: true, agent: 'it', daily_repair: true } });
      posted = true;
    }
  } catch (err) {
    console.error('chat post failed:', err?.message || err);
  }
  console.log(JSON.stringify({ emailed: !!mail?.ok, email_error: mail?.ok ? null : mail?.error, posted_in_team_channel: posted }));
} else {
  console.log('usage: open | pending | pick <id> | done <id> <file> | tell <subject> <file>');
  process.exitCode = 1;
}
