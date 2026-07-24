# Cleanup Quarantine — Restore Map

Generated: 2026-07-24T22:19:55.895Z

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

## Batch: `2026-07-24-auto-v1-and-broken-journal`

### `ao-knowledge-hq-kit/journal/we-live-in-a-not-my-fault-era.md.md`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Malformed double-extension journal file; build-knowledge already skips *.md.md; appears to contain RTF markers
- **Confidence:** high
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-auto-v1-and-broken-journal/ao-knowledge-hq-kit/journal/we-live-in-a-not-my-fault-era.md.md`
- **How to restore:** `npm run cleanup:restore -- --file ao-knowledge-hq-kit/journal/we-live-in-a-not-my-fault-era.md.md`

### `api/ao/auto/chat-v1-backup.js`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Superseded Auto V1 chat handler backup; live handler is chat.js (Auto V2)
- **Confidence:** high
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-auto-v1-and-broken-journal/api/ao/auto/chat-v1-backup.js`
- **How to restore:** `npm run cleanup:restore -- --file api/ao/auto/chat-v1-backup.js`

### `src/components/ao/AutoHubPanel-v1-backup.jsx`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Backup of old Auto UI; live Review uses AutoV2Panel
- **Confidence:** high
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-auto-v1-and-broken-journal/src/components/ao/AutoHubPanel-v1-backup.jsx`
- **How to restore:** `npm run cleanup:restore -- --file src/components/ao/AutoHubPanel-v1-backup.jsx`

### `src/pages/ao/Review-v1-backup.jsx`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Backup Review page; live Review.jsx uses AutoV2Panel and is what App.jsx routes
- **Confidence:** high
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-auto-v1-and-broken-journal/src/pages/ao/Review-v1-backup.jsx`
- **How to restore:** `npm run cleanup:restore -- --file src/pages/ao/Review-v1-backup.jsx`

### `src/components/ao/AutoHubPanel.jsx`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Only imported by Review-v1-backup.jsx; live Review uses AutoV2Panel — effectively dead with V2
- **Confidence:** high
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-auto-v1-and-broken-journal/src/components/ao/AutoHubPanel.jsx`
- **How to restore:** `npm run cleanup:restore -- --file src/components/ao/AutoHubPanel.jsx`

## Batch: `2026-07-24-dead-pages-and-placeholders`

### `src/pages/mentoring/Consulting.jsx`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Placeholder Mentoring pages; App no longer routes a Mentoring section
- **Confidence:** high
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-dead-pages-and-placeholders/src/pages/mentoring/Consulting.jsx`
- **How to restore:** `npm run cleanup:restore -- --file src/pages/mentoring/Consulting.jsx`

### `src/pages/mentoring/Fractional.jsx`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Placeholder Mentoring pages; App no longer routes a Mentoring section
- **Confidence:** high
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-dead-pages-and-placeholders/src/pages/mentoring/Fractional.jsx`
- **How to restore:** `npm run cleanup:restore -- --file src/pages/mentoring/Fractional.jsx`

### `src/pages/mentoring/Mentoring.jsx`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Placeholder Mentoring pages; App no longer routes a Mentoring section
- **Confidence:** high
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-dead-pages-and-placeholders/src/pages/mentoring/Mentoring.jsx`
- **How to restore:** `npm run cleanup:restore -- --file src/pages/mentoring/Mentoring.jsx`

### `src/pages/mentoring/Mentoring1on1.jsx`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Placeholder Mentoring pages; App no longer routes a Mentoring section
- **Confidence:** high
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-dead-pages-and-placeholders/src/pages/mentoring/Mentoring1on1.jsx`
- **How to restore:** `npm run cleanup:restore -- --file src/pages/mentoring/Mentoring1on1.jsx`

### `src/pages/mentoring/Speaking.jsx`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Placeholder Mentoring pages; App no longer routes a Mentoring section
- **Confidence:** high
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-dead-pages-and-placeholders/src/pages/mentoring/Speaking.jsx`
- **How to restore:** `npm run cleanup:restore -- --file src/pages/mentoring/Speaking.jsx`

### `src/pages/mentoring/TeamCulture.jsx`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Placeholder Mentoring pages; App no longer routes a Mentoring section
- **Confidence:** high
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-dead-pages-and-placeholders/src/pages/mentoring/TeamCulture.jsx`
- **How to restore:** `npm run cleanup:restore -- --file src/pages/mentoring/TeamCulture.jsx`

### `src/pages/mentoring/Testimonials.jsx`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Placeholder Mentoring pages; App no longer routes a Mentoring section
- **Confidence:** high
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-dead-pages-and-placeholders/src/pages/mentoring/Testimonials.jsx`
- **How to restore:** `npm run cleanup:restore -- --file src/pages/mentoring/Testimonials.jsx`

### `src/pages/mentoring/Workshops.jsx`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Placeholder Mentoring pages; App no longer routes a Mentoring section
- **Confidence:** high
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-dead-pages-and-placeholders/src/pages/mentoring/Workshops.jsx`
- **How to restore:** `npm run cleanup:restore -- --file src/pages/mentoring/Workshops.jsx`

### `src/pages/archy/Ask.jsx`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Archy placeholder subpage; App forces all /archy/* to main Archy page
- **Confidence:** high
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-dead-pages-and-placeholders/src/pages/archy/Ask.jsx`
- **How to restore:** `npm run cleanup:restore -- --file src/pages/archy/Ask.jsx`

### `src/pages/archy/Corpus.jsx`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Archy placeholder subpage; App forces all /archy/* to main Archy page
- **Confidence:** high
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-dead-pages-and-placeholders/src/pages/archy/Corpus.jsx`
- **How to restore:** `npm run cleanup:restore -- --file src/pages/archy/Corpus.jsx`

### `src/pages/archy/HowItWorks.jsx`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Archy placeholder subpage; App forces all /archy/* to main Archy page
- **Confidence:** high
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-dead-pages-and-placeholders/src/pages/archy/HowItWorks.jsx`
- **How to restore:** `npm run cleanup:restore -- --file src/pages/archy/HowItWorks.jsx`

### `src/pages/ALI.jsx`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Legacy ALI page; superseded by cultureScience/ali SaaS routes
- **Confidence:** high
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-dead-pages-and-placeholders/src/pages/ALI.jsx`
- **How to restore:** `npm run cleanup:restore -- --file src/pages/ALI.jsx`

### `src/pages/ALIApply.jsx`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Legacy ALI apply page; superseded by cultureScience routes
- **Confidence:** high
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-dead-pages-and-placeholders/src/pages/ALIApply.jsx`
- **How to restore:** `npm run cleanup:restore -- --file src/pages/ALIApply.jsx`

### `src/pages/ALIThanks.jsx`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Legacy ALI thanks page; superseded by cultureScience routes
- **Confidence:** high
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-dead-pages-and-placeholders/src/pages/ALIThanks.jsx`
- **How to restore:** `npm run cleanup:restore -- --file src/pages/ALIThanks.jsx`

### `src/pages/Admin.jsx`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Unused Admin page; not routed; contained placeholder secret pattern
- **Confidence:** high
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-dead-pages-and-placeholders/src/pages/Admin.jsx`
- **How to restore:** `npm run cleanup:restore -- --file src/pages/Admin.jsx`

### `src/pages/FractionalLeadership.jsx`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Old shell; App uses newer fractional-roles paths
- **Confidence:** high
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-dead-pages-and-placeholders/src/pages/FractionalLeadership.jsx`
- **How to restore:** `npm run cleanup:restore -- --file src/pages/FractionalLeadership.jsx`

### `src/pages/MentoringConsulting.jsx`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Old shell; not routed
- **Confidence:** high
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-dead-pages-and-placeholders/src/pages/MentoringConsulting.jsx`
- **How to restore:** `npm run cleanup:restore -- --file src/pages/MentoringConsulting.jsx`

