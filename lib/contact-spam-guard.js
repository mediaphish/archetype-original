/**
 * Lightweight spam defenses for anonymous public POST forms that email CONTACT_TO.
 * Not a CAPTCHA substitute; pairs well with CDN/WAF if you enable it later.
 */

const RATE_MAX = 8;
const RATE_WINDOW_MS = 60 * 60 * 1000; // rolling 1 hour per IP-ish key
const MIN_HUMAN_DELAY_MS = 2500;
const MAX_FORM_AGE_MS = 48 * 60 * 60 * 1000;

/** @type {Map<string, number[]>} */
const ipBuckets = new Map();

/** Best-effort client key for rate limiting (shared hosting / NAT will share limits). */
export function spamClientKey(req) {
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff.length) {
    return xff.split(',')[0].trim().slice(0, 256) || '';
  }
  const realIp = req.headers['x-real-ip'];
  if (typeof realIp === 'string') return realIp.trim().slice(0, 256);
  const ra = req.socket?.remoteAddress;
  return typeof ra === 'string' ? ra.slice(0, 256) : '';
}

function pruneIfHuge() {
  if (ipBuckets.size <= 3000) return;
  let n = 0;
  for (const k of ipBuckets.keys()) {
    ipBuckets.delete(k);
    if (++n > 900) break;
  }
}

/**
 * Returns true when this IP-ish key exceeds the hourly budget.
 */
export function spamRateLimited(key) {
  if (!key) return false;
  const now = Date.now();
  const prev = ipBuckets.get(key) || [];
  const windowed = prev.filter((t) => now - t < RATE_WINDOW_MS);
  pruneIfHuge();
  if (windowed.length >= RATE_MAX) return true;
  windowed.push(now);
  ipBuckets.set(key, windowed);
  return false;
}

/**
 * Spam generators often omit spaces and use consonant-heavy tokens.
 */
function tokenLooksSpammyGarbage(s, minLen = 14) {
  const t = (s || '').trim();
  if (!t.includes(' ') && t.length >= minLen) {
    const letters = t.replace(/[^a-z]/gi, '');
    if (letters.length < minLen) return false;
    const vowels = (letters.match(/[aeiouy]/gi) || []).length;
    const ratio = vowels / letters.length;
    if (ratio < 0.12) return true;
  }
  return false;
}

function contactContentSpammy(fields) {
  const { name, message, company, phone } = fields || {};
  const nameBad = tokenLooksSpammyGarbage(name || '', 12);
  const msgBad = tokenLooksSpammyGarbage(message || '', 12);
  const coBad = company && tokenLooksSpammyGarbage(company, 12);
  const phBad = phone && tokenLooksSpammyGarbage(String(phone), 12);
  if (nameBad && msgBad) return true;
  if (nameBad && coBad && (company || '').trim().length > 12) return true;
  return !!(phBad && nameBad && msgBad);
}

/**
 * Timing + honeypot + rate + heuristic. Caller strips internal fields afterward.
 *
 * @param {'contact'|'engagement'} formKind
 */
export function evaluateSpamGuards(formKind, req, rawBody = {}) {
  const key = spamClientKey(req);
  const trap = rawBody._trap;
  if (trap != null && String(trap).trim() !== '') {
    return { outcome: 'silently_accept', detail: 'honeypot' };
  }

  if (spamRateLimited(key)) {
    return {
      outcome: 'rate_limit',
      detail: 'rate',
      message: 'Too many submissions from this connection. Try again later.',
    };
  }

  const loaded = Number(rawBody.form_loaded_at);
  if (Number.isFinite(loaded)) {
    const now = Date.now();
    if (now - loaded < MIN_HUMAN_DELAY_MS || loaded > now + 120_000) {
      return { outcome: 'silently_accept', detail: 'timing_fast_or_future' };
    }
    if (now - loaded > MAX_FORM_AGE_MS) {
      return { outcome: 'silently_accept', detail: 'timing_stale' };
    }
  }

  if (formKind === 'contact') {
    const { name, message, company, phone } = rawBody || {};
    if (contactContentSpammy({ name, message, company, phone })) {
      return { outcome: 'silently_accept', detail: 'heuristic_gibberish' };
    }
  }

  return { outcome: 'allow' };
}
