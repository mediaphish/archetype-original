/**
 * AO Automation — Calendly setup for Bart's conversation hours.
 *
 * GET  /api/ao/calendly-setup           what would be applied (changes nothing)
 * POST /api/ao/calendly-setup {action}  'apply'   write hours + date blocks now
 *                                       'webhook' subscribe the booking listener
 *
 * Owner session only. Never returns the token or the signing key.
 */

import { requireAoSession } from '../../lib/ao/requireAoSession.js';
import {
  calendly,
  calendlyToken,
  currentUser,
  listEventTypes,
  upcomingBookings,
  applyConversationHours,
} from '../../lib/calendly/client.js';
import { buildRules, WEEKLY_CAP } from '../../lib/calendly/conversationHours.js';

const SITE = process.env.SITE_URL || 'https://www.archetypeoriginal.com';
const WEBHOOK_URL = `${SITE}/api/calendly/webhook`;

async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  try {
    return JSON.parse(req.body || '{}');
  } catch {
    return {};
  }
}

export default async function handler(req, res) {
  const auth = requireAoSession(req, res);
  if (!auth) return;
  if (!calendlyToken()) return res.status(200).json({ ok: false, error: 'CALENDLY_API_TOKEN is not set' });

  try {
    if (req.method === 'GET') {
      const user = await currentUser();
      const [types, bookings] = await Promise.all([listEventTypes(user), upcomingBookings(user)]);
      const plan = buildRules(bookings);
      return res.status(200).json({
        ok: true,
        weekly_cap: WEEKLY_CAP,
        upcoming_bookings: bookings.map((b) => ({ name: b.name, start_time: b.start_time })),
        closed_dates: plan.closedDates,
        weekly_rules: plan.rules.filter((r) => r.type === 'wday'),
        event_types: types.map((t) => ({
          name: t.name,
          active: t.active,
          duration: t.duration,
          duration_options: t.duration_options,
          locations: t.locations,
          description: t.description_plain,
          scheduling_url: t.scheduling_url,
          uri: t.uri,
        })),
        webhook_url: WEBHOOK_URL,
        signing_key_set: Boolean(process.env.CALENDLY_WEBHOOK_SIGNING_KEY),
      });
    }

    if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });
    const { action } = await readJson(req);

    if (action === 'apply') {
      return res.status(200).json(await applyConversationHours());
    }

    if (action === 'webhook') {
      const key = process.env.CALENDLY_WEBHOOK_SIGNING_KEY;
      if (!key) return res.status(200).json({ ok: false, error: 'CALENDLY_WEBHOOK_SIGNING_KEY is not set' });
      const user = await currentUser();
      const existing = await calendly(
        `/webhook_subscriptions?organization=${encodeURIComponent(user.current_organization)}&user=${encodeURIComponent(user.uri)}&scope=user`
      );
      const already = (existing.data?.collection || []).find((h) => h.callback_url === WEBHOOK_URL);
      if (already) return res.status(200).json({ ok: true, already: true, state: already.state, events: already.events });
      const r = await calendly('/webhook_subscriptions', {
        method: 'POST',
        body: {
          url: WEBHOOK_URL,
          events: ['invitee.created', 'invitee.canceled'],
          organization: user.current_organization,
          user: user.uri,
          scope: 'user',
          signing_key: key,
        },
      });
      return res.status(200).json({ ok: r.ok, status: r.status, state: r.data?.resource?.state, error: r.ok ? undefined : r.data });
    }

    return res.status(400).json({ ok: false, error: 'Unknown action' });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err?.message || 'Calendly setup failed' });
  }
}