### `src/pages/Methods.jsx`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Old methods shell; App uses newer methods/advisory paths
- **Confidence:** high
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-dead-pages-and-placeholders/src/pages/Methods.jsx`
- **How to restore:** `npm run cleanup:restore -- --file src/pages/Methods.jsx`

### `src/pages/Playbooks.jsx`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Old shell; not routed
- **Confidence:** high
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-dead-pages-and-placeholders/src/pages/Playbooks.jsx`
- **How to restore:** `npm run cleanup:restore -- --file src/pages/Playbooks.jsx`

### `src/pages/SpeakingWorkshops.jsx`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Old shell; not routed
- **Confidence:** high
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-dead-pages-and-placeholders/src/pages/SpeakingWorkshops.jsx`
- **How to restore:** `npm run cleanup:restore -- --file src/pages/SpeakingWorkshops.jsx`

### `src/pages/cultureScience/ALIDashboard.jsx`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Not imported; SaaS dashboard is pages/ali/*
- **Confidence:** high
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-dead-pages-and-placeholders/src/pages/cultureScience/ALIDashboard.jsx`
- **How to restore:** `npm run cleanup:restore -- --file src/pages/cultureScience/ALIDashboard.jsx`

### `src/pages/methods/Mentorship.jsx`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Unused; /methods redirects to /advisory
- **Confidence:** high
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-dead-pages-and-placeholders/src/pages/methods/Mentorship.jsx`
- **How to restore:** `npm run cleanup:restore -- --file src/pages/methods/Mentorship.jsx`

### `src/pages/research.jsx`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Not imported
- **Confidence:** high
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-dead-pages-and-placeholders/src/pages/research.jsx`
- **How to restore:** `npm run cleanup:restore -- --file src/pages/research.jsx`

### `src/pages/cultureScience/Research.jsx`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** /culture-science/research redirects to /culture-science; render path unreachable
- **Confidence:** high
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-dead-pages-and-placeholders/src/pages/cultureScience/Research.jsx`
- **How to restore:** `npm run cleanup:restore -- --file src/pages/cultureScience/Research.jsx`

### `src/components/Hero.jsx`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Imported in App.jsx but never rendered (dead import + component)
- **Confidence:** high
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-dead-pages-and-placeholders/src/components/Hero.jsx`
- **How to restore:** `npm run cleanup:restore -- --file src/components/Hero.jsx`

### `src/app/app/ChatApp.jsx`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Nested duplicate Archy chat tree; live app uses src/app/ChatApp.jsx
- **Confidence:** high
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-dead-pages-and-placeholders/src/app/app/ChatApp.jsx`
- **How to restore:** `npm run cleanup:restore -- --file src/app/app/ChatApp.jsx`

### `src/app/app/components/DarkHoursBanner.jsx`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Nested duplicate Archy chat tree; live app uses src/app/ChatApp.jsx
- **Confidence:** high
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-dead-pages-and-placeholders/src/app/app/components/DarkHoursBanner.jsx`
- **How to restore:** `npm run cleanup:restore -- --file src/app/app/components/DarkHoursBanner.jsx`

### `src/app/app/components/EscalationButton.jsx`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Nested duplicate Archy chat tree; live app uses src/app/ChatApp.jsx
- **Confidence:** high
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-dead-pages-and-placeholders/src/app/app/components/EscalationButton.jsx`
- **How to restore:** `npm run cleanup:restore -- --file src/app/app/components/EscalationButton.jsx`

### `src/app/app/components/MessageBubble.jsx`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Nested duplicate Archy chat tree; live app uses src/app/ChatApp.jsx
- **Confidence:** high
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-dead-pages-and-placeholders/src/app/app/components/MessageBubble.jsx`
- **How to restore:** `npm run cleanup:restore -- --file src/app/app/components/MessageBubble.jsx`

### `src/app/app/components/QuickPrompts.jsx`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Nested duplicate Archy chat tree; live app uses src/app/ChatApp.jsx
- **Confidence:** high
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-dead-pages-and-placeholders/src/app/app/components/QuickPrompts.jsx`
- **How to restore:** `npm run cleanup:restore -- --file src/app/app/components/QuickPrompts.jsx`

### `src/app/app/utils/darkHours.js`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Nested duplicate Archy chat tree; live app uses src/app/ChatApp.jsx
- **Confidence:** high
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-dead-pages-and-placeholders/src/app/app/utils/darkHours.js`
- **How to restore:** `npm run cleanup:restore -- --file src/app/app/utils/darkHours.js`

### `sl-psychology-research/01_intrinsic_motivation_deci_ryan.md`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Standalone research notes; not wired into knowledge build or site routes
- **Confidence:** high
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-dead-pages-and-placeholders/sl-psychology-research/01_intrinsic_motivation_deci_ryan.md`
- **How to restore:** `npm run cleanup:restore -- --file sl-psychology-research/01_intrinsic_motivation_deci_ryan.md`

### `sl-psychology-research/02_psychological_safety_edmondson.md`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Standalone research notes; not wired into knowledge build or site routes
- **Confidence:** high
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-dead-pages-and-placeholders/sl-psychology-research/02_psychological_safety_edmondson.md`
- **How to restore:** `npm run cleanup:restore -- --file sl-psychology-research/02_psychological_safety_edmondson.md`

### `sl-psychology-research/03_transactional_vs_transformational.md`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Standalone research notes; not wired into knowledge build or site routes
- **Confidence:** high
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-dead-pages-and-placeholders/sl-psychology-research/03_transactional_vs_transformational.md`
- **How to restore:** `npm run cleanup:restore -- --file sl-psychology-research/03_transactional_vs_transformational.md`

### `sl-psychology-research/04_fear_of_evaluation.md`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Standalone research notes; not wired into knowledge build or site routes
- **Confidence:** high
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-dead-pages-and-placeholders/sl-psychology-research/04_fear_of_evaluation.md`
- **How to restore:** `npm run cleanup:restore -- --file sl-psychology-research/04_fear_of_evaluation.md`

### `sl-psychology-research/05_group_identity_purpose.md`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Standalone research notes; not wired into knowledge build or site routes
- **Confidence:** high
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-dead-pages-and-placeholders/sl-psychology-research/05_group_identity_purpose.md`
- **How to restore:** `npm run cleanup:restore -- --file sl-psychology-research/05_group_identity_purpose.md`

### `sl-psychology-research/06_stewardship_vs_agency.md`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Standalone research notes; not wired into knowledge build or site routes
- **Confidence:** high
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-dead-pages-and-placeholders/sl-psychology-research/06_stewardship_vs_agency.md`
- **How to restore:** `npm run cleanup:restore -- --file sl-psychology-research/06_stewardship_vs_agency.md`

### `sl-psychology-research/07_trust_as_currency.md`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Standalone research notes; not wired into knowledge build or site routes
- **Confidence:** high
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-dead-pages-and-placeholders/sl-psychology-research/07_trust_as_currency.md`
- **How to restore:** `npm run cleanup:restore -- --file sl-psychology-research/07_trust_as_currency.md`

### `sl-psychology-research/08_game_theory_zero_sum.md`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Standalone research notes; not wired into knowledge build or site routes
- **Confidence:** high
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-dead-pages-and-placeholders/sl-psychology-research/08_game_theory_zero_sum.md`
- **How to restore:** `npm run cleanup:restore -- --file sl-psychology-research/08_game_theory_zero_sum.md`

