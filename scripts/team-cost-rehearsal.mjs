/**
 * Team cost rehearsal (2026-11-09).
 *
 * Bart, after one Eli Archetype chat cost $27 in a day: the last spend fix was
 * proven on a short test, and the first heavy day was his. This replays a real,
 * heavy conversation the way the team works it (Cam answers, Red fixes, Ada
 * reviews) and reports what each turn reads and costs, so a change to the team
 * is measured before Bart ever sees it.
 *
 * It builds each teammate's real request through the same code the chat uses,
 * then sends it with a tiny reply limit and no tools run, so nothing is saved,
 * posted or changed. A full run costs well under a dollar; --count is free.
 *
 *   node --env-file=.env.local scripts/team-cost-rehearsal.mjs [thread_id] [--count]
 *
 * Pass: every teammate after the first reuses at least 80% of what it reads
 * from the saved copy, and one round costs under $0.75.
 */
import Anthropic from '@anthropic-ai/sdk';
import { supabaseAdmin } from '../lib/supabase-admin.js';
import { PRICES } from '../lib/ao/team/spend.js';

const THREAD = process.argv.slice(2).find((a) => !a.startsWith('--')) || '1597dff7-c97e-40cd-9aa9-547bed635db8';
const COUNT_ONLY = process.argv.includes('--count');
const ROUND = [
  ['producer', 'In The Eli Archetype, change "He was ninety-eight and blind." to "He was ninety-eight and blind by then."'],
  ['editor', '[TEAM TASK from Cam] One line fix: The Eli Archetype. Apply the change above with edit_draft_lines.'],
  ['auto', '[TEAM TASK from Ada] Review: Full pass: The Eli Archetype. Read it the way Bart will.'],
];

let captured = null;
Anthropic.Messages.prototype.stream = function stream(params) {
  captured = params;
  throw new Error('REHEARSAL_ONLY');
};
const { runAutoChatStream } = await import('../lib/ao/autoV2.js');
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const realCreate = Anthropic.Messages.prototype.create;

const { data, error } = await supabaseAdmin
  .from('ao_auto_messages')
  .select('role, content, created_at')
  .eq('thread_id', THREAD)
  .order('created_at');
if (error) throw error;
const history = data
  .filter((m) => m.role === 'user' || m.role === 'assistant')
  .map((m) => ({ role: m.role, content: String(m.content || '') }));

const dollars = (model, u) => {
  const p = PRICES[model] || PRICES['claude-opus-5-5'];
  return ((u.input_tokens || 0) * p.input + (u.cache_creation_input_tokens || 0) * p.write + (u.cache_read_input_tokens || 0) * p.read + (u.output_tokens || 0) * p.output) / 1e6;
};

console.log(`Rehearsing ${history.length} messages from conversation ${THREAD}${COUNT_ONLY ? ' (count only, free)' : ''}\n`);
let total = 0;
let failed = false;
for (const [i, [agent, message]] of ROUND.entries()) {
  captured = null;
  try {
    await runAutoChatStream(history, message, null, null, () => {}, null, {
      agent,
      threadId: THREAD,
      email: process.env.AO_OWNER_EMAIL,
    });
  } catch (_) {
    // Expected: the request is captured, never sent by the chat code.
  }
  if (!captured) {
    console.log(`${agent}: no request was built`);
    failed = true;
    continue;
  }
  const { stream: _s, ...params } = captured;
  if (COUNT_ONLY) {
    const n = await client.messages.countTokens({ model: params.model, system: params.system, tools: params.tools, messages: params.messages });
    console.log(`${agent.padEnd(8)} ${params.model}  reads ${n.input_tokens.toLocaleString()} tokens`);
    continue;
  }
  const res = await realCreate.call(client.messages, { ...params, max_tokens: 16 });
  const u = res.usage || {};
  const read = (u.input_tokens || 0) + (u.cache_creation_input_tokens || 0) + (u.cache_read_input_tokens || 0);
  const reused = read ? (u.cache_read_input_tokens || 0) / read : 0;
  const cost = dollars(params.model, u);
  total += cost;
  const pass = i === 0 || reused >= 0.8;
  if (!pass) failed = true;
  console.log(
    `${agent.padEnd(8)} ${params.model}  reads ${read.toLocaleString()}  reused ${(reused * 100).toFixed(0)}%  new ${(u.cache_creation_input_tokens || 0).toLocaleString()}  $${cost.toFixed(3)}  ${pass ? 'ok' : 'FAIL: not shared'}`
  );
}
if (!COUNT_ONLY) {
  if (total >= 0.75) failed = true;
  console.log(`\nOne round (answer, fix, review): $${total.toFixed(2)}  ${failed ? 'FAIL' : 'PASS'}`);
}
process.exit(failed ? 1 : 0);
