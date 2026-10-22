/**
 * AO Automation — Calendly setup for Bart's conversation hours.
 *
 * GET  /api/ao/calendly-setup           what would be applied (changes nothing)
 * POST /api/ao/calendly-setup {action}  'apply'   write hours + date blocks now
 *                                       'webhook' subscribe the booking listener
 *                                       'restructure' new model: one booking
 *                                                 type, A conversation with Bart
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

/** The one public booking type for the Work with Bart model (wording shown to Bart 2026-10-22). */
const CONVERSATION = {
  name: 'A conversation with Bart',
  duration: 90,
  active: true,
  description:
    'Up to ninety minutes, on whatever you are carrying. Bring as many topics as you want. The first conversation is free.',
  locations: [{ kind: 'zoom_conference' }, { kind: 'outbound_call' }],
};

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

    if (action === 'restructure') {
      // Bart, 2026-10-22: "None of those schedules are being used at all... start
      // over with something brand new that fits this new model." Calendly's API
      // cannot delete a booking type, so old ones are switched off instead.
      const user = await currentUser();
      const types = await listEventTypes(user);
      const steps = [];
      let conversation = types.find((t) => t.name === CONVERSATION.name);
      if (!conversation) {
        const created = await calendly('/event_types', {
          method: 'POST',
          body: { owner: user.uri, ...CONVERSATION },
        });
        steps.push({ step: 'create', ok: created.ok, status: created.status, error: created.ok ? undefined : created.data });
        conversation = created.data?.resource || null;
      } else {
        const updated = await calendly(`/event_types/${conversation.uri.split('/').pop()}`, {
          method: 'PATCH',
          body: CONVERSATION,
        });
        steps.push({ step: 'update', ok: updated.ok, status: updated.status, error: updated.ok ? undefined : updated.data });
      }
      if (conversation) {
        for (const t of types.filter((x) => x.active && x.uri !== conversation.uri)) {
          const off = await calendly(`/event_types/${t.uri.split('/').pop()}`, { method: 'PATCH', body: { active: false } });
          steps.push({ step: `switch off ${t.name}`, ok: off.ok, status: off.status, error: off.ok ? undefined : off.data });
        }
      }
      const hours = await applyConversationHours();
      return res.status(200).json({
        ok: steps.every((x) => x.ok) && hours.ok,
        steps,
        conversation: conversation ? { name: conversation.name, scheduling_url: conversation.scheduling_url, duration: conversation.duration } : null,
        hours,
      });
    }

    return res.status(400).json({ ok: false, error: 'Unknown action' });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err?.message || 'Calendly setup failed' });
  }
}
