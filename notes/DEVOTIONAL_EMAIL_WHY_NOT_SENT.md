# Why Today's Devotional May Not Have Been Emailed

## How the email flow works

1. **Cron job** (`api/cron/daily-devotional-notify.js`) runs **once per day at 6:00 AM UTC** (see `vercel.json` → `crons` → `"0 6 * * *"`).
2. At that time it:
   - Fetches devotionals from the **live site**: `GET https://www.archetypeoriginal.com/api/knowledge?type=devotional`
   - Filters for devotionals where `publish_date` (YYYY-MM-DD) equals **today in UTC**
   - Loads subscribers from `journal_subscriptions` where `subscribe_devotionals = true` and `is_active = true`
   - Sends one email per subscriber via Resend

3. **Knowledge API** (`api/knowledge/index.js`) returns whatever is in the deployed `public/knowledge.json`. That file is produced by `build-knowledge.mjs`, which **excludes future devotionals** (only includes entries with `publish_date <= build date`).

## Most likely cause: timing

- The cron runs **once at 6:00 AM UTC** (e.g. 1:00 AM Eastern, midnight Central, 10:00 PM Pacific the previous calendar day).
- It only sees the **currently deployed** `knowledge.json` at that moment.
- If the deployment that added **today’s** devotional (and thus put it in `knowledge.json`) happened **after** 6:00 AM UTC that day, the cron had already run and did **not** see that devotional → **no emails** for that day.
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

- **Vercel** → Project → **Cron Jobs** (or **Logs**): confirm `daily-devotional-notify` runs at 6:00 AM UTC and check for 401/5xx or Resend errors.
- **Database**: confirm there are rows in `journal_subscriptions` with `subscribe_devotionals = true` and `is_active = true`.

### 3. Optional: run notify after deploy

To avoid missing a day when deploy is after 6 AM UTC, you could:
- Add a step in your deploy pipeline that, after a successful deploy, calls `POST /api/journal/notify` with the slug of the devotional whose `publish_date` is “today” (e.g. in UTC), or
- Run the same `curl` above manually on days when you deploy new devotionals.

### 4. Optional: cron time or duplicate run

- Change the cron to a time **after** your usual deploy window (e.g. 12:00 UTC instead of 6:00 UTC), or
- Keep 6 AM UTC and use the manual `POST /api/journal/notify` as a backup when you know you deployed “today’s” devotional after 6 AM UTC.

## Summary

- **Most likely:** Cron ran at 6 AM UTC before the deploy that added today’s devotional to the live site, so it saw 0 devotionals for “today” and sent no emails.
- **Quick fix:** Use `POST /api/journal/notify` with today’s devotional slug to send the email now.
- **Ongoing:** Check Vercel cron logs and subscriber count; consider triggering notify after deploy or adjusting cron time.
