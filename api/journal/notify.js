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

/**
 * Send email notifications to all active subscribers when a new journal post is published
 * 
 * This endpoint should be called when a new post is published (manually or via automation)
 * 
 * POST /api/journal/notify
 * Body: { postSlug: "post-slug" } or { post: { title, slug, email_summary, publish_date, ... } }
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { postSlug, post } = req.body || {};
    
    // If postSlug is provided, fetch post from knowledge corpus
    // Check both journal-post and devotional types
    let postData = post;
    if (postSlug && !post) {
      try {
        // Try journal-post first
        let knowledgeResponse = await fetch(`${process.env.PUBLIC_SITE_URL || 'https://www.archetypeoriginal.com'}/api/knowledge?type=journal-post`);
        let knowledgeData = await knowledgeResponse.json();
        postData = knowledgeData.docs?.find(p => p.slug === postSlug);
        
        // If not found, try devotional
        if (!postData) {
          knowledgeResponse = await fetch(`${process.env.PUBLIC_SITE_URL || 'https://www.archetypeoriginal.com'}/api/knowledge?type=devotional`);
          knowledgeData = await knowledgeResponse.json();
          postData = knowledgeData.docs?.find(p => p.slug === postSlug);
        }
        
        if (!postData) {
          return res.status(404).json({ error: "Post not found in knowledge corpus." });
        }
      } catch (fetchError) {
        console.error("Error fetching post from knowledge corpus:", fetchError);
        return res.status(500).json({ error: "Failed to fetch post data." });
      }
    }
    
    if (!postData) {
      return res.status(400).json({ error: "Post data or postSlug is required." });
    }

    const { title, slug, email_summary, summary, publish_date, type } = postData;
    
    if (!title || !slug) {
      return res.status(400).json({ error: "Post must have title and slug." });
    }

    // Determine post type (default to journal-post if not specified)
    const postType = type || 'journal-post';
    const isDevotional = postType === 'devotional';

    // Get active subscribers, filtering by their preferences
    // For journal posts: only subscribers who have subscribe_journal_entries = true
    // For devotionals: only subscribers who have subscribe_devotionals = true
    let subscriberQuery = supabaseAdmin
      .from("journal_subscriptions")
      .select("id, email, subscribe_journal_entries, subscribe_devotionals")
      .eq("is_active", true);
    
    // Filter by subscription preferences
    if (isDevotional) {
      subscriberQuery = subscriberQuery.eq("subscribe_devotionals", true);
    } else {
      subscriberQuery = subscriberQuery.eq("subscribe_journal_entries", true);
    }

    const { data: subscribers, error: subError } = await subscriberQuery;

    if (subError) {
      console.error("Error fetching subscribers:", subError);
      return res.status(500).json({ error: "Failed to fetch subscribers." });
    }

    if (!subscribers || subscribers.length === 0) {
      return res.status(200).json({ 
        ok: true, 
        message: "No active subscribers to notify.",
        sent: 0 
      });
    }

    // Prepare email content
    const siteUrl = process.env.PUBLIC_SITE_URL || "https://www.archetypeoriginal.com";
    const postUrl = `${siteUrl}/journal/${slug}`;
    const postSummary = email_summary || summary || "Read the full post to learn more.";
    const publishDate = publish_date 
      ? new Date(publish_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
      : new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    const from = process.env.CONTACT_FROM || "Archetype Original <noreply@archetypeoriginal.com>";
    
    // Determine email subject and content based on post type
    const emailSubject = isDevotional 
      ? `New Devotional: ${escapeHtml(title)}`
      : `New Journal Post: ${escapeHtml(title)}`;
    
    const emailHeader = isDevotional
      ? "New Devotional"
      : "New Journal Post";
    
    const emailFooter = isDevotional
      ? `You're receiving this because you subscribed to devotionals at ${siteUrl}/journal`
      : `You're receiving this because you subscribed to journal updates at ${siteUrl}/journal`;
    
    const viewAllLink = isDevotional
      ? `${siteUrl}/faith`
      : `${siteUrl}/journal`;
    
    const viewAllText = isDevotional
      ? "View all devotionals"
      : "View all journal posts";
    
    // Build email HTML template
    const emailHtml = `
      <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; line-height:1.6; color:#1A1A1A; max-width:600px; margin:0 auto;">
        <h2 style="margin:0 0 16px 0; color:#1A1A1A; font-size:24px;">${emailHeader}</h2>
        <h3 style="margin:0 0 12px 0; color:#1A1A1A; font-size:20px; font-weight:600;">${escapeHtml(title)}</h3>
        <p style="margin:0 0 16px 0; color:#6B6B6B; font-size:14px;">Published: ${publishDate}</p>
        
        <div style="margin:24px 0; padding:16px; background-color:#FAFAF9; border-left:4px solid #C85A3C;">
          <p style="margin:0; color:#1A1A1A; line-height:1.7;">${escapeHtml(postSummary)}</p>
        </div>
        
        <p style="margin:24px 0;">
          <a href="${postUrl}" style="display:inline-block; background-color:#1A1A1A; color:#FFFFFF; padding:12px 24px; text-decoration:none; font-weight:500;">Read ${isDevotional ? 'Full Devotional' : 'Full Article'}</a>
        </p>
        
        <hr style="border:none;border-top:1px solid #e5e7eb; margin:24px 0;" />
        
        <p style="margin:0 0 8px 0;">
          <a href="${viewAllLink}" style="color:#C85A3C; text-decoration:none;">${viewAllText}</a>
        </p>
        
        <p style="font-size:12px;color:#6B6B6B; margin:16px 0 0 0;">
          ${emailFooter}
        </p>
      </div>
    `;

    // Use Resend Batch API: up to 100 emails per batch
    // With 10 req/sec limit, we can send batches much faster
    const BATCH_SIZE = 100;
    let sentCount = 0;
    let failedCount = 0;
    const errors = [];
    const failedEmails = [];

    // Split subscribers into batches of 100
    for (let i = 0; i < subscribers.length; i += BATCH_SIZE) {
      const batch = subscribers.slice(i, i + BATCH_SIZE);
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(subscribers.length / BATCH_SIZE);
      
      console.log(`📦 Sending batch ${batchNumber}/${totalBatches} (${batch.length} emails)...`);

      // Build batch array for Resend
      const batchEmails = batch.map(subscriber => ({
        from,
        to: subscriber.email,
        subject: emailSubject,
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
                  failedCount++;
                  errors.push({ email: subscriber.email, error: result.error });
                  failedEmails.push({
                    email: subscriber.email,
                    subscription_id: subscriber.id,
                    post_slug: slug,
                    post_type: isDevotional ? 'devotional' : 'journal-post',
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
                failedCount++;
                errors.push({ email: subscriber.email, error: result.error });
                failedEmails.push({
                  email: subscriber.email,
                  subscription_id: subscriber.id,
                  post_slug: slug,
                  post_type: isDevotional ? 'devotional' : 'journal-post',
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
                failedCount++;
                const subscriber = batch[index];
                errors.push({ email: subscriber.email, error: emailResult.error });
                failedEmails.push({
                  email: subscriber.email,
                  subscription_id: subscriber.id,
                  post_slug: slug,
                  post_type: isDevotional ? 'devotional' : 'journal-post',
                  post_title: title,
                  error_type: emailResult.error.name || 'unknown',
                  error_message: emailResult.error.message || JSON.stringify(emailResult.error),
                  error_code: emailResult.error.statusCode || 500,
                  status: 'pending'
                });
              } else {
                sentCount++;
              }
            });
            console.log(`✅ Batch ${batchNumber} completed: ${sentCount} sent, ${failedCount} failed`);
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
                failedCount++;
                errors.push({ email: subscriber.email, error: batchError.message });
                failedEmails.push({
                  email: subscriber.email,
                  subscription_id: subscriber.id,
                  post_slug: slug,
                  post_type: isDevotional ? 'devotional' : 'journal-post',
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
              failedCount++;
              errors.push({ email: subscriber.email, error: batchError.message });
              failedEmails.push({
                email: subscriber.email,
                subscription_id: subscriber.id,
                post_slug: slug,
                post_type: isDevotional ? 'devotional' : 'journal-post',
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
      // With 10 req/sec, we can send batches faster, but add small buffer
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

    return res.status(200).json({ 
      ok: true, 
      message: `Notifications sent to ${sentCount} subscribers.`,
      sent: sentCount,
      failed: failedCount,
      total_subscribers: subscribers.length,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (err) {
    console.error("Notification error:", err);
    return res.status(500).json({ error: "Server error." });
  }
}

