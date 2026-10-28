# Video moments: plan (approved 2026-10-28)

Bart, 2026-10-28: "The idea is for me to get 2 to 5 small scripts. I'm talking
15 to 30 seconds worth of content, maybe an interview question that Auto
proposes to me, and I set up a camera" (Osmo Mobile 8). Reels, TikTok, YouTube
Shorts. He produces the podcast in Riverside, whose Magic Clips cut long
recordings into short clips automatically.

Earlier context: on 2026-10-27 he held a full "video studio" but asked the team
to start bringing him video opportunities. That coaching is already in the
team's instructions.

## How it works

1. **Moments.** The team (Jot writes, Cam runs it) proposes 2 to 5 moments a
   week from his own writing. Each moment is a 40 to 75 word script or one
   interview question, with an opening line. Bart can read it on his phone.
2. **Recording.** Bart records one sitting, either with the Osmo on his phone
   or in Riverside.
3. **Cutting.** The recording goes into Riverside, and Magic Clips cuts the
   short clips. Riverside has no API for Magic Clips (checked 2026-10-28), and
   CapCut has none at all, so Bart downloads the clips he likes.
4. **Upload.** Bart uploads the finished clips to Auto from his phone, in the
   chat.
5. **Posting.** The team writes the post text for each platform, picks the
   moment's title and schedules it, the same as cards. Instagram Reels and
   Facebook Reels come first. YouTube Shorts follows once his channel is
   connected. He posts TikTok by hand until TikTok approves an app.

## What has to be built

- **Video upload from the phone into the chat.** A clip is too large for the
  current attachment path, so it goes straight to storage.
- **Posting video as a Reel** to Instagram and Facebook, through the scheduled
  posts queue.
- **A video clip shown in the panel** with its captions, one clip at a time,
  like the cards.
- **Team instructions** for weekly moments and for the clip-to-post step.

## What already exists (checked 2026-10-28)

These pieces were built for the podcast but have no screen yet:

- **Video storage:** the bucket `ao-episode-video` is public, with a 2 GB limit. Uploads go straight to storage with a signed upload address (`lib/ao/episodeVideoStorage.js`, `lib/ao/episodeClipStorage.js`). The clip upload endpoint's import path looks wrong.
- **Clip records:** the table `ao_episode_clip_drafts` was set up for Riverside Magic Clips, and `lib/ao/generateEpisodeClipCaption.js` writes a caption for a clip.
- **YouTube upload:** `lib/ao/youtubeUpload.js` uploads unlisted and is switched off unless `AUTO_YOUTUBE_UPLOAD_ENABLED=true`.
- **Missing:** speech-to-text, and posting video to any social platform.

## Later

- YouTube Shorts (Bart signs in once).
- TikTok (TikTok's app review).
- Words on screen, if Riverside's own captions are not enough.
