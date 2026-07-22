/**
 * Vercel Deployment Protection ("Vercel Authentication") blocks ALL requests to this
 * deployment that don't come from a logged-in team member or from Vercel's own Cron
 * scheduler — including requests the deployment makes to itself. Any internal
 * self-fetch call (server code calling one of its own API routes over HTTP) needs this
 * header attached or it will receive { "code": "401", "message": "Protected deployment" }
 * regardless of any application-level auth (CRON_SECRET, session cookies, etc.) — Vercel's
 * edge rejects the request before it ever reaches the function.
 *
 * VERCEL_AUTOMATION_BYPASS_SECRET is automatically injected into every deployment once a
 * "Protection Bypass for Automation" secret is added in Vercel Project Settings →
 * Deployment Protection. No manual env var setup is required beyond adding that secret.
 *
 * Usage: spread this into the headers object of any fetch() call this deployment makes
 * to its own API routes.
 *   fetch(url, { headers: { ...vercelProtectionBypassHeaders(), 'Content-Type': 'application/json' }, ... })
 */
export function vercelProtectionBypassHeaders() {
  const secret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  if (!secret) return {};
  return { 'x-vercel-protection-bypass': secret };
}
