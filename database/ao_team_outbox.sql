-- Emails the team writes for Bart (2026-10-25).
-- Bart: "I need these agents, when necessary, to be able to send emails from my
-- Account." And: "Show me first for now, but I will want this automated."
-- A draft waits for Bart in the Queue; approved ones are sent by his own Gmail
-- (the Apps Script in notes/gmail-sync), so they sit in his Sent folder.
create table if not exists ao_team_outbox (
  id uuid primary key default gen_random_uuid(),
  agent text not null,
  task_id uuid references ao_team_tasks(id) on delete set null,
  thread_id uuid references ao_auto_threads(id) on delete set null,
  to_email text not null,
  to_name text,
  subject text not null,
  body text not null,
  purpose text,
  status text not null default 'pending_review'
    check (status in ('pending_review', 'approved', 'sending', 'sent', 'discarded', 'failed')),
  gmail_message_id text,
  gmail_thread_id text,
  error text,
  approved_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ao_team_outbox_status_idx on ao_team_outbox (status, created_at);

alter table ao_team_outbox enable row level security;
