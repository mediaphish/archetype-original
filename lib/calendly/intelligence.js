/**
 * The judgment layer of Auto > Clients: tiers, gone-quiet, the health meter,
 * and Bart's own numbers.
 *
 * Bart, 2026-10-24:
 *   "if I have a client that has gone dark, say 3 weeks of silence, no
 *    interactivity tracked with Archy, etc. I want to know about it ... I
 *    don't want to be able to miss it."
 *   "Do we build in a health meter and how would we assess a score?"
 *   "This system is not just about my client's success, it's about mine ...
 *    I need real metrics in a dashboard I can use to be a genuine help."
 *
 * Everything here is pure: it reads a "person" (lib/calendly/people.js) and
 * returns a judgment with its reasons, so every number on screen can say why.
 */

const DAY = 24 * 60 * 60 * 1000;

/** Tiers and what they mean for how closely Bart stays in touch. */
export const TIERS = [
  { key: 'rising', label: 'Rising leader', quietDays: 30 },
  { key: 'season', label: 'A season', quietDays: 21, monthly: 1500 },
  { key: 'ongoing', label: 'Ongoing', quietDays: 14, monthly: 3000 },
];
const TIER_BY_KEY = Object.fromEntries(TIERS.map((t) => [t.key, t]));
export const DEFAULT_QUIET_DAYS = 21;

/** Stages where silence matters. Booked people have a date; Not now chose to pause. */
const ACTIVE_STAGES = new Set(['contact', 'met', 'season', 'ongoing']);

export function tierOf(person) {
  const fromRecord = person?.record?.tier;
  if (TIER_BY_KEY[fromRecord]) return fromRecord;
  // A stage of season or ongoing implies the tier until Bart says otherwise.
  if (person?.stage === 'season' || person?.stage === 'ongoing') return person.stage;
  return null;
}

export function quietDaysFor(person) {
  return TIER_BY_KEY[tierOf(person)]?.quietDays || DEFAULT_QUIET_DAYS;
}

/** Event kinds that count as real contact, either direction. */
const CONTACT_KINDS = new Set([
  'podcast_intake',
  'podcast_recorded',
  'prep_submitted',
  'prep_updated',
  'transcript_added',
  'thank_you_sent',
  'reinvite_sent',
  'checkin_sent',
  'reply',
  'email_out',
  'archy_message',
  'note',
]);

/** The last time Bart and this person were actually in touch. */
export function lastContactAt(person, now = Date.now()) {
  let best = 0;
  for (const s of person?.sessions || []) {
    const t = Date.parse(s.answers?.scheduled_for || '');
    if (!s.answers?.cancelled_at && Number.isFinite(t) && t <= now) best = Math.max(best, t);
  }
  for (const e of person?.events || []) {
    if (!CONTACT_KINDS.has(e.kind)) continue;
    const t = Date.parse(e.at || '');
    if (Number.isFinite(t)) best = Math.max(best, t);
  }
  return best || null;
}

export function nextConversationAt(person, now = Date.now()) {
  let next = null;
  for (const s of person?.sessions || []) {
    const t = Date.parse(s.answers?.scheduled_for || '');
    if (!s.answers?.cancelled_at && Number.isFinite(t) && t > now && (next === null || t < next)) next = t;
  }
  return next;
}

/** Gone quiet: an active client, nothing booked, and no contact for longer than their tier allows. */
export function quietness(person, now = Date.now()) {
  if (!ACTIVE_STAGES.has(person?.stage)) return null;
  if (nextConversationAt(person, now)) return null;
  const last = lastContactAt(person, now);
  if (!last) return null;
  const days = Math.floor((now - last) / DAY);
  const limit = quietDaysFor(person);
  return days >= limit ? { days, limit, since: new Date(last).toISOString() } : null;
}

/**
 * Health, 0 to 100, from four parts, each with its reason. Version 1: rough
 * until someone has two or three conversations on record, and it says so.
 *   Engagement     30  recent contact, measured against their tier
 *   Follow-through 30  did they do what they said (read from the next conversation)
 *   Momentum       25  getting better, holding, or slipping across conversations
 *   Connection     15  filled out the form, open to check-ins, responding
 */
