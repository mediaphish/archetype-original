/**
 * Operators analytics - event tracking for user behavior.
 * Plan 4.2: "Integrate analytics (Google Analytics, Mixpanel, or PostHog)"
 *
 * Track key events: event creation, RSVP, voting, check-in, ROI.
 * Set VITE_ANALYTICS_ENABLED=true and configure your provider (GA, PostHog, etc.) in the app entry.
 */

const isEnabled = () =>
  typeof import.meta !== 'undefined' &&
  import.meta.env?.VITE_ANALYTICS_ENABLED === 'true';

/**
 * Track a custom event. Wire to your analytics provider (GA gtag, PostHog, etc.).
 */
export function trackEvent(eventName, properties = {}) {
  if (!isEnabled()) return;
  try {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', eventName, properties);
    }
    if (typeof window !== 'undefined' && window.posthog) {
      window.posthog.capture(eventName, properties);
    }
    // Fallback: send to monitoring endpoint for internal analytics
    if (typeof window !== 'undefined' && !window.gtag && !window.posthog) {
      fetch('/api/monitoring/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: eventName, ...properties }),
      }).catch(() => {});
    }
  } catch (e) {
    console.warn('[Analytics] trackEvent failed:', e);
  }
}

export const operatorsEvents = {
  eventCreated: 'operators_event_created',
  rsvp: 'operators_rsvp',
  rsvpCancelled: 'operators_rsvp_cancelled',
  vote: 'operators_vote',
  checkIn: 'operators_check_in',
  roiViewed: 'operators_roi_viewed',
  profileSaved: 'operators_profile_saved',
};
