# Auto V2 — Corpus Fix

I am not an engineer. One task only. Report back when done.

---

## THE PROBLEM

Auto is running on Anthropic but the corpus is not loading into sessions.
The fix is a single file replacement.

---

## THE FILE ATTACHED

`autoV2-fixed.js` — updated version of the brain file

---

## WHAT YOU ARE DOING

Replacing `/lib/ao/autoV2.js` with the fixed version.

The fix: corpus loading now uses `loadKnowledgeDocs` and `rankDocumentsByQuery`
from the existing `lib/ao/corpusPullQuotes.js` — the same pattern that worked
in V1 production. The old version tried to read markdown files directly,
which does not work on Vercel.

---

## ONE STEP ONLY

Copy `autoV2-fixed.js` over the existing file at:
```
/lib/ao/autoV2.js
```

That is the only change. Nothing else.

---

## THEN DEPLOY

Commit and deploy to Vercel. Tell me when it is live.

---

## DO NOT TOUCH

- `api/ao/auto/chat.js` — do not touch
- Any frontend files — do not touch
- Any other lib files — do not touch