### `sl-psychology-research/09_burnout_performanceism.md`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Standalone research notes; not wired into knowledge build or site routes
- **Confidence:** high
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-dead-pages-and-placeholders/sl-psychology-research/09_burnout_performanceism.md`
- **How to restore:** `npm run cleanup:restore -- --file sl-psychology-research/09_burnout_performanceism.md`

### `sl-psychology-research/10_theology_stewardship.md`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Standalone research notes; not wired into knowledge build or site routes
- **Confidence:** high
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-dead-pages-and-placeholders/sl-psychology-research/10_theology_stewardship.md`
- **How to restore:** `npm run cleanup:restore -- --file sl-psychology-research/10_theology_stewardship.md`

## Batch: `2026-07-24-unused-homepage-components`

### `src/components/AboutTeaser.jsx`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Legacy shared marketing component with no live importers after HomePage rewrite
- **Confidence:** high
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-unused-homepage-components/src/components/AboutTeaser.jsx`
- **How to restore:** `npm run cleanup:restore -- --file src/components/AboutTeaser.jsx`

### `src/components/ClosingConfidence.jsx`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Legacy shared marketing component with no live importers after HomePage rewrite
- **Confidence:** high
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-unused-homepage-components/src/components/ClosingConfidence.jsx`
- **How to restore:** `npm run cleanup:restore -- --file src/components/ClosingConfidence.jsx`

### `src/components/FeaturedFAQs.jsx`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Legacy shared marketing component with no live importers after HomePage rewrite
- **Confidence:** high
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-unused-homepage-components/src/components/FeaturedFAQs.jsx`
- **How to restore:** `npm run cleanup:restore -- --file src/components/FeaturedFAQs.jsx`

### `src/components/JournalHighlights.jsx`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Root-level JournalHighlights duplicate/unused; not imported by live pages
- **Confidence:** high
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-unused-homepage-components/src/components/JournalHighlights.jsx`
- **How to restore:** `npm run cleanup:restore -- --file src/components/JournalHighlights.jsx`

### `src/components/Methods.jsx`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Legacy shared marketing component with no live importers after HomePage rewrite
- **Confidence:** high
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-unused-homepage-components/src/components/Methods.jsx`
- **How to restore:** `npm run cleanup:restore -- --file src/components/Methods.jsx`

### `src/components/MethodsTeaser.jsx`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Legacy shared marketing component with no live importers after HomePage rewrite
- **Confidence:** high
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-unused-homepage-components/src/components/MethodsTeaser.jsx`
- **How to restore:** `npm run cleanup:restore -- --file src/components/MethodsTeaser.jsx`

### `src/components/Philosophy.jsx`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Legacy shared marketing component with no live importers after HomePage rewrite
- **Confidence:** high
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-unused-homepage-components/src/components/Philosophy.jsx`
- **How to restore:** `npm run cleanup:restore -- --file src/components/Philosophy.jsx`

### `src/components/PhilosophySection.jsx`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Legacy shared marketing component with no live importers after HomePage rewrite
- **Confidence:** high
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-unused-homepage-components/src/components/PhilosophySection.jsx`
- **How to restore:** `npm run cleanup:restore -- --file src/components/PhilosophySection.jsx`

### `src/components/PhilosophyTeaser.jsx`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Legacy shared marketing component with no live importers after HomePage rewrite
- **Confidence:** high
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-unused-homepage-components/src/components/PhilosophyTeaser.jsx`
- **How to restore:** `npm run cleanup:restore -- --file src/components/PhilosophyTeaser.jsx`

### `src/components/Playbooks.jsx`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Legacy shared marketing component with no live importers after HomePage rewrite
- **Confidence:** high
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-unused-homepage-components/src/components/Playbooks.jsx`
- **How to restore:** `npm run cleanup:restore -- --file src/components/Playbooks.jsx`

### `src/components/ProofBoxPsychology.jsx`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Legacy shared marketing component with no live importers after HomePage rewrite
- **Confidence:** high
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-unused-homepage-components/src/components/ProofBoxPsychology.jsx`
- **How to restore:** `npm run cleanup:restore -- --file src/components/ProofBoxPsychology.jsx`

### `src/components/QuickPaths.jsx`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Legacy shared marketing component with no live importers after HomePage rewrite
- **Confidence:** high
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-unused-homepage-components/src/components/QuickPaths.jsx`
- **How to restore:** `npm run cleanup:restore -- --file src/components/QuickPaths.jsx`

### `src/components/SocialShare.jsx`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Legacy shared marketing component with no live importers after HomePage rewrite
- **Confidence:** high
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-unused-homepage-components/src/components/SocialShare.jsx`
- **How to restore:** `npm run cleanup:restore -- --file src/components/SocialShare.jsx`

### `src/components/Speaking.jsx`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Legacy shared marketing component with no live importers after HomePage rewrite
- **Confidence:** high
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-unused-homepage-components/src/components/Speaking.jsx`
- **How to restore:** `npm run cleanup:restore -- --file src/components/Speaking.jsx`

### `src/components/ValueStatement.jsx`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Legacy shared marketing component with no live importers after HomePage rewrite
- **Confidence:** high
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-unused-homepage-components/src/components/ValueStatement.jsx`
- **How to restore:** `npm run cleanup:restore -- --file src/components/ValueStatement.jsx`

### `src/components/home/AntiProjects.jsx`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Unused homepage building-block; live HomePage.jsx is self-contained and does not import this
- **Confidence:** high
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-unused-homepage-components/src/components/home/AntiProjects.jsx`
- **How to restore:** `npm run cleanup:restore -- --file src/components/home/AntiProjects.jsx`

### `src/components/home/ArchetypeFitness.jsx`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Unused homepage building-block; live HomePage.jsx is self-contained and does not import this
- **Confidence:** high
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-unused-homepage-components/src/components/home/ArchetypeFitness.jsx`
- **How to restore:** `npm run cleanup:restore -- --file src/components/home/ArchetypeFitness.jsx`

### `src/components/home/FinalCTA.jsx`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Unused homepage building-block; live HomePage.jsx is self-contained and does not import this
- **Confidence:** high
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-unused-homepage-components/src/components/home/FinalCTA.jsx`
- **How to restore:** `npm run cleanup:restore -- --file src/components/home/FinalCTA.jsx`

### `src/components/home/HomeHero.jsx`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Unused homepage building-block; live HomePage.jsx is self-contained and does not import this
- **Confidence:** high
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-unused-homepage-components/src/components/home/HomeHero.jsx`
- **How to restore:** `npm run cleanup:restore -- --file src/components/home/HomeHero.jsx`

### `src/components/home/JournalHighlights.jsx`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Unused homepage building-block; live HomePage.jsx is self-contained and does not import this
- **Confidence:** high
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-unused-homepage-components/src/components/home/JournalHighlights.jsx`
- **How to restore:** `npm run cleanup:restore -- --file src/components/home/JournalHighlights.jsx`

### `src/components/home/LeadershipLegacy.jsx`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Unused homepage building-block; live HomePage.jsx is self-contained and does not import this
- **Confidence:** high
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-unused-homepage-components/src/components/home/LeadershipLegacy.jsx`
- **How to restore:** `npm run cleanup:restore -- --file src/components/home/LeadershipLegacy.jsx`

### `src/components/home/MeetArchy.jsx`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Unused homepage building-block; live HomePage.jsx is self-contained and does not import this
- **Confidence:** high
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-unused-homepage-components/src/components/home/MeetArchy.jsx`
- **How to restore:** `npm run cleanup:restore -- --file src/components/home/MeetArchy.jsx`

### `src/components/home/MeetBart.jsx`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Unused homepage building-block; live HomePage.jsx is self-contained and does not import this
- **Confidence:** high
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-unused-homepage-components/src/components/home/MeetBart.jsx`
- **How to restore:** `npm run cleanup:restore -- --file src/components/home/MeetBart.jsx`

### `src/components/home/PillarCard.jsx`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Unused homepage building-block; live HomePage.jsx is self-contained and does not import this
- **Confidence:** high
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-unused-homepage-components/src/components/home/PillarCard.jsx`
- **How to restore:** `npm run cleanup:restore -- --file src/components/home/PillarCard.jsx`

