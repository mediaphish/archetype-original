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
    let postData = post;
    if (postSlug && !post) {
      try {
        const knowledgeResponse = await fetch(`${process.env.PUBLIC_SITE_URL || 'https://www.archetypeoriginal.com'}/api/knowledge?type=journal-post`);
        const knowledgeData = await knowledgeResponse.json();
        postData = knowledgeData.docs?.find(p => p.slug === postSlug);
        
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

    const { title, slug, email_summary, summary, publish_date } = postData;
    
    if (!title || !slug) {
      return res.status(400).json({ error: "Post must have title and slug." });
    }

    // Get all active subscribers
    const { data: subscribers, error: subError } = await supabaseAdmin
      .from("journal_subscriptions")
      .select("email")
      .eq("is_active", true);

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
    
    // Send emails to all subscribers
    let sentCount = 0;
    let failedCount = 0;
    const errors = [];

    for (const subscriber of subscribers) {
      try {
        const result = await resend.emails.send({
          from,
          to: subscriber.email,
          subject: `New Journal Post: ${escapeHtml(title)}`,
          html: `
            <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; line-height:1.6; color:#1A1A1A; max-width:600px; margin:0 auto;">
              <h2 style="margin:0 0 16px 0; color:#1A1A1A; font-size:24px;">New Journal Post</h2>
              <h3 style="margin:0 0 12px 0; color:#1A1A1A; font-size:20px; font-weight:600;">${escapeHtml(title)}</h3>
              <p style="margin:0 0 16px 0; color:#6B6B6B; font-size:14px;">Published: ${publishDate}</p>
              
              <div style="margin:24px 0; padding:16px; background-color:#FAFAF9; border-left:4px solid #C85A3C;">
                <p style="margin:0; color:#1A1A1A; line-height:1.7;">${escapeHtml(postSummary)}</p>
              </div>
              
              <p style="margin:24px 0;">
                <a href="${postUrl}" style="display:inline-block; background-color:#1A1A1A; color:#FFFFFF; padding:12px 24px; text-decoration:none; font-weight:500;">Read Full Article</a>
              </p>
              
              <hr style="border:none;border-top:1px solid #e5e7eb; margin:24px 0;" />
              
              <p style="margin:0 0 8px 0;">
                <a href="${siteUrl}/journal" style="color:#C85A3C; text-decoration:none;">View all journal posts</a>
              </p>
              
              <p style="font-size:12px;color:#6B6B6B; margin:16px 0 0 0;">
                You're receiving this because you subscribed to journal updates at ${siteUrl}/journal
              </p>
            </div>
          `
        });

        if (result?.error) {
          failedCount++;
          errors.push({ email: subscriber.email, error: result.error });
          console.error(`Failed to send email to ${subscriber.email}:`, result.error);
        } else {
          sentCount++;
        }
      } catch (emailError) {
        failedCount++;
        errors.push({ email: subscriber.email, error: emailError.message });
        console.error(`Error sending email to ${subscriber.email}:`, emailError);
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

