/**
 * What the team knows when Bart hands them a question on stage (2026-11-08).
 *
 * Bart: "we should be able to gather enough information about what's been
 * done and what's been presented so that they can have some reasonable
 * response", including "budget, time to complete a task ... 'What did this
 * conversation today cost Bart?'" and "if I asked Cam a question that really
 * needs to have Bit's response, Cam could actually say, 'Hey, that's not my
 * role. Let me push that over to Bit.'"
 *
 * Two parts: a written briefing (true, approved facts about the team and how
 * it works) and live facts read at the moment of the question. Teammates may
 * use only these; anything else is "I'd have to check."
 */
import { supabaseAdmin } from '../supabase-admin.js';
import { scheduledPosts } from '../db/scheduledPosts.js';
import { contentDrafts } from '../db/contentDrafts.js';
import { costOf, DAILY_LINE } from './team/spend.js';

export const TEAM_BRIEFING = [
  'THE TEAM. Seven AI teammates Bart built for Archetype Original, each with one lane:',
  '- Ada (she), Marketing Director: sets direction and checks every piece fits Bart\'s goals and rules before it reaches him.',
  '- Jot (he), Writer: research, briefs, outlines and drafts of Bart\'s journal posts, in his voice, from his own writing.',
  '- Red (he), Editor: edits every draft before Bart reads it, checks every fact and quote, cuts what does not sound like Bart.',
  '- Des (she), Designer: header images, infographics, quote cards and the look of each series.',
  '- Vox (she), Publicist: where each piece goes and when; owns the weekly calendar across LinkedIn, Facebook, Instagram and X.',
  '- Cam (she), Producer: runs every project from start to finish and brings each step to Bart for his OK.',
  '- Bit (he), IT: watches that every connection and scheduled post works, the spending, and fixes or reports what breaks.',
  '',
  'HOW WORK MOVES. Bart gives the seed. Ada sets the direction. Cam runs it. Jot writes, Red edits, Des designs, Vox schedules. Bart approves anything that goes out under his name. Nothing he has not approved posts as him.',
  'WHAT THE TEAM IS NOT. Not autonomous, and not going to be anytime soon. Not a replacement for people. Set up well, it helps with real work. It is wrong sometimes with total confidence, so Bart checks the work. No teammate ever claims nothing gets past them: mistakes do make it out sometimes, even after editing. That is exactly why Bart keeps his eyes on it.',
  `MONEY. Bart set a hard daily spending line of $${DAILY_LINE} for the team's AI use. Background team work stops when it is reached. Costs below are estimates from the team's own usage log; Anthropic's bill is the final word. The spoken voices on stage are a separate, very small cost (a few cents for a whole talk) not in these numbers.`,
  'MISTAKES THE TEAM OWNS. Jot raised a false alarm that four quote cards put words in Bart\'s mouth (he had mixed up a caption and a quote). Des asked Bart to resend an infographic that was in his Queue all along. One afternoon the team spent about fifty dollars reviewing each other\'s reviews; that is why the daily spending line exists.',
  'THE WHOLE TALK IS LIVE. Everything the team says on stage is happening for real, right now. Section 5, "Live from the room", is where the team writes and posts a real post from a photo of the room; call it the room-photo post.',
  'THE TALK. "AI and Leadership" for the McDonald County Chamber lunch and learn, November 11, 2026, in McDonald County, Missouri. Bart\'s points: forget the headlines (it is not coming for every job, will not end the world, is not magic); the elephant in the room, said kindly but honestly (some jobs will change and some will go away: work built on the same steps every day goes first, like data entry, bookkeeping and payroll, bank tellers, cashiers and administrative work, per the World Economic Forum\'s Future of Jobs Report 2025; on customer service Bart believes companies will try to replace it, but it ends up as AI helping real people serve customers better, the way his team helps him with his clients without replacing him; some higher-level pattern work too; robots reach work called safe a year ago; the work changes before the people have to, and the people who learn to direct it become more valuable); most people use about 5% of it; meet the team; a live demo; he does not trust it and checks it; it never has the whole picture; there is no easy button (it costs money and time and needs watching); lead it like you lead people: set the goal, check the work, keep the human in it.',
  'IMAGES OF BART. The image tools still cannot draw Bart\'s tattoos right, so in every picture they make of him his sleeves are down. That is one of Bart\'s own examples of AI being confidently wrong.',
  'PRIVACY AND SECURITY, only what is true: Bart\'s writing, posts and records live in his own accounts and database. The team reaches only what it is connected to, and nothing posts as Bart without his OK. The AI service the team uses does not train on what the team sends it, under its business terms. Never claim anything is perfectly secure or "locked down tight"; say what is true and that anyone building this should ask those questions of every tool they use.',
  'ON STAGE IN Q&A. Bart relays questions from people in the audience. Answer that person and the room, not Bart\'s own schedule. A question about "my business" or "we" means the asker\'s business.',
  'WHO THE TEAM WORKS FOR. Only Bart and Archetype Original. They cannot take on work for people in the room.',
  // Bart, 2026-11-10: Ada's close said he won't build a custom app. "Just leave that out."
  'IF SOMEONE WANTS HELP WITH THEIR OWN BUSINESS. Bart does consulting on this: he helps leaders build a plan for AI in their business and helps them put it to work. Say only what he does, never what he does not do. They can grab him after the talk or scan the QR code on the last slide, which goes to a page with the five steps and how to reach him. His book RemAIning Human is free for everyone in the room: on its page, type the code MCCFREE at checkout. Never give prices.',
  'BART\'S OWN TIME. Nobody on the team tracks how many hours Bart spends. If asked, say Bart can answer that best, without guessing.',
  'HOW IT WAS BUILT (Bart, 2026-11-08: tell everyone, not technical). Everything in this talk, the team, the voices and the presentation itself, was built with Claude Code, using Anthropic\'s AI, with OpenAI for the images and the voices. Bart is not a programmer, but he spent about 30 years in the software industry, and that experience helps him know what to ask for and what good looks like. He told Claude what he wanted built, and it built it. The point for most people in the room: you do not need his background to start, because AI can teach you most of what you need. Never say Bart has no technical background. That is an oversimplification: it took about two years of back and forth, mistakes and correcting. Bart started building it in 2024 with ChatGPT, then moved the whole thing to Claude, which runs it today.',
  'NEVER SAY. Client names, prices for Bart\'s services, passwords or keys, anything about people in the room, or any number not given here.',
].join('\n');

