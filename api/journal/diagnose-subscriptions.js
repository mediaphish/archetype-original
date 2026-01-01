/**
 * Diagnose subscription issues - check all subscribers and their preferences
 * GET /api/journal/diagnose-subscriptions
 */

import { supabaseAdmin } from "../../lib/supabase-admin.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    // Get ALL subscribers (active and inactive)
    const { data: allSubscribers, error: allError } = await supabaseAdmin
      .from("journal_subscriptions")
      .select("*")
      .order("subscribed_at", { ascending: false });

    if (allError) {
      console.error("Error fetching all subscribers:", allError);
      return res.status(500).json({ error: "Database error." });
    }

    // Get active devotional subscribers (what the cron job uses)
    const { data: devotionalSubs, error: devError } = await supabaseAdmin
      .from("journal_subscriptions")
      .select("email, subscribe_devotionals, subscribe_journal_entries")
      .eq("is_active", true)
      .eq("subscribe_devotionals", true);

    if (devError) {
      console.error("Error fetching devotional subscribers:", devError);
      return res.status(500).json({ error: "Database error." });
    }

    // Get active journal subscribers
    const { data: journalSubs, error: journalError } = await supabaseAdmin
      .from("journal_subscriptions")
      .select("email, subscribe_devotionals, subscribe_journal_entries")
      .eq("is_active", true)
      .eq("subscribe_journal_entries", true);

    if (journalError) {
      console.error("Error fetching journal subscribers:", journalError);
      return res.status(500).json({ error: "Database error." });
    }

    // Analyze the data
    const totalSubscribers = allSubscribers?.length || 0;
    const activeSubscribers = allSubscribers?.filter(s => s.is_active) || [];
    const inactiveSubscribers = allSubscribers?.filter(s => !s.is_active) || [];
    
    const activeWithDevotionals = activeSubscribers.filter(s => s.subscribe_devotionals);
    const activeWithoutDevotionals = activeSubscribers.filter(s => !s.subscribe_devotionals);
    const activeWithJournal = activeSubscribers.filter(s => s.subscribe_journal_entries);
    const activeWithoutJournal = activeSubscribers.filter(s => !s.subscribe_journal_entries);

    // Find subscribers who are active but won't receive devotionals
    const missingDevotionals = activeSubscribers.filter(s => 
      s.is_active && !s.subscribe_devotionals
    );

    return res.status(200).json({
      summary: {
        total_subscribers: totalSubscribers,
        active_subscribers: activeSubscribers.length,
        inactive_subscribers: inactiveSubscribers.length,
        active_devotional_subscribers: devotionalSubs?.length || 0,
        active_journal_subscribers: journalSubs?.length || 0,
        active_with_devotionals: activeWithDevotionals.length,
        active_without_devotionals: activeWithoutDevotionals.length,
        active_with_journal: activeWithJournal.length,
        active_without_journal: activeWithoutJournal.length,
        missing_devotional_emails: missingDevotionals.length
      },
      devotional_subscribers: devotionalSubs?.map(s => s.email) || [],
      missing_devotionals: missingDevotionals.map(s => ({
        email: s.email,
        subscribe_journal_entries: s.subscribe_journal_entries,
        subscribe_devotionals: s.subscribe_devotionals,
        subscribed_at: s.subscribed_at
      })),
      all_subscribers: allSubscribers?.map(s => ({
        email: s.email,
        is_active: s.is_active,
        subscribe_journal_entries: s.subscribe_journal_entries,
        subscribe_devotionals: s.subscribe_devotionals,
        subscribed_at: s.subscribed_at,
        unsubscribed_at: s.unsubscribed_at
      })) || []
    });

  } catch (err) {
    console.error("Error diagnosing subscriptions:", err);
    return res.status(500).json({ error: "Server error." });
  }
}

