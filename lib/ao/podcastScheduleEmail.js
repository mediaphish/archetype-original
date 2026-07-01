import { Resend } from 'resend';
import { formatRecordingDateTime } from './podcastScheduleUtils.js';
import { timezoneLabel } from './podcastTimezones.js';

const resend = new Resend(process.env.RESEND_API_KEY);

function escapeHtml(str = '') {
  return str
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function buildRecordingConfirmationHtml({ guestName, scheduledAt, timezone }) {
  const { dateStr, timeStr } = formatRecordingDateTime(scheduledAt, timezone);
  const tzNote = timezone ? timezoneLabel(timezone) : 'your local time';

  return `
    <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; line-height:1.6; color:#0f172a;">
      <h2 style="margin:0 0 12px 0;">Recording confirmed</h2>
      <p>Hi ${escapeHtml(guestName || 'there')},</p>
      <p>Your recording session for <strong>The Archetype Original Podcast</strong> is confirmed:</p>
      <p style="margin:16px 0;padding:16px;background:#f8fafc;border-left:3px solid #DB0812;">
        <strong>${escapeHtml(dateStr)}</strong><br/>
        ${escapeHtml(timeStr)} (${escapeHtml(tzNote)})
      </p>
      <p>Sessions usually run about 60–90 minutes on Riverside. Bart will send Riverside session details separately before the recording.</p>
      <p style="font-size:14px;">Questions before then? Reply to this email any time.</p>
      <hr style="border:none;border-top:1px solid #e5e7eb; margin:16px 0;" />
      <p style="font-size:12px;color:#64748b;">Archetype Original — The Archetype Original Podcast</p>
    </div>
  `;
}

export async function sendRecordingConfirmationEmail({ guest, slot }) {
  const email = String(guest?.email || '').trim();
  if (!email) return { ok: false, error: 'guest_email_missing' };

  const from = process.env.CONTACT_FROM;
  if (!process.env.RESEND_API_KEY || !from) {
    return { ok: false, error: 'email_not_configured' };
  }

  const timezone = slot?.timezone || guest?.schedule_timezone || null;
  const html = buildRecordingConfirmationHtml({
    guestName: guest?.name,
    scheduledAt: slot?.scheduled_at,
    timezone,
  });

  const result = await resend.emails.send({
    from,
    to: email,
    subject: 'Recording confirmed — The Archetype Original Podcast',
    html,
  });

  if (result?.error) {
    return { ok: false, error: result.error.message || 'send_failed' };
  }

  return { ok: true };
}
