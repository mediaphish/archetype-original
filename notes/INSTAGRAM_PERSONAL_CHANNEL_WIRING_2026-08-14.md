# Instagram Personal channel wiring (#125) — verification notes

## Code wiring (shipped)

- `instagram_personal` added to `JOURNAL_LAUNCH_REQUIRED_CHANNELS` with `account_id: ig_mediaphish`
- Same list reused by schedule + captions completeness/quality gates
- System prompt updated: Instagram Personal is auto-scheduled, not manual paste

## Token refresh workflow

File exists: `.github/workflows/refresh-instagram-login-tokens.yml`  
Schedule: weekly Monday 7am UTC + manual dispatch  
Uses secrets: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

**Still confirm in GitHub:** the workflow is enabled on the repo, and those two secrets are actually set. If secrets are missing, the channel works today and can silently fail when the token expires (~60 days from last refresh; row previously showed expires_at ~2026-09-24).

## Live post verification (required before treating as fully proven)

Code review alone is not enough per the prompt. Remaining manual check on the live site:

1. Publish/schedule a journal launch that includes an `instagram_personal` caption.
2. Confirm an `ao_scheduled_posts` row exists with `platform=instagram` and `account_id=ig_mediaphish`.
3. Let the publish worker run; confirm a real post on `@mediaphish` and capture the permalink.
4. Confirm Instagram Business (`account_id=meta`) still posts to the business account only — no cross-wire.
