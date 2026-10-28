-- What each team model call used (2026-10-28), so AI spend can be read by
-- teammate and kind of work. Applied as migration ai_usage_log. Server-only
-- (RLS on, no policies). Written by lib/ao/promptCache.js recordUsage.
create table if not exists public.ao_ai_usage (
  id bigserial primary key,
  at timestamptz not null default now(),
  source text not null,
  model text,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  cache_read_tokens integer not null default 0,
  cache_write_tokens integer not null default 0,
  thread_id text
);
create index if not exists ao_ai_usage_at_idx on public.ao_ai_usage (at);
alter table public.ao_ai_usage enable row level security;
