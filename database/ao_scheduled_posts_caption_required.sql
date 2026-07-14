-- Enforce non-blank captions on scheduled posts.
-- Run in Supabase SQL editor.
--
-- Existing blank scheduled rows will block this constraint. Mark them failed
-- first so they cannot go out blank and the constraint can be added.

UPDATE ao_scheduled_posts
SET
  status = 'failed',
  error_message = COALESCE(
    NULLIF(TRIM(COALESCE(error_message, '')), ''),
    'Blocked: empty caption — cannot schedule'
  ),
  updated_at = now()
WHERE status = 'scheduled'
  AND (caption IS NULL OR TRIM(caption) = '');

-- Prevent scheduled posts from having null or empty captions.
-- Only applies to rows with status = 'scheduled'.
-- Pending review, posted, and failed rows are exempt.
ALTER TABLE ao_scheduled_posts
DROP CONSTRAINT IF EXISTS ao_scheduled_posts_caption_required;

ALTER TABLE ao_scheduled_posts
ADD CONSTRAINT ao_scheduled_posts_caption_required
CHECK (
  status != 'scheduled'
  OR (caption IS NOT NULL AND TRIM(caption) != '')
);

-- Confirm
SELECT constraint_name, check_clause
FROM information_schema.check_constraints
WHERE constraint_name = 'ao_scheduled_posts_caption_required';
