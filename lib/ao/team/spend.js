/**
 * Bit's watch on AI spend (2026-10-28).
 *
 * Bart: API spend was running about $100 a day, and "Is there any way to setup
 * something that will monitor this kind of stuff constantly to make sure we are
 * optimized when it comes to token use?" He set the daily line at $30.
 *
 * Reads ao_ai_usage (written by lib/ao/promptCache.js recordUsage) and prices it
 * with Anthropic's published rates. These are estimates; Anthropic's bill is the
 * final word, and work done in Claude Code on Bart's plan is not in this log.
 */

/** Dollars per million tokens (platform.claude.com pricing, read 2026-10-28). */
export const PRICES = Object.freeze({
  'claude-opus-5-5': { input: 4, write: 5, read: 0.2, output: 20 },
  'claude-opus-5': { input: 5, write: 6.25, read: 0.5, output: 25 },
  'claude-sonnet-5-5': { input: 2, write: 2.5, read: 0.1, output: 10 },
  'claude-sonnet-5': { input: 2, write: 2.5, read: 0.2, output: 10 },
  'claude-haiku-4-5': { input: 1, write: 1.25, read: 0.1, output: 5 },
});

export const DAILY_LINE = 30;
/** One chat or job using this much in a day is treated as a possible runaway. */
export const RUNAWAY_LINE = 10;
/** Prompt tokens needed before Bit judges whether caching is working. */
export const REUSE_MIN_TOKENS = 2000000;

const priceFor = (model) => {
  const m = String(model || '').toLowerCase();
  const key = Object.keys(PRICES).find((k) => m.startsWith(k));
  return PRICES[key] || PRICES['claude-opus-5-5'];
};

/** Estimated dollars for one usage row. */
export function costOf(row) {
  const p = priceFor(row?.model);
  return (
    ((row?.input_tokens || 0) * p.input +
      (row?.cache_write_tokens || 0) * p.write +
      (row?.cache_read_tokens || 0) * p.read +
      (row?.output_tokens || 0) * p.output) /
    1e6
  );
}

const who = (source) => {
  const s = String(source || '');
  const agent = s.split(':')[1];
  const names = { auto: 'Ada', jot: 'Jot', reach: 'Vox', producer: 'Cam', designer: 'Des', it: 'Bit', editor: 'Red' };
  return names[agent] || s;
};

