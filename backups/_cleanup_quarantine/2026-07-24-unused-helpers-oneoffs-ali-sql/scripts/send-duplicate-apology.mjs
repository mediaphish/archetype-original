#!/usr/bin/env node
/**
 * Trigger the one-time duplicate-devotional apology email on the live site.
 *
 * Env:
 *   PUBLIC_SITE_URL (default https://www.archetypeoriginal.com)
 *   CRON_SECRET — required when the host has CRON_SECRET set
 */

const SITE_URL = (process.env.PUBLIC_SITE_URL || 'https://www.archetypeoriginal.com').replace(
  /\/$/,
  ''
);

const headers = { 'Content-Type': 'application/json' };
if (process.env.CRON_SECRET) {
  headers.Authorization = `Bearer ${process.env.CRON_SECRET}`;
}

const res = await fetch(`${SITE_URL}/api/journal/notify`, {
  method: 'POST',
  headers,
  body: JSON.stringify({ send_duplicate_apology: true }),
});

const body = await res.json().catch(() => ({}));
console.log(JSON.stringify(body, null, 2));

if (!res.ok || !body.ok) {
  console.error(`Failed: HTTP ${res.status}`);
  process.exit(1);
}

console.log(`Done. sent=${body.sent ?? 0}`);
