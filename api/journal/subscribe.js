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
    const { email } = req.body || {};
    
    if (!email) {
      return res.status(400).json({ error: "Email address is required." });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Invalid email address." });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if email already exists
    const { data: existing, error: checkError } = await supabaseAdmin
      .from("journal_subscriptions")
      .select("id, is_active, unsubscribed_at")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error("Error checking existing subscription:", checkError);
      return res.status(500).json({ error: "Database error." });
    }

    // If exists and is active, return success (idempotent)
    if (existing && existing.is_active) {
      return res.status(200).json({ 
        ok: true, 
        message: "You're already subscribed!",
        already_subscribed: true 
      });
    }

    // If exists but was unsubscribed, reactivate it
    if (existing && !existing.is_active) {
      const { error: updateError } = await supabaseAdmin
        .from("journal_subscriptions")
        .update({ 
          is_active: true,
          subscribed_at: new Date().toISOString(),
          unsubscribed_at: null
        })
        .eq("id", existing.id);

      if (updateError) {
        console.error("Error reactivating subscription:", updateError);
        return res.status(500).json({ error: "Failed to reactivate subscription." });
      }

      // Send confirmation email
      await sendConfirmationEmail(normalizedEmail);
      
      return res.status(200).json({ 
        ok: true, 
        message: "Welcome back! Your subscription has been reactivated.",
        reactivated: true 
      });
    }

    // Create new subscription
    const { data: subscription, error: insertError } = await supabaseAdmin
      .from("journal_subscriptions")
      .insert([
        {
          email: normalizedEmail,
          is_active: true,
          subscribed_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (insertError) {
      console.error("Error creating subscription:", insertError);
      return res.status(500).json({ error: "Failed to create subscription." });
    }

    // Send confirmation email
    await sendConfirmationEmail(normalizedEmail);

    return res.status(200).json({ 
      ok: true, 
      message: "Successfully subscribed!",
      subscription_id: subscription.id 
    });

  } catch (err) {
    console.error("Subscription error:", err);
    return res.status(500).json({ error: "Server error." });
  }
}

async function sendConfirmationEmail(email) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not configured, skipping confirmation email");
    return;
  }

  const from = process.env.CONTACT_FROM || "Archetype Original <noreply@archetypeoriginal.com>";
  const siteUrl = process.env.PUBLIC_SITE_URL || "https://www.archetypeoriginal.com";

  try {
    const result = await resend.emails.send({
      from,
      to: email,
      subject: "You're subscribed to Archetype Original Journal",
      html: `
        <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; line-height:1.6; color:#1A1A1A; max-width:600px; margin:0 auto;">
          <h2 style="margin:0 0 16px 0; color:#1A1A1A;">Thanks for subscribing!</h2>
          <p>You'll now receive an email notification whenever a new journal post is published on Archetype Original.</p>
          <p>We share thoughts, insights, and lessons learned from 32+ years of building companies and growing people.</p>
          <p style="margin-top:24px;">
            <a href="${siteUrl}/journal" style="display:inline-block; background-color:#1A1A1A; color:#FFFFFF; padding:12px 24px; text-decoration:none; font-weight:500;">Read the Journal</a>
          </p>
          <hr style="border:none;border-top:1px solid #e5e7eb; margin:24px 0;" />
          <p style="font-size:12px;color:#6B6B6B;">
            You're receiving this because you subscribed to journal updates at ${siteUrl}/journal
          </p>
        </div>
      `
    });

    if (result?.error) {
      console.error("Failed to send confirmation email:", result.error);
    }
  } catch (emailError) {
    console.error("Error sending confirmation email:", emailError);
  }
}

