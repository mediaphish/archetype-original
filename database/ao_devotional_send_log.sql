-- A row for every devotional send run.
--
-- 2026-10-06. Every failure in this story was silent. The sender answered
-- 200 OK with "no devotionals published today" on days one was published, two
-- mornings running, and the only way anyone found out was Bart's inbox being
-- empty. He is off grid for eleven days.
--
-- With a row per run, "did it go out" has an answer that does not depend on
-- reading server logs, and a missed day is something a check can see.

create table if not exists ao_devotional_send_log (
  id uuid primary key default gen_random_uuid(),
  ran_at timestamptz not null default now(),
  calendar_date date not null,
  source text,
  found integer not null default 0,
  sent integer not null default 0,
  failed integer not null default 0,
  skipped_duplicates integer not null default 0,
  note text
);

create index if not exists ao_devotional_send_log_ran_at_idx on ao_devotional_send_log (ran_at desc);
