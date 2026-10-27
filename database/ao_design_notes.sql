-- Bart's design calls, kept so Des never makes the same mistake twice (2026-10-27).
-- Applied as migration des_designer_and_design_notes. Server-only (RLS on, no policies).

alter table public.ao_team_tasks drop constraint if exists ao_team_tasks_agent_check;
alter table public.ao_team_tasks add constraint ao_team_tasks_agent_check check (agent = any (array['auto','jot','reach','producer','editor','designer']));

create table if not exists public.ao_design_notes (
  id uuid primary key default gen_random_uuid(),
  owner_email text not null,
  note text not null,
  applies_to text not null default 'all',
  about text,
  thread_id uuid,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists ao_design_notes_owner_idx on public.ao_design_notes (owner_email, active, created_at desc);
alter table public.ao_design_notes enable row level security;

-- 2026-10-27, migration team_lessons_area: every correction Bart makes to anyone
-- on the team is kept here as a lesson for everyone, by area.
alter table public.ao_design_notes add column if not exists area text not null default 'design';
alter table public.ao_design_notes add column if not exists source text not null default 'teammate';
create index if not exists ao_design_notes_area_idx on public.ao_design_notes (owner_email, area, active);
