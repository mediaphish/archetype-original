# Scheduled journal auto-publish (#127)

## Gap (fixed)

Social captions already auto-post via cron. Journal posts did not — Auto could only publish during a live chat, and a spoken “publish on Aug 19” date was never stored.

## What shipped

1. **Database:** `ao_content_drafts.scheduled_publish_at` (timestamptz)
2. **Tool:** `schedule_journal_publish` — Auto must call this when you agree on a future publish date
3. **Cron:** `/api/cron/publish-scheduled-journals` every 15 minutes — publishes approved due drafts (image + required captions required; skips and logs failures without blocking others)
4. **Auto prompt:** updated so future dates are persisted, not only spoken

## How to use on the live site

1. Approve the draft, attach a header image, schedule captions as usual.
2. Tell Auto the target date (e.g. “publish Wednesday Aug 19”).
3. Confirm Auto calls **schedule_journal_publish** and reports the stored time back.
4. On that day, the site publishes without opening a chat. Check activity log if something was skipped (missing image/captions).

## Design note (from companion gate prompt)

Narrow regex claim-patterns will keep missing edge phrasings. A durable follow-up could extend fabricated-completion-style state diffs to schedule/save batch claims — not built in this pass; flagged for a later decision.
