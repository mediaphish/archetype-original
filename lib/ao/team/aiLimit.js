/**
 * When Anthropic's spending limit stops the team (2026-10-28).
 *
 * Bart: "If I set a limit, can you create a way for Bit to communicate the
 * hard stop to me so I can temporarily suspend the limit if needed?"
 *
 * Once the limit is reached, every model call is refused. Email does not go
 * through Anthropic, so Bit can still say so: the first refusal emails Bart at
 * once (not at the next six-hourly check), Auto shows a paused line at the top
 * of the chat, and the first call that goes through again clears it and says
 * the team is back.
 *
 * State lives in ao_bit_reports under the key "ai_limit".
 */
import { supabaseAdmin } from '../../supabase-admin.js';

const KEY = 'ai_limit';
const LABEL = 'AI spending limit';
export const LIMITS_URL = 'https://platform.claude.com/settings/limits';
const SITE = () => process.env.SITE_URL || 'https://www.archetypeoriginal.com';

const WHO = { auto: 'Ada', jot: 'Jot', reach: 'Vox', producer: 'Cam', designer: 'Des', it: 'Bit', editor: 'Red' };

/** Pure: whether an API error is Anthropic refusing for the spend limit or an empty balance. */
export function isLimitError(err) {
  const text = `${err?.message || ''} ${err?.error?.error?.message || ''} ${typeof err === 'string' ? err : ''}`;
  return /usage limits?|spend(ing)? limit|credit balance is too low|reached your (specified )?(api )?(usage|spend)/i.test(text);
}

/** Pure: who or what was stopped, in Bart's words. */
export function whatStopped(source) {
  const [kind, who] = String(source || '').split(':');
  if (WHO[who]) return `${WHO[who]}'s work`;
  if (kind === 'text') return 'a background check';
  return 'the team\'s work';
}

let lastRaise = 0;
let lastClearCheck = 0;

async function email(subject, lines) {
  const [{ sendToBart }, { noticeHtml }] = await Promise.all([import('../../calendly/followups.js'), import('../../calendly/emailLayout.js')]);
  return sendToBart({ subject, html: noticeHtml({ title: subject.replace(/^Bit:\s*/, ''), lines, cta: { label: 'Open the limit in Anthropic', url: LIMITS_URL }, eyebrow: 'Auto · Bit' }) });
}

/** Record that the limit stopped a call, and tell Bart the first time. Never throws. */
export async function raiseLimitStop(source) {
  if (Date.now() - lastRaise < 60000) return false;
  lastRaise = Date.now();
  try {
    const stamp = new Date().toISOString();
    const { data: prev } = await supabaseAdmin.from('ao_bit_reports').select('status').eq('key', KEY).maybeSingle();
    const already = prev?.status === 'broken';
    const detail = `The team is paused: your monthly AI spending limit in Anthropic was reached, so ${whatStopped(source)} was refused. Raise or lift the limit in your Anthropic Console (Settings, then Limits) and the team picks up again.`;
    await supabaseAdmin.from('ao_bit_reports').upsert(
      { key: KEY, label: LABEL, status: 'broken', detail, for_claude: `Anthropic refused calls for the spend limit (first seen in ${source}). Nothing to fix in code; Bart raises the limit.`, last_checked_at: stamp, ...(already ? {} : { first_seen_at: stamp, resolved_at: null, notified_at: stamp }) },
      { onConflict: 'key' }
    );
    if (already) return false;
    await email('Bit: the team is paused by your AI spending limit', [
      detail,
      'Nothing is lost. Work that was refused can be asked for again once the limit is raised.',
      `When the team is working again I will tell you. You can also check Auto: ${SITE()}/ao/analyst`,
    ]);
    return true;
  } catch (err) {
    console.error('[aiLimit] raise failed:', err?.message || err);
    return false;
  }
}

/** After a call goes through: if the team was paused, clear it and say so. Checks at most every five minutes. */
export async function clearLimitStopIfSet() {
  if (Date.now() - lastClearCheck < 5 * 60000) return false;
  lastClearCheck = Date.now();
  try {
    const { data: prev } = await supabaseAdmin.from('ao_bit_reports').select('status').eq('key', KEY).maybeSingle();
    if (prev?.status !== 'broken') return false;
    const stamp = new Date().toISOString();
    await supabaseAdmin.from('ao_bit_reports').update({ status: 'ok', detail: 'The team is working again.', for_claude: null, resolved_at: stamp, last_checked_at: stamp, notified_at: stamp }).eq('key', KEY);
    await email('Bit: the team is working again', ['The AI spending limit no longer stops the team. Everyone is back to work.']);
    return true;
  } catch (err) {
    console.error('[aiLimit] clear failed:', err?.message || err);
    return false;
  }
}

/** For the chat screen: whether the team is paused by the limit. */
export async function limitPause() {
  const { data } = await supabaseAdmin.from('ao_bit_reports').select('status, first_seen_at').eq('key', KEY).maybeSingle();
  return data?.status === 'broken' ? { paused: true, since: data.first_seen_at || null, url: LIMITS_URL } : { paused: false };
}
