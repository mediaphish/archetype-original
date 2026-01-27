-- Add profile fields to operators_users table
-- These fields are only available to Operators (not Candidates)

ALTER TABLE operators_users
ADD COLUMN IF NOT EXISTS headshot_url TEXT,
ADD COLUMN IF NOT EXISTS business_name TEXT,
ADD COLUMN IF NOT EXISTS website_url TEXT;

-- Add index for business_name for potential search/filtering
CREATE INDEX IF NOT EXISTS idx_operators_users_business_name ON operators_users(business_name) WHERE business_name IS NOT NULL;
