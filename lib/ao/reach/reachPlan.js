/**
 * Reach, the publicist inside Auto.
 *
 * Bart, 2026-10-25: "Maybe we add a Publicist Agent to Auto? So the CMO, Auto,
 * is in charge. We build an Agent called Reach that is a Publicist. This agent
 * would help make decisions about where and when content goes? Maybe it can
 * speak into the vision that comes from me and Auto?" And: "make sure Reach is
 * full integrated and communicating with Auto and myself."
 *
 * Bart sets the vision, Auto decides what is said, Reach decides where, when and
 * how often. Reach recommends; it never overrides Bart.
 *
 * The plan is one row in ao_reach_plan. These defaults are what Bart described:
 * Monday the Archetype series, Wednesday business and leadership (where the
 * Leading with AI series goes), Friday the resurfaces. Channel jobs are a
 * proposal until he approves them.
 */
import { supabaseAdmin } from '../../supabase-admin.js';

export const WEEKDAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export const DEFAULT_PLAN = {
  days: {
    monday: { focus: 'Archetype series entry', expects: 'archetype_entry' },
    tuesday: { focus: 'Quick hits: infographic, pull quote from Monday', expects: null },
    wednesday: { focus: 'Business and leadership entry (Leading with AI series goes here)', expects: 'leadership_entry' },
    thursday: { focus: 'Quick hits: infographic, pull quote from Wednesday', expects: null },
    friday: { focus: 'Resurface of an older entry', expects: 'resurface' },
    saturday: { focus: 'Nothing automatic', expects: null },
    sunday: { focus: 'Nothing automatic', expects: null },
  },
  channel_jobs_status: 'proposed',
  channel_jobs: {
    'linkedin|personal': 'Main stage: entries, infographics, pull quotes.',
    'instagram|meta': 'Brand library: infographics, quote cards, resurfaces.',
    'facebook|meta': 'Brand library: infographics, quote cards, resurfaces.',
    'instagram|ig_mediaphish': 'Bart\'s real life: "Life through my eyes", his own photos. Nothing generated without him.',
    'twitter|personal': 'Conversation, not broadcast: short takes and replies over repeated cards.',
  },
  min_gap_hours: 2,
  posting_hours: '8:00am to 5:30pm Central',
};

export const CHANNEL_NAMES = {
  'linkedin|personal': 'LinkedIn',
  'instagram|meta': 'Instagram (company)',
  'instagram|ig_mediaphish': 'Instagram (personal)',
  'facebook|meta': 'Facebook (company)',
  'twitter|personal': 'X',
};

export const KIND_NAMES = {
  journal_launch: 'Journal entry launch',
  weekly_pull_bundle: 'Pull quote',
  infographic: 'Infographic',
  ao_journal_reshare: 'Resurface',
  auto_quote_card: 'Quote card',
  owner_break_notice: 'Personal note',
  owner_birthday_ask: 'Personal note',
};

export function channelName(platform, accountId) {
  const key = `${String(platform || '').toLowerCase()}|${String(accountId || '')}`;
  return CHANNEL_NAMES[key] || `${platform}${accountId ? ` (${accountId})` : ''}`;
}

/** Merge a stored plan over the defaults, one level deep for days and jobs. */
export function mergePlan(stored = {}) {
  const s = stored && typeof stored === 'object' ? stored : {};
  return {
    ...DEFAULT_PLAN,
    ...s,
    days: { ...DEFAULT_PLAN.days, ...(s.days || {}) },
    channel_jobs: { ...DEFAULT_PLAN.channel_jobs, ...(s.channel_jobs || {}) },
  };
}

export async function loadReachPlan() {
  try {
    const { data } = await supabaseAdmin.from('ao_reach_plan').select('plan, updated_at, updated_by').eq('id', 'default').maybeSingle();
    return { plan: mergePlan(data?.plan), updated_at: data?.updated_at || null, stored: !!data };
  } catch (_) {
    return { plan: mergePlan(), updated_at: null, stored: false };
  }
}

/**
 * Apply Bart's change to the plan. Only Bart's direction comes through here.
 * @param {{ day?: string, focus?: string, channel?: string, job?: string, approve_channel_jobs?: boolean }} change
 */
export async function updateReachPlan(change = {}, email = null) {
  const { plan } = await loadReachPlan();
  const next = { ...plan, days: { ...plan.days }, channel_jobs: { ...plan.channel_jobs } };
  const changed = [];
  if (change.day) {
    const day = String(change.day).toLowerCase().trim();
    if (!WEEKDAYS.includes(day)) return { ok: false, error: `day must be one of ${WEEKDAYS.join(', ')}` };
    const focus = String(change.focus || '').trim();
    if (!focus) return { ok: false, error: 'focus is required with day' };
    next.days[day] = { focus, expects: change.expects === undefined ? plan.days[day]?.expects ?? null : change.expects || null };
    changed.push(`${day}: ${focus}`);
  }
  if (change.channel) {
    const key = String(change.channel).toLowerCase().trim();
    const job = String(change.job || '').trim();
    if (!CHANNEL_NAMES[key]) return { ok: false, error: `channel must be one of ${Object.keys(CHANNEL_NAMES).join(', ')}` };
    if (!job) return { ok: false, error: 'job is required with channel' };
    next.channel_jobs[key] = job;
    changed.push(`${CHANNEL_NAMES[key]}: ${job}`);
  }
  if (change.approve_channel_jobs === true) {
    next.channel_jobs_status = 'approved';
    changed.push('channel jobs approved');
  }
  if (changed.length === 0) return { ok: false, error: 'Nothing to change' };
  const { error } = await supabaseAdmin
    .from('ao_reach_plan')
    .upsert({ id: 'default', plan: next, updated_by: email, updated_at: new Date().toISOString() });
  if (error) return { ok: false, error: error.message };
  return { ok: true, changed, plan: next };
}
