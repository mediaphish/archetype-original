# Cleanup Quarantine — Restore Map

Generated: 2026-07-24T16:51:52.121Z

This map shows every file moved aside during cleanup, where it went, and how to bring it back.
Nothing is permanently deleted until you explicitly say so after living with the change.

## Commands

- List everything: `npm run cleanup:restore -- --list`
- Restore one batch: `npm run cleanup:restore -- --batch <batch-name>`
- Restore one file: `npm run cleanup:restore -- --file <original_path>`
- Refresh this map: `npm run cleanup:map`

## Batch: `2026-07-24-zero-risk-junk`

### `project_map.txt`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** ~2.5MB untracked filesystem dump, not used by build or site
- **Confidence:** high
- **Was tracked in git:** false
- **Quarantine copy committed:** false
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-zero-risk-junk/project_map.txt`
- **How to restore:** `npm run cleanup:restore -- --file project_map.txt`
- **Note:** Untracked file, quarantined to local disk only. No git history exists for this file — if this machine's local quarantine copy is ever lost, this file cannot be recovered.

### `public/videos/ao-posting-platform-linkedin-review.mov`

- **Status:** removed_via_git_rm
- **Date:** 2026-07-24
- **Reason:** 71MB video, no code references found (re-confirmed independently, not just trusting prior audit)
- **Confidence:** high
- **Was tracked in git:** true
- **Quarantine copy committed:** false
- **How to restore (run these yourself — the restore script will only print them):**
  1. `git rev-list -n 1 HEAD -- public/videos/ao-posting-platform-linkedin-review.mov`
  2. `git checkout <that-sha> -- public/videos/ao-posting-platform-linkedin-review.mov`
  (Use the commit that still contained the file — do **not** add `^` after the sha.)
- **Note:** Not quarantined as a physical copy (71MB, avoiding doubling repo size). Recover via: git rev-list -n 1 HEAD -- public/videos/ao-posting-platform-linkedin-review.mov (finds the last commit that still contained the file), then git checkout <that-sha> -- public/videos/ao-posting-platform-linkedin-review.mov (no ^ — checking out the commit itself, not its parent, since the parent may predate the file or be the wrong snapshot)

### `dist/videos/ao-posting-platform-linkedin-review.mov`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Untracked duplicate of the public/videos copy; quarantined after public/ removal
- **Confidence:** high
- **Was tracked in git:** false
- **Quarantine copy committed:** false
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-zero-risk-junk/dist/videos/ao-posting-platform-linkedin-review.mov`
- **How to restore:** `npm run cleanup:restore -- --file dist/videos/ao-posting-platform-linkedin-review.mov`
- **Note:** Untracked file, quarantined to local disk only. No git history exists for this file — if this machine's local quarantine copy is ever lost, this file cannot be recovered. If it reappears under dist/ after a future build, that signals the public/ copy was not fully removed.

### `ao-knowledge-hq-kit/journal/AO-Journal-Posts.zip`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Tracked zip; journal posts already exist as extracted .md files
- **Confidence:** high
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-zero-risk-junk/ao-knowledge-hq-kit/journal/AO-Journal-Posts.zip`
- **How to restore:** `npm run cleanup:restore -- --file ao-knowledge-hq-kit/journal/AO-Journal-Posts.zip`

### `ao-knowledge-hq-kit/knowledge/accidental-ceo/Accidental_CEO.zip`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Tracked zip; Accidental CEO chapters already exist as extracted files
- **Confidence:** high
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-zero-risk-junk/ao-knowledge-hq-kit/knowledge/accidental-ceo/Accidental_CEO.zip`
- **How to restore:** `npm run cleanup:restore -- --file ao-knowledge-hq-kit/knowledge/accidental-ceo/Accidental_CEO.zip`

