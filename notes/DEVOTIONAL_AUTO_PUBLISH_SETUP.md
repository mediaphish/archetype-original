# Devotional auto‑publish (nightly safety net)

This project can already “refresh the site’s content list” on a schedule. What this adds is a **nightly safety net** that:

- checks whether any **new devotional files** were added/edited locally
- publishes them to the live site automatically

It’s designed for the workflow where another tool (like Claude) saves new devotional markdown files into:

- `ao-knowledge-hq-kit/journal/devotionals/`

## What will happen each night (11:50 PM)

- If there are **no new devotionals**, nothing happens.
- If there **are** new devotionals:
  - it runs the normal “refresh content list” step
  - it publishes the new devotionals live

If it detects a duplicate/overlap (same date, same slug, same scripture, or suspiciously similar topic), it will **STOP** and write a report here:

- `notes/DEVOTIONAL_AUTO_PUBLISH_REPORT.md`

## One‑time setup on your Mac

You (or Claude) will do this once.

1) Create the folder if it doesn’t exist:

- `~/Library/LaunchAgents`

2) Copy this file into that folder (exact filename matters):

- `notes/com.archetypeoriginal.devotionals.autopublish.plist`
  → `~/Library/LaunchAgents/com.archetypeoriginal.devotionals.autopublish.plist`

3) Turn it on:

- Run: `launchctl load ~/Library/LaunchAgents/com.archetypeoriginal.devotionals.autopublish.plist`

4) To test immediately (optional):

- Run: `launchctl start com.archetypeoriginal.devotionals.autopublish`

## If you ever want to turn it off

- Run: `launchctl unload ~/Library/LaunchAgents/com.archetypeoriginal.devotionals.autopublish.plist`

