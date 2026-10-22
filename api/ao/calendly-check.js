/**
 * AO Automation — Calendly diagnostic
 * GET /api/ao/calendly-check
 *
 * Bart, 2026-10-22: conversations only Tue/Thu 10-12 and 2-4, Wed 10-11:30 or
 * 3-5 (one Wednesday window, never both), never Mon/Fri, 4-6 a week, so the
 * rest of the week stays for building and writing. Before changing anything in
 * Calendly this reports what is there now: the plan (webhooks need a paid
 * one), the booking types, the availability schedules and any webhooks.
 *
 * SAFETY: owner session only. Never returns the token. Reads only; changes
 * nothing in Calendly.
 */

import { requireAoSession } from '../../lib/ao/requireAoSession.js';

const API = 'https://api.calendly.com';

async function calendly(path, token) {
  const res = await fetch(path.startsWith('http') ? path : `${API}${path}`, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });
  const text = await res.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text.slice(0, 300) };
  }
  return { status: res.status, ok: res.ok, body };
}

export default async function handler(req, res) {
  const auth = requireAoSession(req, res);
  if (!auth) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const token = String(process.env.CALENDLY_API_TOKEN || '').trim();
  if (!token) {
    return res.status(200).json({ ok: false, configured: false, error: 'CALENDLY_API_TOKEN is not set' });
  }

  try {
    const me = await calendly('/users/me', token);
    if (!me.ok) {
      return res.status(200).json({ ok: false, configured: true, step: 'users/me', status: me.status, error: me.body });
    }
    const user = me.body.resource;
    const orgUri = user.current_organization;

    const [org, types, schedules, hooksUser, hooksOrg] = await Promise.all([
      calendly(orgUri, token),
      calendly(`/event_types?user=${encodeURIComponent(user.uri)}&count=100`, token),
      calendly(`/user_availability_schedules?user=${encodeURIComponent(user.uri)}`, token),
      calendly(
        `/webhook_subscriptions?organization=${encodeURIComponent(orgUri)}&user=${encodeURIComponent(user.uri)}&scope=user`,
        token
      ),
      calendly(`/webhook_subscriptions?organization=${encodeURIComponent(orgUri)}&scope=organization`, token),
    ]);

    return res.status(200).json({
      ok: true,
      user: {
        name: user.name,
        timezone: user.timezone,
        scheduling_url: user.scheduling_url,
      },
      organization: org.ok ? { plan: org.body.resource?.plan, stage: org.body.resource?.stage } : { status: org.status, error: org.body },
      event_types: types.ok
        ? (types.body.collection || []).map((t) => ({
            name: t.name,
            active: t.active,
            duration: t.duration,
            kind: t.kind,
            secret: t.secret,
            scheduling_url: t.scheduling_url,
            uri: t.uri,
            updated_at: t.updated_at,
          }))
        : { status: types.status, error: types.body },
      availability_schedules: schedules.ok
        ? (schedules.body.collection || []).map((s) => ({
            name: s.name,
            default: s.default,
            timezone: s.timezone,
            uri: s.uri,
            rules: (s.rules || []).filter((r) => r.type === 'wday'),
            date_overrides: (s.rules || []).filter((r) => r.type === 'date').length,
          }))
        : { status: schedules.status, error: schedules.body },
      webhooks: {
        user: hooksUser.ok ? (hooksUser.body.collection || []).map((h) => ({ url: h.callback_url, events: h.events, state: h.state })) : { status: hooksUser.status, error: hooksUser.body },
        organization: hooksOrg.ok ? (hooksOrg.body.collection || []).map((h) => ({ url: h.callback_url, events: h.events, state: h.state })) : { status: hooksOrg.status, error: hooksOrg.body },
      },
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err?.message || 'Calendly check failed' });
  }
}
