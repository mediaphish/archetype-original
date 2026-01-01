/**
 * Retry Failed Email Notifications
 * 
 * This endpoint allows you to retry sending emails that failed previously,
 * especially those that failed due to rate limiting (429 errors).
 * 
 * POST /api/journal/retry-failed-emails
 * Body (optional): { 
 *   status: 'pending' | 'all',  // Default: 'pending'
 *   error_code: 429,            // Optional: filter by error code
 *   limit: 50                   // Optional: max number to retry
 * }
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
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { status = 'pending', error_code, limit = 50 } = req.body || {};

    // Build query for failed emails
    let query = supabaseAdmin
      .from("journal_email_failures")
      .select("*")
      .eq("status", status)
      .order("created_at", { ascending: true })
      .limit(limit);

    // Optional: filter by error code
    if (error_code) {
      query = query.eq("error_code", error_code);
    }

    const { data: failedEmails, error: queryError } = await query;

    if (queryError) {
      console.error("Error fetching failed emails:", queryError);
      return res.status(500).json({ error: "Failed to fetch failed emails." });
    }

    if (!failedEmails || failedEmails.length === 0) {
      return res.status(200).json({ 
        ok: true, 
        message: "No failed emails to retry.",
        retried: 0,
        failed: 0
      });
    }

    console.log(`🔄 Retrying ${failedEmails.length} failed email(s)...`);

    const siteUrl = process.env.PUBLIC_SITE_URL || "https://www.archetypeoriginal.com";
    const from = process.env.CONTACT_FROM || "Archetype Original <noreply@archetypeoriginal.com>";
    
    let retriedCount = 0;
    let stillFailedCount = 0;
    const errors = [];

    // Fetch post data from knowledge corpus for each unique post
    const uniquePosts = [...new Set(failedEmails.map(f => f.post_slug))];
    const postDataMap = {};

    for (const slug of uniquePosts) {
      try {
        const knowledgeResponse = await fetch(`${siteUrl}/api/knowledge?type=all`);
        const knowledgeData = await knowledgeResponse.json();
        const post = knowledgeData.docs?.find(p => p.slug === slug);
        if (post) {
          postDataMap[slug] = post;
        }
      } catch (fetchError) {
        console.error(`Error fetching post ${slug}:`, fetchError);
      }
    }

    // Retry each failed email with rate limiting
    for (let i = 0; i < failedEmails.length; i++) {
      const failure = failedEmails[i];
      
      // Add delay between emails to respect rate limit (except for first email)
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, 600)); // 600ms = ~1.67 requests/second
      }

      const post = postDataMap[failure.post_slug];
      if (!post) {
        console.warn(`⚠️  Post not found for ${failure.post_slug}, skipping...`);
        stillFailedCount++;
        errors.push({ 
          email: failure.email, 
          post_slug: failure.post_slug, 
          error: "Post not found in knowledge corpus" 
        });
        continue;
      }

      const { title, slug, email_summary, summary, publish_date, type } = post;
      const isDevotional = type === 'devotional';
      const postUrl = `${siteUrl}/journal/${slug}`;
      const postSummary = email_summary || summary || "Read the full post to learn more.";
      const publishDate = publish_date 
        ? new Date(publish_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
        : new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

      const emailSubject = isDevotional 
        ? `New Devotional: ${escapeHtml(title)}`
        : `New Journal Post: ${escapeHtml(title)}`;
      
      const emailHeader = isDevotional ? "New Devotional" : "New Journal Post";
      const emailFooter = isDevotional
        ? `You're receiving this because you subscribed to devotionals at ${siteUrl}/journal`
        : `You're receiving this because you subscribed to journal updates at ${siteUrl}/journal`;
      
      const viewAllLink = isDevotional ? `${siteUrl}/faith` : `${siteUrl}/journal`;
      const viewAllText = isDevotional ? "View all devotionals" : "View all journal posts";

      // Retry logic with 3 attempts
      let retries = 3;
      let sent = false;

      while (retries > 0 && !sent) {
        try {
          console.log(`📨 Retrying email to ${failure.email} for ${slug}... (${4 - retries}/3 attempt)`);
          const result = await resend.emails.send({
            from,
            to: failure.email,
            subject: emailSubject,
            html: `
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
            `
          });

          if (result?.error) {
            // Check if it's a rate limit error
            if (result.error.name === 'rate_limit_exceeded' || result.error.statusCode === 429) {
              retries--;
              if (retries > 0) {
                console.warn(`⏳ Rate limit hit for ${failure.email}, waiting 2 seconds before retry...`);
                await new Promise(resolve => setTimeout(resolve, 2000));
                continue;
              } else {
                // Still failed after retries - update failure record
                stillFailedCount++;
                errors.push({ email: failure.email, post_slug: slug, error: result.error });
                await supabaseAdmin
                  .from("journal_email_failures")
                  .update({ 
                    retry_count: failure.retry_count + 1,
                    last_retry_at: new Date().toISOString(),
                    error_message: result.error.message || JSON.stringify(result.error)
                  })
                  .eq("id", failure.id);
                console.error(`❌ Still failed after retries: ${failure.email} for ${slug}`);
              }
            } else {
              // Non-rate-limit error - mark as failed
              stillFailedCount++;
              errors.push({ email: failure.email, post_slug: slug, error: result.error });
              await supabaseAdmin
                .from("journal_email_failures")
                .update({ 
                  status: 'failed',
                  retry_count: failure.retry_count + 1,
                  last_retry_at: new Date().toISOString(),
                  resolved_at: new Date().toISOString(),
                  error_message: result.error.message || JSON.stringify(result.error)
                })
                .eq("id", failure.id);
              sent = true; // Exit retry loop
            }
          } else {
            // Success! Update failure record
            retriedCount++;
            await supabaseAdmin
              .from("journal_email_failures")
              .update({ 
                status: 'sent',
                retry_count: failure.retry_count + 1,
                last_retry_at: new Date().toISOString(),
                resolved_at: new Date().toISOString(),
                resend_email_id: result?.data?.id || null
              })
              .eq("id", failure.id);
            console.log(`✅ Successfully retried email to ${failure.email} for ${slug}`);
            sent = true; // Success, exit retry loop
          }
        } catch (emailError) {
          // Check if it's a rate limit error
          if (emailError.message?.includes('rate_limit') || emailError.statusCode === 429) {
            retries--;
            if (retries > 0) {
              console.warn(`⏳ Rate limit hit for ${failure.email}, waiting 2 seconds before retry...`);
              await new Promise(resolve => setTimeout(resolve, 2000));
              continue;
            } else {
              stillFailedCount++;
              errors.push({ email: failure.email, post_slug: slug, error: emailError.message });
              await supabaseAdmin
                .from("journal_email_failures")
                .update({ 
                  retry_count: failure.retry_count + 1,
                  last_retry_at: new Date().toISOString(),
                  error_message: emailError.message
                })
                .eq("id", failure.id);
            }
          } else {
            // Non-rate-limit error - mark as failed
            stillFailedCount++;
            errors.push({ email: failure.email, post_slug: slug, error: emailError.message });
            await supabaseAdmin
              .from("journal_email_failures")
              .update({ 
                status: 'failed',
                retry_count: failure.retry_count + 1,
                last_retry_at: new Date().toISOString(),
                resolved_at: new Date().toISOString(),
                error_message: emailError.message
              })
              .eq("id", failure.id);
            sent = true; // Exit retry loop
          }
        }
      }
    }

    console.log(`✅ Retry complete: ${retriedCount} sent, ${stillFailedCount} still failed`);

    return res.status(200).json({ 
      ok: true, 
      message: `Retry complete: ${retriedCount} sent, ${stillFailedCount} still failed`,
      retried: retriedCount,
      failed: stillFailedCount,
      total_processed: failedEmails.length,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (err) {
    console.error("Retry failed emails error:", err);
    return res.status(500).json({ 
      error: "Server error processing retry.",
      details: err.message 
    });
  }
}

