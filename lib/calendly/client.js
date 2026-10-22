/**
 * Small Calendly API client, plus the one job everything else calls:
 * applyConversationHours(), which writes Bart's hours and the date blocks
 * from lib/calendly/conversationHours.js onto every active booking type.
 *
 * Every booking type gets the same rules on purpose. A podcast mentorship on a
 * Wednesday uses that Wednesday just as much as a conversation does, and it
 * counts toward the week's limit too.
 */

import { buildRules } from './conversationHours.js';

const API = 'https://api.calendly.com';

export function calendlyToken() {
  return String(process.env.CALENDLY_API_TOKEN || '').trim();
}

export async function calendly(path, { method = 'GET', body, token = calendlyToken() } = {}) {
  const res = await fetch(path.startsWith('http') ? path : `${API}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text.slice(0, 500) };
  }
  return { ok: res.ok, status: res.status, data };
}

export async function currentUser() {
  const me = await calendly('/users/me');
  if (!me.ok) throw new Error(`Calendly users/me ${me.status}: ${JSON.stringify(me.data)}`);
  return me.data.resource;
}

export async function listEventTypes(user) {
  const r = await calendly(`/event_types?user=${encodeURIComponent(user.uri)}&count=100`);
  if (!r.ok) throw new Error(`Calendly event_types ${r.status}: ${JSON.stringify(r.data)}`);
  return r.data.collection || [];
}

/** Every active booking from now on, following pages. */
export async function upcomingBookings(user, now = new Date()) {
  const out = [];
  let url = `/scheduled_events?user=${encodeURIComponent(user.uri)}&status=active&count=100&sort=start_time:asc&min_start_time=${encodeURIComponent(now.toISOString())}`;
  while (url) {
    const r = await calendly(url);
    if (!r.ok) throw new Error(`Calendly scheduled_events ${r.status}: ${JSON.stringify(r.data)}`);
    out.push(...(r.data.collection || []));
    url = r.data.pagination?.next_page || null;
  }
  return out;
}

export async function setEventTypeRules(user, eventTypeUri, { timezone, rules }) {
  return calendly(`/event_type_availability_schedules?event_type=${encodeURIComponent(eventTypeUri)}`, {
    method: 'PATCH',
    body: { user: user.uri, availability_setting: 'host', availability_rule: { timezone, rules } },
  });
}

export async function applyConversationHours(now = new Date()) {
  const user = await currentUser();
  const [types, bookings] = await Promise.all([listEventTypes(user), upcomingBookings(user, now)]);
  const plan = buildRules(bookings, now);
  const results = [];
  for (const t of types.filter((x) => x.active)) {
    const r = await setEventTypeRules(user, t.uri, plan);
    results.push({ name: t.name, ok: r.ok, status: r.status, error: r.ok ? undefined : r.data });
  }
  return {
    ok: results.every((r) => r.ok),
    bookings: bookings.length,
    per_week: plan.perWeek,
    closed_dates: plan.closedDates,
    event_types: results,
  };
}
