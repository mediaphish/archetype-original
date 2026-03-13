-- AO Newsroom Shared Memory Loop — Phase 1
-- Unified memory of what we've published/written (site corpus + posted social).
--
-- Run in Supabase SQL editor.

create table if not exists public.ao_editorial_memory_items (
  id uuid primary key default gen_random_uuid(),
  created_by_email text not null,

  -- MVP kinds: site corpus items + social posts that were actually posted.
  kind text not null check (kind in ('corpus_doc', 'social_post')),

  title text,
  source_url_or_slug text,
  body_text text,
  published_at timestamptz,

  ao_lane text,
  topic_tags text[] not null default '{}'::text[],
  series_key text,

  -- lineage back into AO Automation objects (when applicable)
  source_quote_id uuid,
  source_idea_id uuid,
  source_scheduled_post_id uuid,
  external_platform text,

  -- learning loop (manual feedback captured in Publisher UI)
  feedback_rating text,
  feedback_notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_ao_editorial_memory_items_by_owner
  on public.ao_editorial_memory_items (created_by_email);

create index if not exists idx_ao_editorial_memory_items_by_owner_kind_published
  on public.ao_editorial_memory_items (created_by_email, kind, published_at desc);

create index if not exists idx_ao_editorial_memory_items_topic_tags_gin
  on public.ao_editorial_memory_items using gin (topic_tags);

-- Avoid duplicates when rebuilding.
create unique index if not exists idx_ao_editorial_memory_items_unique_corpus
  on public.ao_editorial_memory_items (created_by_email, kind, source_url_or_slug)
  where kind = 'corpus_doc' and source_url_or_slug is not null;

create unique index if not exists idx_ao_editorial_memory_items_unique_social
  on public.ao_editorial_memory_items (created_by_email, kind, source_scheduled_post_id)
  where kind = 'social_post' and source_scheduled_post_id is not null;

