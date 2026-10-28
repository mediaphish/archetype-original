-- A talk Bart gives from inside Auto (2026-10-28, first: Neosho Chamber,
-- Nov 11). Applied as migration talks. Server-only (RLS on, no policies).
-- sections: [{ id, kind: 'slide' | 'demo', title, lines: [text], image, notes, minutes }]
-- See notes/PLAN-talk-mode.md.
create table if not exists public.ao_talks (
  slug text primary key,
  title text not null,
  event text,
  sections jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.ao_talks enable row level security;
