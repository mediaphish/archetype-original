# Caption launch date + same-turn gate evidence (#128 / #129) — 2026-08-14

## #128 Caption scheduler ignored draft target date

**Bug:** Journal captions for `the-standard-that-held` landed on 2026-10-07 because the scheduler read a missing markdown `publish_date`, then walked the whole content queue (including far-future quote-card rows).

**Fix:** Prefer `ao_content_drafts.scheduled_publish_at`; markdown is legacy fallback only; missing both → clear error (no queue guess). Drift >14 days from stored target → refuse. `findNextQueueDate` can filter by `source_kind` for other callers.

## #129 False SYSTEM WARNING on approve/image

**Bug:** Claims like “draft approved / header image attached” fired even when `schedule_journal_publish` returned those facts in the same turn.

**Fix:** `evidenceFromResults` on approve + generate_image rules accepts `status: approved` / `image_url` from any successful same-turn tool payload.

## Live data still needs Bart’s decision

Five `journal_launch` rows for `the-standard-that-held` remain scheduled on **2026-10-07**. Recommend: delete those five, then re-run caption scheduling through the fixed path so they land on **2026-08-19**. Do not silently rewrite until Bart confirms.