/** Pure: totals for a set of usage rows. */
export function summarizeSpend(rows) {
  const list = Array.isArray(rows) ? rows : [];
  let total = 0;
  let read = 0;
  let fresh = 0;
  const bySource = new Map();
  const byThread = new Map();
  for (const r of list) {
    const c = costOf(r);
    total += c;
    read += r.cache_read_tokens || 0;
    fresh += (r.input_tokens || 0) + (r.cache_write_tokens || 0);
    const name = who(r.source);
    bySource.set(name, (bySource.get(name) || 0) + c);
    if (r.thread_id) byThread.set(r.thread_id, (byThread.get(r.thread_id) || 0) + c);
  }
  const top = [...bySource.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
  const runaways = [...byThread.entries()].filter(([, c]) => c >= RUNAWAY_LINE).sort((a, b) => b[1] - a[1]);
  const reuse = read + fresh > 0 ? read / (read + fresh) : null;
  return { total, calls: list.length, reuse, top, runaways, promptTokens: read + fresh };
}

const money = (n) => `$${n.toFixed(2)}`;
const topLine = (top) => top.map(([name, c]) => `${name} ${money(c)}`).join(', ');

/** Pure: Bit's check on the last 24 hours. */
export function spendCheck(rows, { line = DAILY_LINE } = {}) {
  const key = 'ai_spend';
  const label = 'AI spend';
  const s = summarizeSpend(rows);
  const base = { key, label, for_claude: null };
  if (!s.calls) return { ...base, status: 'ok', detail: 'No team AI calls were logged in the last 24 hours.' };
  const reusePct = s.reuse == null ? null : Math.round(s.reuse * 100);
  const summary = `About ${money(s.total)} in the last 24 hours across ${s.calls} calls (top: ${topLine(s.top)}).`;
  const problems = [];
  const forClaude = [];
  if (s.total > line) {
    problems.push(`That is over your $${line} daily line.`);
    forClaude.push(`24h estimate ${money(s.total)} > $${line}. By teammate: ${topLine(s.top)}. Read ao_ai_usage for the last 24h grouped by source and thread_id to find what drove it.`);
  }
  if (s.runaways.length) {
    problems.push(`One conversation used ${money(s.runaways[0][1])} on its own, which looks like a teammate stuck in a loop.`);
    forClaude.push(`Possible runaway: thread ${s.runaways.map(([t, c]) => `${t} (${money(c)})`).join(', ')}.`);
  }
  // Below about half reused, caching has probably broken again (the 2026-10-28 cause
  // was a clock to the second at the top of the instructions). Each teammate's
  // first call of a stretch always pays full price for its ~100k-token
  // instructions, so a handful of calls reads near 50% even when caching works
  // (Bit's first live check, 12 calls, 49%). Judge only on a real day's work.
  if (reusePct != null && reusePct < 50 && s.promptTokens > REUSE_MIN_TOKENS) {
    problems.push(`Only ${reusePct}% of the team's reading was reused at the cheaper rate, so something is undoing the savings.`);
    forClaude.push(`Cache reuse ${reusePct}% over ${s.promptTokens} prompt tokens. Something before SYSTEM_CACHE_SPLIT (lib/ao/promptCache.js) is changing between calls, or a call path skips withPromptCache.`);
  }
  if (!problems.length) return { ...base, status: 'ok', detail: `${summary}${reusePct != null ? ` ${reusePct}% reused at the cheaper rate.` : ''}` };
  return { ...base, status: 'warn', detail: `${summary} ${problems.join(' ')}`, for_claude: forClaude.join(' ') };
}

/** Pure: the short weekly note. */
export function weeklySpendLines(rows) {
  const s = summarizeSpend(rows);
  if (!s.calls) return ['No team AI calls were logged this week.'];
  const lines = [`The team's AI use came to about ${money(s.total)} this week, about ${money(s.total / 7)} a day, across ${s.calls} calls.`];
  if (s.top.length) lines.push(`Most of it: ${topLine(s.top)}.`);
  if (s.reuse != null) lines.push(`${Math.round(s.reuse * 100)}% of what the team read was reused at the cheaper rate.`);
  lines.push('These are estimates from my log. Anthropic\'s bill is the final word, and my work in Claude Code is not in it.');
  return lines;
}

export async function loadUsageSince(sinceIso) {
  const { supabaseAdmin } = await import('../../supabase-admin.js');
  const out = [];
  for (let from = 0; from < 50000; from += 1000) {
    const { data, error } = await supabaseAdmin
      .from('ao_ai_usage')
      .select('source, model, input_tokens, output_tokens, cache_read_tokens, cache_write_tokens, thread_id')
      .gte('at', sinceIso)
      .range(from, from + 999);
    if (error) throw new Error(error.message);
    out.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return out;
}

/** Share of the monthly limit at which Bit warns Bart (2026-10-28). */
export const MONTH_WARN_SHARE = 0.8;

/** Pure: the month so far against the limit Bart set in Anthropic. */
export function monthCheck(rows, limit, { since = null } = {}) {
  const key = 'ai_month';
  const label = 'AI spend this month';
  const base = { key, label, for_claude: null };
  const s = summarizeSpend(rows);
  const from = since ? ` since ${since}` : ' this month';
  if (!Number.isFinite(limit) || limit <= 0) {
    return { ...base, status: 'ok', detail: `About ${money(s.total)}${from}. No monthly limit is on record, so I cannot warn before it.` };
  }
  const share = s.total / limit;
  const pct = Math.round(share * 100);
  if (share >= MONTH_WARN_SHARE) {
    return {
      ...base,
      status: 'warn',
      detail: `About ${money(s.total)}${from}, ${pct}% of your $${limit} monthly limit. At the limit the team stops until you raise it in Anthropic (Settings, then Limits).`,
      for_claude: `Month-to-date estimate ${money(s.total)} is ${pct}% of the $${limit} limit (ao_bit_settings ai_monthly_limit). Top: ${topLine(s.top)}.`,
    };
  }
  return { ...base, status: 'ok', detail: `About ${money(s.total)}${from}, ${pct}% of your $${limit} monthly limit.` };
}
