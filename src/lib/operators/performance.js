/**
 * Performance monitoring utilities
 * Tracks page load times, API response times, and user interactions
 */

import { trackPerformance } from './errorTracking';

/**
 * Track page load performance
 */
export const trackPageLoad = async (pageName) => {
  if (typeof window === 'undefined') return;
  
  // Wait for page to be fully loaded
  if (document.readyState === 'complete') {
    const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
    await trackPerformance('page_load', loadTime, 'ms', { page: pageName });
  } else {
    window.addEventListener('load', () => {
      const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
      trackPerformance('page_load', loadTime, 'ms', { page: pageName });
    });
  }
};

/**
 * Track API response time
 */
export const trackAPIResponseTime = async (endpoint, duration, status = 'success') => {
  await trackPerformance('api_response_time', duration, 'ms', {
    endpoint,
    status,
  });
};

/**
 * Track component render time
 */
export const trackComponentRender = async (componentName, renderTime) => {
  await trackPerformance('component_render', renderTime, 'ms', {
    component: componentName,
  });
};

/**
 * Track user interaction (button clicks, form submissions, etc.)
 */
export const trackInteraction = async (interactionType, details = {}) => {
  if (process.env.NODE_ENV === 'development' && !process.env.VITE_ENABLE_PERFORMANCE_TRACKING) {
    return;
  }

  try {
    await fetch('/api/monitoring/analytics', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        event: 'user_interaction',
        properties: {
          type: interactionType,
          ...details,
        },
        timestamp: new Date().toISOString(),
      }),
    }).catch(() => {
      // Silently fail
    });
  } catch (error) {
    // Silently fail
  }
};

/**
 * Measure time between two performance marks
 */
export const measureBetweenMarks = (startMark, endMark) => {
  try {
    performance.measure('custom-measure', startMark, endMark);
    const measure = performance.getEntriesByName('custom-measure')[0];
    return measure.duration;
  } catch (error) {
    return null;
  }
};
