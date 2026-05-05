# Claude devotional publish checklist (recommended)

If Claude is creating devotional files directly inside this repo, ask it to do **all** of the following every time:

1) Save new devotionals into:
- `ao-knowledge-hq-kit/journal/devotionals/`

2) Before publishing, check for accidental repeats:
- same date
- same slug
- same scripture reference
- very similar title/summary

3) Publish immediately:
- run `scripts/auto-publish-devotionals-local.mjs`

That script will:
- stop if it detects overlaps
- refresh the site’s content list
- publish the new devotionals live

