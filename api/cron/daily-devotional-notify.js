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

    // Fetch all published devotionals from knowledge corpus
    const siteUrl = process.env.PUBLIC_SITE_URL || 'https://www.archetypeoriginal.com';
    const knowledgeResponse = await fetch(`${siteUrl}/api/knowledge?type=devotional`);
    
    if (!knowledgeResponse.ok) {
      throw new Error(`Failed to fetch devotionals: ${knowledgeResponse.statusText}`);
    }

    const knowledgeData = await knowledgeResponse.json();
    const allDevotionals = knowledgeData.docs || [];

    // Find devotionals published today (using string comparison to avoid timezone issues)
    const todayDevotionals = allDevotionals.filter((devotional) => {
      if (devotional.status !== 'published') return false;
      const publishDateStr =
        publishDateCalendarOnly(devotional.publish_date ?? devotional.date) ||
        String(devotional.publish_date ?? '')
          .split('T')[0]
          .split(' ')[0];
      if (!publishDateStr) return false;
      return publishDateStr === todayStr;
    });

    if (todayDevotionals.length === 0) {
      console.log(`✅ No devotionals published today (${todayStr}).`);
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
      if (claim.duplicate) {
        console.log(`⏭️ Skipping ${slug} — devotional already broadcast for ${pubDay}`);
        skippedAlreadySent += 1;
        continue;
      }
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
        skippedAlreadySent += 1;
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