### `src/components/home/PsychologyBehind.jsx`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Unused homepage building-block; live HomePage.jsx is self-contained and does not import this
- **Confidence:** high
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-unused-homepage-components/src/components/home/PsychologyBehind.jsx`
- **How to restore:** `npm run cleanup:restore -- --file src/components/home/PsychologyBehind.jsx`

### `src/components/home/WhatImBuilding.jsx`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Unused homepage building-block; live HomePage.jsx is self-contained and does not import this
- **Confidence:** high
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-unused-homepage-components/src/components/home/WhatImBuilding.jsx`
- **How to restore:** `npm run cleanup:restore -- --file src/components/home/WhatImBuilding.jsx`

### `src/components/home/WhyArchetypeOriginal.jsx`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Unused homepage building-block; live HomePage.jsx is self-contained and does not import this
- **Confidence:** high
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-unused-homepage-components/src/components/home/WhyArchetypeOriginal.jsx`
- **How to restore:** `npm run cleanup:restore -- --file src/components/home/WhyArchetypeOriginal.jsx`

## Batch: `2026-07-24-unused-lib-and-kit-scaffolding`

### `lib/ao/postMetricsStub.js`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Deprecated re-export; live code imports lib/ao/postMetrics.js directly. Nothing imports the stub.
- **Confidence:** high
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-unused-lib-and-kit-scaffolding/lib/ao/postMetricsStub.js`
- **How to restore:** `npm run cleanup:restore -- --file lib/ao/postMetricsStub.js`

### `lib/ao/detectSchedulingIntent.js`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** No importers found anywhere in src/api/lib/scripts
- **Confidence:** high
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-unused-lib-and-kit-scaffolding/lib/ao/detectSchedulingIntent.js`
- **How to restore:** `npm run cleanup:restore -- --file lib/ao/detectSchedulingIntent.js`

### `lib/ao/requireOwnerEmail.js`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** No importers found; auth uses requireAoSession/requireOwnerSession
- **Confidence:** high
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-unused-lib-and-kit-scaffolding/lib/ao/requireOwnerEmail.js`
- **How to restore:** `npm run cleanup:restore -- --file lib/ao/requireOwnerEmail.js`

### `lib/ao/voiceReview.js`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** No importers found; superseded by voiceGuardrails enforcement
- **Confidence:** high
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-unused-lib-and-kit-scaffolding/lib/ao/voiceReview.js`
- **How to restore:** `npm run cleanup:restore -- --file lib/ao/voiceReview.js`

### `ao-knowledge-hq-kit/PATCH_instructions/package.json.additions.json`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Kit scaffolding patch; not runtime, not referenced by build
- **Confidence:** high
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-unused-lib-and-kit-scaffolding/ao-knowledge-hq-kit/PATCH_instructions/package.json.additions.json`
- **How to restore:** `npm run cleanup:restore -- --file ao-knowledge-hq-kit/PATCH_instructions/package.json.additions.json`

## Batch: `2026-07-24-unused-helpers-oneoffs-ali-sql`

### `lib/supabase.js`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Anon client unused; all live code uses lib/supabase-admin.js
- **Confidence:** high
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-unused-helpers-oneoffs-ali-sql/lib/supabase.js`
- **How to restore:** `npm run cleanup:restore -- --file lib/supabase.js`

### `lib/operators/sanitize.js`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** No importers found in operators API or elsewhere
- **Confidence:** high
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-unused-helpers-oneoffs-ali-sql/lib/operators/sanitize.js`
- **How to restore:** `npm run cleanup:restore -- --file lib/operators/sanitize.js`

### `scripts/send-duplicate-apology.mjs`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** One-off apology email trigger; not in package.json; finished ops use
- **Confidence:** high
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-unused-helpers-oneoffs-ali-sql/scripts/send-duplicate-apology.mjs`
- **How to restore:** `npm run cleanup:restore -- --file scripts/send-duplicate-apology.mjs`

### `scripts/fix-journal-image-paths.mjs`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** One-off journal image path repair; not in package.json
- **Confidence:** high
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-unused-helpers-oneoffs-ali-sql/scripts/fix-journal-image-paths.mjs`
- **How to restore:** `npm run cleanup:restore -- --file scripts/fix-journal-image-paths.mjs`

### `scripts/repair-queue-schedule.mjs`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** One-off queue schedule repair; not in package.json
- **Confidence:** high
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-unused-helpers-oneoffs-ali-sql/scripts/repair-queue-schedule.mjs`
- **How to restore:** `npm run cleanup:restore -- --file scripts/repair-queue-schedule.mjs`

### `database/ali-phase1-schema.sql`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Overlapping ALI phase-1 schema variant; superseded/historical; not runtime
- **Confidence:** high
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-unused-helpers-oneoffs-ali-sql/database/ali-phase1-schema.sql`
- **How to restore:** `npm run cleanup:restore -- --file database/ali-phase1-schema.sql`

### `database/ali-phase1-schema-simple.sql`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Overlapping ALI phase-1 schema variant; superseded/historical; not runtime
- **Confidence:** high
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-unused-helpers-oneoffs-ali-sql/database/ali-phase1-schema-simple.sql`
- **How to restore:** `npm run cleanup:restore -- --file database/ali-phase1-schema-simple.sql`

### `database/ali-phase1-schema-complete.sql`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Overlapping ALI phase-1 schema variant; historical; only referenced from old notes
- **Confidence:** high
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-unused-helpers-oneoffs-ali-sql/database/ali-phase1-schema-complete.sql`
- **How to restore:** `npm run cleanup:restore -- --file database/ali-phase1-schema-complete.sql`

### `database/ali-phase1-migration-fix.sql`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** ALI phase-1 migration fix variant; historical; not runtime
- **Confidence:** high
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-unused-helpers-oneoffs-ali-sql/database/ali-phase1-migration-fix.sql`
- **How to restore:** `npm run cleanup:restore -- --file database/ali-phase1-migration-fix.sql`

## Batch: `2026-07-24-notes-artifacts-kit-scaffolding-oneoffs`

### `ao-knowledge-hq-kit/scripts/build-index.mjs`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Kit-local index builder; live site uses scripts/build-knowledge.mjs
- **Confidence:** medium
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-notes-artifacts-kit-scaffolding-oneoffs/ao-knowledge-hq-kit/scripts/build-index.mjs`
- **How to restore:** `npm run cleanup:restore -- --file ao-knowledge-hq-kit/scripts/build-index.mjs`

### `ao-knowledge-hq-kit/.github/workflows/build-knowledge.yml`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Nested kit workflow; real workflows live in /.github/workflows/
- **Confidence:** medium
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-notes-artifacts-kit-scaffolding-oneoffs/ao-knowledge-hq-kit/.github/workflows/build-knowledge.yml`
- **How to restore:** `npm run cleanup:restore -- --file ao-knowledge-hq-kit/.github/workflows/build-knowledge.yml`

### `notes/com.archetypeoriginal.devotionals.autopublish.plist`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Local macOS launchd plist; not part of the website
- **Confidence:** high
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-notes-artifacts-kit-scaffolding-oneoffs/notes/com.archetypeoriginal.devotionals.autopublish.plist`
- **How to restore:** `npm run cleanup:restore -- --file notes/com.archetypeoriginal.devotionals.autopublish.plist`

