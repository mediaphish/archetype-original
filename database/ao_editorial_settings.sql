-- AO Newsroom Shared Memory Loop — Phase 1
-- Owner-editable "beat priorities" (your universe).
--
-- Run in Supabase SQL editor.

create table if not exists public.ao_editorial_settings (
  created_by_email text primary key,
  beat_priorities text[] not null default '{}'::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

