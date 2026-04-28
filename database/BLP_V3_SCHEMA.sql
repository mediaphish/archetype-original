-- Bad Leader Project v3 schema
-- Run in Supabase SQL editor.

create extension if not exists vector;
create extension if not exists pgcrypto;

create table if not exists blp_submissions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  region text not null,
  industry text not null,
  original_story text not null,
  tone text not null default 'dysfunctional',
  status text not null default 'pending',
  relevance_decision text not null default 'approve',
  relevance_reason text,
  created_at timestamptz not null default now()
);

create table if not exists blp_clusters (
  id uuid primary key default gen_random_uuid(),
  tone text not null default 'dysfunctional',
  label text,
  created_at timestamptz not null default now()
);

create table if not exists blp_stories (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null unique references blp_submissions(id) on delete cascade,
  region text not null,
  industry text not null,
  neutralized_text text not null,
  tone text not null default 'dysfunctional',
  ali_conditions text[] not null default '{}',
  scoreboard_leadership boolean not null default false,
  classification_confidence text not null default 'medium',
  embedding_vector vector(1536),
  cluster_id uuid references blp_clusters(id) on delete set null,
  thumbs_up_count integer not null default 0,
  status text not null default 'pending',
  published_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists blp_cluster_jobs (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references blp_stories(id) on delete cascade,
  status text not null default 'queued',
  error_message text,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

create table if not exists blp_magic_link_tokens (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  token text not null unique,
  expires_at timestamptz not null,
  used boolean not null default false,
  used_at timestamptz,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

create table if not exists blp_admin_sessions (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  token text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists blp_votes (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references blp_stories(id) on delete cascade,
  vote_key text not null,
  created_at timestamptz not null default now(),
  unique (story_id, vote_key)
);

create index if not exists idx_blp_submissions_status on blp_submissions(status);
create index if not exists idx_blp_submissions_relevance on blp_submissions(relevance_decision);
create index if not exists idx_blp_submissions_created on blp_submissions(created_at desc);

create index if not exists idx_blp_stories_status on blp_stories(status);
create index if not exists idx_blp_stories_tone on blp_stories(tone);
create index if not exists idx_blp_stories_cluster on blp_stories(cluster_id);
create index if not exists idx_blp_stories_published on blp_stories(published_at desc);
create index if not exists idx_blp_stories_conditions on blp_stories using gin (ali_conditions);
create index if not exists idx_blp_stories_vector on blp_stories using ivfflat (embedding_vector vector_cosine_ops) with (lists = 100);
create index if not exists idx_blp_stories_search on blp_stories using gin (to_tsvector('english', neutralized_text));

create index if not exists idx_blp_cluster_jobs_status on blp_cluster_jobs(status, created_at);

create index if not exists idx_blp_magic_tokens_lookup on blp_magic_link_tokens(token, email, used);
create index if not exists idx_blp_admin_sessions_token on blp_admin_sessions(token, expires_at);

-- Keep these tables server-only.
alter table blp_submissions disable row level security;
alter table blp_clusters disable row level security;
alter table blp_stories disable row level security;
alter table blp_cluster_jobs disable row level security;
alter table blp_magic_link_tokens disable row level security;
alter table blp_admin_sessions disable row level security;
alter table blp_votes disable row level security;
