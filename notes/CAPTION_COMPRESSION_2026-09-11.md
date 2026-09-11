# Why Auto's captions come back compressed

Investigated 2026-09-11 after Bart: "Very often, Auto does not get them right.
It tries to simplify. It doesn't use all the knowledge it has about the post in
my corpus... I always have to push on it."

## Not model habit. Instructed.

Auto's channel caption rules in lib/ao/autoV2.js told it to be short:

- Instagram Business: "1-3 sentences max. Punchy."
- X: "One sentence."
- LinkedIn Business, Facebook Business, Facebook Personal: "1-2 paragraphs."
- Captions were to be "derived from the finished post body", with nothing
  about the corpus.

The captions actually scheduled in the last 120 days match that instruction.
Median length: Facebook 253 characters, Instagram 263, LinkedIn 265, X 174.
LinkedIn's median sits at 265 even though LinkedIn Personal asked for two to
four paragraphs.

## The account's data does not support short captions

Engagement by caption length, ao_scheduled_post_metrics joined to
ao_scheduled_posts, synced rows only:

| Platform | 0-125 | 126-300 | 301-500 | 501-800 |
|---|---|---|---|---|
| Instagram | 28.9 (n=21) | 16.4 (n=31) | 19.5 (n=13) | 28.0 (n=6) |
| Facebook | 0.19 (n=21) | 1.05 (n=22) | 0.00 (n=9) | 0.60 (n=10) |
| X | 0.00 (n=2) | 0.00 (n=27) | | |

Instagram's shortest and longest groups perform about the same. Facebook and X
are near zero at every length. Sample sizes are small throughout. Nothing here
says shorter wins, so the caps were opinion.

## LinkedIn has never reported engagement

87 of 88 LinkedIn metric rows carry a sync_error, all the same one:

    LinkedIn: Not enough permissions to access: partnerApiSocialActions.GET.20260701

Reading reactions and comments needs LinkedIn partner API access, which is the
approval Bart is still waiting on. So this is not a code bug and cannot be fixed
from this side. Until access is granted, LinkedIn is the highest-volume channel
with no performance data at all, and every "what performs on LinkedIn" answer is
a guess. Auto is already told to say so when a metrics sync alert is present.

## A second, smaller push toward short

The performance context shown to Auto lists top posts with each caption cut to
80 characters. Auto's only view of Bart's best-performing captions was
fragments, and fragments read as short captions.

## What changed

1. Channel rules rewritten. Length caps with no data behind them removed; real
   platform limits kept (X 280 characters including the URL, Instagram no URLs
   in body, link policy, hashtag counts).
2. Captions must be written from the full approved post, with search_corpus
   for the central argument, the series, and connected pieces.
3. Each caption must carry a specific idea, line, or tension from the post.
   "If a caption could have been written without reading the post, it is wrong."
4. Top-post captions in the performance context are no longer cut to 80
   characters.

## What this does not fix

A prompt rule is an instruction, not a gate. If captions still come back thin,
the next step is mechanical, the same way voice is enforced: a check on
schedule_captions that refuses captions below a substance floor for channels
that allow length, or that share no distinctive phrase with the post. Not built
yet, because a length floor is a blunt instrument and should wait until we see
whether the instruction alone moves it.
