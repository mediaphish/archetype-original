# Publisher intent + feedback (what’s new)

## Goal

When you schedule a post, we keep the **original intent** (lane + why it matters + recommended move) attached to that scheduled post, and we give you a simple way to record **what worked** so the system can learn over time.

## What this enables

- **Intent stays visible** in Publisher (so it doesn’t turn into “just text”).
- Posts can be traced back to their origin (quote vs ready post).
- You can add a quick “good / meh / bad” rating after a post runs.

## One-time database setup

Run this in Supabase:
- `database/ao_scheduled_posts_intent_and_feedback.sql`

If you don’t run this yet:
- Scheduling still works
- “Intent” will simply not be stored on the scheduled post
- “Add feedback” will tell you the database upgrade is needed

