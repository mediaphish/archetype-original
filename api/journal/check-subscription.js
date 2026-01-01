/**
 * Check subscription status for a specific email
 * GET /api/journal/check-subscription?email=cariepaden@gmail.com
 */

import { supabaseAdmin } from "../../lib/supabase-admin.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { email } = req.query || {};
    
    if (!email) {
      return res.status(400).json({ error: "Email address is required." });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check exact match
    const { data: subscription, error: subError } = await supabaseAdmin
      .from("journal_subscriptions")
      .select("*")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (subError) {
      console.error("Error checking subscription:", subError);
      return res.status(500).json({ error: "Database error." });
    }

    if (!subscription) {
      return res.status(200).json({
        found: false,
        email: normalizedEmail,
        message: "No subscription found for this email."
      });
    }

    // Check if they should receive devotionals
    const shouldReceiveDevotionals = subscription.is_active && subscription.subscribe_devotionals;
    const shouldReceiveJournal = subscription.is_active && subscription.subscribe_journal_entries;

    // Get all active devotional subscribers for comparison
    const { data: allDevotionalSubs, error: allError } = await supabaseAdmin
      .from("journal_subscriptions")
      .select("email")
      .eq("is_active", true)
      .eq("subscribe_devotionals", true);

    const isInDevotionalList = allDevotionalSubs?.some(s => s.email.toLowerCase() === normalizedEmail) || false;

    return res.status(200).json({
      found: true,
      email: subscription.email,
      subscription: {
        id: subscription.id,
        email: subscription.email,
        is_active: subscription.is_active,
        subscribe_devotionals: subscription.subscribe_devotionals,
        subscribe_journal_entries: subscription.subscribe_journal_entries,
        subscribed_at: subscription.subscribed_at,
        unsubscribed_at: subscription.unsubscribed_at
      },
      should_receive: {
        devotionals: shouldReceiveDevotionals,
        journal_entries: shouldReceiveJournal
      },
      in_devotional_list: isInDevotionalList,
      total_active_devotional_subscribers: allDevotionalSubs?.length || 0
    });

  } catch (err) {
    console.error("Error checking subscription:", err);
    return res.status(500).json({ error: "Server error." });
  }
}

