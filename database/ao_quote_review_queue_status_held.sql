-- AO Automation — allow `held` items in Analyst
-- Run in Supabase SQL editor.
--
-- The app uses `status='held'`, but the original table CHECK constraint was created without it.

DO $$
DECLARE
  cname TEXT;
BEGIN
  SELECT c.conname INTO cname
  FROM pg_constraint c
  JOIN pg_class t ON t.oid = c.conrelid
  JOIN pg_namespace n ON n.oid = t.relnamespace
  WHERE t.relname = 'ao_quote_review_queue'
    AND n.nspname = 'public'
    AND c.contype = 'c'
    AND pg_get_constraintdef(c.oid) ILIKE '%status%'
    AND pg_get_constraintdef(c.oid) ILIKE '%pending%'
    AND pg_get_constraintdef(c.oid) ILIKE '%approved%'
    AND pg_get_constraintdef(c.oid) ILIKE '%rejected%';

  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.ao_quote_review_queue DROP CONSTRAINT IF EXISTS %I', cname);
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- If the constraint lookup fails for any reason, do not block the migration.
  NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.ao_quote_review_queue
    ADD CONSTRAINT ao_quote_review_queue_status_check
      CHECK (status IN ('pending', 'held', 'approved', 'rejected'));
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

