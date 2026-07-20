-- Multi-guest episode drafts: plural guests alongside singular guest.
-- Run once in the Supabase SQL editor.
-- guest / guest_id stay for single-guest episodes; guests / guest_ids are used for multi-guest.

ALTER TABLE ao_episode_drafts
ADD COLUMN IF NOT EXISTS guests jsonb DEFAULT NULL;

ALTER TABLE ao_episode_drafts
ADD COLUMN IF NOT EXISTS guest_ids text[] DEFAULT NULL;
