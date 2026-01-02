/**
 * Automatic Retry Cron Job for Failed Email Notifications
 * 
 * Runs periodically to automatically retry failed email sends.
 * Stops retrying after MAX_RETRIES attempts.
 * 
 * Configured in vercel.json to run at specified intervals.
 */

import { supabaseAdmin } from "../../lib/supabase-admin.js";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const MAX_RETRIES = 5; // Maximum number of retry attempts before marking as permanently failed

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
  const isVercelCron = req.headers['x-vercel-cron'] === '1' || 
                       req.headers['authorization']?.startsWith('Bearer');
  
  // For additional security, you can set CRON_SECRET in environment variables
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
    console.log('🔄 Starting automatic retry of failed emails...');

    // Get pending failures that haven't exceeded max retries
    const { data: failedEmails, error: queryError } = await supabaseAdmin
      .from("journal_email_failures")
      .select("*")
      .eq("status", "pending")
      .lt("retry_count", MAX_RETRIES)
      .order("created_at", { ascending: true })
      .limit(100); // Process up to 100 at a time to avoid timeout

    if (queryError) {
      console.error("Error fetching failed emails:", queryError);
      return res.status(500).json({ error: "Failed to fetch failed emails." });
    }

    if (!failedEmails || failedEmails.length === 0) {
      console.log("✅ No failed emails to retry.");
      return res.status(200).json({ 
        ok: true, 
        message: "No failed emails to retry.",
        retried: 0,
        failed: 0,
        maxed_out: 0
      });
    }

    console.log(`📧 Found ${failedEmails.length} failed email(s) to retry...`);

    const siteUrl = process.env.PUBLIC_SITE_URL || "https://www.archetypeoriginal.com";
    const from = process.env.CONTACT_FROM || "Archetype Original <noreply@archetypeoriginal.com>";
    
    let retriedCount = 0;
    let stillFailedCount = 0;
    let maxedOutCount = 0;
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

    // Filter out failures that have exceeded max retries
    const validFailures = failedEmails.filter(f => {
      if (f.retry_count >= MAX_RETRIES) {
        maxedOutCount++;
        supabaseAdmin
          .from("journal_email_failures")
          .update({ 
            status: 'failed',
            resolved_at: new Date().toISOString(),
            error_message: `Max retries (${MAX_RETRIES}) exceeded. Email could not be delivered.`
          })
          .eq("id", f.id);
        return false;
      }
      return true;
    });

    // Group failures by post_slug for batch sending
    const failuresByPost = {};
    for (const failure of validFailures) {
      if (!failuresByPost[failure.post_slug]) {
        failuresByPost[failure.post_slug] = [];
      }
      failuresByPost[failure.post_slug].push(failure);
    }

    // Process each post's failures in batches
    for (const [postSlug, failures] of Object.entries(failuresByPost)) {
      const post = postDataMap[postSlug];
      if (!post) {
        console.warn(`⚠️  Post not found for ${postSlug}, marking all as failed...`);
        for (const failure of failures) {
          stillFailedCount++;
          errors.push({ 
            email: failure.email, 
            post_slug: postSlug, 
            error: "Post not found in knowledge corpus" 
          });
          await supabaseAdmin
            .from("journal_email_failures")
            .update({ 
              status: 'failed',
              resolved_at: new Date().toISOString(),
              error_message: "Post not found in knowledge corpus"
            })
            .eq("id", failure.id);
        }
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

      // Use batch sending: up to 100 emails per batch
      const BATCH_SIZE = 100;
      for (let i = 0; i < failures.length; i += BATCH_SIZE) {
        const batch = failures.slice(i, i + BATCH_SIZE);
        const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(failures.length / BATCH_SIZE);
        
        console.log(`📦 Retrying batch ${batchNumber}/${totalBatches} for ${slug} (${batch.length} emails)...`);

        // Build batch array for Resend
        const batchEmails = batch.map(failure => ({
          from,
          to: failure.email,
          subject: emailSubject,
          html: emailHtml
        }));

        let retries = 3;
        let batchSent = false;

        while (retries > 0 && !batchSent) {
          try {
            const result = await resend.batch.send(batchEmails);

            if (result?.error) {
              if (result.error.name === 'rate_limit_exceeded' || result.error.statusCode === 429) {
                retries--;
                if (retries > 0) {
                  console.warn(`⏳ Rate limit hit for retry batch ${batchNumber}, waiting 2 seconds...`);
                  await new Promise(resolve => setTimeout(resolve, 2000));
                  continue;
                } else {
                  // Batch failed - update individual records
                  for (const failure of batch) {
                    const newRetryCount = failure.retry_count + 1;
                    const shouldMarkAsFailed = newRetryCount >= MAX_RETRIES;
                    
                    stillFailedCount++;
                    errors.push({ email: failure.email, post_slug: slug, error: result.error });
                    
                    await supabaseAdmin
                      .from("journal_email_failures")
                      .update({ 
                        retry_count: newRetryCount,
                        last_retry_at: new Date().toISOString(),
                        status: shouldMarkAsFailed ? 'failed' : 'pending',
                        resolved_at: shouldMarkAsFailed ? new Date().toISOString() : null,
                        error_message: result.error.message || JSON.stringify(result.error)
                      })
                      .eq("id", failure.id);
                    
                    if (shouldMarkAsFailed) {
                      maxedOutCount++;
                    }
                  }
                  batchSent = true;
                }
              } else {
                // Non-rate-limit error
                for (const failure of batch) {
                  const newRetryCount = failure.retry_count + 1;
                  const shouldMarkAsFailed = newRetryCount >= MAX_RETRIES;
                  
                  stillFailedCount++;
                  errors.push({ email: failure.email, post_slug: slug, error: result.error });
                  
                  await supabaseAdmin
                    .from("journal_email_failures")
                    .update({ 
                      status: shouldMarkAsFailed ? 'failed' : 'pending',
                      retry_count: newRetryCount,
                      last_retry_at: new Date().toISOString(),
                      resolved_at: shouldMarkAsFailed ? new Date().toISOString() : null,
                      error_message: result.error.message || JSON.stringify(result.error)
                    })
                    .eq("id", failure.id);
                  
                  if (shouldMarkAsFailed) {
                    maxedOutCount++;
                  }
                }
                batchSent = true;
              }
            } else {
              // Batch success - check individual results
              const batchResults = result.data || [];
              for (let j = 0; j < batchResults.length; j++) {
                const emailResult = batchResults[j];
                const failure = batch[j];
                const newRetryCount = failure.retry_count + 1;
                
                if (emailResult.error) {
                  const shouldMarkAsFailed = newRetryCount >= MAX_RETRIES;
                  stillFailedCount++;
                  errors.push({ email: failure.email, post_slug: slug, error: emailResult.error });
                  await supabaseAdmin
                    .from("journal_email_failures")
                    .update({ 
                      retry_count: newRetryCount,
                      last_retry_at: new Date().toISOString(),
                      status: shouldMarkAsFailed ? 'failed' : 'pending',
                      resolved_at: shouldMarkAsFailed ? new Date().toISOString() : null,
                      error_message: emailResult.error.message || JSON.stringify(emailResult.error)
                    })
                    .eq("id", failure.id);
                  
                  if (shouldMarkAsFailed) {
                    maxedOutCount++;
                  }
                } else {
                  retriedCount++;
                  await supabaseAdmin
                    .from("journal_email_failures")
                    .update({ 
                      status: 'sent',
                      retry_count: newRetryCount,
                      last_retry_at: new Date().toISOString(),
                      resolved_at: new Date().toISOString(),
                      resend_email_id: emailResult.id || null
                    })
                    .eq("id", failure.id);
                }
              }
              console.log(`✅ Retry batch ${batchNumber} completed for ${slug}`);
              batchSent = true;
            }
          } catch (batchError) {
            if (batchError.message?.includes('rate_limit') || batchError.statusCode === 429) {
              retries--;
              if (retries > 0) {
                console.warn(`⏳ Rate limit hit for retry batch ${batchNumber}, waiting 2 seconds...`);
                await new Promise(resolve => setTimeout(resolve, 2000));
                continue;
              } else {
                for (const failure of batch) {
                  const newRetryCount = failure.retry_count + 1;
                  const shouldMarkAsFailed = newRetryCount >= MAX_RETRIES;
                  
                  stillFailedCount++;
                  errors.push({ email: failure.email, post_slug: slug, error: batchError.message });
                  await supabaseAdmin
                    .from("journal_email_failures")
                    .update({ 
                      retry_count: newRetryCount,
                      last_retry_at: new Date().toISOString(),
                      status: shouldMarkAsFailed ? 'failed' : 'pending',
                      resolved_at: shouldMarkAsFailed ? new Date().toISOString() : null,
                      error_message: batchError.message
                    })
                    .eq("id", failure.id);
                  
                  if (shouldMarkAsFailed) {
                    maxedOutCount++;
                  }
                }
                batchSent = true;
              }
            } else {
              for (const failure of batch) {
                const newRetryCount = failure.retry_count + 1;
                const shouldMarkAsFailed = newRetryCount >= MAX_RETRIES;
                
                stillFailedCount++;
                errors.push({ email: failure.email, post_slug: slug, error: batchError.message });
                await supabaseAdmin
                  .from("journal_email_failures")
                  .update({ 
                    status: shouldMarkAsFailed ? 'failed' : 'pending',
                    retry_count: newRetryCount,
                    last_retry_at: new Date().toISOString(),
                    resolved_at: shouldMarkAsFailed ? new Date().toISOString() : null,
                    error_message: batchError.message
                  })
                  .eq("id", failure.id);
                
                if (shouldMarkAsFailed) {
                  maxedOutCount++;
                }
              }
              batchSent = true;
            }
          }
        }

        // Small delay between batches
        if (i + BATCH_SIZE < failures.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    }

    console.log(`✅ Automatic retry complete: ${retriedCount} sent, ${stillFailedCount} still pending, ${maxedOutCount} maxed out`);

    return res.status(200).json({ 
      ok: true, 
      message: `Automatic retry complete: ${retriedCount} sent, ${stillFailedCount} still pending, ${maxedOutCount} maxed out`,
      retried: retriedCount,
      still_pending: stillFailedCount,
      maxed_out: maxedOutCount,
      total_processed: failedEmails.length,
      errors: errors.length > 0 ? errors.slice(0, 10) : undefined // Limit errors in response
    });

  } catch (err) {
    console.error("❌ Automatic retry cron error:", err);
    return res.status(500).json({ 
      error: "Server error processing automatic retry.",
      details: err.message 
    });
  }
}

