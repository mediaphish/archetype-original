/**
 * Where "Book a conversation" goes.
 *
 * Bart, 2026-10-22, chose to send booking buttons straight to Calendly, with
 * the old form's questions moved onto the Calendly booking so nothing it
 * captured is lost (answers are saved by api/calendly/webhook.js). Every
 * booking button on the site still points at /engagement-inquiry?option=...,
 * and that page forwards here, so this is the one place the link lives.
 *
 * Rising leaders are the exception: Bart reads those notes himself first, so
 * option=rising keeps the form.
 */
export const CALENDLY_CONVERSATION_URL = 'https://calendly.com/bartpaden/a-conversation-with-bart';

export const FORM_OPTIONS = new Set(['rising']);

export function bookingUrl(option) {
  const params = new URLSearchParams({
    utm_source: 'archetypeoriginal.com',
    utm_medium: 'site',
    utm_content: option || 'conversation',
  });
  return `${CALENDLY_CONVERSATION_URL}?${params.toString()}`;
}

/** True when this visit to the inquiry page should go to Calendly instead. */
export function shouldForwardToCalendly(search, nav = typeof navigator !== 'undefined' ? navigator : null) {
  // The pre-render robot visits this page to save it; it must not follow the
  // forward, or the saved page would be Calendly's.
  if (nav?.webdriver) return false;
  const option = new URLSearchParams(search || '').get('option');
  return !FORM_OPTIONS.has(option);
}
