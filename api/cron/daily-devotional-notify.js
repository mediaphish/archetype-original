/**
 * Daily Devotional Notification Cron Job
 * 
 * Runs daily to check for devotionals published today and send email notifications
 * to subscribers who have opted in to receive devotional emails.
 * 
 * Configured in vercel.json to run daily at a specified time.
 */

import { supabaseAdmin } from "../../lib/supabase-admin.js";
import { Resend } from "resend";

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
    // Get today's date in YYYY-MM-DD format for accurate comparison (UTC)
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD format

    console.log(`🔍 Checking for devotionals published on ${todayStr}...`);

    // Fetch all published devotionals from knowledge corpus
    const siteUrl = process.env.PUBLIC_SITE_URL || 'https://www.archetypeoriginal.com';
    const knowledgeResponse = await fetch(`${siteUrl}/api/knowledge?type=devotional`);
    
    if (!knowledgeResponse.ok) {
      throw new Error(`Failed to fetch devotionals: ${knowledgeResponse.statusText}`);
    }

    const knowledgeData = await knowledgeResponse.json();
    const allDevotionals = knowledgeData.docs || [];

    // Find devotionals published today (using string comparison to avoid timezone issues)
    const todayDevotionals = allDevotionals.filter(devotional => {
      if (!devotional.publish_date || devotional.status !== 'published') return false;
      
      // Extract date string (YYYY-MM-DD) for accurate comparison
      const publishDateStr = String(devotional.publish_date).split('T')[0].split(' ')[0];
      
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

    // Send notifications for each devotional published today
    for (const devotional of todayDevotionals) {
      const { title, slug, email_summary, summary, publish_date } = devotional;
      
      if (!title || !slug) {
        console.warn(`⚠️  Skipping devotional with missing title or slug:`, slug);
        continue;
      }

      console.log(`📧 Processing devotional: ${title} (${slug})`);

      const postUrl = `${siteUrl}/journal/${slug}`;
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
            You're receiving this because you subscribed to devotionals at ${siteUrl}/journal
          </p>
        </div>
      `;

      // Use Resend Batch API: up to 100 emails per batch
      // With 10 req/sec limit, we can send batches much faster
      const BATCH_SIZE = 100;
      const failedEmails = [];

      // Split subscribers into batches of 100
      for (let i = 0; i < subscribers.length; i += BATCH_SIZE) {
        const batch = subscribers.slice(i, i + BATCH_SIZE);
        const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(subscribers.length / BATCH_SIZE);
        
        console.log(`📦 Sending batch ${batchNumber}/${totalBatches} (${batch.length} emails) for ${slug}...`);

        // Build batch array for Resend
        const batchEmails = batch.map(subscriber => ({
          from,
          to: subscriber.email,
          subject: `New Devotional: ${escapeHtml(title)}`,
          html: emailHtml
        }));

        let retries = 3;
        let batchSent = false;

        while (retries > 0 && !batchSent) {
          try {
            const result = await resend.batch.send(batchEmails);

            if (result?.error) {
              // Check if it's a rate limit error
              if (result.error.name === 'rate_limit_exceeded' || result.error.statusCode === 429) {
                retries--;
                if (retries > 0) {
                  console.warn(`⏳ Rate limit hit for batch ${batchNumber}, waiting 2 seconds before retry...`);
                  await new Promise(resolve => setTimeout(resolve, 2000));
                  continue;
                } else {
                  // Batch failed after retries - store individual failures
                  console.error(`❌ Batch ${batchNumber} failed after retries:`, result.error);
                  batch.forEach(subscriber => {
                    totalFailed++;
                    errors.push({ email: subscriber.email, devotional: slug, error: result.error });
                    failedEmails.push({
                      email: subscriber.email,
                      subscription_id: subscriber.id,
                      post_slug: slug,
                      post_type: 'devotional',
                      post_title: title,
                      error_type: 'rate_limit_exceeded',
                      error_message: result.error.message || JSON.stringify(result.error),
                      error_code: 429,
                      status: 'pending'
                    });
                  });
                  batchSent = true;
                }
              } else {
                // Non-rate-limit error
                console.error(`❌ Batch ${batchNumber} failed:`, result.error);
                batch.forEach(subscriber => {
                  totalFailed++;
                  errors.push({ email: subscriber.email, devotional: slug, error: result.error });
                  failedEmails.push({
                    email: subscriber.email,
                    subscription_id: subscriber.id,
                    post_slug: slug,
                    post_type: 'devotional',
                    post_title: title,
                    error_type: result.error.name || 'unknown',
                    error_message: result.error.message || JSON.stringify(result.error),
                    error_code: result.error.statusCode || 500,
                    status: 'pending'
                  });
                });
                batchSent = true;
              }
            } else {
              // Batch success - check individual results
              const batchResults = result.data || [];
              batchResults.forEach((emailResult, index) => {
                if (emailResult.error) {
                  totalFailed++;
                  const subscriber = batch[index];
                  errors.push({ email: subscriber.email, devotional: slug, error: emailResult.error });
                  failedEmails.push({
                    email: subscriber.email,
                    subscription_id: subscriber.id,
                    post_slug: slug,
                    post_type: 'devotional',
                    post_title: title,
                    error_type: emailResult.error.name || 'unknown',
                    error_message: emailResult.error.message || JSON.stringify(emailResult.error),
                    error_code: emailResult.error.statusCode || 500,
                    status: 'pending'
                  });
                } else {
                  totalSent++;
                  sentEmails.push(batch[index].email);
                }
              });
              console.log(`✅ Batch ${batchNumber} completed for ${slug}: ${totalSent} sent, ${totalFailed} failed`);
              batchSent = true;
            }
          } catch (batchError) {
            // Check if it's a rate limit error
            if (batchError.message?.includes('rate_limit') || batchError.statusCode === 429) {
              retries--;
              if (retries > 0) {
                console.warn(`⏳ Rate limit hit for batch ${batchNumber}, waiting 2 seconds before retry...`);
                await new Promise(resolve => setTimeout(resolve, 2000));
                continue;
              } else {
                console.error(`❌ Batch ${batchNumber} error after retries:`, batchError);
                batch.forEach(subscriber => {
                  totalFailed++;
                  errors.push({ email: subscriber.email, devotional: slug, error: batchError.message });
                  failedEmails.push({
                    email: subscriber.email,
                    subscription_id: subscriber.id,
                    post_slug: slug,
                    post_type: 'devotional',
                    post_title: title,
                    error_type: 'rate_limit_exceeded',
                    error_message: batchError.message,
                    error_code: 429,
                    status: 'pending'
                  });
                });
                batchSent = true;
              }
            } else {
              // Non-rate-limit error
              console.error(`❌ Batch ${batchNumber} error:`, batchError);
              batch.forEach(subscriber => {
                totalFailed++;
                errors.push({ email: subscriber.email, devotional: slug, error: batchError.message });
                failedEmails.push({
                  email: subscriber.email,
                  subscription_id: subscriber.id,
                  post_slug: slug,
                  post_type: 'devotional',
                  post_title: title,
                  error_type: batchError.name || 'unknown',
                  error_message: batchError.message,
                  error_code: batchError.statusCode || 500,
                  status: 'pending'
                });
              });
              batchSent = true;
            }
          }
        }

        // Small delay between batches to respect rate limits (100ms = 10 batches/second max)
        if (i + BATCH_SIZE < subscribers.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      // Store all failures in database
      if (failedEmails.length > 0) {
        try {
          await supabaseAdmin.from('journal_email_failures').insert(failedEmails);
          console.log(`📝 Stored ${failedEmails.length} email failures in database for retry`);
        } catch (dbError) {
          console.error(`Failed to store email failures in database:`, dbError);
        }
      }
    }

    console.log(`✅ Daily notification complete: ${totalSent} sent, ${totalFailed} failed`);

    return res.status(200).json({ 
      ok: true, 
      message: `Daily devotional notifications processed.`,
      checked: todayStr,
      found: todayDevotionals.length,
      sent: totalSent,
      failed: totalFailed,
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

