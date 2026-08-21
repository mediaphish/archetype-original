-- Phase 2: allow 'candidate' in ao_editorial_memory_items.kind
--
-- Applied 2026-08-20. The kind CHECK already permitted 'series_plan' and
-- 'standing_rule', both of which had zero rows — the schema anticipated series
-- memory and standing rules and neither was ever populated. seriesMemory.js
-- reuses 'series_plan' rather than adding a parallel kind.
--
-- 'candidate' is genuinely new. Exploratory, pre-decision ideas had nowhere to
-- live anywhere in the system, which is why a discussed-but-undecided list of
-- series entries could be lost outright rather than merely being hard to find.

ALTER TABLE ao_editorial_memory_items
  DROP CONSTRAINT IF EXISTS ao_editorial_memory_items_kind_check;

ALTER TABLE ao_editorial_memory_items
  ADD CONSTRAINT ao_editorial_memory_items_kind_check
  CHECK (kind = ANY (ARRAY[
    'corpus_doc'::text,
    'social_post'::text,
    'image_series'::text,
    'series_plan'::text,
    'standing_rule'::text,
    'stated_preference'::text,
    'candidate'::text
  ]));
