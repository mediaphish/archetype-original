-- AO Newsroom Shared Memory Loop — Phase 1
-- Generated, prioritized "chase list" for Scout (what to pursue next).
--
-- Run in Supabase SQL editor.

create table if not exists public.ao_scout_chase_list (
  id uuid primary key default gen_random_uuid(),
  created_by_email text not null,
  topic text not null,
  why text,
  priority int not null default 50,
  expires_at timestamptz,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_ao_scout_chase_list_by_owner_status_priority
  on public.ao_scout_chase_list (created_by_email, status, priority desc, updated_at desc);