### `notes/faq-full-export-for-review.txt`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** FAQ review export artifact; not served
- **Confidence:** high
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-notes-artifacts-kit-scaffolding-oneoffs/notes/faq-full-export-for-review.txt`
- **How to restore:** `npm run cleanup:restore -- --file notes/faq-full-export-for-review.txt`

### `notes/faq-review-culture-science-audit.html`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** FAQ review HTML artifact; not served
- **Confidence:** high
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-notes-artifacts-kit-scaffolding-oneoffs/notes/faq-review-culture-science-audit.html`
- **How to restore:** `npm run cleanup:restore -- --file notes/faq-review-culture-science-audit.html`

### `notes/faq-review-viewer.html`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** FAQ review HTML artifact; not served
- **Confidence:** high
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-notes-artifacts-kit-scaffolding-oneoffs/notes/faq-review-viewer.html`
- **How to restore:** `npm run cleanup:restore -- --file notes/faq-review-viewer.html`

### `notes/culture-science-corpus-export.txt`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Corpus export dump; not served
- **Confidence:** high
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-notes-artifacts-kit-scaffolding-oneoffs/notes/culture-science-corpus-export.txt`
- **How to restore:** `npm run cleanup:restore -- --file notes/culture-science-corpus-export.txt`

### `notes/journal-summary.txt`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Journal listing dump; not served
- **Confidence:** high
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-notes-artifacts-kit-scaffolding-oneoffs/notes/journal-summary.txt`
- **How to restore:** `npm run cleanup:restore -- --file notes/journal-summary.txt`

### `notes/mobile-qa-audit-results.json`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Mobile QA result dump; not served
- **Confidence:** high
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-notes-artifacts-kit-scaffolding-oneoffs/notes/mobile-qa-audit-results.json`
- **How to restore:** `npm run cleanup:restore -- --file notes/mobile-qa-audit-results.json`

### `notes/mobile-qa-browser-results.json`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Mobile QA result dump; not served
- **Confidence:** high
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-notes-artifacts-kit-scaffolding-oneoffs/notes/mobile-qa-browser-results.json`
- **How to restore:** `npm run cleanup:restore -- --file notes/mobile-qa-browser-results.json`

### `notes/mobile-qa-interaction-results.json`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Mobile QA result dump; not served
- **Confidence:** high
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-notes-artifacts-kit-scaffolding-oneoffs/notes/mobile-qa-interaction-results.json`
- **How to restore:** `npm run cleanup:restore -- --file notes/mobile-qa-interaction-results.json`

### `notes/ali-instrument-v2-curation.csv`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** ALI instrument curation CSV artifact; not served
- **Confidence:** high
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-notes-artifacts-kit-scaffolding-oneoffs/notes/ali-instrument-v2-curation.csv`
- **How to restore:** `npm run cleanup:restore -- --file notes/ali-instrument-v2-curation.csv`

### `notes/ali-instrument-v2-curation.approved.csv`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** ALI instrument curation CSV artifact; not served
- **Confidence:** high
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-notes-artifacts-kit-scaffolding-oneoffs/notes/ali-instrument-v2-curation.approved.csv`
- **How to restore:** `npm run cleanup:restore -- --file notes/ali-instrument-v2-curation.approved.csv`

### `scripts/list-journal-entries.mjs`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Manual inventory helper; not in package.json; overlaps manage-journal
- **Confidence:** medium
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-notes-artifacts-kit-scaffolding-oneoffs/scripts/list-journal-entries.mjs`
- **How to restore:** `npm run cleanup:restore -- --file scripts/list-journal-entries.mjs`

### `scripts/strip-em-dashes-journal.mjs`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** One-off content cleanup script; not in package.json
- **Confidence:** medium
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-notes-artifacts-kit-scaffolding-oneoffs/scripts/strip-em-dashes-journal.mjs`
- **How to restore:** `npm run cleanup:restore -- --file scripts/strip-em-dashes-journal.mjs`

### `scripts/test-longform-truncation.mjs`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Ad-hoc test script; not in package.json
- **Confidence:** medium
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-notes-artifacts-kit-scaffolding-oneoffs/scripts/test-longform-truncation.mjs`
- **How to restore:** `npm run cleanup:restore -- --file scripts/test-longform-truncation.mjs`

### `scripts/test-retry-emails.mjs`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Ad-hoc test script; not in package.json
- **Confidence:** medium
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-notes-artifacts-kit-scaffolding-oneoffs/scripts/test-retry-emails.mjs`
- **How to restore:** `npm run cleanup:restore -- --file scripts/test-retry-emails.mjs`

### `tests/test-roi-announcements.js`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Ad-hoc test file; not part of active Jest suite naming
- **Confidence:** medium
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-notes-artifacts-kit-scaffolding-oneoffs/tests/test-roi-announcements.js`
- **How to restore:** `npm run cleanup:restore -- --file tests/test-roi-announcements.js`

## Batch: `2026-07-24-notes-chatgpt-v0-ali-history`

### `notes/ABOUT_PAGE_CONTENT_FOR_CHATGPT.md`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** External ChatGPT prompt/content dump; historical planning only; not served
- **Confidence:** medium
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-notes-chatgpt-v0-ali-history/notes/ABOUT_PAGE_CONTENT_FOR_CHATGPT.md`
- **How to restore:** `npm run cleanup:restore -- --file notes/ABOUT_PAGE_CONTENT_FOR_CHATGPT.md`

### `notes/ALI_CHATGPT_REVIEW_FILES.md`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** External ChatGPT prompt/content dump; historical planning only; not served
- **Confidence:** medium
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-notes-chatgpt-v0-ali-history/notes/ALI_CHATGPT_REVIEW_FILES.md`
- **How to restore:** `npm run cleanup:restore -- --file notes/ALI_CHATGPT_REVIEW_FILES.md`

### `notes/CHATGPT_CORPUS_FILE_STRUCTURE_PROMPT.md`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** External ChatGPT prompt/content dump; historical planning only; not served
- **Confidence:** medium
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-notes-chatgpt-v0-ali-history/notes/CHATGPT_CORPUS_FILE_STRUCTURE_PROMPT.md`
- **How to restore:** `npm run cleanup:restore -- --file notes/CHATGPT_CORPUS_FILE_STRUCTURE_PROMPT.md`

### `notes/CHATGPT_PROMPT_ALI_REMAINING_SPECS.md`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** External ChatGPT prompt/content dump; historical planning only; not served
- **Confidence:** medium
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-notes-chatgpt-v0-ali-history/notes/CHATGPT_PROMPT_ALI_REMAINING_SPECS.md`
- **How to restore:** `npm run cleanup:restore -- --file notes/CHATGPT_PROMPT_ALI_REMAINING_SPECS.md`

### `notes/CHATGPT_PROMPT_ALI_SCORE_CALCULATIONS.md`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** External ChatGPT prompt/content dump; historical planning only; not served
- **Confidence:** medium
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-notes-chatgpt-v0-ali-history/notes/CHATGPT_PROMPT_ALI_SCORE_CALCULATIONS.md`
- **How to restore:** `npm run cleanup:restore -- --file notes/CHATGPT_PROMPT_ALI_SCORE_CALCULATIONS.md`

### `notes/HOMEPAGE_CONTENT_FOR_CHATGPT.md`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** External ChatGPT prompt/content dump; historical planning only; not served
- **Confidence:** medium
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-notes-chatgpt-v0-ali-history/notes/HOMEPAGE_CONTENT_FOR_CHATGPT.md`
- **How to restore:** `npm run cleanup:restore -- --file notes/HOMEPAGE_CONTENT_FOR_CHATGPT.md`

### `notes/METHODS_PAGE_CONTENT_FOR_CHATGPT.md`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** External ChatGPT prompt/content dump; historical planning only; not served
- **Confidence:** medium
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-notes-chatgpt-v0-ali-history/notes/METHODS_PAGE_CONTENT_FOR_CHATGPT.md`
- **How to restore:** `npm run cleanup:restore -- --file notes/METHODS_PAGE_CONTENT_FOR_CHATGPT.md`

