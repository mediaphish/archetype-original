# Devotional auto‑publish (nightly safety net)

You’re not supposed to “babysit” publishing.

This project already has routines that refresh what the site shows. What this adds is a **nightly safety net** that makes sure any new devotionals you wrote locally get published without you doing anything extra.

## What this does (in plain terms)

Every night at **11:50 PM**, it checks:

- “Did any new devotionals get added to the devotionals folder today?”

If **no**, it does nothing.

If **yes**, it publishes them to the live site.

If it detects an accidental repeat (same date, same slug, same scripture, or a “too-similar” topic), it **stops** and writes a simple report so you can fix it.

## Where Claude should save new devotionals

- `ao-knowledge-hq-kit/journal/devotionals/`

## The easiest setup (recommended): tell Claude to do it once

Copy/paste this message to Claude:

“Please enable the nightly devotional auto‑publisher for Archetype Original.
It should run at 11:50 PM local time.
Use the setup file at `notes/com.archetypeoriginal.devotionals.autopublish.plist`.
After enabling it, run a quick test and confirm where I can see the result.”

That’s it. Claude can do the setup without you needing to think about the mechanics.

## How to confirm it worked (no technical tools needed)

After the nightly run, you can check these files inside the repo:

- **Log (what it did)**: `notes/DEVOTIONAL_AUTO_PUBLISH_LOCAL.log`
- **If it stopped for overlap reasons**: `notes/DEVOTIONAL_AUTO_PUBLISH_REPORT.md`

If a devotional was published, you’ll also see it on the live site under `/faith` on its scheduled date.

## Day‑to‑day workflow (how you’ll use this)

- Claude writes new devotionals into the devotionals folder.
- If Claude publishes immediately, great.
- If not, the nightly safety net publishes anything that was missed.

## Appendix (only if you ever need it): the “manual” steps

These are only here as a backstop. You should not need to do this yourself.

1) Make sure this folder exists on your Mac:
- `~/Library/LaunchAgents`

2) Copy this file into it (exact name matters):
- `notes/com.archetypeoriginal.devotionals.autopublish.plist`
  → `~/Library/LaunchAgents/com.archetypeoriginal.devotionals.autopublish.plist`

3) Turn it on (Claude can do this part):
- Load: `launchctl load ~/Library/LaunchAgents/com.archetypeoriginal.devotionals.autopublish.plist`
- Test now: `launchctl start com.archetypeoriginal.devotionals.autopublish`
- Turn off: `launchctl unload ~/Library/LaunchAgents/com.archetypeoriginal.devotionals.autopublish.plist`

