/**
 * Retry wrapper for Anthropic messages.create calls.
 * Handles temporary "Overloaded" (529) responses with backoff.
 */

const OVERLOAD_FRIENDLY =
  'The AI service is temporarily busy. Wait a minute and try again.';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Detect Anthropic overloaded / capacity errors from SDK throws or raw payloads.
 */
export function isAnthropicOverloaded(err) {
  if (!err) return false;

  const status = err.status || err.statusCode || err?.error?.status;
  if (status === 529) return true;

  const type =
    err.type ||
    err.error?.type ||
    err.error?.error?.type ||
    (typeof err.error === 'object' ? err.error?.type : null);
  if (type === 'overloaded_error') return true;

  const message = String(err.message || err || '');
  if (/overloaded/i.test(message)) return true;

  if (typeof err === 'object') {
    try {
      const raw = JSON.stringify(err);
      if (/overloaded_error|"Overloaded"/i.test(raw)) return true;
    } catch (_) {
      // ignore
    }
  }

  return false;
}

/**
 * Turn Anthropic (or nested) errors into a short, human-readable string.
 */
export function friendlyAnthropicError(err, fallback = 'Reshare engine failed') {
  if (isAnthropicOverloaded(err)) return OVERLOAD_FRIENDLY;

  if (typeof err === 'string' && err.trim()) {
    if (/overloaded/i.test(err)) return OVERLOAD_FRIENDLY;
    // Raw Anthropic JSON blob as a string
    if (err.trim().startsWith('{') && /overloaded/i.test(err)) return OVERLOAD_FRIENDLY;
    return err.length > 300 ? `${err.slice(0, 300)}…` : err;
  }

  const msg = err?.message || err?.error?.message || err?.error?.error?.message;
  if (typeof msg === 'string' && msg.trim()) {
    if (/overloaded/i.test(msg)) return OVERLOAD_FRIENDLY;
    return msg.length > 300 ? `${msg.slice(0, 300)}…` : msg;
  }

  if (err && typeof err === 'object') {
    try {
      const raw = JSON.stringify(err);
      if (/overloaded/i.test(raw)) return OVERLOAD_FRIENDLY;
      return raw.length > 300 ? `${raw.slice(0, 300)}…` : raw;
    } catch (_) {
      // fall through
    }
  }

  return fallback;
}

/**
 * Call anthropic.messages.create with retries on overload / 529.
 *
 * @param {import('@anthropic-ai/sdk').default} client
 * @param {object} params - same args as messages.create
 * @param {{ maxAttempts?: number, label?: string, baseDelayMs?: number }} [options]
 */
export async function anthropicMessagesCreateWithRetry(client, params, options = {}) {
  const maxAttempts = options.maxAttempts ?? 4;
  const label = options.label || 'anthropic';
  const baseDelayMs = options.baseDelayMs ?? 1500;

  let lastErr;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await client.messages.create(params);
    } catch (err) {
      lastErr = err;
      const overloaded = isAnthropicOverloaded(err);
      const retryable = overloaded || err?.status === 429 || err?.status === 500 || err?.status === 503;

      if (!retryable || attempt === maxAttempts) {
        console.error(
          `[anthropicWithRetry] ${label} failed (attempt ${attempt}/${maxAttempts}):`,
          err?.message || err
        );
        throw err;
      }

      // Exponential backoff with light jitter: ~1.5s, 3s, 6s
      const delay = Math.round(baseDelayMs * Math.pow(2, attempt - 1) + Math.random() * 400);
      console.warn(
        `[anthropicWithRetry] ${label} overloaded/busy (attempt ${attempt}/${maxAttempts}) — retrying in ${delay}ms`
      );
      await sleep(delay);
    }
  }

  throw lastErr;
}

export { OVERLOAD_FRIENDLY };