### `notes/PHILOSOPHY_PAGE_CONTENT_FOR_CHATGPT.md`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** External ChatGPT prompt/content dump; historical planning only; not served
- **Confidence:** medium
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-notes-chatgpt-v0-ali-history/notes/PHILOSOPHY_PAGE_CONTENT_FOR_CHATGPT.md`
- **How to restore:** `npm run cleanup:restore -- --file notes/PHILOSOPHY_PAGE_CONTENT_FOR_CHATGPT.md`

### `notes/V0_DESIGN_REVIEW.md`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Historical V0 design/prompt dump; not served
- **Confidence:** medium
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-notes-chatgpt-v0-ali-history/notes/V0_DESIGN_REVIEW.md`
- **How to restore:** `npm run cleanup:restore -- --file notes/V0_DESIGN_REVIEW.md`

### `notes/V0_FIXES_PROMPT.md`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Historical V0 design/prompt dump; not served
- **Confidence:** medium
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-notes-chatgpt-v0-ali-history/notes/V0_FIXES_PROMPT.md`
- **How to restore:** `npm run cleanup:restore -- --file notes/V0_FIXES_PROMPT.md`

### `notes/V0_FOLLOWUP_DATA_STRUCTURE_FIXES.md`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Historical V0 design/prompt dump; not served
- **Confidence:** medium
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-notes-chatgpt-v0-ali-history/notes/V0_FOLLOWUP_DATA_STRUCTURE_FIXES.md`
- **How to restore:** `npm run cleanup:restore -- --file notes/V0_FOLLOWUP_DATA_STRUCTURE_FIXES.md`

### `notes/V0_HANDOFF_CORRECTIONS.md`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Historical V0 design/prompt dump; not served
- **Confidence:** medium
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-notes-chatgpt-v0-ali-history/notes/V0_HANDOFF_CORRECTIONS.md`
- **How to restore:** `npm run cleanup:restore -- --file notes/V0_HANDOFF_CORRECTIONS.md`

### `notes/V0_PROMPT_ALI_COMPLETE_UI.md`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Historical V0 design/prompt dump; not served
- **Confidence:** medium
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-notes-chatgpt-v0-ali-history/notes/V0_PROMPT_ALI_COMPLETE_UI.md`
- **How to restore:** `npm run cleanup:restore -- --file notes/V0_PROMPT_ALI_COMPLETE_UI.md`

### `notes/V0_RESPONSE_REVIEW.md`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Historical V0 design/prompt dump; not served
- **Confidence:** medium
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-notes-chatgpt-v0-ali-history/notes/V0_RESPONSE_REVIEW.md`
- **How to restore:** `npm run cleanup:restore -- --file notes/V0_RESPONSE_REVIEW.md`

### `notes/ALI_1M_RESPONSES_PLAN.md`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Historical ALI planning/status note; superseded by live product; not served
- **Confidence:** medium
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-notes-chatgpt-v0-ali-history/notes/ALI_1M_RESPONSES_PLAN.md`
- **How to restore:** `npm run cleanup:restore -- --file notes/ALI_1M_RESPONSES_PLAN.md`

### `notes/ALI_BACKEND_INTEGRATION_COMPLETE.md`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Historical ALI planning/status note; superseded by live product; not served
- **Confidence:** medium
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-notes-chatgpt-v0-ali-history/notes/ALI_BACKEND_INTEGRATION_COMPLETE.md`
- **How to restore:** `npm run cleanup:restore -- --file notes/ALI_BACKEND_INTEGRATION_COMPLETE.md`

### `notes/ALI_BACKEND_INTEGRATION_STATUS.md`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Historical ALI planning/status note; superseded by live product; not served
- **Confidence:** medium
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-notes-chatgpt-v0-ali-history/notes/ALI_BACKEND_INTEGRATION_STATUS.md`
- **How to restore:** `npm run cleanup:restore -- --file notes/ALI_BACKEND_INTEGRATION_STATUS.md`

### `notes/ALI_DASHBOARD_REPORTS_DIFFERENTIATION_PLAN.md`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Historical ALI planning/status note; superseded by live product; not served
- **Confidence:** medium
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-notes-chatgpt-v0-ali-history/notes/ALI_DASHBOARD_REPORTS_DIFFERENTIATION_PLAN.md`
- **How to restore:** `npm run cleanup:restore -- --file notes/ALI_DASHBOARD_REPORTS_DIFFERENTIATION_PLAN.md`

### `notes/ALI_IMPLEMENTATION_PLAN.md`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Historical ALI planning/status note; superseded by live product; not served
- **Confidence:** medium
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-notes-chatgpt-v0-ali-history/notes/ALI_IMPLEMENTATION_PLAN.md`
- **How to restore:** `npm run cleanup:restore -- --file notes/ALI_IMPLEMENTATION_PLAN.md`

### `notes/ALI_IMPLEMENTATION_STATUS.md`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Historical ALI planning/status note; superseded by live product; not served
- **Confidence:** medium
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-notes-chatgpt-v0-ali-history/notes/ALI_IMPLEMENTATION_STATUS.md`
- **How to restore:** `npm run cleanup:restore -- --file notes/ALI_IMPLEMENTATION_STATUS.md`

### `notes/ALI_PHASE1_IMPLEMENTATION.md`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Historical ALI planning/status note; superseded by live product; not served
- **Confidence:** medium
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-notes-chatgpt-v0-ali-history/notes/ALI_PHASE1_IMPLEMENTATION.md`
- **How to restore:** `npm run cleanup:restore -- --file notes/ALI_PHASE1_IMPLEMENTATION.md`

### `notes/ALI_SCORING_IMPLEMENTATION_NOTES.md`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Historical ALI planning/status note; superseded by live product; not served
- **Confidence:** medium
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-notes-chatgpt-v0-ali-history/notes/ALI_SCORING_IMPLEMENTATION_NOTES.md`
- **How to restore:** `npm run cleanup:restore -- --file notes/ALI_SCORING_IMPLEMENTATION_NOTES.md`

### `notes/AUTO_V2_CURSOR_INSTRUCTIONS.md`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Historical Auto V2 cutover prompt/docs; not runtime
- **Confidence:** medium
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-notes-chatgpt-v0-ali-history/notes/AUTO_V2_CURSOR_INSTRUCTIONS.md`
- **How to restore:** `npm run cleanup:restore -- --file notes/AUTO_V2_CURSOR_INSTRUCTIONS.md`

### `notes/AUTO_V2_WHAT_WE_SHIPPED.md`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Historical Auto V2 cutover prompt/docs; not runtime
- **Confidence:** medium
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-notes-chatgpt-v0-ali-history/notes/AUTO_V2_WHAT_WE_SHIPPED.md`
- **How to restore:** `npm run cleanup:restore -- --file notes/AUTO_V2_WHAT_WE_SHIPPED.md`

### `notes/auto-v2-CURSOR_PROMPT.md`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Historical Auto V2 cutover prompt/docs; not runtime
- **Confidence:** medium
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-notes-chatgpt-v0-ali-history/notes/auto-v2-CURSOR_PROMPT.md`
- **How to restore:** `npm run cleanup:restore -- --file notes/auto-v2-CURSOR_PROMPT.md`

## Batch: `2026-07-24-unused-image-near-dupes-and-layers`

