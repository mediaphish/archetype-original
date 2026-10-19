/**
 * Did today's devotional actually go out? Say so only when it did not.
 *
 * 2026-10-06. Bart is off grid for eleven days: "I cannot have this fail." And,
 * on being told he could check the result himself: "I will have connectivity, I
 * just want to not have to be."
 *
 * Every failure in this story was silent. The sender answered 200 OK with
 * "no devotionals published today" on days one was published, twice, and the
 * only detector was his empty inbox. He should not be the monitoring.
 *
 * This runs after every send window has passed. If a devotional was scheduled
 * for today and nobody received it, he gets one email saying so. If all is well
 * it sends nothing, so an email from this address always means something needs
 * him. Silence is the good outcome.
 */

import { Resend } from 'resend';
import { supabaseAdmin } from '../../lib/supabase-admin.js';
import { contactFormRecipient } from '../../lib/contact-form-inbox.js';
import {
  daysBetween,
  devotionalsFromSchedule,
  devotionalsPublishedOn,
  lastScheduledDevotionalDate,
} from '../../lib/devotionalsForDate.js';
import {
  calendarTodayPublicationTz,
  publicationTimeZone,
} from '../../lib/publish-eligibility.mjs';

const resend = new Resend(process.env.RESEND_API_KEY);

/** A send is healthy when it reached roughly everyone, not merely when it ran. */
const MIN_HEALTHY_RECIPIENTS = 50;

/**
 * Warn when the schedule has this many days or fewer left after today. Three
 * days is enough for the writing session to finish and publish a batch.
 */
const RUNWAY_WARNING_DAYS = 3;

/**
 * A line for the alert when the schedule is about to run out, or null.
 *
 * 2026-10-19. Devotionals were scheduled through October 28 and nothing after.
 * The check below treated an empty day as healthy, so the first warning would
 * have been an empty inbox on the 29th. Running low is now said out loud.
 */
function runwayWarning(today) {
  const last = lastScheduledDevotionalDate();
  if (!last) return null;
  const left = daysBetween(today, last);
  if (left < 0) return `No devotionals are scheduled at all after ${last}. Nothing will go out until more are published.`;
  if (left === 0) return `Today is the last scheduled devotional. Nothing is scheduled for tomorrow.`;
  if (left <= RUNWAY_WARNING_DAYS) {
    return `Devotionals are scheduled only through ${last}, ${left} day${left === 1 ? '' : 's'} from now. More need to be published before then.`;
  }
  return null;
}

function authorizeCron(req, res) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return true;
  const auth = req.headers.authorization || req.query?.secret || '';
  const provided = auth.replace(/^Bearer\s+/i, '') || (req.query?.secret ?? '');
  if (provided !== cronSecret) {
    res.status(401).json({ ok: false, error: 'Unauthorized' });
    return false;
  }
  return true;
}

function escapeHtml(str = '') {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }
  if (!authorizeCron(req, res)) return;

  const today = calendarTodayPublicationTz(new Date(), publicationTimeZone());

  // Same order the sender uses, so this checks against what it would have found.
  let expected = devotionalsFromSchedule(today);
  let source = 'schedule';
  if (expected === null) {
    expected = devotionalsPublishedOn(today);
    source = 'files';
  }
  if (expected === null) {
    // Unable to read either source. That is itself worth saying, because it
    // means the sender could not read them either.
    return sendAlert(res, today, 'unreadable', {
      subject: `Devotional check could not run for ${today}`,
      lines: [
        'Neither the devotional schedule nor the devotional files could be read on the server.',
        'That means the sender could not read them either, so today may not have gone out.',
      ],
    });
  }

  if (expected.length === 0) {
    // An empty day used to count as healthy and stay silent. Devotionals go out
    // every day, so an empty day is the problem, not the absence of one.
    const runway = runwayWarning(today);
    return sendAlert(res, today, source, {
      subject: `No devotional was scheduled for today: ${today}`,
      lines: [
        'Nothing was scheduled for today, so no devotional email went out.',
        ...(runway ? [runway] : []),
      ],
    });
  }

  const problems = [];
  const checked = [];

  for (const devotional of expected) {
    const { count, error } = await supabaseAdmin
      .from('journal_devotional_recipient_sent')
      .select('*', { count: 'exact', head: true })
      .eq('post_slug', devotional.slug)
      .eq('publish_calendar_date', today);

    if (error) {
      problems.push(`${devotional.slug}: could not check who received it (${error.message})`);
      continue;
    }

    const recipients = count || 0;
    checked.push({ slug: devotional.slug, title: devotional.title, recipients });

    if (recipients === 0) {
      problems.push(`"${devotional.title}" was scheduled for today and nobody received it.`);
    } else if (recipients < MIN_HEALTHY_RECIPIENTS) {
      problems.push(`"${devotional.title}" reached only ${recipients} people, which is far below normal.`);
    }
  }

  const runway = runwayWarning(today);

  if (problems.length === 0 && !runway) {
    return res.status(200).json({ ok: true, today, source, healthy: true, checked });
  }

  if (problems.length === 0) {
    // Today went out. The only news is that the schedule is about to run dry.
    return sendAlert(res, today, source, {
      subject: `Devotionals run out soon: ${today}`,
      lines: [`Today's devotional went out normally.`, runway],
      checked,
    });
  }

  if (runway) problems.push(runway);

  return sendAlert(res, today, source, {
    subject: `Devotional did not go out: ${today}`,
    lines: problems,
    checked,
  });
}

async function sendAlert(res, today, source, { subject, lines, checked = [] }) {
  const to = contactFormRecipient();
  const from = process.env.CONTACT_FROM;

  // Recorded first, so the alert exists even if the email cannot be sent. That
  // ordering is the same lesson as the send itself.
  try {
    await supabaseAdmin.from('ao_devotional_send_log').insert({
      calendar_date: today,
      source: `health:${source}`,
      found: checked.length,
      sent: checked.reduce((n, c) => n + (c.recipients || 0), 0),
      note: lines.join(' | ').slice(0, 300),
    });
  } catch (_) {}

  if (!process.env.RESEND_API_KEY || !from) {
    return res.status(500).json({ ok: false, today, healthy: false, problems: lines, error: 'Email is not configured' });
  }

  const html = `
    <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; line-height:1.6; color:#1a1a1a;">
      <h2 style="margin:0 0 12px 0;">${escapeHtml(subject)}</h2>
      <p style="margin:0 0 16px 0;">Checked for ${escapeHtml(today)} after all four send windows had passed.</p>
      <ul>${lines.map((l) => `<li>${escapeHtml(l)}</li>`).join('')}</ul>
      <p style="margin:16px 0 0 0;font-size:13px;color:#555;">
        You only get this email when something is wrong. Nothing from this address means the devotional went out.
      </p>
    </div>
  `;

  try {
    const result = await resend.emails.send({ from, to, subject, html });
    return res.status(200).json({
      ok: true,
      today,
      healthy: false,
      problems: lines,
      alerted: !result?.error,
      alert_error: result?.error ? String(result.error.message || result.error) : undefined,
    });
  } catch (err) {
    return res.status(500).json({ ok: false, today, healthy: false, problems: lines, error: err?.message });
  }
}
