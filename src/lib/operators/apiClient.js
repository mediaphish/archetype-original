/**
 * Standardized API client wrapper with consistent error handling
 */

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
    
    // For GET requests, check cache first (5 second TTL)
    if ((!options.method || options.method === 'GET') && this.responseCache.has(requestKey)) {
      const cached = this.responseCache.get(requestKey);
      if (Date.now() - cached.timestamp < 5000) {
        return cached.data;
      }
      this.responseCache.delete(requestKey);
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
            this.responseCache.set(requestKey, {
              data,
              timestamp: Date.now()
            });
          }
          
          return data;
        } catch (error) {
          lastError = error;

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
