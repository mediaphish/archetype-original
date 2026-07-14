-- Reshare engine rebuild: review gate columns + settings + pending_review status.
-- Run in Supabase SQL editor BEFORE relying on the new Settings reshare UI.

-- Allow pending_review status on scheduled posts (required for review gate)
ALTER TABLE ao_scheduled_posts DROP CONSTRAINT IF EXISTS ao_scheduled_posts_status_check;
ALTER TABLE ao_scheduled_posts ADD CONSTRAINT ao_scheduled_posts_status_check
  CHECK (status IN ('scheduled', 'publishing', 'posted', 'failed', 'pending_review'));

-- Why the engine picked this entry
ALTER TABLE ao_reshare_queue
ADD COLUMN IF NOT EXISTS selection_reason text DEFAULT '';

-- Track which ao_scheduled_posts rows are pending review for this entry
ALTER TABLE ao_reshare_queue
ADD COLUMN IF NOT EXISTS pending_review_ids text[] DEFAULT '{}';

-- Auto-approve setting (off by default)
CREATE TABLE IF NOT EXISTS ao_reshare_settings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_email text NOT NULL UNIQUE,
  auto_approve boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

INSERT INTO ao_reshare_settings (owner_email, auto_approve)
VALUES ('bart@archetypeoriginal.com', false)
ON CONFLICT (owner_email) DO NOTHING;
