-- Draft identity fix: slug+kind is the stable post identity, not series_slug+part_number.
-- Verified before apply (2026-08-11): zero duplicate (created_by_email, slug, kind) rows; zero empty slugs.

ALTER TABLE public.ao_content_drafts
  DROP CONSTRAINT IF EXISTS ao_content_drafts_created_by_email_series_slug_part_number__key;

ALTER TABLE public.ao_content_drafts
  ADD CONSTRAINT ao_content_drafts_created_by_email_slug_kind_key
  UNIQUE (created_by_email, slug, kind);
