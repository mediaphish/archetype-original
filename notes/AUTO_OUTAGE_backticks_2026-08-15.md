# Auto outage — extra backticks in the draft-visibility instruction (2026-08-15)

Auto went down for every message (“Could not reach Auto”) because a prompt line used unescaped backticks around `[ARTIFACT type="draft" ...]`. That broke Auto’s startup, so the chat path never loaded.

Fixed in `lib/ao/autoV2.js` (escape those backticks). This note exists so the live site picks up that already-pushed fix.
