# Audience / follower data research spike (Phase 4 — no build yet)

**Date:** 2026-08-12  
**Goal:** Confirm what audience data each connected platform can return *with Bart’s current tokens/scopes*, before writing any caption code that assumes follower models.

## Current access snapshot (live DB, no secrets)

| Integration | Token table | Present? | Notes from live metrics work |
| --- | --- | --- | --- |
| Meta (Facebook Page + IG) | `ao_meta_tokens` | Yes — user + page tokens, IG business id, Page id | Post-level FB likes/comments work; IG media insights work |
| Instagram Login (separate) | `ao_instagram_login_tokens` | Table exists | Parallel path; do not assume same scopes as Page-linked IG |
| LinkedIn | `ao_linkedin_tokens` | Yes | **Post metrics blocked:** `partnerApiSocialActions.GET` permission missing |
| X/Twitter | `ao_x_tokens` | Yes | `public_metrics` on tweets works |

There is **no** `ao_connected_platforms` table and **no** audience/follower tables or modules under `lib/ao/` today.

## Per-platform: what is real vs what would require more access

### 1. Facebook Page (deepest Meta path already connected)

**Available with typical Page token (likely already in hand):**
- `GET /{page-id}?fields=fan_count,followers_count` — simple audience *size*
- Page insights for reach/impressions over time (Page-level, not demographic)

**Not “who follows you” demographics** without further Insights / Marketing API surfaces and reviews.

**Cost/complexity:** Low for fan/follower *count* only (one Graph call, store a daily snapshot). Medium if Page insights time series are wanted.

**Recommendation:** Start here if we add audience at all — cheapest confirmation of “how big is this channel?”

### 2. Instagram (Business / Creator)

**With current post insights scopes (already used for media metrics):**
- Media insights: reach, likes, comments, shares, saves — **already in use**
- Account-level `GET /{ig-user-id}?fields=followers_count,media_count` is often available with basic IG permissions

**Audience insights / demographics** (`follower_demographics`, `online_followers`, etc.):
- Require `instagram_manage_insights` (Facebook Login path) or `instagram_business_manage_insights` (Instagram Login path)
- Many demographic metrics need **≥100 followers**
- Meta app review is commonly required for production insights scopes
- Data lag up to ~48 hours; demographic breakdowns are partial (top segments)

**Cost/complexity:** Low for `followers_count` if the current token already allows the field (verify with one live call before building). High for true demographic audience modeling (scope review + privacy constraints).

### 3. LinkedIn

**Today:** social-actions metrics for posts already fail with  
`Not enough permissions to access: partnerApiSocialActions.GET…`

**Follower analytics** for an organization typically need Marketing Developer Platform / partner products and scopes such as organization admin / follower statistics APIs — **not** something the current personal token has proven.

**Cost/complexity:** High. Do not build LinkedIn audience features until post metrics permissions are fixed first; audience would be a second permission climb.

### 4. X / Twitter

**Today:** tweet `public_metrics` works (impressions, likes, replies, retweets).

**Audience size:** user lookup `public_metrics.followers_count` on the authenticated user is usually available on v2 with standard user-read scopes — verify with one live call against the connected account.

**Demographics:** not meaningfully available on self-serve API the way Meta insights are.

**Cost/complexity:** Low for follower *count*; rate limits apply. Do not plan demographic audience modeling on X.

## Metrics scoring note (Gap 2 follow-up, 2026-08-12 evening)

Re-checked `ao_scheduled_post_metrics` after the silent-failure fix:

| Platform | Rows | Scored (`engagement_score` not null) | Live fetch now |
| --- | --- | --- | --- |
| Instagram | 61 | 58 | OK |
| Facebook | 63 | 0 | OK (likes/comments) — rows not yet rewritten by cron with scores |
| Twitter | 25 | 0 | OK (`public_metrics`) — same: cron rewrite pending / sparse |
| LinkedIn | 70 | 0 | **Fail:** missing `partnerApiSocialActions` permission |

So: the earlier silent-failure bug is not “still hiding errors” for LinkedIn — LinkedIn is a real permissions gap. Facebook/X fetches work in diagnostic; scored counts should rise once the daily cron (or a manual sync) rewrites those rows. Caption-craft insight in this pass is therefore **additive and data-gated**: it fires when scored captions exist (Instagram today) and stays quiet when they do not.

## Build recommendation (do not implement in this spike)

1. **Do not** invent an audience model for caption writing yet.  
2. Optional next smallest step (separate prompt): one verified live call each for FB `fan_count`, IG `followers_count`, X `followers_count`; store daily snapshots only if all three succeed with *current* tokens.  
3. Defer LinkedIn audience until post-metrics scopes are repaired.  
4. Defer demographic / “who is the audience” modeling until Meta insights scopes are confirmed and reviewed.
