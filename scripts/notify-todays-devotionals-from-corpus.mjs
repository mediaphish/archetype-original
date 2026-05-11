#!/usr/bin/env node
/**
 * Notify devotional subscribers using the freshly built local public/knowledge.json.
 * Intended for CI right after knowledge.json is committed: sends full `post` in the body
 * so the live site does not need to have redeployed yet for the payload to be correct.
 * The notify API dedupes by slug + publish calendar day (journal_devotional_notify_sent).
 *
 * Matches the same "today" and publish_date rules as api/cron/daily-devotional-notify.js
 * (publication timezone via PUBLICATION_TIME_ZONE / VITE_PUBLICATION_TIME_ZONE, default America/Chicago).
 *
 * Env:
 *   PUBLIC_SITE_URL — target host (default https://www.archetypeoriginal.com)
 *   NOTIFY_DELAY_MS — optional delay before requests (e.g. 90000 so Vercel deploy can finish)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  calendarTodayPublicationTz,
  publicationTimeZone,
  publishDateCalendarOnly,
} from '../lib/publish-eligibility.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const SITE_URL = (process.env.PUBLIC_SITE_URL || 'https://www.archetypeoriginal.com').replace(
  /\/$/,
  ''
);
const delay = Number(process.env.NOTIFY_DELAY_MS || 0) || 0;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  if (delay > 0) {
    console.log(`Waiting ${delay}ms before notify…`);
    await sleep(delay);
  }

  const corpPath = path.join(ROOT, 'public', 'knowledge.json');
  if (!fs.existsSync(corpPath)) {
    console.error('Missing public/knowledge.json — run build-knowledge first.');
    process.exit(1);
  }

  const raw = JSON.parse(fs.readFileSync(corpPath, 'utf8'));
  const docs = raw.docs || [];
  const tz = publicationTimeZone();
  const todayStr = calendarTodayPublicationTz(new Date(), tz);
  console.log(`Publication TZ: ${tz} — today’s calendar date: ${todayStr}`);

  const todays = docs.filter((d) => {
    if (d.type !== 'devotional' || String(d.status).toLowerCase() !== 'published') return false;
    const pub =
      publishDateCalendarOnly(d.publish_date ?? d.date) ||
      String(d.publish_date ?? '')
        .split('T')[0]
        .split(' ')[0];
    return pub === todayStr;
  });

  if (todays.length === 0) {
    console.log('No published devotionals for that date in this corpus — nothing to notify.');
    process.exit(0);
  }

  const headers = { 'Content-Type': 'application/json' };

  for (const post of todays) {
    const slug = post.slug;
    console.log(`POST /api/journal/notify (body.post) slug=${slug}`);
    const res = await fetch(`${SITE_URL}/api/journal/notify`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ post }),
    });
    let body = {};
    try {
      body = await res.json();
    } catch {
      body = {};
    }
    if (!res.ok || !body.ok) {
      console.error(`Failed for ${slug}: HTTP ${res.status}`, body);
      process.exit(1);
    }
    console.log(`  ok sent=${body.sent} failed=${body.failed ?? 0}`);
  }

  console.log('Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
