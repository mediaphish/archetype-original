-- Fix description constraints to match UI validation (150 words, not 150 characters)
-- Run this in Supabase SQL Editor

-- Drop the existing character-length constraints
ALTER TABLE operators_events
DROP CONSTRAINT IF EXISTS operators_events_host_description_check;

ALTER TABLE operators_events
DROP CONSTRAINT IF EXISTS operators_events_sponsor_description_check;

-- Add new constraints that allow enough characters for 150 words
-- 150 words * ~7 chars/word average = ~1050 chars, but allow up to 2000 for safety
ALTER TABLE operators_events
ADD CONSTRAINT operators_events_host_description_check 
CHECK (host_description IS NULL OR char_length(host_description) <= 2000);

ALTER TABLE operators_events
ADD CONSTRAINT operators_events_sponsor_description_check 
CHECK (sponsor_description IS NULL OR char_length(sponsor_description) <= 2000);

-- Note: Word count validation (150 words max) is still enforced in the UI/API layer
-- This database constraint just ensures reasonable character limits
