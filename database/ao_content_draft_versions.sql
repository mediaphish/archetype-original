-- Draft version history: one row per save with the pre-overwrite content/title.
-- Applied via Supabase migration ao_content_draft_versions (2026-08-13).

CREATE TABLE IF NOT EXISTS public.ao_content_draft_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_id UUID NOT NULL REFERENCES public.ao_content_drafts(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  title TEXT,
  created_by_email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ao_content_draft_versions_draft_id_created_at_idx
  ON public.ao_content_draft_versions (draft_id, created_at DESC);

CREATE INDEX IF NOT EXISTS ao_content_draft_versions_email_idx
  ON public.ao_content_draft_versions (created_by_email);

COMMENT ON TABLE public.ao_content_draft_versions IS
  'Append-only history of ao_content_drafts content before each overwrite save.';

ALTER TABLE public.ao_content_draft_versions ENABLE ROW LEVEL SECURITY;
