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
    const { 
      email, 
      subscribe_journal_entries = true, 
      subscribe_devotionals = false 
    } = req.body || {};
    
    if (!email) {
      return res.status(400).json({ error: "Email address is required." });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Invalid email address." });
    }

    // Require at least one subscription type
    if (!subscribe_journal_entries && !subscribe_devotionals) {
      return res.status(400).json({ error: "Please select at least one subscription type." });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if email already exists
    const { data: existing, error: checkError } = await supabaseAdmin
      .from("journal_subscriptions")
      .select("id, is_active, unsubscribed_at, subscribe_journal_entries, subscribe_devotionals")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error("Error checking existing subscription:", checkError);
      return res.status(500).json({ error: "Database error." });
    }

    // Prepare subscription data
    const subscriptionData = {
      subscribe_journal_entries: Boolean(subscribe_journal_entries),
      subscribe_devotionals: Boolean(subscribe_devotionals)
    };

    // If exists and is active, update preferences
    if (existing && existing.is_active) {
      console.log(`📝 Updating subscription for ${normalizedEmail}:`, {
        current: {
          subscribe_journal_entries: existing.subscribe_journal_entries,
          subscribe_devotionals: existing.subscribe_devotionals
        },
        new: subscriptionData
      });

      const { data: updated, error: updateError } = await supabaseAdmin
        .from("journal_subscriptions")
        .update(subscriptionData)
        .eq("id", existing.id)
        .select()
        .single();

      if (updateError) {
        console.error("Error updating subscription preferences:", updateError);
        return res.status(500).json({ error: "Failed to update subscription preferences." });
      }

      console.log(`✅ Subscription updated successfully for ${normalizedEmail}:`, updated);

      // Send confirmation email when preferences are updated
      await sendConfirmationEmail(normalizedEmail, subscriptionData);

      return res.status(200).json({ 
        ok: true, 
        message: "Subscription preferences updated!",
        already_subscribed: true,
        updated: updated
      });
    }

    // If exists but was unsubscribed, reactivate it with new preferences
    if (existing && !existing.is_active) {
      console.log(`📝 Reactivating subscription for ${normalizedEmail}:`, subscriptionData);
      
      const { data: reactivated, error: updateError } = await supabaseAdmin
        .from("journal_subscriptions")
        .update({ 
          is_active: true,
          subscribed_at: new Date().toISOString(),
          unsubscribed_at: null,
          ...subscriptionData
        })
        .eq("id", existing.id)
        .select()
        .single();

      if (updateError) {
        console.error("❌ Error reactivating subscription:", updateError);
        return res.status(500).json({ error: "Failed to reactivate subscription." });
      }

      console.log(`✅ Subscription reactivated successfully for ${normalizedEmail}:`, reactivated);

      // Send confirmation email
      const emailResult = await sendConfirmationEmail(normalizedEmail, subscriptionData);
      
      if (!emailResult.sent) {
        console.warn(`⚠️  Subscription reactivated but confirmation email failed for ${normalizedEmail}`);
      }
      
      return res.status(200).json({ 
        ok: true, 
        message: "Welcome back! Your subscription has been reactivated.",
        reactivated: true,
        email_sent: emailResult.sent
      });
    }

    // Create new subscription
    console.log(`📝 Creating new subscription for ${normalizedEmail}:`, subscriptionData);
    
    const { data: subscription, error: insertError } = await supabaseAdmin
      .from("journal_subscriptions")
      .insert([
        {
          email: normalizedEmail,
          is_active: true,
          subscribed_at: new Date().toISOString(),
          ...subscriptionData
        }
      ])
      .select()
      .single();

    if (insertError) {
      console.error("❌ Error creating subscription:", insertError);
      return res.status(500).json({ error: "Failed to create subscription." });
    }

    console.log(`✅ Subscription created successfully for ${normalizedEmail}:`, subscription);

    // Send confirmation email
    const emailResult = await sendConfirmationEmail(normalizedEmail, subscriptionData);
    
    if (!emailResult.sent) {
      console.warn(`⚠️  Subscription created but confirmation email failed for ${normalizedEmail}`);
    }

    return res.status(200).json({ 
      ok: true, 
      message: "Successfully subscribed!",
      subscription_id: subscription.id,
      email_sent: emailResult.sent
    });

  } catch (err) {
    console.error("Subscription error:", err);
    return res.status(500).json({ error: "Server error." });
  }
}

async function sendConfirmationEmail(email, preferences = {}) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not configured, skipping confirmation email");
    return { sent: false, reason: "RESEND_API_KEY not configured" };
  }

  const from = process.env.CONTACT_FROM || "Archetype Original <noreply@archetypeoriginal.com>";
  const siteUrl = process.env.PUBLIC_SITE_URL || "https://www.archetypeoriginal.com";

  // Build subscription list
  const subscriptions = [];
  if (preferences.subscribe_journal_entries) {
    subscriptions.push("Servant Leadership Entries");
  }
  if (preferences.subscribe_devotionals) {
    subscriptions.push("Servant Leadership Devotional");
  }
  const subscriptionText = subscriptions.length > 0 
    ? subscriptions.join(" and ")
    : "updates";

  console.log(`📧 Sending confirmation email to ${email} for: ${subscriptionText}`);

  try {
    const result = await resend.emails.send({
      from,
      to: email,
      subject: "You're subscribed to Archetype Original",
      html: `
        <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; line-height:1.6; color:#1A1A1A; max-width:600px; margin:0 auto;">
          <h2 style="margin:0 0 16px 0; color:#1A1A1A;">Thanks for subscribing!</h2>
          <p>You'll now receive email notifications for ${subscriptionText}.</p>
          <p>We share thoughts, insights, and lessons learned from 32+ years of building companies and growing people.</p>
          <p style="margin-top:24px;">
            <a href="${siteUrl}/journal" style="display:inline-block; background-color:#1A1A1A; color:#FFFFFF; padding:12px 24px; text-decoration:none; font-weight:500;">Read the Journal</a>
          </p>
          <hr style="border:none;border-top:1px solid #e5e7eb; margin:24px 0;" />
          <p style="font-size:12px;color:#6B6B6B;">
            You're receiving this because you subscribed to updates at ${siteUrl}/journal
          </p>
        </div>
      `
    });

    if (result?.error) {
      console.error(`❌ Failed to send confirmation email to ${email}:`, result.error);
      return { sent: false, error: result.error };
    }

    console.log(`✅ Confirmation email sent successfully to ${email}, Resend ID: ${result?.data?.id || 'unknown'}`);
    return { sent: true, resendId: result?.data?.id };
  } catch (emailError) {
    console.error(`❌ Error sending confirmation email to ${email}:`, emailError);
    return { sent: false, error: emailError.message };
  }
}

