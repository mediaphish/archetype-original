/**
 * Channels: Auto as Bart's Slack with his team (notes/PLAN-auto-chat-first.md,
 * Phase 1).
 *
 * Bart, 2026-10-25: "Auto is my Slack with my Team." and "Every chat can be a
 * full group chat with everyone being able to speak up at will or on request."
 *
 * A channel holds threads (the existing Auto conversations). The whole team is
 * in every thread; the channel's lead answers by default. A thread records its
 * channel in ao_auto_threads.state.channel. Older threads have none, so their
 * channel is worked out from what they already carry (which teammate, whether
 * it is a team task or the CRM's Ask), and nothing has to be moved.
 */
import { supabaseAdmin } from '../../supabase-admin.js';
import { AGENTS, normalizeAgent } from './agents.js';

/** Always there. Order is the order Bart sees. */
export const STANDING_CHANNELS = [
  { key: 'general', name: 'general', lead: 'auto', purpose: 'Anything. Ada answers and brings in whoever is needed.' },
  { key: 'today', name: 'today', lead: 'auto', purpose: 'What needs Bart today.' },
  { key: 'social', name: 'social', lead: 'reach', purpose: 'What goes out where and when, and how it is doing.' },
  { key: 'writing', name: 'writing', lead: 'jot', purpose: 'Journal entries, series, drafts and revisions.' },
  { key: 'podcast', name: 'podcast', lead: 'producer', purpose: 'Guests, recordings, show notes and releases.' },
  { key: 'crm', name: 'crm', lead: 'auto', purpose: 'The people Bart works with or is nurturing.' },
  { key: 'team', name: 'team', lead: 'auto', purpose: 'Work the team runs in the background, and older one-on-one chats.' },
];

/** The first projects Bart named on 2026-10-26 ("Probably more..."). */
export const FIRST_PROJECTS = [
  { key: 'ai-and-leadership', name: 'AI & Leadership', lead: 'jot', purpose: 'The Leading with AI series.' },
  { key: 'next-archetype', name: 'Next Biblical Archetype', lead: 'jot', purpose: 'The next Archetype entry: a positive example after Rehoboam.' },
  { key: 'automated-posts', name: 'Automated posts', lead: 'reach', purpose: 'Resurfaces, quote cards and infographics: quality, rhythm and results.' },
  { key: 'podcast-next-steps', name: 'Podcast next steps', lead: 'producer', purpose: 'Organizing everything the podcast needs next.' },
];

const STANDING_KEYS = new Set(STANDING_CHANNELS.map((c) => c.key));

/** Pure: a short, safe key from a channel name. */
export function channelKey(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

/** Pure: which channel a thread belongs to. */
export function channelOfThread(thread) {
  const st = thread?.state && typeof thread.state === 'object' ? thread.state : {};
  if (st.channel) return String(st.channel);
  if (st.crm_ask) return 'crm';
  if (st.task_id) return 'team';
  // The one-on-one chats with Jot, Vox and Cam become the history of #team.
  const agent = st.agent ? normalizeAgent(st.agent) : 'auto';
  return agent === 'auto' ? 'general' : 'team';
}

function shape(row) {
  return {
    key: row.key,
    name: row.name,
    kind: row.kind,
    lead: normalizeAgent(row.lead),
    lead_name: AGENTS[normalizeAgent(row.lead)]?.name || 'Ada',
    purpose: row.purpose || '',
    sort: row.sort,
  };
}

/** The channels, made the first time they are asked for. */
export async function ensureChannels(owner) {
  const email = String(owner || '').toLowerCase();
  const { data, error } = await supabaseAdmin.from('ao_channels').select('*').eq('owner_email', email);
  if (error) throw new Error(error.message);
  const have = new Set((data || []).map((r) => r.key));
  const missing = [
    ...STANDING_CHANNELS.map((c, i) => ({ ...c, kind: 'standing', sort: i * 10 })),
    ...FIRST_PROJECTS.map((c, i) => ({ ...c, kind: 'project', sort: 200 + i * 10 })),
  ].filter((c) => !have.has(c.key));
  if (!missing.length) return data || [];
  // First projects are seeded once. A project Bart later archives stays archived.
  const { data: added, error: addErr } = await supabaseAdmin
    .from('ao_channels')
    .upsert(missing.map((c) => ({ owner_email: email, key: c.key, name: c.name, kind: c.kind, lead: c.lead, purpose: c.purpose, sort: c.sort })), { onConflict: 'owner_email,key', ignoreDuplicates: true })
    .select('*');
  if (addErr) throw new Error(addErr.message);
  return [...(data || []), ...(added || [])];
}

/** Every channel, standing first, then projects, newest work first within each. */
export async function listChannels(owner) {
  const rows = (await ensureChannels(owner)).filter((r) => !r.archived);
  const channels = rows.map(shape).sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name));
  return {
    ok: true,
    standing: channels.filter((c) => c.kind === 'standing'),
    projects: channels.filter((c) => c.kind === 'project'),
  };
}

export async function getChannel(owner, key) {
  const rows = await ensureChannels(owner);
  const row = rows.find((r) => r.key === key && !r.archived);
  return row ? shape(row) : null;
}

/** A new project channel. */
export async function createChannel(owner, { name, lead = 'auto', purpose = '' } = {}) {
  const email = String(owner || '').toLowerCase();
  const clean = String(name || '').trim().slice(0, 60);
  const key = channelKey(clean);
  if (!key) return { ok: false, error: 'A channel needs a name' };
  if (STANDING_KEYS.has(key)) return { ok: false, error: `#${key} already exists` };
  const rows = await ensureChannels(email);
  const existing = rows.find((r) => r.key === key);
  if (existing && !existing.archived) return { ok: true, channel: shape(existing), existed: true };
  const row = { owner_email: email, key, name: clean, kind: 'project', lead: normalizeAgent(lead), purpose: String(purpose || '').slice(0, 300), sort: 300, archived: false, updated_at: new Date().toISOString() };
  const { data, error } = await supabaseAdmin.from('ao_channels').upsert(row, { onConflict: 'owner_email,key' }).select('*').single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, channel: shape(data) };
}

/** Set a project aside. Standing channels stay. Its threads keep their history. */
export async function archiveChannel(owner, key) {
  if (STANDING_KEYS.has(key)) return { ok: false, error: 'Standing channels stay.' };
  const { error } = await supabaseAdmin
    .from('ao_channels')
    .update({ archived: true, updated_at: new Date().toISOString() })
    .eq('owner_email', String(owner || '').toLowerCase())
    .eq('key', key);
  return error ? { ok: false, error: error.message } : { ok: true };
}

/** Move a thread to another channel. */
export async function moveThread(owner, threadId, key) {
  const email = String(owner || '').toLowerCase();
  const channel = await getChannel(email, key);
  if (!channel) return { ok: false, error: 'No such channel' };
  const { data: thread, error } = await supabaseAdmin
    .from('ao_auto_threads')
    .select('id, state')
    .eq('id', threadId)
    .eq('created_by_email', email)
    .maybeSingle();
  if (error || !thread) return { ok: false, error: 'No such thread' };
  // The channel's lead answers from here on; the whole team stays in.
  const state = { ...(thread.state && typeof thread.state === 'object' ? thread.state : {}), channel: key, agent: channel.lead };
  const { error: upErr } = await supabaseAdmin.from('ao_auto_threads').update({ state }).eq('id', threadId);
  return upErr ? { ok: false, error: upErr.message } : { ok: true, channel };
}
