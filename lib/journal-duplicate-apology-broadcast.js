import { claimDevotionalBroadcast } from "./journal-devotional-notify-dedupe.js";
import {
  filterDevotionalRecipientsNotYetSent,
  recordDevotionalRecipientsSent,
} from "./journal-devotional-recipient-dedupe.js";
import { resendBroadcastSameHtml } from "./resend-broadcast-same-html.js";

export const APOLOGY_SLUG = "system-duplicate-devotional-apology-2026-05";
export const APOLOGY_PUBLISH_DAY = "2026-05-15";
export const APOLOGY_SUBJECT = "We're sorry about the duplicate emails";

export function buildApologyHtml(siteUrl) {
  return `
  <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; line-height:1.7; color:#1A1A1A; max-width:600px; margin:0 auto; padding:8px 0;">
    <p style="margin:0 0 16px 0;">We're very sorry for the duplicate emails. We have been expanding our system as a whole and created a bug while doing so. This should be eliminated very soon.</p>
    <p style="margin:0 0 8px 0;">Sincerely,</p>
    <p style="margin:0; font-weight:600;">Bart Paden</p>
    <p style="margin:0 0 24px 0; color:#6B6B6B;">Founder, Archetype Original</p>
    <hr style="border:none;border-top:1px solid #e5e7eb; margin:24px 0;" />
    <p style="font-size:12px;color:#6B6B6B; margin:0;">
      You're receiving this because you subscribe to devotionals at <a href="${siteUrl}/faith" style="color:#C85A3C;text-decoration:none;">Archetype Original</a>.
    </p>
  </div>`;
}

/**
 * One-time apology to all active devotional subscribers. Send-once dedupe.
 * @param {*} supabaseAdmin
 * @param {import('resend').Resend} resend
 */
export async function sendDuplicateApologyBroadcast(supabaseAdmin, resend) {
  const claim = await claimDevotionalBroadcast(
    supabaseAdmin,
    APOLOGY_SLUG,
    APOLOGY_PUBLISH_DAY,
    "duplicate_apology"
  );
  if (claim.duplicate) {
    return { ok: true, sent: 0, skipped: "apology_already_sent" };
  }
  if (claim.error) {
    return { ok: false, status: 500, error: claim.error };
  }

  const { data: subscribers, error: subError } = await supabaseAdmin
    .from("journal_subscriptions")
    .select("id, email")
    .eq("is_active", true)
    .eq("subscribe_devotionals", true);

  if (subError) {
    return { ok: false, status: 500, error: "Failed to fetch subscribers." };
  }
  if (!subscribers?.length) {
    return { ok: true, sent: 0, message: "No subscribers." };
  }

  const recipientsToSend = await filterDevotionalRecipientsNotYetSent(
    supabaseAdmin,
    APOLOGY_SLUG,
    APOLOGY_PUBLISH_DAY,
    subscribers
  );

  if (recipientsToSend.length === 0) {
    return {
      ok: true,
      sent: 0,
      skipped: "all_recipients_already_sent",
    };
  }

  const from =
    process.env.CONTACT_FROM || "Archetype Original <noreply@archetypeoriginal.com>";
  const siteUrl = process.env.PUBLIC_SITE_URL || "https://www.archetypeoriginal.com";

  const { sent, failed, failures, sentAddresses } = await resendBroadcastSameHtml({
    resend,
    from,
    subject: APOLOGY_SUBJECT,
    html: buildApologyHtml(siteUrl),
    recipients: recipientsToSend,
  });

  if (sentAddresses?.length > 0) {
    await recordDevotionalRecipientsSent(
      supabaseAdmin,
      APOLOGY_SLUG,
      APOLOGY_PUBLISH_DAY,
      sentAddresses,
      "duplicate_apology"
    );
  }

  return {
    ok: true,
    message: `Apology sent to ${sent} subscriber(s).`,
    sent,
    failed,
    total_subscribers: subscribers.length,
    errors:
      failures?.length > 0
        ? failures.map((f) => ({ email: f.recipient?.email, error: f.error }))
        : undefined,
  };
}
