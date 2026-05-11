# Why Today's Devotional May Not Have Been Emailed

## How the email flow works

1. **Cron job** (`api/cron/daily-devotional-notify.js`) runs **once per day at 6:20 AM UTC** (see `vercel.json` → `crons` → `"20 6 * * *"`). That is about **1:20 AM US Eastern** during standard time (EST); during daylight saving (EDT) about **2:20 AM Eastern**. (It was moved off **:00** UTC so it does not start at the same instant as other scheduled jobs, including the failed-email retry below.)
2. **Failed-email retry** (`api/cron/retry-failed-emails.js`) runs **four times a day at :05 past** midnight, 6 AM, noon, and 6 PM UTC (`5 */6 * * *` in `vercel.json`). On the 6 AM UTC hour, retry runs at **6:05** and the devotional send runs at **6:20**, so they do not stack on the same minute.
3. When the devotional cron runs it:
   - Fetches devotionals from the **live site**: `GET https://www.archetypeoriginal.com/api/knowledge?type=devotional`
   - Filters for devotionals where `publish_date` (YYYY-MM-DD) equals **today’s calendar date in the publication timezone** (`PUBLICATION_TIME_ZONE`, default `America/Chicago`) — **same rule as `build-knowledge.mjs`**, so the cron and the corpus stay aligned.
   - Loads subscribers from `journal_subscriptions` where `subscribe_devotionals = true` and `is_active = true`
   - Sends one email per subscriber via Resend (requires `RESEND_API_KEY` on Vercel; otherwise the job returns 500 with a clear message).

4. **GitHub Actions backup** (`.github/workflows/update-journal.yml`): after the workflow **commits** an updated `public/knowledge.json`, it waits **90 seconds** then runs `scripts/notify-todays-devotionals-from-corpus.mjs`, which POSTs to `/api/journal/notify` with the **full post object** from the freshly built corpus. That covers the common case where the **scheduled morning cron already ran** before the deploy that added today’s devotional to the live site.

5. **No duplicate broadcasts:** Supabase table `journal_devotional_notify_sent` (see `database/journal_devotional_notify_sent.sql`) stores one row per devotional **slug + publish calendar date**. The cron and `/api/journal/notify` **claim** that row before sending; a second caller gets `skipped: already_sent` and sends nothing. If a run claims the row but **zero** emails succeed, the row is **removed** so a later retry can still go out.

6. **Knowledge API** (`api/knowledge/index.js`) returns whatever is in the deployed `public/knowledge.json`. That file is produced by `build-knowledge.mjs`, which **excludes future devotionals** (only includes entries with `publish_date <= build date` in the publication timezone).

### Required once: dedupe table

Run the SQL in **`database/journal_devotional_notify_sent.sql`** in the Supabase SQL editor (same project the site uses for `journal_subscriptions`). Until that table exists, devotional notify and the daily cron will return a **500** with a hint to apply the migration — no silent skip.

## Most likely cause: timing

- The cron runs **once at 6:20 AM UTC** (about twenty minutes after 6:00 AM UTC—roughly 1:20 AM Eastern standard time, 12:20 AM Central standard time, or 10:20 PM Pacific the previous calendar day in standard time; add an hour where daylight saving applies).
- It only sees the **currently deployed** `knowledge.json` at that moment.
- If the deployment that added **today’s** devotional (and thus put it in `knowledge.json`) happened **after** 6:20 AM UTC that day, the cron had already run and did **not** see that devotional → **no emails** for that day.
- The site can still show “today’s” devotional because the new deploy (with today’s devotional in `knowledge.json`) is what users see; the cron does not run again until the next day (and then looks for *that* day’s `publish_date`).

So: **devotional went live on the site, but didn’t get emailed** is consistent with the cron running before the deploy that added today’s devotional to the live `knowledge.json`.

## Other possible causes

1. **No subscribers**  
   No rows in `journal_subscriptions` with `subscribe_devotionals = true` and `is_active = true` → cron finds 0 subscribers and sends nothing (it still returns 200).

2. **Cron not running**  
   Vercel cron disabled, misconfigured, or failing (e.g. 401 if `CRON_SECRET` is set and the request doesn’t send the right `Authorization: Bearer <CRON_SECRET>`).

3. **Env / Resend**  
   Missing or invalid `RESEND_API_KEY` or sender config → cron could fail when sending (check Vercel function logs).

4. **Auth**  
   If `CRON_SECRET` is set in Vercel, the cron request must send `Authorization: Bearer <CRON_SECRET>`. Vercel’s cron trigger sends this only if configured; otherwise the handler returns 401 and no emails are sent.

## What to do

### 1. Manually send today’s devotional email

Call the journal notify API with the slug of today’s devotional (from the URL, e.g. `/journal/leading-from-love-not-urgency` → slug `leading-from-love-not-urgency`):

```bash
curl -X POST https://www.archetypeoriginal.com/api/journal/notify \
  -H "Content-Type: application/json" \
  -d '{"postSlug": "SLUG_OF_TODAYS_DEVOTIONAL"}'
```

That uses the **current** knowledge corpus on the live site and sends to all active devotional subscribers. No cron timing involved.

### 2. Confirm cron and subscribers

- **Vercel** → Project → **Cron Jobs** (or **Logs**): confirm `daily-devotional-notify` runs at **6:20 AM UTC** and check for 401/5xx or Resend errors.
- **Database**: confirm there are rows in `journal_subscriptions` with `subscribe_devotionals = true` and `is_active = true`.

### 3. Optional: manual notify after deploy

If the GitHub backup did not run (no `knowledge.json` commit) or you need an immediate send, use the `curl` above or `node scripts/send-journal-notification.mjs <slug>`.

### 4. Optional: cron time

- Change the cron to a time **after** your usual deploy window (e.g. 12:00 UTC instead of 6:00 UTC), or
- Keep 6 AM UTC and rely on the **GitHub Actions** backup + manual `POST` when needed.

## Summary

- **Most likely:** The early-morning (ET) cron ran **before** the live site had today’s devotional in `knowledge.json`, so it sent nothing — **not** necessarily a Resend outage.
- **Now also:** After each committed knowledge refresh on `main`, CI waits 90s and runs `notify-todays-devotionals-from-corpus.mjs` so the same day can still be emailed once the corpus is built.
- **Quick fix:** `POST /api/journal/notify` with today’s slug.
- **Ongoing:** Vercel cron logs and `RESEND_API_KEY` on the host.
