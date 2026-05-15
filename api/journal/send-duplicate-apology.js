/**
 * One-time apology broadcast for duplicate devotional emails (May 2026).
 * POST /api/journal/send-duplicate-apology
 * Also available via POST /api/journal/notify { "send_duplicate_apology": true }
 */

import { supabaseAdmin } from "../../lib/supabase-admin.js";
import { Resend } from "resend";
import { checkDevotionalNotifyAuth } from "../../lib/journal-devotional-notify-guards.js";
import { sendDuplicateApologyBroadcast } from "../../lib/journal-duplicate-apology-broadcast.js";

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const auth = checkDevotionalNotifyAuth(req);
  if (!auth.ok) {
    return res.status(auth.status).json({ error: auth.error });
  }

  if (!process.env.RESEND_API_KEY) {
    return res.status(500).json({ error: "Email provider is not configured." });
  }

  try {
    const result = await sendDuplicateApologyBroadcast(supabaseAdmin, resend);
    if (!result.ok) {
      return res.status(result.status || 500).json({ error: result.error });
    }
    return res.status(200).json(result);
  } catch (err) {
    console.error("[send-duplicate-apology]", err);
    return res.status(500).json({ error: "Server error." });
  }
}
