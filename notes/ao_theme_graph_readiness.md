# Theme mapping readiness (future-proofing checklist)

The theme / ideology graph later depends on one thing: **consistent tags + traceable lineage**.

## What we’re standardizing now (without a re-architecture)

- **Lane**: stored as `ao_lane` (short label)
- **Tags**: stored as `topic_tags` (lowercase, small set)
- **Lineage**:
  - quote-based work: `source_quote_id` on scheduled posts
  - idea-based work: `source_idea_id` on scheduled posts
  - source link / attribution stays attached where it exists

## Where those fields are preserved today

- Analyst → Studio: `ao_quote_review_queue.ao_lane` + `topic_tags`
- Studio → Publisher scheduling: `ao_scheduled_posts.ao_lane` + `topic_tags` + `why_it_matters` + `best_move`
- Library (Ideas): `suggested_ao_lane` + `suggested_topic_tags` (and optional brief fields)

## One-time setup

To keep intent + tags on scheduled posts, run:
- `database/ao_scheduled_posts_intent_and_feedback.sql`

