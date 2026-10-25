-- Auto's team: background tasks (2026-10-25).
-- Bart: "Then they run autonomously until they need me again."
-- One row per assignment. A task runs in passes on the server through the same
-- engine as the chat (api/ao/auto/chat.js runChatTurn), in its own conversation.
create table if not exists ao_team_tasks (
  id uuid primary key default gen_random_uuid(),
  agent text not null check (agent in ('auto', 'jot', 'reach', 'producer')),
  title text not null,
  brief text not null,
  status text not null default 'queued'
    check (status in ('queued', 'running', 'needs_bart', 'done', 'failed', 'cancelled')),
  assigned_by text not null default 'auto',
  thread_id uuid references ao_auto_threads(id) on delete set null,
  parent_thread_id uuid references ao_auto_threads(id) on delete set null,
  question text,
  summary text,
  last_note text,
  error text,
  passes integer not null default 0,
  max_passes integer not null default 8,
  heartbeat_at timestamptz,
  started_at timestamptz,
  finished_at timestamptz,
  notified_at timestamptz,
  created_by_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ao_team_tasks_status_idx on ao_team_tasks (status, updated_at desc);
create index if not exists ao_team_tasks_thread_idx on ao_team_tasks (thread_id);

alter table ao_team_tasks enable row level security;

-- 2026-10-25: the Producer joins the team.
alter table ao_team_tasks drop constraint if exists ao_team_tasks_agent_check;
alter table ao_team_tasks add constraint ao_team_tasks_agent_check check (agent in ('auto', 'jot', 'reach', 'producer'));
