/**
 * Accessibility utilities for keyboard navigation and ARIA attributes
 */

/**
 * Handle keyboard events for interactive elements
 */
export const handleKeyDown = (callback, keys = ['Enter', ' ']) => {
  return (e) => {
    if (keys.includes(e.key)) {
      e.preventDefault();
      callback(e);
    }
  };
};

/**
 * Get ARIA label for vote button
 */
export const getVoteAriaLabel = (targetEmail, voteValue, currentVote) => {
  const action = voteValue === 1 ? 'upvote' : 'downvote';
  const current = currentVote === voteValue ? ' (currently selected)' : '';
  return `${action} ${targetEmail}${current}`;
};

/**
 * Get ARIA label for check-in button
 */
export const getCheckInAriaLabel = (email, isCheckedIn) => {
  return isCheckedIn 
    ? `Check out ${email} (early departure)`
    : `Check in ${email}`;
};

/**
 * Get ARIA label for RSVP button
 */
export const getRSVPAriaLabel = (eventTitle, hasRSVP) => {
  return hasRSVP 
    ? `Cancel RSVP for ${eventTitle}`
    : `RSVP for ${eventTitle}`;
};

/**
 * Ensure focus management for modals
 */
export const trapFocus = (element) => {
  if (!element) return;

  const focusableElements = element.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  
  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  const handleTab = (e) => {
    if (e.key !== 'Tab') return;

    if (e.shiftKey) {
      if (document.activeElement === firstElement) {
        e.preventDefault();
        lastElement?.focus();
      }
    } else {
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    }
  };

  element.addEventListener('keydown', handleTab);
  firstElement?.focus();

  return () => {
    element.removeEventListener('keydown', handleTab);
  };
};

/**
 * Announce to screen readers
 */
export const announceToScreenReader = (message, priority = 'polite') => {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;
  
  document.body.appendChild(announcement);
  
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
};
