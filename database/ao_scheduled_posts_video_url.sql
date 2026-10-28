-- A short video posted as a Reel (2026-10-28). Applied as migration
-- scheduled_posts_video_url. When set, image_url is only a cover. See
-- lib/social/reels.js and notes/PLAN-video-moments.md.
alter table public.ao_scheduled_posts add column if not exists video_url text;
