-- Reviewer action audit log (append-only).
-- Run once in the Supabase SQL editor.
-- Records every reviewer login, page load, upload, publish, and production-route click.

CREATE TABLE IF NOT EXISTS ao_reviewer_audit_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type text NOT NULL,
  route text,
  method text,
  request_summary jsonb,
  result_ok boolean,
  result_summary jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS ao_reviewer_audit_log_created_at_idx ON ao_reviewer_audit_log (created_at DESC);
