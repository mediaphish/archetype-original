/**
 * Client-side error tracking utility
 * Sends errors to monitoring endpoint for logging and analysis
 */

/**
 * Track an error to the monitoring service
 */
export const trackError = async (error, errorInfo = null, context = {}) => {
  // Don't track errors in development unless explicitly enabled
  if (process.env.NODE_ENV === 'development' && !process.env.VITE_ENABLE_ERROR_TRACKING) {
    console.error('Error tracked (dev mode):', error, errorInfo, context);
    return;
  }

  try {
    const errorData = {
      error: error?.message || String(error),
      message: error?.message || 'Unknown error',
      stack: error?.stack || null,
      url: window.location.href,
      userAgent: navigator.userAgent,
      userId: context.userId || context.email || null,
      timestamp: new Date().toISOString(),
      context: {
        ...context,
        componentStack: errorInfo?.componentStack || null,
      },
    };

    // Send to monitoring endpoint
    await fetch('/api/monitoring/errors', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(errorData),
    }).catch((fetchError) => {
      // Silently fail - don't break the app if error tracking fails
      console.error('Failed to send error to monitoring:', fetchError);
    });
  } catch (trackingError) {
    // Silently fail - don't break the app if error tracking fails
    console.error('Error tracking failed:', trackingError);
  }
};

/**
 * Track API errors
 */
export const trackAPIError = async (error, endpoint, method = 'GET', context = {}) => {
  await trackError(
    error,
    null,
    {
      ...context,
      type: 'api_error',
      endpoint,
      method,
    }
  );
};

/**
 * Track performance metrics
 */
export const trackPerformance = async (metricName, value, unit = 'ms', context = {}) => {
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
        event: 'performance_metric',
        properties: {
          metric: metricName,
          value,
          unit,
          ...context,
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
 * Measure and track function execution time
 */
export const measurePerformance = async (fn, metricName, context = {}) => {
  const startTime = performance.now();
  
  try {
    const result = await fn();
    const duration = performance.now() - startTime;
    
    await trackPerformance(metricName, duration, 'ms', context);
    
    return result;
  } catch (error) {
    const duration = performance.now() - startTime;
    await trackPerformance(`${metricName}_error`, duration, 'ms', { ...context, error: error.message });
    throw error;
  }
};