export function computeHealth(person, now = Date.now()) {
  const reasons = [];
  const parts = {};
  const limit = quietDaysFor(person);
  const last = lastContactAt(person, now);
  const days = last ? Math.floor((now - last) / DAY) : null;
  const upcoming = nextConversationAt(person, now);

  if (upcoming) {
    parts.engagement = 30;
    reasons.push('A conversation is on the calendar.');
  } else if (days === null) {
    parts.engagement = 15;
    reasons.push('No contact on record yet.');
  } else if (days <= limit / 2) {
    parts.engagement = 30;
    reasons.push(`In touch ${days} day${days === 1 ? '' : 's'} ago.`);
  } else if (days <= limit) {
    parts.engagement = 20;
    reasons.push(`${days} days since contact; quiet line for their tier is ${limit}.`);
  } else if (days <= limit * 2) {
    parts.engagement = 8;
    reasons.push(`Quiet for ${days} days, past the ${limit}-day line.`);
  } else {
    parts.engagement = 0;
    reasons.push(`Quiet for ${days} days.`);
  }

  const ft = person?.thread?.follow_through;
  const items = Array.isArray(ft?.items) ? ft.items.filter((x) => x.status && x.status !== 'unknown') : [];
  if (items.length) {
    const score = items.reduce((n, x) => n + (x.status === 'done' ? 1 : x.status === 'partly' ? 0.5 : 0), 0) / items.length;
    parts.follow_through = Math.round(score * 30);
    const done = items.filter((x) => x.status === 'done').length;
    reasons.push(`Did ${done} of ${items.length} things they committed to${ft.assessment ? `: ${ft.assessment}` : '.'}`);
  } else {
    parts.follow_through = 15;
    reasons.push('Follow-through shows up after the second conversation.');
  }

  const m = person?.thread?.momentum?.direction;
  parts.momentum = m === 'improving' ? 25 : m === 'steady' ? 16 : m === 'slipping' ? 5 : 12;
  reasons.push(
    m && m !== 'unknown'
      ? `Momentum ${m}${person.thread.momentum.reason ? `: ${person.thread.momentum.reason}` : '.'}`
      : 'Momentum needs a conversation or two on record.'
  );

  const rec = person?.record || {};
  let c = 0;
  if (rec.prep?.submitted_at) c += 5;
  if (rec.consent?.checkins?.answer === 'yes') c += 3;
  if ((person?.events || []).some((e) => e.kind === 'reply' || e.kind === 'archy_message')) c += 7;
  else c += 3; // Replies and Archy use are not tracked yet, so neither counts against them.
  parts.connection = Math.min(15, c);
  reasons.push(
    [
      rec.prep?.submitted_at ? 'Filled out Before we talk' : 'Has not filled out Before we talk',
      rec.consent?.checkins?.answer === 'yes' ? 'open to check-ins' : rec.consent?.checkins?.answer === 'no' ? 'said no to check-ins' : 'check-ins not answered',
    ].join(', ') + '. Replies and Archy use are not tracked yet.'
  );

  const computed = parts.engagement + parts.follow_through + parts.momentum + parts.connection;
  const override = rec.health?.override;
  const score = override && Number.isFinite(override.score) ? override.score : computed;
  const sessionsOnRecord = (person?.sessions || []).filter((s) => s.answers?.transcript_at).length;
  return {
    score,
    computed,
    band: score >= 75 ? 'strong' : score >= 50 ? 'steady' : 'needs_attention',
    parts,
    reasons,
    override: override || null,
    early: sessionsOnRecord < 2,
  };
}

/** Upcoming birthdays, anniversaries and other dated details, within `withinDays`. */
export function upcomingDates(person, now = Date.now(), withinDays = 14) {
  const out = [];
  const today = new Date(now);
  for (const d of person?.record?.details || []) {
    if (d.status === 'suggested' || !d.date) continue;
    const m = /^(\d{4}-)?(\d{2})-(\d{2})$/.exec(String(d.date));
    if (!m) continue;
    const month = Number(m[2]) - 1;
    const day = Number(m[3]);
    let next = Date.UTC(today.getUTCFullYear(), month, day);
    if (next < Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())) {
      next = Date.UTC(today.getUTCFullYear() + 1, month, day);
    }
    const daysAway = Math.round((next - Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())) / DAY);
    if (daysAway <= withinDays) out.push({ ...d, days_away: daysAway, on: new Date(next).toISOString().slice(0, 10) });
  }
  return out.sort((a, b) => a.days_away - b.days_away);
}

/** Bart's numbers across everyone. */
export function metrics(people, now = Date.now()) {
  const monthStart = new Date(now);
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const real = people.filter((p) => !p.test);
  const byStage = {};
  for (const p of real) byStage[p.stage] = (byStage[p.stage] || 0) + 1;

  const hadFirst = real.filter((p) => (p.sessions || []).some((s) => !s.answers?.cancelled_at && Date.parse(s.answers?.scheduled_for || '') <= now));
  const converted = hadFirst.filter((p) => p.stage === 'season' || p.stage === 'ongoing');

  let sessionsThisMonth = 0;
  const followupHours = [];
  for (const p of real) {
    for (const s of p.sessions || []) {
      const a = s.answers || {};
      const t = Date.parse(a.scheduled_for || '');
      if (!a.cancelled_at && t >= monthStart.getTime() && t <= now) sessionsThisMonth += 1;
      const sent = Date.parse(a.thank_you_sent_at || '');
      if (Number.isFinite(t) && Number.isFinite(sent) && sent > t) followupHours.push((sent - t) / 3600000);
    }
  }
  const ftItems = real.flatMap((p) => (p.thread?.follow_through?.items || []).filter((x) => x.status && x.status !== 'unknown'));
  const followThrough = ftItems.length
    ? Math.round((ftItems.reduce((n, x) => n + (x.status === 'done' ? 1 : x.status === 'partly' ? 0.5 : 0), 0) / ftItems.length) * 100)
    : null;
  const activeHealth = real.filter((p) => ['met', 'season', 'ongoing'].includes(p.stage)).map((p) => p.health?.score).filter(Number.isFinite);
  const monthly = real.reduce((n, p) => n + (p.stage === 'season' ? 1500 : p.stage === 'ongoing' ? 3000 : 0), 0);
  const median = (xs) => {
    if (!xs.length) return null;
    const s = [...xs].sort((a, b) => a - b);
    return s[Math.floor(s.length / 2)];
  };
  return {
    by_stage: byStage,
    active_clients: (byStage.season || 0) + (byStage.ongoing || 0),
    first_conversations: hadFirst.length,
    conversion_rate: hadFirst.length ? Math.round((converted.length / hadFirst.length) * 100) : null,
    average_health: activeHealth.length ? Math.round(activeHealth.reduce((a, b) => a + b, 0) / activeHealth.length) : null,
    follow_through_rate: followThrough,
    sessions_this_month: sessionsThisMonth,
    monthly_income: monthly,
    followup_hours_median: followupHours.length ? Math.round(median(followupHours)) : null,
    gone_quiet: real.filter((p) => p.quiet).length,
  };
}

