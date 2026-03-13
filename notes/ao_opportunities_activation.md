# Opportunities (first-class objects) — when and how to turn on

This is **not active yet** in the live product. It’s the “next layer” once Steps 1–3 feel consistently strong.

## Why we’re waiting

If briefs + drafts aren’t high-quality and repeatable, adding Opportunities will just create *more cards* without creating *more clarity*.

## The minimal approach (what we prepared)

We prepared a **minimal** `ao_opportunities` table that can:
- store multiple “opportunities” created from a single lead (a Scout/Analyst item or a Library idea)
- keep a short brief + routing status
- preserve tags (`ao_lane`, `topic_tags`) so theme mapping can be added later

This avoids a big re-architecture while still unlocking “one lead → many plays.”

## Turning it on

1) In Supabase, run:
- `database/ao_opportunities.sql`

2) After that, these endpoints become usable:
- `GET /api/ao/opportunities`
- `GET /api/ao/opportunities/:id`
- `POST /api/ao/opportunities`

## Next UI milestone (later)

When we’re ready, we’ll add:
- an “Opportunities” panel inside Analyst (split one item into 2–4 concrete plays)
- routing + hold reasons per opportunity
- a clear link back to the source (“where did this come from?”)