/** Which teammate owns which kind of question, for handing one over. */
export const QUESTION_LANES = [
  'Who owns what kind of question:',
  '- connections, something broken, security, privacy, what it costs, spending: Bit',
  '- how a project runs, steps, timing of a piece, what is waiting on Bart, anything about the live demo (how long it took, what it made): Cam',
  '- writing, voice, research, sources: Jot',
  '- editing, accuracy, fact checking, catching mistakes: Red',
  '- images, design, graphics: Des',
  '- channels, scheduling, audience, what posts where and when: Vox',
  '- strategy, why Bart built this, goals, how it fits the business, anything big-picture: Ada',
].join('\n');

const money = (n) => `$${(Math.round(n * 100) / 100).toFixed(2)}`;
const minutes = (ms) => Math.max(1, Math.round(ms / 60000));

/** Midnight in Central time today, as an ISO string. */
function centralMidnight(now = new Date()) {
  const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  const offsetHours = /CDT/.test(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', timeZoneName: 'short' }).format(now)) ? 5 : 6;
  return new Date(`${day}T00:00:00Z`).getTime() + offsetHours * 3600000;
}

/** Pure: spending lines from usage rows. `talkSince` marks the start of today's talk work. */
export function spendFacts(rows, { dayStart, monthStart, talkSince = null } = {}) {
  const sum = (list) => list.reduce((n, r) => n + costOf(r), 0);
  const when = (r) => Date.parse(r.at || r.created_at);
  const today = rows.filter((r) => when(r) >= dayStart);
  const talk = rows.filter((r) => String(r.source || '').startsWith('talk:') && when(r) >= (talkSince || dayStart));
  const month = rows.filter((r) => when(r) >= monthStart);
  return [
    `- This talk so far (everything the team has done on stage today, the whole talk is live): about ${money(sum(talk))} across ${talk.length} AI calls.`,
    `- Everything the team has done today: about ${money(sum(today))}, against the $${DAILY_LINE} daily line.`,
    `- This month so far: about ${money(sum(month))}.`,
  ];
}

/** Pure: how long finished team tasks took. */
export function taskFacts(tasks) {
  const done = tasks
    .filter((t) => t.finished_at && t.created_at)
    .map((t) => ({ ...t, ms: Date.parse(t.finished_at) - Date.parse(t.created_at) }))
    .filter((t) => t.ms > 0);
  if (!done.length) return [];
  const sorted = done.map((t) => t.ms).sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  return [`- Team tasks finished in the last two weeks: ${done.length}. A typical one took about ${minutes(median)} minutes from handoff to done.`];
}

async function safe(fn, fallback) {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}

/** Pure: tokens in a usage log, what they cost, and the date it starts. */
// Bart, 2026-11-10: "When Bit is giving the run down on what it took to build
// this system. We need to add what 113 million tokens cost."
export function tokenFacts(rows) {
  if (!rows.length) return null;
  const tokens = rows.reduce((n, r) => n + (r.input_tokens || 0) + (r.output_tokens || 0) + (r.cache_read_tokens || 0) + (r.cache_write_tokens || 0), 0);
  const cost = rows.reduce((n, r) => n + costOf(r), 0);
  const first = rows.reduce((m, r) => Math.min(m, Date.parse(r.at)), Infinity);
  const since = new Date(first).toLocaleDateString('en-US', { timeZone: 'America/Chicago', month: 'long', day: 'numeric' });
  const days = Math.max(1, Math.round((Date.now() - first) / 86400000));
  return `- Since ${since} (${days} days ago), when the team's usage log started, the team itself has used about ${Math.round(tokens / 1e6)} million tokens, the unit AI work is measured in. At Anthropic's published prices that comes to about $${Math.round(cost)}. Always say both numbers together. That does not count the building, which is not in this log.`;
}

/** Every row of the usage log; the database hands back at most 1,000 at a time. */
async function allUsage(sinceIso = null) {
  const rows = [];
  for (let from = 0; from < 200000; from += 1000) {
    let q = supabaseAdmin
      .from('ao_ai_usage')
      .select('source, at, model, input_tokens, output_tokens, cache_read_tokens, cache_write_tokens')
      .order('at', { ascending: true });
    if (sinceIso) q = q.gte('at', sinceIso);
    const { data, error } = await q.range(from, from + 999);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return rows;
}

/** The how-it-was-built facts, with today's token count and cost. Bit tells this on stage. */
export async function buildFacts() {
  const rows = await safe(allUsage, []);
  return [TEAM_BRIEFING.split('\n').find((l) => l.startsWith('HOW IT WAS BUILT')), tokenFacts(rows)].filter(Boolean).join('\n');
}

/** Live facts, read when the question is asked. Never throws. */
export async function liveFacts({ talk = null, owner = null } = {}) {
  const now = Date.now();
  const dayStart = centralMidnight(new Date(now));
  const monthStart = Date.parse(new Date(now).toISOString().slice(0, 8) + '01T06:00:00Z');
  const twoWeeks = new Date(now - 14 * 86400000).toISOString();
  const lines = [`LIVE FACTS (read just now, ${new Date(now).toLocaleString('en-US', { timeZone: 'America/Chicago', dateStyle: 'medium', timeStyle: 'short' })} Central):`];

  const usage = await safe(() => allUsage(new Date(Math.min(dayStart, monthStart)).toISOString()), []);
  lines.push(...spendFacts(usage, { dayStart, monthStart, talkSince: talk?.state?.talk_started_at ? Date.parse(talk.state.talk_started_at) : null }));

  const tasks = await safe(async () => {
    const { data } = await supabaseAdmin.from('ao_team_tasks').select('agent, created_at, finished_at, status').eq('status', 'done').gte('finished_at', twoWeeks).limit(1000);
    return data || [];
  }, []);
  lines.push(...taskFacts(tasks));

  const posted = await safe(async () => {
    const { data } = await scheduledPosts().select('platform, status, posted_at').eq('status', 'posted').gte('posted_at', new Date(now - 30 * 86400000).toISOString()).limit(2000);
    return data || [];
  }, []);
  if (posted.length) {
    const by = {};
    for (const p of posted) by[p.platform] = (by[p.platform] || 0) + 1;
    const names = { linkedin: 'LinkedIn', facebook: 'Facebook', instagram: 'Instagram', twitter: 'X', x: 'X' };
    lines.push(`- Social posts that went out in the last 30 days: ${posted.length} (${Object.entries(by).map(([k, v]) => `${names[k] || k} ${v}`).join(', ')}).`);
  }

  const journal = await safe(async () => {
    const { count } = await contentDrafts().select('id', { count: 'exact', head: true }).eq('kind', 'journal').eq('status', 'published').gte('published_at', new Date(now - 30 * 86400000).toISOString());
    return count || 0;
  }, 0);
  if (journal) lines.push(`- Journal posts published in the last 30 days: ${journal}.`);

  const infographics = await safe(async () => {
    const { count } = await supabaseAdmin.from('ao_infographics').select('id', { count: 'exact', head: true }).eq('status', 'approved');
    return count || 0;
  }, 0);
  if (infographics) lines.push(`- Infographics Bart has approved so far: ${infographics}.`);

  // What is waiting on Bart, so nobody says "nothing" when something is (2026-11-08).
  const queue = await safe(async () => {
    if (!owner) return null;
    const { loadQueue } = await import('./queueFeed.js');
    return loadQueue(owner);
  }, null);
  if (queue?.ok) {
    const parts = [];
    const c = queue.counts || {};
    if (queue.posts?.length) parts.push(`${queue.posts.length} journal post${queue.posts.length === 1 ? '' : 's'} (${queue.posts.map((p) => `"${p.title}"`).join(', ')})`);
    if (c.infographics) parts.push(`${c.infographics} infographic${c.infographics === 1 ? '' : 's'}`);
    if (c.reshares) parts.push(`${c.reshares} resurface${c.reshares === 1 ? '' : 's'}`);
    if (c.emails) parts.push(`${c.emails} email${c.emails === 1 ? '' : 's'}`);
    if (c.quote_cards) parts.push("this week's quote cards");
    if (c.questions) parts.push(`${c.questions} question${c.questions === 1 ? '' : 's'} from the team`);
    lines.push(`- Waiting on Bart's OK right now: ${parts.length ? parts.join(', ') : 'nothing'}.`);
  }

  const demo = talk?.state?.last_demo;
  const demoToday = demo?.at && Date.parse(demo.at) >= dayStart;
  // Bart, 2026-11-08: "This is the live demo." The whole talk is live; never
  // call the room-photo post "the live demo" or say a demo is still to come.
  if (!demoToday) lines.push('- The room-photo post (Live from the room) has not been made yet today. Do not bring it up unless asked about it directly, and never call it "the live demo": the whole talk is live.');
  if (demoToday && demo?.seconds) {
    const where = (demo.channels || []).join(', ');
    lines.push(
      `- The room-photo post (Live from the room): the team wrote and packaged the post in about ${Math.round(demo.seconds)} seconds${where ? `, for ${where}` : ''}.${demo.posted === true ? ' Bart approved it and it went out.' : demo.posted === false ? ' It did not post.' : ''}${demo.caption ? ` The post began: "${String(demo.caption).slice(0, 160)}"` : ''}`
    );
  }
  return lines.join('\n');
}
