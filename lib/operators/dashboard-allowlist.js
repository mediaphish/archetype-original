/**
 * Aggregate Operators dashboard access rules (browser-safe, no DB).
 * Shared by server handlers and the React app via small re-export barrels.
 */

/**
 * Aggregate dashboard (system-wide metrics): Super Admin, Chief Operator, Accountant only.
 * @param {string[]} roles - operators_users roles
 * @returns {boolean}
 */
export function rolesCanViewOperatorsDashboard(roles) {
  if (!Array.isArray(roles)) return false;
  return (
    roles.includes('super_admin') ||
    roles.includes('chief_operator') ||
    roles.includes('accountant')
  );
}

/** Default viewer(s) for aggregate dashboard when env is not set (comma-separated list). */
export const DEFAULT_OPERATORS_DASHBOARD_EMAILS = 'bart@archetypeoriginal.com';

/**
 * Aggregate dashboard access (comma-separated emails, case-insensitive).
 * - Unset / empty string → uses DEFAULT_OPERATORS_DASHBOARD_EMAILS only.
 * - Literal `ROLE_BASED` → use rolesCanViewOperatorsDashboard (staff roles).
 * - Any other value → that comma-separated allowlist only.
 * Server: process.env.OPERATORS_DASHBOARD_ALLOWED_EMAILS
 * Client: import.meta.env.VITE_OPERATORS_DASHBOARD_ALLOWED_EMAILS (keep in sync when overriding)
 */
export function emailMayViewOperatorsDashboard(email, roles, allowlistEnv) {
  const raw = allowlistEnv != null ? String(allowlistEnv).trim() : '';
  if (raw === 'ROLE_BASED') {
    return rolesCanViewOperatorsDashboard(roles);
  }
  const effective = raw || DEFAULT_OPERATORS_DASHBOARD_EMAILS;
  const allowed = effective.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
  const em = (email || '').trim().toLowerCase();
  return em.length > 0 && allowed.includes(em);
}
