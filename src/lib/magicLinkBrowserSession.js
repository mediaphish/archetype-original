/**
 * ALI + Operators: magic-link follow-up "session" in localStorage (30-day TTL).
 * Email-in-URL flows persist here; expired entries are cleared on read.
 *
 * AO Automation + Bad Leader use server cookies / DB sessions (see lib/ao/requireAoSession.js, lib/badLeaderAuth.js).
 */

export const MAGIC_LINK_BROWSER_SESSION_MS = 30 * 24 * 60 * 60 * 1000;

const STORAGE_V = 1;
const KEY_ALI = 'ali_email';
const KEY_OPERATORS = 'operators_email';

function writeEntry(key, email) {
  const emailLower = String(email || '').trim().toLowerCase();
  if (!emailLower) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
    return;
  }
  try {
    localStorage.setItem(
      key,
      JSON.stringify({
        v: STORAGE_V,
        email: emailLower,
        expiresAt: Date.now() + MAGIC_LINK_BROWSER_SESSION_MS,
      }),
    );
  } catch {
    /* ignore */
  }
}

function parseEntry(raw, key) {
  if (raw == null || raw === '') return null;
  const s = String(raw).trim();
  if (!s) return null;
  if (s.startsWith('{')) {
    try {
      const o = JSON.parse(s);
      const email = String(o.email ?? '').trim().toLowerCase();
      const exp = Number(o.expiresAt);
      if (!email || !Number.isFinite(exp)) {
        try {
          localStorage.removeItem(key);
        } catch {
          /* ignore */
        }
        return null;
      }
      if (exp <= Date.now()) {
        try {
          localStorage.removeItem(key);
        } catch {
          /* ignore */
        }
        return null;
      }
      return email;
    } catch {
      try {
        localStorage.removeItem(key);
      } catch {
        /* ignore */
      }
      return null;
    }
  }
  // Legacy: plain email string — migrate to TTL-wrapped value
  if (s.includes('@')) {
    const email = s.toLowerCase();
    writeEntry(key, email);
    return email;
  }
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
  return null;
}

function readKey(key) {
  if (typeof window === 'undefined') return '';
  try {
    return parseEntry(localStorage.getItem(key), key) || '';
  } catch {
    return '';
  }
}

export function getAliSessionEmail() {
  return readKey(KEY_ALI);
}

export function setAliSessionEmail(email) {
  if (typeof window === 'undefined') return;
  writeEntry(KEY_ALI, email);
}

export function clearAliSessionEmail() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(KEY_ALI);
  } catch {
    /* ignore */
  }
}

export function getOperatorsSessionEmail() {
  return readKey(KEY_OPERATORS);
}

export function setOperatorsSessionEmail(email) {
  if (typeof window === 'undefined') return;
  writeEntry(KEY_OPERATORS, email);
}

export function clearOperatorsSessionEmail() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(KEY_OPERATORS);
  } catch {
    /* ignore */
  }
}
