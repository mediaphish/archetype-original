import { Resend } from 'resend';
import { formatRecordingDateTime } from './podcastScheduleUtils.js';
import { timezoneLabel } from './podcastTimezones.js';
import {
  createRandomToken,
  storeGuestMagicLink,
  getSiteUrl,
} from './podcastGuestAuth.js';

const resend = new Resend(process.env.RESEND_API_KEY);
const BART_TEXT_NUMBER = '+1 417 388 0680';
const COMBINED_INVITE_MAGIC_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function escapeHtml(str = '') {
  return str
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function buildRecordingLinkHtml({
  guestName,
  riversideLink,
  scheduledAt,
  timezone,
  magicLink = null,
}) {
  const { dateStr, timeStr } = formatRecordingDateTime(scheduledAt, timezone);
  const tzLabel = timezoneLabel(timezone);

  const showPageBlock = magicLink
    ? `
      <p>You can review your bio and the questions we might cover anytime at your show page.</p>
      <p style="margin: 24px 0;">
        <a href="${escapeHtml(magicLink)}" style="display:inline-block;background:#DB0812;color:#fff;padding:12px 20px;text-decoration:none;border-radius:2px;">View my show page</a>
      </p>
    `
    : '';

  return `
    <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; max-width: 560px; margin: 0 auto; color: #1A1A1A; line-height: 1.6;">
      <h1 style="font-family: Georgia, serif; font-weight: 400; font-size: 24px; color: #2B2929;">Recording day is set</h1>
      <p>${escapeHtml(guestName || 'there')},</p>
      <p>We're recording ${escapeHtml(dateStr)} at ${escapeHtml(timeStr)} ${escapeHtml(tzLabel)}.</p>
      ${showPageBlock}
      <p>Here's what you need.</p>
      <p><strong>Device</strong><br/>Any laptop, desktop, phone, or tablet with a camera works. No professional equipment required. If you're on a phone, make sure it's not low on storage. Riverside records locally first, then uploads, so a full phone can cause problems.</p>
      <p><strong>Browser</strong><br/>On a computer, use Chrome or Edge. On a phone or tablet, just use the link below.</p>
      <p><strong>Audio</strong><br/>A microphone helps but isn't required. Headphones aren't required either. If you use them, wired or wireless both work, just make sure wireless ones are charged.</p>
      <p><strong>Room</strong><br/>Find a quiet room. Shut the door. Turn off fans, TVs, and music. Somewhere you won't be interrupted.</p>
      <p><strong>Camera</strong><br/>Sit where your face is clearly lit, ideally a window or lamp in front of you, not behind you. Set the camera at eye level.</p>
      <p><strong>Before you log in</strong><br/>Close extra tabs and apps. Put your phone on Do Not Disturb. Be ready to allow camera and microphone permissions when Riverside asks. Make sure your device is charged or plugged in.</p>
      <p>Log in to the studio right at ${escapeHtml(timeStr)}, not before. We'll check mics, cameras, and audio together once you're in.</p>
      <p style="margin: 24px 0;">
        <a href="${escapeHtml(riversideLink)}" style="display:inline-block;background:#DB0812;color:#fff;padding:12px 20px;text-decoration:none;border-radius:2px;">Join the studio</a>
      </p>
      <p>I'm reachable by text 10 to 15 minutes early, at <strong>${BART_TEXT_NUMBER}</strong>. If anything doesn't connect, or your mic or camera isn't working, text me there.</p>
      <p>See you then.</p>
      <p>Bart</p>
      <hr style="border:none;border-top:1px solid #e5e7eb; margin:24px 0;" />
      <p style="font-size:12px;color:#6B6B6B;">Archetype Original. The Archetype Original Podcast</p>
    </div>
  `;
}

export async function sendRecordingLinkEmail({ guest, riversideLink, scheduledAt, timezone }) {
  const email = String(guest?.email || '').trim();
  if (!email) return { ok: false, error: 'guest_email_missing' };

  const from = process.env.CONTACT_FROM;
  if (!process.env.RESEND_API_KEY || !from) {
    return { ok: false, error: 'email_not_configured' };
  }

  const link = String(riversideLink || '').trim();
  if (!link) return { ok: false, error: 'riverside_link_missing' };

  let magicLink = null;
  try {
    if (guest?.id) {
      const token = createRandomToken();
      await storeGuestMagicLink(guest.id, token, COMBINED_INVITE_MAGIC_TTL_MS);
      const emailLower = String(guest.email || '').toLowerCase().trim();
      magicLink = `${getSiteUrl()}/api/podcast/guest-magic-verify?token=${encodeURIComponent(token)}&email=${encodeURIComponent(emailLower)}&guest_id=${encodeURIComponent(guest.id)}`;
    }
  } catch (err) {
    console.error('[sendRecordingLinkEmail] magic link generation failed; sending Riverside invite without show-page link', err);
    magicLink = null;
  }

  const { dateStr, timeStr } = formatRecordingDateTime(scheduledAt, timezone);
  const tzLabel = timezoneLabel(timezone);
  const subject = `Recording day is set: ${dateStr} at ${timeStr} ${tzLabel}`;

  const html = buildRecordingLinkHtml({
    guestName: guest?.name,
    riversideLink: link,
    scheduledAt,
    timezone,
    magicLink,
  });

  const result = await resend.emails.send({
    from,
    to: email,
    subject,
    html,
  });

  if (result?.error) {
    return { ok: false, error: result.error.message || 'send_failed' };
  }

  return { ok: true, id: result?.data?.id || null };
}
