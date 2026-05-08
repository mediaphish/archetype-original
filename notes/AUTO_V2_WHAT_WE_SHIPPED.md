# Auto V2 — What landed in the repo (vs the Dropbox bundle)

The bundle’s `chat-v2.js` assumed columns like `owner_email` and a JSON shape `{ reply }` only. **This app’s database and UI do not match that.**

## What we shipped instead

- **`lib/ao/autoV2.js`** — Anthropic brain (`runAutoChat`), corpus snippets + voice anchors, optional `AUTO_ANTHROPIC_MODEL`.
- **`api/ao/auto/chat.js`** — Thin route that:
  - Uses **`ensureAutoThread` / `addAutoMessage` / `getAutoThreadState`** from [`lib/ao/autoHub.js`](../lib/ao/autoHub.js) (correct **`created_by_email`** threading model).
  - Returns the **same JSON shape as V1** so **`AutoHubPanel.jsx` keeps working**: `thread`, `messages`, `attachments`, `assistant_message`, `receipts`, etc.
- **`api/ao/auto/chat-v1-backup.js`** — Full previous handler (rollback).

## Env

- **`ANTHROPIC_API_KEY`** — required on Vercel.
- **`AUTO_ANTHROPIC_MODEL`** — optional override if the default model id needs adjustment.

## Rollback

1. Replace `api/ao/auto/chat.js` with the contents of `chat-v1-backup.js` (or rename files per your preference).
2. Deploy.
