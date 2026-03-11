-- AO Automation — Add person_urn to LinkedIn tokens table (one-time migration).
-- Run in Supabase SQL editor.

ALTER TABLE ao_linkedin_tokens
ADD COLUMN IF NOT EXISTS person_urn TEXT;

