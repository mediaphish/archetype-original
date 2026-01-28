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
 * Standard API client with consistent error handling and retry logic
 */
class APIClient {
  constructor(baseURL = '') {
    this.baseURL = baseURL;
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
   * Make API request with retry logic
   */
  async request(endpoint, options = {}, retries = 2) {
    const url = `${this.baseURL}${endpoint}`;
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

    let lastError;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, config);
        return await this.handleResponse(response);
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
      }
    }

    throw lastError;
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
