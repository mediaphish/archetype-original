-- Engagement inquiries.
--
-- 2026-10-04. A real inquiry arrived with no name, no email and no phone,
-- because the form had never asked for any of them and the handler stored
-- nothing anywhere. The notification email was the only copy that had ever
-- existed, so there was no way to answer the person who sent it.
--
-- Every submission is written here first and emailed second. A failure to
-- deliver the notification is then an inconvenience rather than a lost person.

create table if not exists engagement_inquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  role text,
  role_other text,
  org_size text,
  answers jsonb not null default '{}'::jsonb,
  email_delivered boolean not null default false,
  email_error text,
  created_at timestamptz not null default now()
);

create index if not exists engagement_inquiries_created_at_idx on engagement_inquiries (created_at desc);
create index if not exists engagement_inquiries_email_idx on engagement_inquiries (lower(email));
