/**
 * How every email in the client system looks.
 *
 * Bart, 2026-10-24: "Every email needs formatting. Even those sent as
 * notifications to me." Two looks:
 *   letter   from Bart to a client: reads like a personal note, not a
 *            newsletter. Serif, generous spacing, links as words, the
 *            permissions link small at the foot.
 *   notice   from the system to Bart: what happened, the few facts that
 *            matter, and one button into Auto.
 * Every email also carries a plain-text version for mail apps that want it.
 */

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const SERIF = "Georgia,'Times New Roman',serif";
const SANS = "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";
const RED = '#DB0812';
const INK = '#1A1A1A';
const MUTED = '#6B6B6B';

function linkify(escaped) {
  return escaped.replace(/(https?:\/\/[^\s<]+[^\s<.,;:!?)])/g, `<a href="$1" style="color:${RED};">$1</a>`);
}

function paragraphs(text) {
  return String(text || '')
    .trim()
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 18px;">${linkify(escapeHtml(p)).replace(/\n/g, '<br>')}</p>`)
    .join('');
}

function button(label, url, bg = RED) {
  return `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:8px 0 22px;"><tr><td style="background:${bg};border-radius:3px;">
<a href="${url}" style="display:inline-block;padding:13px 22px;font-family:${SANS};font-size:14px;font-weight:bold;color:#ffffff;text-decoration:none;">${escapeHtml(label)}</a>
</td></tr></table>`;
}

function shell(inner, { footer = '' } = {}) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#F7F5F2;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#F7F5F2;"><tr><td align="center" style="padding:20px 10px;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border-radius:4px;">
<tr><td style="padding:30px 26px 18px;font-family:${SERIF};font-size:17px;line-height:1.65;color:${INK};">${inner}</td></tr>
${footer ? `<tr><td style="padding:0 26px 26px;font-family:${SANS};font-size:12px;line-height:1.5;color:${MUTED};">${footer}</td></tr>` : ''}
</table></td></tr></table></body></html>`;
}

/**
 * A letter from Bart. `cta` puts the one action the letter asks for as a
 * button (the form link, a booking link) instead of a raw web address.
 */
export function letterHtml(text, { cta = null, permissionsUrl = null } = {}) {
  let body = String(text || '');
  // In the formatted version the web address becomes a button, so the
  // sentence that carried it points at the button instead ("here: <url>" reads "below").
  if (cta?.url) body = body.split(`here: ${cta.url}`).join('below').split(cta.url).join('below');
  if (cta?.url) body = body.replace(/ below$/gm, ' below.');
  const parts = body.trim().split(/\n{2,}/);
  // The sign-off stays last, after the button.
  const signoff = parts.length > 1 && /^bart$/i.test(parts[parts.length - 1].trim()) ? parts.pop() : null;
  const inner =
    paragraphs(parts.join('\n\n')) +
    (cta?.url ? button(cta.label, cta.url) : '') +
    (signoff ? `<p style="margin:0;">${escapeHtml(signoff)}</p>` : '');
  const footer = permissionsUrl
    ? `<a href="${permissionsUrl}" style="color:${MUTED};">Change what you are comfortable with</a>`
    : '';
  return shell(inner, { footer });
}

/** A longer notice to Bart in sections, for the weekly summary. */
export function summaryHtml({ title, intro = null, sections = [], cta = null }) {
  const blocks = sections
    .filter((s) => s && s.lines && s.lines.filter(Boolean).length)
    .map(
      (s) => `<p style="margin:22px 0 8px;font-family:${SANS};font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:${RED};">${escapeHtml(s.heading)}</p>
${s.lines
  .filter(Boolean)
  .map((l) => `<p style="margin:0 0 8px;font-family:${SANS};font-size:15px;line-height:1.5;color:${INK};">${linkify(escapeHtml(l))}</p>`)
  .join('')}`
    )
    .join('');
  const inner = `<p style="margin:0 0 10px;font-family:${SANS};font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:${MUTED};">Auto · Clients</p>
<p style="margin:0 0 12px;font-family:${SERIF};font-size:22px;line-height:1.3;color:${INK};">${escapeHtml(title)}</p>
${intro ? `<p style="margin:0 0 6px;font-family:${SANS};font-size:14px;color:${MUTED};">${escapeHtml(intro)}</p>` : ''}
${blocks}
${cta?.url ? `<div style="margin-top:22px;">${button(cta.label || 'Open in Auto', cta.url)}</div>` : ''}`;
  return shell(inner);
}

/** A notice to Bart from his own system. */
export function noticeHtml({ title, lines = [], cta = null, note = null }) {
  const facts = lines
    .filter(Boolean)
    .map((l) => `<p style="margin:0 0 6px;font-family:${SANS};font-size:15px;color:${INK};">${linkify(escapeHtml(l))}</p>`)
    .join('');
  const inner = `<p style="margin:0 0 10px;font-family:${SANS};font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:${MUTED};">Auto · Clients</p>
<p style="margin:0 0 16px;font-family:${SERIF};font-size:22px;line-height:1.3;color:${INK};">${escapeHtml(title)}</p>
${facts ? `<div style="margin:0 0 18px;">${facts}</div>` : ''}
${note ? `<p style="margin:0 0 18px;font-family:${SANS};font-size:14px;color:${MUTED};">${escapeHtml(note)}</p>` : ''}
${cta?.url ? button(cta.label || 'Open in Auto', cta.url) : ''}`;
  return shell(inner);
}
