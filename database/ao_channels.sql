-- Auto channels (Slack-style), Phase 1 of notes/PLAN-auto-chat-first.md. Applied 2026-10-26.
create table if not exists public.ao_channels (
  id uuid primary key default gen_random_uuid(),
  owner_email text not null,
  key text not null,
  name text not null,
  kind text not null default 'project' check (kind in ('standing','project')),
  lead text not null default 'auto',
  purpose text,
  sort integer not null default 100,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_email, key)
);
alter table public.ao_channels enable row level security;
