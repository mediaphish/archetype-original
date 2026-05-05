/**
 * Resolved inbox for contact + engagement inquiry notifications.
 * Production historically used a personal Gmail in server mail settings; map that to the Archetype address.
 */
const LEGACY_FORM_INBOX = "bartpaden@gmail.com";
const DEFAULT_FORM_INBOX = "bart@archetypeoriginal.com";

export function contactFormRecipient() {
  const raw = process.env.CONTACT_TO;
  const trimmed = typeof raw === "string" ? raw.trim() : "";
  const lower = trimmed.toLowerCase();
  if (!trimmed || lower === LEGACY_FORM_INBOX) return DEFAULT_FORM_INBOX;
  return trimmed;
}