### `public/images/leadership-shoes-melted-feet.jpg`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Near-duplicate image; live journal/knowledge uses the replacement filename; zero exact refs
- **Confidence:** high
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-unused-image-near-dupes-and-layers/public/images/leadership-shoes-melted-feet.jpg`
- **How to restore:** `npm run cleanup:restore -- --file public/images/leadership-shoes-melted-feet.jpg`

### `public/images/when-leaders-refuse-to-change.jpg`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Near-duplicate image; live journal/knowledge uses the replacement filename; zero exact refs
- **Confidence:** high
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-unused-image-near-dupes-and-layers/public/images/when-leaders-refuse-to-change.jpg`
- **How to restore:** `npm run cleanup:restore -- --file public/images/when-leaders-refuse-to-change.jpg`

### `public/images/where-we-begin-instagram.jpg`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Near-duplicate image; live journal/knowledge uses the replacement filename; zero exact refs
- **Confidence:** high
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-unused-image-near-dupes-and-layers/public/images/where-we-begin-instagram.jpg`
- **How to restore:** `npm run cleanup:restore -- --file public/images/where-we-begin-instagram.jpg`

### `public/images/ao-mark-white.png`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Unused white AO mark asset; no code/knowledge references
- **Confidence:** medium
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-unused-image-near-dupes-and-layers/public/images/ao-mark-white.png`
- **How to restore:** `npm run cleanup:restore -- --file public/images/ao-mark-white.png`

### `public/images/bart-character-001b.png`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Character asset unused by live routes/knowledge; only mentioned in old audit notes if at all
- **Confidence:** medium
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-unused-image-near-dupes-and-layers/public/images/bart-character-001b.png`
- **How to restore:** `npm run cleanup:restore -- --file public/images/bart-character-001b.png`

### `public/images/archy-character-008.png`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Character asset unused by live routes/knowledge; only mentioned in old audit notes if at all
- **Confidence:** medium
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-unused-image-near-dupes-and-layers/public/images/archy-character-008.png`
- **How to restore:** `npm run cleanup:restore -- --file public/images/archy-character-008.png`

### `public/images/ali-dash-03.png`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Unused ALI dashboard screenshot asset; no code/knowledge references
- **Confidence:** medium
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-unused-image-near-dupes-and-layers/public/images/ali-dash-03.png`
- **How to restore:** `npm run cleanup:restore -- --file public/images/ali-dash-03.png`

### `public/images/ali-dash-04.png`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Unused ALI dashboard screenshot asset; no code/knowledge references
- **Confidence:** medium
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-unused-image-near-dupes-and-layers/public/images/ali-dash-04.png`
- **How to restore:** `npm run cleanup:restore -- --file public/images/ali-dash-04.png`

### `public/images/about-layer-1.png`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Legacy page-layer export; no code/knowledge references found
- **Confidence:** medium
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-unused-image-near-dupes-and-layers/public/images/about-layer-1.png`
- **How to restore:** `npm run cleanup:restore -- --file public/images/about-layer-1.png`

### `public/images/about-layer-2.png`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Legacy page-layer export; no code/knowledge references found
- **Confidence:** medium
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-unused-image-near-dupes-and-layers/public/images/about-layer-2.png`
- **How to restore:** `npm run cleanup:restore -- --file public/images/about-layer-2.png`

### `public/images/about-layer-3.png`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Legacy page-layer export; no code/knowledge references found
- **Confidence:** medium
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-unused-image-near-dupes-and-layers/public/images/about-layer-3.png`
- **How to restore:** `npm run cleanup:restore -- --file public/images/about-layer-3.png`

### `public/images/consulting-layer-1.png`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Legacy page-layer export; no code/knowledge references found
- **Confidence:** medium
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-unused-image-near-dupes-and-layers/public/images/consulting-layer-1.png`
- **How to restore:** `npm run cleanup:restore -- --file public/images/consulting-layer-1.png`

### `public/images/consulting-layer-2.png`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Legacy page-layer export; no code/knowledge references found
- **Confidence:** medium
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-unused-image-near-dupes-and-layers/public/images/consulting-layer-2.png`
- **How to restore:** `npm run cleanup:restore -- --file public/images/consulting-layer-2.png`

### `public/images/consulting-layer-3.png`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Legacy page-layer export; no code/knowledge references found
- **Confidence:** medium
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-unused-image-near-dupes-and-layers/public/images/consulting-layer-3.png`
- **How to restore:** `npm run cleanup:restore -- --file public/images/consulting-layer-3.png`

### `public/images/hero-layer-1.png`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Legacy page-layer export; no code/knowledge references found
- **Confidence:** medium
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-unused-image-near-dupes-and-layers/public/images/hero-layer-1.png`
- **How to restore:** `npm run cleanup:restore -- --file public/images/hero-layer-1.png`

### `public/images/hero-layer-2.png`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Legacy page-layer export; no code/knowledge references found
- **Confidence:** medium
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-unused-image-near-dupes-and-layers/public/images/hero-layer-2.png`
- **How to restore:** `npm run cleanup:restore -- --file public/images/hero-layer-2.png`

### `public/images/home-layer-1.png`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Legacy page-layer export; no code/knowledge references found
- **Confidence:** medium
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-unused-image-near-dupes-and-layers/public/images/home-layer-1.png`
- **How to restore:** `npm run cleanup:restore -- --file public/images/home-layer-1.png`

### `public/images/home-layer-2.png`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Legacy page-layer export; no code/knowledge references found
- **Confidence:** medium
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-unused-image-near-dupes-and-layers/public/images/home-layer-2.png`
- **How to restore:** `npm run cleanup:restore -- --file public/images/home-layer-2.png`

### `public/images/home-layer-3.png`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Legacy page-layer export; no code/knowledge references found
- **Confidence:** medium
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-unused-image-near-dupes-and-layers/public/images/home-layer-3.png`
- **How to restore:** `npm run cleanup:restore -- --file public/images/home-layer-3.png`

### `public/images/home-layer-4.png`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Legacy page-layer export; no code/knowledge references found
- **Confidence:** medium
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-unused-image-near-dupes-and-layers/public/images/home-layer-4.png`
- **How to restore:** `npm run cleanup:restore -- --file public/images/home-layer-4.png`

### `public/images/mentor-layer-1.png`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Legacy page-layer export; no code/knowledge references found
- **Confidence:** medium
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-unused-image-near-dupes-and-layers/public/images/mentor-layer-1.png`
- **How to restore:** `npm run cleanup:restore -- --file public/images/mentor-layer-1.png`

### `public/images/mentor-layer-2.png`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Legacy page-layer export; no code/knowledge references found
- **Confidence:** medium
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-unused-image-near-dupes-and-layers/public/images/mentor-layer-2.png`
- **How to restore:** `npm run cleanup:restore -- --file public/images/mentor-layer-2.png`

### `public/images/mentor-layer-3.png`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Legacy page-layer export; no code/knowledge references found
- **Confidence:** medium
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-unused-image-near-dupes-and-layers/public/images/mentor-layer-3.png`
- **How to restore:** `npm run cleanup:restore -- --file public/images/mentor-layer-3.png`

### `public/images/methods-layer-1.png`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Legacy page-layer export; no code/knowledge references found
- **Confidence:** medium
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-unused-image-near-dupes-and-layers/public/images/methods-layer-1.png`
- **How to restore:** `npm run cleanup:restore -- --file public/images/methods-layer-1.png`

### `public/images/methods-layer-2.png`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Legacy page-layer export; no code/knowledge references found
- **Confidence:** medium
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-unused-image-near-dupes-and-layers/public/images/methods-layer-2.png`
- **How to restore:** `npm run cleanup:restore -- --file public/images/methods-layer-2.png`

### `public/images/methods-layer-3.png`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Legacy page-layer export; no code/knowledge references found
- **Confidence:** medium
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-unused-image-near-dupes-and-layers/public/images/methods-layer-3.png`
- **How to restore:** `npm run cleanup:restore -- --file public/images/methods-layer-3.png`

