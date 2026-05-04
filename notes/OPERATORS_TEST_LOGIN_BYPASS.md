# Operators — temporary login without magic link (testing only)

## When to use

Browser or QA sessions where email magic links are awkward. **Not** a replacement for normal login long-term.

## How it works

1. You set a **server secret** on the host: `OPERATORS_TEST_LOGIN_SECRET` (long random string, at least 8 characters).
2. On **`/operators/login`**, add query **`?operatorsTest=1`** to reveal the test sign-in block (or set `VITE_SHOW_OPERATORS_TEST_LOGIN=true` at build time so it always shows during that deploy).
3. Enter the **same email** you already have in `operators_users`, plus the secret → the app stores `operators_email` in the browser (same outcome as a successful magic link for session purposes).

If **`OPERATORS_TEST_LOGIN_SECRET` is unset**, the API refuses test login entirely.

## After testing

1. Remove **`OPERATORS_TEST_LOGIN_SECRET`** from Vercel (or your env).
2. Remove **`VITE_SHOW_OPERATORS_TEST_LOGIN`** if you used it; redeploy if needed.
3. Optional: stop using **`?operatorsTest=1`** links in bookmarks.

No code change required to “turn off” — the bypass stops when the secret is gone.
