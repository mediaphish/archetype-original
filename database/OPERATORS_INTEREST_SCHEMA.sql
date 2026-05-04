-- Public interest applications for The Operators (marketing landing form)
-- Run in Supabase SQL editor. Inserts are performed by server API using the service role.

CREATE TABLE IF NOT EXISTS operators_interest (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  role_title text NOT NULL,
  company_size text NOT NULL,
  bio text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_operators_interest_created_at ON operators_interest (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_operators_interest_status ON operators_interest (status);

ALTER TABLE operators_interest ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access - operators_interest"
  ON operators_interest FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
