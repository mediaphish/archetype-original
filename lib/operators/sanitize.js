/**
 * Input sanitization for Operators API - XSS and injection mitigation.
 * Plan 2.5: "Add input sanitization for user-generated content", "Implement XSS protection"
 */

const DEFAULT_MAX_LENGTH = 10000;

/**
 * Strip HTML/script tags and trim. Use for display-safe text (bio, essay, descriptions).
 * Does not allow any HTML.
 */
export function sanitizeText(value, maxLength = DEFAULT_MAX_LENGTH) {
  if (value == null) return '';
  const str = String(value)
    .replace(/<[^>]*>/g, '')
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
    .trim();
  return str.slice(0, maxLength);
}

/**
 * Sanitize for use in HTML attribute (e.g. title). Escapes quotes and angle brackets.
 */
export function escapeAttr(value) {
  if (value == null) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .slice(0, 500);
}

/**
 * Validate and sanitize email (format only; does not verify existence).
 */
export function sanitizeEmail(value) {
  if (!value || typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email.slice(0, 255);
}