### `public/images/philosophy-layer-1.png`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Legacy page-layer export; no code/knowledge references found
- **Confidence:** medium
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-unused-image-near-dupes-and-layers/public/images/philosophy-layer-1.png`
- **How to restore:** `npm run cleanup:restore -- --file public/images/philosophy-layer-1.png`

### `public/images/philosophy-layer-2.png`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Legacy page-layer export; no code/knowledge references found
- **Confidence:** medium
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-unused-image-near-dupes-and-layers/public/images/philosophy-layer-2.png`
- **How to restore:** `npm run cleanup:restore -- --file public/images/philosophy-layer-2.png`

### `public/images/philosophy-layer-3.png`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Legacy page-layer export; no code/knowledge references found
- **Confidence:** medium
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-unused-image-near-dupes-and-layers/public/images/philosophy-layer-3.png`
- **How to restore:** `npm run cleanup:restore -- --file public/images/philosophy-layer-3.png`

### `public/images/science-layer-1.png`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Legacy page-layer export; no code/knowledge references found
- **Confidence:** medium
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-unused-image-near-dupes-and-layers/public/images/science-layer-1.png`
- **How to restore:** `npm run cleanup:restore -- --file public/images/science-layer-1.png`

### `public/images/science-layer-2.png`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Legacy page-layer export; no code/knowledge references found
- **Confidence:** medium
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-unused-image-near-dupes-and-layers/public/images/science-layer-2.png`
- **How to restore:** `npm run cleanup:restore -- --file public/images/science-layer-2.png`

### `public/images/science-layer-3.png`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Legacy page-layer export; no code/knowledge references found
- **Confidence:** medium
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-unused-image-near-dupes-and-layers/public/images/science-layer-3.png`
- **How to restore:** `npm run cleanup:restore -- --file public/images/science-layer-3.png`

### `public/images/scoreboard-layer-1.png`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Legacy page-layer export; no code/knowledge references found
- **Confidence:** medium
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-unused-image-near-dupes-and-layers/public/images/scoreboard-layer-1.png`
- **How to restore:** `npm run cleanup:restore -- --file public/images/scoreboard-layer-1.png`

### `public/images/scoreboard-layer-2.png`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Legacy page-layer export; no code/knowledge references found
- **Confidence:** medium
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-unused-image-near-dupes-and-layers/public/images/scoreboard-layer-2.png`
- **How to restore:** `npm run cleanup:restore -- --file public/images/scoreboard-layer-2.png`

## Batch: `2026-07-24-unused-ops-qa-scripts`

### `scripts/ali-volume-survey-runner.mjs`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** ALI volume testing helper; not in package.json; no runtime callers
- **Confidence:** high
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-unused-ops-qa-scripts/scripts/ali-volume-survey-runner.mjs`
- **How to restore:** `npm run cleanup:restore -- --file scripts/ali-volume-survey-runner.mjs`

### `scripts/auto-publish-devotionals-local.mjs`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Local-only devotionals publish helper; not in package.json; no runtime callers
- **Confidence:** medium
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-unused-ops-qa-scripts/scripts/auto-publish-devotionals-local.mjs`
- **How to restore:** `npm run cleanup:restore -- --file scripts/auto-publish-devotionals-local.mjs`

### `scripts/check-subscription.mjs`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Manual subscription diagnostic; not in package.json
- **Confidence:** high
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-unused-ops-qa-scripts/scripts/check-subscription.mjs`
- **How to restore:** `npm run cleanup:restore -- --file scripts/check-subscription.mjs`

### `scripts/check-subscription-direct.mjs`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Manual subscription diagnostic; not in package.json
- **Confidence:** high
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-unused-ops-qa-scripts/scripts/check-subscription-direct.mjs`
- **How to restore:** `npm run cleanup:restore -- --file scripts/check-subscription-direct.mjs`

### `scripts/disable-prerender-on-commit.mjs`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Local git-hook helper; not part of live build
- **Confidence:** medium
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-unused-ops-qa-scripts/scripts/disable-prerender-on-commit.mjs`
- **How to restore:** `npm run cleanup:restore -- --file scripts/disable-prerender-on-commit.mjs`

### `scripts/fetch-knowledge.mjs`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Manual knowledge fetch; live path uses build-knowledge
- **Confidence:** high
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-unused-ops-qa-scripts/scripts/fetch-knowledge.mjs`
- **How to restore:** `npm run cleanup:restore -- --file scripts/fetch-knowledge.mjs`

### `scripts/generate-faq-review-html.mjs`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** FAQ review HTML generator; review artifacts already quarantined
- **Confidence:** high
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-unused-ops-qa-scripts/scripts/generate-faq-review-html.mjs`
- **How to restore:** `npm run cleanup:restore -- --file scripts/generate-faq-review-html.mjs`

### `scripts/mobile-qa-audit.mjs`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Mobile QA tooling; result dumps already quarantined
- **Confidence:** high
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-unused-ops-qa-scripts/scripts/mobile-qa-audit.mjs`
- **How to restore:** `npm run cleanup:restore -- --file scripts/mobile-qa-audit.mjs`

### `scripts/mobile-qa-browser.mjs`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Mobile QA tooling; result dumps already quarantined
- **Confidence:** high
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-unused-ops-qa-scripts/scripts/mobile-qa-browser.mjs`
- **How to restore:** `npm run cleanup:restore -- --file scripts/mobile-qa-browser.mjs`

### `scripts/mobile-qa-header-check.mjs`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Mobile QA tooling; result dumps already quarantined
- **Confidence:** high
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-unused-ops-qa-scripts/scripts/mobile-qa-header-check.mjs`
- **How to restore:** `npm run cleanup:restore -- --file scripts/mobile-qa-header-check.mjs`

### `scripts/mobile-qa-interactions.mjs`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Mobile QA tooling; result dumps already quarantined
- **Confidence:** high
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-unused-ops-qa-scripts/scripts/mobile-qa-interactions.mjs`
- **How to restore:** `npm run cleanup:restore -- --file scripts/mobile-qa-interactions.mjs`

### `scripts/notify-todays-devotionals-from-corpus.mjs`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Manual/ops notification helper; not in package.json
- **Confidence:** high
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-unused-ops-qa-scripts/scripts/notify-todays-devotionals-from-corpus.mjs`
- **How to restore:** `npm run cleanup:restore -- --file scripts/notify-todays-devotionals-from-corpus.mjs`

### `scripts/operators-apply-interest-schema.mjs`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Operators one-off schema helper; not in package.json
- **Confidence:** high
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-unused-ops-qa-scripts/scripts/operators-apply-interest-schema.mjs`
- **How to restore:** `npm run cleanup:restore -- --file scripts/operators-apply-interest-schema.mjs`

### `scripts/operators-probe-interest-table.mjs`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Operators probe helper; not in package.json
- **Confidence:** high
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-unused-ops-qa-scripts/scripts/operators-probe-interest-table.mjs`
- **How to restore:** `npm run cleanup:restore -- --file scripts/operators-probe-interest-table.mjs`

### `scripts/operators-seed-simulation.mjs`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Operators seed simulation; not in package.json
- **Confidence:** high
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-unused-ops-qa-scripts/scripts/operators-seed-simulation.mjs`
- **How to restore:** `npm run cleanup:restore -- --file scripts/operators-seed-simulation.mjs`

### `scripts/print-public-inventory-summary.mjs`

- **Status:** quarantined
- **Date:** 2026-07-24
- **Reason:** Inventory dump helper; not in package.json
- **Confidence:** high
- **Was tracked in git:** true
- **Quarantine copy committed:** true
- **Quarantine path:** `backups/_cleanup_quarantine/2026-07-24-unused-ops-qa-scripts/scripts/print-public-inventory-summary.mjs`
- **How to restore:** `npm run cleanup:restore -- --file scripts/print-public-inventory-summary.mjs`

