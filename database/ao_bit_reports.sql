-- Bit, the IT teammate (2026-10-27): one row per thing he watches.
-- Applied as migration bit_it_reports. Server-only (RLS on, no policies).
create table if not exists public.ao_bit_reports (
  key text primary key,
  label text not null,
  status text not null check (status in ('ok','warn','broken')),
  detail text,
  for_claude text,
  first_seen_at timestamptz,
  last_checked_at timestamptz not null default now(),
  resolved_at timestamptz,
  notified_at timestamptz
);
alter table public.ao_bit_reports enable row level security;

alter table public.ao_team_tasks drop constraint if exists ao_team_tasks_agent_check;
alter table public.ao_team_tasks add constraint ao_team_tasks_agent_check check (agent = any (array['auto','jot','reach','producer','editor','designer','it']));