/**
 * Next moves for one person: what Bart might do, each with its reason.
 *
 * From the CRM list Bart asked to have built (2026-10-24): "Auto suggests next
 * moves from the pipeline ... Auto suggests; Bart decides." Nothing here acts.
 * Drawn only from what is on record: the conversations, the thread, dates he
 * confirmed. At most three, most pressing first.
 */
export function nextMoves(person, now = Date.now()) {
  const first = String(person?.name || '').trim().split(/\s+/)[0] || 'them';
  const moves = [];
  const latest = (person?.sessions || []).find((s) => s.analysis) || null;
  const askNext = person?.thread?.open_questions?.[0] || latest?.analysis?.next_time?.[0] || null;
  const missed = (person?.thread?.follow_through?.items || []).filter((x) => x.status === 'not_done' || x.status === 'partly');
  const nextAt = person?.next_conversation_at || null;

  // A podcast guest or mentor who has not recorded yet: get it on the calendar.
  const pod = person?.record?.flags?.podcast_guest;
  if (pod && !pod.recorded_at && !nextAt) {
    const what = pod.track === 'mentor session' ? 'mentor session' : 'interview';
    const since = pod.submitted_at ? Math.floor((now - Date.parse(pod.submitted_at)) / DAY) : null;
    moves.push({
      kind: 'schedule_podcast',
      label: `Get ${first}'s ${what} recorded`,
      why: `${since != null ? `Signed up ${since} day${since === 1 ? '' : 's'} ago` : 'Signed up'} and nothing is on the calendar yet.`,
    });
  }
  if (person?.quiet) {
    moves.push({
      kind: 'reach_out',
      label: `Reach out to ${first}`,
      why: `Quiet for ${person.quiet.days} days.${askNext ? ` Something to ask: ${askNext}` : ''}`,
    });
  }
  if (nextAt && nextAt - now <= 7 * DAY) {
    const day = new Date(nextAt).toLocaleDateString('en-US', { weekday: 'long', timeZone: 'America/Chicago' });
    if (missed.length) {
      moves.push({ kind: 'prepare', label: `Before ${day}: ask how "${missed[0].item}" went`, why: missed[0].evidence || 'They had not finished it last time.' });
    } else if (askNext) {
      moves.push({ kind: 'prepare', label: `Before ${day}: ask about ${askNext.replace(/[.?]$/, '')}`, why: 'Flagged from your last conversation.' });
    }
  }
  for (const d of person?.upcoming_dates || []) {
    if (d.days_away > 7) continue;
    moves.push({ kind: 'personal', label: `A note for ${first}: ${d.label}`, why: d.days_away === 0 ? 'Today.' : `In ${d.days_away} day${d.days_away === 1 ? '' : 's'} (${d.on}).` });
  }
  if (!person?.quiet && !nextAt && person?.thread?.momentum?.direction === 'slipping') {
    moves.push({ kind: 'check_in', label: `Check in with ${first}`, why: `Momentum is slipping${person.thread.momentum.reason ? `: ${person.thread.momentum.reason}` : '.'}` });
  }
  const lastTalk = (person?.sessions || [])
    .filter((s) => !s.cancelled_at && Date.parse(s.scheduled_for || '') <= now)
    .map((s) => Date.parse(s.scheduled_for))
    .sort((a, b) => b - a)[0];
  if (lastTalk && now - lastTalk <= 21 * DAY && latest?.analysis?.action_items?.bart?.length) {
    moves.push({ kind: 'your_promise', label: `You said you would: ${latest.analysis.action_items.bart[0]}`, why: 'From your last conversation.' });
  }
  if (person?.stage === 'met' && !nextAt && !person?.quiet && lastTalk && now - lastTalk > 7 * DAY) {
    moves.push({ kind: 'keep_going', label: `Ask ${first} whether they want to keep going`, why: `${Math.floor((now - lastTalk) / DAY)} days since your conversation and nothing is booked.` });
  }
  return moves.slice(0, 3);
}
