/**
 * Daily Devotional Notification Cron Job
 * 
 * Runs daily to check for devotionals published today and send email notifications
 * to subscribers who have opted in to receive devotional emails.
 * 
 * Configured in vercel.json (see crons → daily-devotional-notify; currently 6:20 UTC daily).
 */

import { supabaseAdmin } from "../../lib/supabase-admin.js";
import { Resend } from "resend";
import {
  calendarTodayPublicationTz,
  publicationTimeZone,
  publishDateCalendarOnly,
} from "../../lib/publish-eligibility.mjs";
import { claimDevotionalBroadcast } from "../../lib/journal-devotional-notify-dedupe.js";
import { devotionalsPublishedOn, devotionalsFromSchedule } from "../../lib/devotionalsForDate.js";
import {
  filterDevotionalRecipientsNotYetSent,
  recordDevotionalRecipientsSent,
} from "../../lib/journal-devotional-recipient-dedupe.js";
import { isDevotionalNotifyEnabled } from "../../lib/journal-devotional-notify-guards.js";
import { resendBroadcastSameHtml } from "../../lib/resend-broadcast-same-html.js";

const resend = new Resend(process.env.RESEND_API_KEY);

function escapeHtml(str = "") {
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/**
 * Record what this run did.
 *
 * 2026-10-06. Every failure in this story was silent. The sender answered
 * 200 OK with "no devotionals published today" on a day one was published, for
 * two mornings, and the only way anyone found out was Bart's inbox being empty.
 * A row per run means the question "did it go out" has an answer that does not
 * depend on reading server logs, and makes a missed day something a check can
 * see rather than something nobody notices.
 */
async function recordRun(fields) {
  try {
    await supabaseAdmin.from('ao_devotional_send_log').insert(fields);
  } catch (err) {
    console.error('[daily-devotional-notify] could not record the run:', err?.message || err);
  }
}

export default async function handler(req, res) {
  // Vercel Cron Jobs automatically send authorization headers
  // Check for Vercel's cron-specific header or standard authorization
  // In production, Vercel will always send these headers
  const isVercelCron = req.headers['x-vercel-cron'] === '1' || 
                       req.headers['authorization']?.startsWith('Bearer');
  
  // For additional security, you can set CRON_SECRET in environment variables
  // If set, it must match the Authorization header
  if (process.env.CRON_SECRET) {
    const authHeader = req.headers['authorization'];
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  } else if (!isVercelCron) {
    // In production, Vercel always sends headers, but allow for local testing
    console.warn('⚠️  No Vercel cron headers detected - allowing for testing');
  }

  try {
    if (!isDevotionalNotifyEnabled()) {
      console.log('⏸️ Devotional notify disabled (DEVOTIONAL_NOTIFY_ENABLED).');
      return res.status(200).json({
        ok: true,
        message: 'Devotional notify disabled.',
        sent: 0,
        skipped: 'devotional_notify_disabled',
      });
    }

    if (!process.env.RESEND_API_KEY) {
      console.error('❌ RESEND_API_KEY is not set; cannot send devotional emails.');
      return res.status(500).json({
        ok: false,
        error: 'Email provider is not configured (missing RESEND_API_KEY).',
      });
    }

    // Same "today" as build-knowledge / public schedule (PUBLICATION_TIME_ZONE, default America/Chicago).
    // Using UTC-only here caused misses when the publication calendar and UTC date disagreed near boundaries.
    const todayStr = calendarTodayPublicationTz(new Date(), publicationTimeZone());
    const tz = publicationTimeZone();

    console.log(`🔍 Checking for devotionals with publish_date === ${todayStr} (publication TZ: ${tz})...`);

    // The devotional files are the source of truth, and they carry their own
    // publish date.
    //
    // This used to ask the site for a list that a scheduled job rebuilds each
    // morning. The rebuild is set for 6:00am and this runs at 6:20, and GitHub
    // routinely runs scheduled jobs hours late: on October 3 the rebuild landed
    // at 11:28 and on October 4 at 12:09. Both times this looked, saw nothing,
    // and reported success. Reading the files removes the race rather than
    // widening it.
    // The generated schedule first. It is written by the build next to
    // knowledge.json, which is proven to reach the functions, and it carries
    // future dates on purpose, so today's devotional is always in yesterday's
    // build. The markdown files are second: right in principle, but they were
    // never bundled into this function, which is why the October 4 rewrite
    // changed nothing for two mornings running.
    let todayDevotionals = devotionalsFromSchedule(todayStr);
    let source = 'schedule';

    if (todayDevotionals === null) {
      todayDevotionals = devotionalsPublishedOn(todayStr);
      source = 'files';
    }

    if (todayDevotionals === null) {
      // The folder was not readable, which is different from it holding nothing
      // for today. Only then is the rebuilt list worth asking for.
      source = 'knowledge_list';
      console.warn('⚠️  Could not read the devotional files; falling back to the content list.');
      const siteUrl = process.env.PUBLIC_SITE_URL || 'https://www.archetypeoriginal.com';
      const knowledgeResponse = await fetch(`${siteUrl}/api/knowledge?type=devotional`);

      if (!knowledgeResponse.ok) {
        throw new Error(`Failed to fetch devotionals: ${knowledgeResponse.statusText}`);
      }

      const knowledgeData = await knowledgeResponse.json();
      const allDevotionals = knowledgeData.docs || [];

      todayDevotionals = allDevotionals.filter((devotional) => {
        if (devotional.status !== 'published') return false;
        const publishDateStr =
          publishDateCalendarOnly(devotional.publish_date ?? devotional.date) ||
          String(devotional.publish_date ?? '')
            .split('T')[0]
            .split(' ')[0];
        if (!publishDateStr) return false;
        return publishDateStr === todayStr;
      });
    }

    console.log(`📖 Read ${todayDevotionals.length} devotional(s) for ${todayStr} from ${source}.`);

    if (todayDevotionals.length === 0) {
      console.log(`✅ No devotionals published today (${todayStr}).`);
      await recordRun({ calendar_date: todayStr, source, found: 0, sent: 0, note: 'nothing scheduled' });
      return res.status(200).json({ 
        ok: true, 
        message: `No devotionals published today (${todayStr}).`,
        checked: todayStr,
        found: 0,
        sent: 0
      });
    }

    console.log(`📧 Found ${todayDevotionals.length} devotional(s) published today.`);

    // Get all active subscribers who want devotional emails
    const { data: subscribers, error: subError } = await supabaseAdmin
      .from("journal_subscriptions")
      .select("id, email, subscribe_devotionals")
      .eq("is_active", true)
      .eq("subscribe_devotionals", true);

    if (subError) {
      console.error("Error fetching subscribers:", subError);
      return res.status(500).json({ error: "Failed to fetch subscribers." });
    }

    if (!subscribers || subscribers.length === 0) {
      console.log("✅ No active subscribers for devotionals.");
      return res.status(200).json({ 
        ok: true, 
        message: "No active subscribers for devotionals.",
        checked: todayStr,
        found: todayDevotionals.length,
        sent: 0
      });
    }

    console.log(`📬 Sending notifications to ${subscribers.length} subscriber(s)...`);
    console.log(`📋 Subscriber emails:`, subscribers.map(s => s.email).join(', '));

    const from = process.env.CONTACT_FROM || "Archetype Original <noreply@archetypeoriginal.com>";
    let totalSent = 0;
    let totalFailed = 0;
    const errors = [];
    const sentEmails = [];
    let skippedAlreadySent = 0;

    // Send notifications for each devotional published today
    for (const devotional of todayDevotionals) {
      const { title, slug, email_summary, summary, publish_date } = devotional;
      
      if (!title || !slug) {
        console.warn(`⚠️  Skipping devotional with missing title or slug:`, slug);
        continue;
      }

      const pubDay =
        publishDateCalendarOnly(publish_date ?? devotional.date) || todayStr;

      const claim = await claimDevotionalBroadcast(supabaseAdmin, slug, pubDay, 'daily_cron');
      // If a previous run already claimed the "broadcast slot", treat this as a retry:
      // per-recipient dedupe will prevent double-sends while allowing missed recipients to get the email.
      const retryingAfterPriorRun = claim.duplicate === true;
      if (claim.error) {
        throw new Error(claim.error);
      }

      let recipientsToSend = await filterDevotionalRecipientsNotYetSent(
        supabaseAdmin,
        slug,
        pubDay,
        subscribers
      );
      if (recipientsToSend.length === 0) {
        console.log(`⏭️ Skipping ${slug} — all subscribers already received for ${pubDay}`);
        if (retryingAfterPriorRun) skippedAlreadySent += 1;
        continue;
      }

      console.log(`📧 Processing devotional: ${title} (${slug})`);

      const postUrl = `${siteUrl}/faith?slug=${encodeURIComponent(slug)}`;
      const postSummary = email_summary || summary || "Read the full devotional to learn more.";
      const publishDate = publish_date 
        ? new Date(publish_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
        : new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

      // Build email HTML template
      const emailHtml = `
        <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; line-height:1.6; color:#1A1A1A; max-width:600px; margin:0 auto;">
          <h2 style="margin:0 0 16px 0; color:#1A1A1A; font-size:24px;">New Devotional</h2>
          <h3 style="margin:0 0 12px 0; color:#1A1A1A; font-size:20px; font-weight:600;">${escapeHtml(title)}</h3>
          <p style="margin:0 0 16px 0; color:#6B6B6B; font-size:14px;">Published: ${publishDate}</p>
          
          <div style="margin:24px 0; padding:16px; background-color:#FAFAF9; border-left:4px solid #C85A3C;">
            <p style="margin:0; color:#1A1A1A; line-height:1.7;">${escapeHtml(postSummary)}</p>
          </div>
          
          <p style="margin:24px 0;">
            <a href="${postUrl}" style="display:inline-block; background-color:#1A1A1A; color:#FFFFFF; padding:12px 24px; text-decoration:none; font-weight:500;">Read Full Devotional</a>
          </p>
          
          <hr style="border:none;border-top:1px solid #e5e7eb; margin:24px 0;" />
          
          <p style="margin:0 0 8px 0;">
            <a href="${siteUrl}/faith" style="color:#C85A3C; text-decoration:none;">View all devotionals</a>
          </p>
          
          <p style="font-size:12px;color:#6B6B6B; margin:16px 0 0 0;">
            You're receiving this because you subscribed to devotionals at ${siteUrl}/faith
          </p>
        </div>
      `;

      console.log(
        `📦 Broadcasting ${slug} to ${recipientsToSend.length} subscriber(s) (single-mail)...`
      );

      const { sent, failed, failures, sentAddresses } = await resendBroadcastSameHtml({
        resend,
        from,
        subject: `New Devotional: ${escapeHtml(title)}`,
        html: emailHtml,
        recipients: recipientsToSend,
        // Record each wave as it lands. If this run dies partway through the
        // list, the next one picks up from here instead of emailing the people
        // who already received it a second time.
        onWaveSent: (addresses) =>
          recordDevotionalRecipientsSent(supabaseAdmin, slug, pubDay, addresses, 'daily_cron'),
      });

      totalSent += sent;
      totalFailed += failed;
      sentEmails.push(...sentAddresses);

      for (const { recipient, error } of failures) {
        errors.push({ email: recipient.email, devotional: slug, error });
      }

      if (sentAddresses?.length > 0) {
        await recordDevotionalRecipientsSent(
          supabaseAdmin,
          slug,
          pubDay,
          sentAddresses,
          'daily_cron'
        );
      }

      console.log(`✅ Broadcast for ${slug}: ${sent} sent, ${failed} failed (this devotional)`);
    }

    console.log(`✅ Daily notification complete: ${totalSent} sent, ${totalFailed} failed, skipped_duplicates=${skippedAlreadySent}`);

    await recordRun({
      calendar_date: todayStr,
      source,
      found: todayDevotionals.length,
      sent: totalSent,
      failed: totalFailed,
      skipped_duplicates: skippedAlreadySent,
      note: todayDevotionals.map((d) => d.slug).join(', ').slice(0, 300),
    });

    return res.status(200).json({ 
      ok: true, 
      message: `Daily devotional notifications processed.`,
      checked: todayStr,
      found: todayDevotionals.length,
      sent: totalSent,
      failed: totalFailed,
      skipped_duplicates: skippedAlreadySent,
      total_subscribers: subscribers.length,
      devotionals: todayDevotionals.map(d => ({ title: d.title, slug: d.slug })),
      sent_emails: sentEmails,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (err) {
    console.error("❌ Daily devotional notification error:", err);
    return res.status(500).json({ 
      error: "Server error processing daily notifications.",
      details: err.message 
    });
  }
}

