/**
 * A client's private Archy (/archy/you), server side. See lib/calendly/privateArchy.js.
 *
 * GET  ?e=<email>&s=<signature>            their conversation so far
 * POST same query, JSON body { message }   ask Archy
 *
 * The link is signed per person, so only the person Bart sent it to can open
 * it. When Archy hands a question to Bart, Bart is told by email.
 */

import { openArchy, history, askArchy, answerWindowLabel } from '../../lib/calendly/privateArchy.js';
import { tierOf } from '../../lib/calendly/intelligence.js';
import { sendToBart } from '../../lib/calendly/followups.js';
import { noticeHtml } from '../../lib/calendly/emailLayout.js';

const SITE = process.env.SITE_BASE_URL || 'https://www.archetypeoriginal.com';

async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  try {
    return JSON.parse(req.body || '{}');
  } catch {
    return {};
  }
}

const visible = (rows) =>
  rows.map((m) => ({ id: m.id, role: m.role, content: m.content, at: m.at, handed_to_bart: Boolean(m.handoff_reason), answer_by: m.answer_by || null }));

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex');
  const access = await openArchy(req.query?.e, req.query?.s);
  if (!access.ok) return res.status(access.status).json({ ok: false, error: access.error || 'This link does not work. Ask Bart for a new one.' });
  const { email, record } = access;
  const tier = tierOf({ record, stage: record.stage });
  const first = String(record.name || '').trim().split(/\s+/)[0] || '';

  try {
    if (req.method === 'GET') {
      return res.status(200).json({ ok: true, first, answer_window: answerWindowLabel(tier), messages: visible(await history(email)) });
    }
    if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });
    const body = await readJson(req);
    const r = await askArchy(email, body.message, { record });
    if (!r.ok) return res.status(r.error === 'empty' ? 400 : 502).json({ ok: false, error: r.error });
    if (r.handoff) {
      const by = new Date(r.answer_by).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', timeZone: 'America/Chicago' });
      await sendToBart({
        subject: `Archy handed you a question from ${r.name}`,
        html: noticeHtml({
          title: `${r.name} needs you`,
          lines: [r.handoff, `They were told you answer ${answerWindowLabel(tier)}: by ${by}.`],
          cta: { label: 'Answer in Auto', url: `${SITE}/ao/clients?c=${encodeURIComponent(email)}` },
        }),
      });
    }
    return res.status(200).json({ ok: true, messages: visible(await history(email)) });
  } catch (err) {
    console.error('[client archy] failed:', err?.message || err);
    return res.status(500).json({ ok: false, error: 'Something went wrong. Try again in a minute.' });
  }
}
