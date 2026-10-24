/**
 * The Before we talk form (/before-we-talk), server side.
 *
 * GET  ?b=<booking id>&s=<signature>   who it is for, and anything they already said
 * POST same query, JSON body            save their answers and permissions
 *
 * The link is signed per booking (lib/calendly/clientRecords.js), so only the
 * person it was emailed to can open it. The same link is the "change what you
 * are comfortable with" link at the foot of every email from Bart.
 */

import { getBooking } from '../../lib/calendly/followups.js';
import {
  verifyPrep,
  getClientRecord,
  upsertClientRecord,
  addEvent,
  CONSENT_TEXT,
  normEmail,
} from '../../lib/calendly/clientRecords.js';
import { whenText, sendToBart, escapeHtml } from '../../lib/calendly/followups.js';

const clip = (v, n = 2000) => String(v ?? '').trim().slice(0, n);
const yesNo = (v) => (v === 'yes' || v === 'no' ? v : null);

async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  try {
    return JSON.parse(req.body || '{}');
  } catch {
    return {};
  }
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const id = String(req.query?.b || '');
  const sig = String(req.query?.s || '');
  if (!verifyPrep(id, sig)) return res.status(403).json({ ok: false, error: 'This link is not valid.' });

  let booking;
  try {
    booking = await getBooking(id);
  } catch (err) {
    return res.status(500).json({ ok: false, error: 'Something went wrong. Please try again.' });
  }
  if (!booking) return res.status(404).json({ ok: false, error: 'We could not find that booking.' });

  const email = normEmail(booking.email);
  const record = await getClientRecord(email).catch(() => null);
  const prep = record?.prep || {};

  if (req.method === 'GET') {
    return res.status(200).json({
      ok: true,
      name: record?.name || booking.name,
      email,
      when: booking.answers?.scheduled_for ? whenText(booking.answers.scheduled_for) : null,
      consent_text: CONSENT_TEXT,
      saved: {
        phone: record?.phone || booking.phone || '',
        texts_ok: Boolean(prep.texts_ok),
        company: prep.company || '',
        role: prep.role || booking.role || '',
        website: prep.website || '',
        linkedin: prep.linkedin || '',
        worth_it: prep.worth_it || '',
        how_you_work: prep.how_you_work || '',
        anything_else: prep.anything_else || '',
        podcast: record?.podcast_interest || '',
        consent: Object.fromEntries(Object.keys(CONSENT_TEXT).map((k) => [k, record?.consent?.[k]?.answer || ''])),
      },
      submitted_at: prep.submitted_at || null,
    });
  }

  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  const body = await readJson(req);
  if (body.website_trap) return res.status(200).json({ ok: true });
  const now = new Date().toISOString();
  const consent = { ...(record?.consent || {}) };
  for (const key of Object.keys(CONSENT_TEXT)) {
    const answer = yesNo(body.consent?.[key]);
    if (!answer) continue;
    // Keep what they agreed to, word for word, with when.
    if (consent[key]?.answer !== answer) consent[key] = { answer, at: now, text: CONSENT_TEXT[key] };
  }
  const podcast = ['yes', 'maybe', 'no'].includes(body.podcast) ? body.podcast : record?.podcast_interest || null;
  const first = !prep.submitted_at;

  try {
    await upsertClientRecord(email, {
      name: clip(body.name, 200) || record?.name || booking.name,
      phone: clip(body.phone, 60) || null,
      consent,
      podcast_interest: podcast,
      prep: {
        ...prep,
        texts_ok: Boolean(body.texts_ok),
        company: clip(body.company, 300),
        role: clip(body.role, 300),
        website: clip(body.website, 500),
        linkedin: clip(body.linkedin, 500),
        worth_it: clip(body.worth_it),
        how_you_work: clip(body.how_you_work),
        anything_else: clip(body.anything_else),
        submitted_at: prep.submitted_at || now,
        updated_at: now,
      },
      ...(record ? {} : { created_at: now }),
    });
    await addEvent({
      email,
      inquiryId: id,
      kind: first ? 'prep_submitted' : 'prep_updated',
      meta: { consent: Object.fromEntries(Object.entries(consent).map(([k, v]) => [k, v.answer])), podcast },
    });
    if (first || podcast === 'yes') {
      const name = clip(body.name, 200) || booking.name;
      await sendToBart({
        subject: `${name} filled out Before we talk${podcast === 'yes' ? ', and is open to the podcast' : ''}.`,
        html: `<p style="font-family:Georgia,serif;font-size:16px">${escapeHtml(name)} filled out Before we talk. <a href="${process.env.SITE_URL || 'https://www.archetypeoriginal.com'}/ao/clients">Open in Auto</a></p>`,
      }).catch(() => {});
    }
  } catch (err) {
    console.error('[prep] save failed:', err?.message || err);
    return res.status(500).json({ ok: false, error: 'That did not save. Please try again.' });
  }

  return res.status(200).json({
    ok: true,
    when: booking.answers?.scheduled_for ? whenText(booking.answers.scheduled_for) : null,
  });
}
