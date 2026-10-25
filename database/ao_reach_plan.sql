-- Reach, the publicist inside Auto (2026-10-25).
-- One row holds Bart's weekly rhythm and each channel's job. Bart changes it by
-- telling Auto; defaults live in lib/ao/reach/reachPlan.js until he does.
create table if not exists ao_reach_plan (
  id text primary key default 'default',
  plan jsonb not null default '{}'::jsonb,
  updated_by text,
  updated_at timestamptz not null default now()
);

alter table ao_reach_plan enable row level security;
