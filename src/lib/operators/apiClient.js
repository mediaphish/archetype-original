/**
 * Standardized API client wrapper with consistent error handling, retry logic, and caching
 */

import { trackAPIError } from './errorTracking';

class APIError extends Error {
  constructor(message, code, details = null) {
    super(message);
    this.name = 'APIError';
    this.code = code;
    this.details = details;
  }
}

/**
 * Standard API client with consistent error handling, retry logic, and request deduplication
 */
class APIClient {
  constructor(baseURL = '') {
    this.baseURL = baseURL;
    this.pendingRequests = new Map(); // Cache for pending requests to prevent duplicates
    this.responseCache = new Map(); // Simple cache for GET requests (5 second TTL)
    this.persistentCache = new Map(); // Persistent cache for certain endpoints (localStorage-backed)
    
    // Load persistent cache from localStorage on initialization
    this.loadPersistentCache();
    
    // Clean up expired cache entries every minute
    setInterval(() => this.cleanExpiredCache(), 60000);
  }

  /**
   * Load persistent cache from localStorage
   */
  loadPersistentCache() {
    try {
      const stored = localStorage.getItem('operators_api_cache');
      if (stored) {
        const parsed = JSON.parse(stored);
        const now = Date.now();
        // Only load non-expired entries
        Object.entries(parsed).forEach(([key, value]) => {
          if (value.expiresAt > now) {
            this.persistentCache.set(key, value);
          }
        });
      }
    } catch (error) {
      console.warn('Failed to load persistent cache:', error);
    }
  }

  /**
   * Save persistent cache to localStorage
   */
  savePersistentCache() {
    try {
      const cacheObj = Object.fromEntries(this.persistentCache);
      localStorage.setItem('operators_api_cache', JSON.stringify(cacheObj));
    } catch (error) {
      console.warn('Failed to save persistent cache:', error);
    }
  }

  /**
   * Clean expired cache entries
   */
  cleanExpiredCache() {
    const now = Date.now();
    
    // Clean in-memory cache
    for (const [key, value] of this.responseCache.entries()) {
      if (now - value.timestamp > 5000) {
        this.responseCache.delete(key);
      }
    }
    
    // Clean persistent cache
    let needsSave = false;
    for (const [key, value] of this.persistentCache.entries()) {
      if (now > value.expiresAt) {
        this.persistentCache.delete(key);
        needsSave = true;
      }
    }
    
    if (needsSave) {
      this.savePersistentCache();
    }
  }

  /**
   * Get cache TTL for an endpoint (in milliseconds)
   * Some endpoints can be cached longer than others
   */
  getCacheTTL(endpoint) {
    // Dashboard and user data can be cached longer
    if (endpoint.includes('/dashboard') || endpoint.includes('/users/me')) {
      return 30000; // 30 seconds
    }
    // Events list can be cached moderately
    if (endpoint.includes('/events') && !endpoint.includes('/events/') && !endpoint.includes('/events/[')) {
      return 10000; // 10 seconds
    }
    // Default short cache
    return 5000; // 5 seconds
  }

  /**
   * Standardize error response format
   */
  async handleResponse(response) {
    const contentType = response.headers.get('content-type');
    const isJSON = contentType && contentType.includes('application/json');

    let data;
    try {
      data = isJSON ? await response.json() : await response.text();
    } catch (error) {
      throw new APIError('Failed to parse response', 'PARSE_ERROR', { originalError: error });
    }

    if (!response.ok) {
      const errorMessage = data?.error || data?.message || `Request failed with status ${response.status}`;
      const errorCode = data?.code || `HTTP_${response.status}`;
      throw new APIError(errorMessage, errorCode, data?.details || null);
    }

    return data;
  }

  /**
   * Make API request with retry logic and request deduplication
   */
  async request(endpoint, options = {}, retries = 2) {
    const url = `${this.baseURL}${endpoint}`;
    const requestKey = `${options.method || 'GET'}:${url}:${options.body ? JSON.stringify(options.body) : ''}`;
    
    // For GET requests, check cache first
    if (!options.method || options.method === 'GET') {
      const cacheTTL = this.getCacheTTL(endpoint);
      
      // Check in-memory cache
      if (this.responseCache.has(requestKey)) {
        const cached = this.responseCache.get(requestKey);
        if (Date.now() - cached.timestamp < cacheTTL) {
          return cached.data;
        }
        this.responseCache.delete(requestKey);
      }
      
      // Check persistent cache for longer-lived data
      if (cacheTTL > 5000 && this.persistentCache.has(requestKey)) {
        const cached = this.persistentCache.get(requestKey);
        if (Date.now() < cached.expiresAt) {
          // Also add to in-memory cache for faster access
          this.responseCache.set(requestKey, {
            data: cached.data,
            timestamp: Date.now(),
          });
          return cached.data;
        }
        this.persistentCache.delete(requestKey);
        this.savePersistentCache();
      }
    }

    // Check if same request is already pending (deduplication)
    if (this.pendingRequests.has(requestKey)) {
      return this.pendingRequests.get(requestKey);
    }

    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    // Remove Content-Type for FormData
    if (options.body instanceof FormData) {
      delete config.headers['Content-Type'];
    }

    // Create promise for this request
    const requestPromise = (async () => {
      let lastError;
      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          const response = await fetch(url, config);
          const data = await this.handleResponse(response);
          
          // Cache GET responses
          if (!options.method || options.method === 'GET') {
            const cacheTTL = this.getCacheTTL(endpoint);
            const now = Date.now();
            
            // Always add to in-memory cache
            this.responseCache.set(requestKey, {
              data,
              timestamp: now,
            });
            
            // Add to persistent cache for longer-lived endpoints
            if (cacheTTL > 5000) {
              this.persistentCache.set(requestKey, {
                data,
                expiresAt: now + cacheTTL,
              });
              this.savePersistentCache();
            }
          }
          
          return data;
        } catch (error) {
          lastError = error;

          // Track API errors (only on final attempt to avoid spam)
          if (attempt === retries) {
            trackAPIError(error, endpoint, options.method || 'GET', {
              attempt: attempt + 1,
              retries,
            }).catch(() => {
              // Silently fail - error tracking shouldn't break the app
            });
          }

          // Don't retry on client errors (4xx) except 429 (rate limit)
          if (error.code && error.code.startsWith('HTTP_4') && error.code !== 'HTTP_429') {
            throw error;
          }

          // Don't retry on last attempt
          if (attempt < retries) {
            // Exponential backoff: wait 2^attempt * 100ms
            const delay = Math.pow(2, attempt) * 100;
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
        } finally {
          // Remove from pending requests when done
          this.pendingRequests.delete(requestKey);
        }
      }

      throw lastError;
    })();

    // Store pending request
    this.pendingRequests.set(requestKey, requestPromise);
    
    return requestPromise;
  }

  /**
   * GET request
   */
  async get(endpoint, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    return this.request(url, { method: 'GET' });
  }

  /**
   * POST request
   */
  async post(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * PUT request
   */
  async put(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  /**
   * DELETE request
   */
  async delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }

  /**
   * POST request with FormData (for file uploads)
   */
  async postFormData(endpoint, formData) {
    return this.request(endpoint, {
      method: 'POST',
      body: formData,
    });
  }
}

// Create singleton instance
const apiClient = new APIClient();

export default apiClient;
export { APIError };
