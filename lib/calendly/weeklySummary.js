/**
 * The Monday one-page summary of Bart's clients, by email.
 *
 * From the CRM list Bart asked to have built (2026-10-24): "a weekly one-page
 * summary". The same picture as the Clients home in Auto, in one email: what
 * is waiting on him, who he talks to this week, suggested next moves, dates
 * coming up, and his numbers. Test people are left out. Nothing goes out when
 * there is nobody real to report on.
 */

import { homeView } from './people.js';
import { summaryHtml } from './emailLayout.js';
import { sendToBart } from './followups.js';

const SITE = process.env.SITE_BASE_URL || 'https://www.archetypeoriginal.com';
const TZ = 'America/Chicago';

function when(iso) {
  return new Date(iso).toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit', timeZone: TZ });
}

/** Pure: the email from the home view, or null when there is nothing real to say. */
export function buildWeeklySummary(home, now = Date.now()) {
  const real = (xs) => (xs || []).filter((x) => !x.test);
  const people = real(home.people);
  if (!people.length) return null;
  const m = home.metrics || {};

  const sections = [
    {
      heading: 'Waiting on you',
      lines: real(home.needs).map((n) => `${n.name}: ${n.items.map((i) => i.label).join('; ')}.`),
    },
    {
      heading: 'Conversations this week',
      lines: real(home.this_week).map((c) => `${when(c.at)}: ${c.name}${c.prep_done ? '' : ' (has not filled out Before we talk)'}.`),
    },
    {
      heading: 'Suggested next moves',
      lines: real(home.next_moves).flatMap((p) => p.moves.map((mv) => `${mv.label}. ${mv.why}`)),
    },
    {
      heading: 'Private Archy this week',
      lines: people
        .filter((p) => p.archy_week || p.archy_waiting)
        .map((p) => `${p.name}: ${p.archy_week || 0} question${p.archy_week === 1 ? '' : 's'}${p.archy_waiting ? `, ${p.archy_waiting} waiting on you` : ''}.`),
    },
    {
      heading: 'Dates coming up',
      lines: real(home.coming_up).map((d) => `${d.name}: ${d.label}, ${d.days_away === 0 ? 'today' : `in ${d.days_away} day${d.days_away === 1 ? '' : 's'}`}.`),
    },
    {
      heading: 'Your numbers',
      lines: [
        `Active clients: ${m.active_clients ?? 0}. Conversations this month: ${m.sessions_this_month ?? 0}.`,
        m.conversion_rate != null ? `First conversations that became a season or ongoing: ${m.conversion_rate}% of ${m.first_conversations}.` : null,
        m.average_health != null ? `Average health: ${m.average_health}.` : null,
        m.follow_through_rate != null ? `Follow-through on what clients committed to: ${m.follow_through_rate}%.` : null,
        m.gone_quiet ? `Gone quiet: ${m.gone_quiet}.` : null,
      ],
    },
  ];
  const waiting = real(home.needs).length;
  const week = real(home.this_week).length;
  const intro = `${waiting ? `${waiting} ${waiting === 1 ? 'person needs' : 'people need'} something from you` : 'Nothing is waiting on you'}, and ${week || 'no'} conversation${week === 1 ? '' : 's'} this week.`;
  const date = new Date(now).toLocaleDateString('en-US', { month: 'long', day: 'numeric', timeZone: TZ });
  return {
    subject: `Your clients this week (${date})`,
    html: summaryHtml({ title: `Your clients, week of ${date}`, intro, sections, cta: { label: 'Open Clients in Auto', url: `${SITE}/ao/clients` } }),
  };
}

export async function sendWeeklySummary(now = Date.now()) {
  const email = buildWeeklySummary(await homeView(now), now);
  if (!email) return { ok: true, skipped: 'no real clients yet' };
  return sendToBart(email);
}
