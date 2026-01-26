-- Add missing Event and Sponsor fields to operators_events table
-- Run this in Supabase SQL Editor

-- Add Host fields
ALTER TABLE operators_events
ADD COLUMN IF NOT EXISTS host_name TEXT,
ADD COLUMN IF NOT EXISTS host_logo_url TEXT,
ADD COLUMN IF NOT EXISTS host_location TEXT,
ADD COLUMN IF NOT EXISTS host_location_lat DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS host_location_lng DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS host_description TEXT CHECK (char_length(host_description) <= 150);

-- Replace sponsor_email with full sponsor fields
ALTER TABLE operators_events
DROP CONSTRAINT IF EXISTS unique_sponsor_per_event;

ALTER TABLE operators_events
ADD COLUMN IF NOT EXISTS sponsor_name TEXT,
ADD COLUMN IF NOT EXISTS sponsor_logo_url TEXT,
ADD COLUMN IF NOT EXISTS sponsor_website TEXT,
ADD COLUMN IF NOT EXISTS sponsor_phone TEXT,
ADD COLUMN IF NOT EXISTS sponsor_pot_value DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS sponsor_description TEXT CHECK (char_length(sponsor_description) <= 150);

-- Keep sponsor_email for backwards compatibility but it's now optional
-- The constraint was removed above, so multiple sponsors could theoretically exist
-- But we'll enforce max 1 sponsor in application logic

-- Add index for location searches
CREATE INDEX IF NOT EXISTS idx_operators_events_location ON operators_events(host_location_lat, host_location_lng) WHERE host_location_lat IS NOT NULL;
