# Instagram Personal channel wiring (#125) — verification notes

## Code wiring (shipped)

- `instagram_personal` added to `JOURNAL_LAUNCH_REQUIRED_CHANNELS` with `account_id: ig_mediaphish`
- Same list reused by schedule + captions completeness/quality gates
- System prompt updated: Instagram Personal is auto-scheduled, not manual paste

## Settings visibility (shipped — added scope)

- Status endpoint: `GET /api/ao/instagram-login/status` — reads via `getInstagramLoginConnection('ig_mediaphish')`, returns `connected`, `username`, `instagram_user_id`, `expires_at`, and an expiry warning when within 10 days
- Test endpoint: `POST /api/providers/meta/test-post-personal` — always posts with `account_id: ig_mediaphish` (does not use the Page-linked Meta path)
- Settings page: new **Instagram (Personal)** card next to Meta — status pill, username/id, expiry date, warning banner, “Post Instagram Personal Test” button
- No Connect/Reconnect button on this card (token was set up offline; reconnect flow is a separate follow-up if needed)

## Token refresh workflow

File exists: `.github/workflows/refresh-instagram-login-tokens.yml`  
Schedule: weekly Monday 7am UTC + manual dispatch  
Uses secrets: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

**Still confirm in GitHub Actions UI:** the workflow is enabled on the repo, and those two secrets are actually set. This environment could not verify secrets via the `gh` tool. If secrets are missing, the channel works today and can silently fail when the token expires (~60 days from last refresh).

## Live post verification

After deploy:

1. Open Settings → Instagram (Personal) and confirm Connected + @mediaphish.
2. Click **Post Instagram Personal Test** and confirm a real post on @mediaphish.
3. Optionally: publish/schedule a journal launch with an `instagram_personal` caption; confirm `ao_scheduled_posts` has `platform=instagram` and `account_id=ig_mediaphish`; confirm Instagram Business (`account_id=meta`) still posts only to the business account.
