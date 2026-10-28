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

-- Bart asking Bit to send the engineer a report now, outside the daily pass
-- (2026-10-27). Applied as migration bit_engineer_requests.
create table if not exists public.ao_bit_requests (
  id uuid primary key default gen_random_uuid(),
  requested_at timestamptz not null default now(),
  note text,
  thread_id uuid,
  status text not null default 'pending' check (status in ('pending','picked','done')),
  picked_at timestamptz,
  done_at timestamptz,
  outcome text
);
create index if not exists ao_bit_requests_status_idx on public.ao_bit_requests (status, requested_at);
alter table public.ao_bit_requests enable row level security;
