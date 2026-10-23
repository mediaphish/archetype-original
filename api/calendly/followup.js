/**
 * The two buttons in Bart's after-call email.
 *
 * GET shows a page: the thank-you in an editable box, or the re-invite, with a
 * Send button. Nothing is sent on GET, because mail apps open links on their
 * own to check them. POST sends. Links are signed per booking and action
 * (lib/calendly/followups.js), so only Bart's email can open them.
 */

import {
  getBooking,
  verifyAction,
  reinviteEmail,
  fallbackThankYou,
  sendToClient,
  markRow,
  escapeHtml,
  firstName,
} from '../../lib/calendly/followups.js';

function page(title, body) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>body{margin:0;background:#f7f5f2;font-family:Georgia,serif;color:#1a1a1a}main{max-width:640px;margin:0 auto;padding:40px 20px}
h1{font-weight:normal;font-size:28px;margin:0 0 12px}p{line-height:1.55}textarea,input{width:100%;box-sizing:border-box;font:16px/1.55 Georgia,serif;padding:14px;border:1px solid #ccc;border-radius:3px;background:#fff}
textarea{min-height:260px}label{display:block;font:13px Arial,sans-serif;color:#666;margin:18px 0 6px}
button{margin-top:18px;padding:14px 24px;background:#DB0812;color:#fff;border:0;border-radius:3px;font:bold 15px Arial,sans-serif;cursor:pointer}
.note{font:14px Arial,sans-serif;color:#666}</style></head><body><main>${body}</main></body></html>`;
}

async function readForm(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  const chunks = [];
  for await (const c of req) chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c));
  return Object.fromEntries(new URLSearchParams(Buffer.concat(chunks).toString('utf8')));
}

export default async function handler(req, res) {
  const q = req.query || {};
  const id = String(q.id || '');
  const action = String(q.action || '');
  const sig = String(q.sig || '');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');

  if (!['thank_you', 'reinvite'].includes(action) || !verifyAction(id, action, sig)) {
    return res.status(403).send(page('Link not valid', '<h1>This link is not valid.</h1><p>Open it from the email again.</p>'));
  }

  let row;
  try {
    row = await getBooking(id);
  } catch (err) {
    return res.status(500).send(page('Something went wrong', `<h1>Something went wrong.</h1><p class="note">${escapeHtml(err.message)}</p>`));
  }
  if (!row) return res.status(404).send(page('Not found', '<h1>That booking is gone.</h1>'));

  const a = row.answers || {};
  const already = a.thank_you_sent_at || a.reinvite_sent_at;
  if (already) {
    const what = a.thank_you_sent_at ? 'thank-you' : 're-invite';
    return res.status(200).send(page('Already sent', `<h1>Already sent.</h1><p>The ${what} to ${escapeHtml(row.name)} went out ${escapeHtml(new Date(already).toLocaleString('en-US', { timeZone: 'America/Chicago' }))}.</p>`));
  }

  const isThanks = action === 'thank_you';
  const defaults = isThanks
    ? { subject: 'Thank you', text: a.thank_you_draft || fallbackThankYou(row) }
    : reinviteEmail(row);

  if (req.method === 'GET') {
    return res.status(200).send(
      page(
        isThanks ? 'Send the thank-you' : 'Send a re-invite',
        `<h1>${isThanks ? 'Thank-you' : 'Re-invite'} for ${escapeHtml(row.name)}</h1>
         <p class="note">To ${escapeHtml(row.email)}, from you. Replies come to you. Edit anything, then send.</p>
         <form method="post">
           <label for="subject">Subject</label>
           <input id="subject" name="subject" value="${escapeHtml(defaults.subject)}">
           <label for="text">Message</label>
           <textarea id="text" name="text">${escapeHtml(defaults.text)}</textarea>
           <button type="submit">Send to ${escapeHtml(firstName(row.name))}</button>
         </form>`
      )
    );
  }

  if (req.method !== 'POST') return res.status(405).send(page('Not allowed', '<h1>Not allowed.</h1>'));

  const form = await readForm(req);
  const subject = String(form.subject || defaults.subject).trim().slice(0, 200);
  const text = String(form.text || defaults.text).trim().slice(0, 5000);
  const sent = await sendToClient(row, { subject, text });
  if (!sent.ok) {
    return res.status(502).send(page('Not sent', `<h1>That did not send.</h1><p class="note">${escapeHtml(sent.error)}</p><p>Nothing went to ${escapeHtml(row.name)}. Try again in a minute.</p>`));
  }
  await markRow(row, isThanks ? { thank_you_sent_at: new Date().toISOString(), thank_you_text: text } : { reinvite_sent_at: new Date().toISOString(), reinvite_text: text });
  return res.status(200).send(page('Sent', `<h1>Sent.</h1><p>${isThanks ? 'Your thank-you' : 'The re-invite'} is on its way to ${escapeHtml(row.name)}. You were copied.</p>`));
}
