# Auto V2 Deployment — Cursor Instructions

I am not an engineer. Follow these instructions exactly. Do not improvise. Do not refactor anything that is not listed here. When each step is done, tell me what you did before moving to the next one.

---

## THE THREE FILES ATTACHED

- `autoV2.js` — the new AI brain
- `chat-v2.js` — the new route handler
- `AUTO_V2_CURSOR_INSTRUCTIONS.md` — full technical reference (read it)

---

## WHAT YOU ARE DOING

Replacing the chat brain for the Auto feature with a new Anthropic-powered version. Nothing else in the codebase changes. The frontend does not change. The quote card system does not change. The publishing system does not change. Only the chat brain changes.

---

## STEP 1 — Install the Anthropic SDK

Run this command in the project root:

```
npm install @anthropic-ai/sdk
```

Tell me when it's done.

---

## STEP 2 — Place the brain file

Copy `autoV2.js` to exactly this path:

```
/lib/ao/autoV2.js
```

Do not rename it. Do not move it anywhere else. Tell me when it's done.

---

## STEP 3 — Back up the old chat route

Find the file at:

```
/api/ao/auto/chat.js
```

Rename it to:

```
/api/ao/auto/chat-v1-backup.js
```

Do not delete it. This is our rollback. Tell me when it's done.

---

## STEP 4 — Place the new chat route

Copy `chat-v2.js` to exactly this path:

```
/api/ao/auto/chat.js
```

Tell me when it's done.

---

## STEP 5 — Verify the environment variable

Check that `ANTHROPIC_API_KEY` exists in the Vercel environment variables for this project. Do not add it — it is already there. Just confirm it exists and tell me.

---

## STEP 6 — Check the Supabase tables

Open the Supabase project for this app. Confirm that both of these tables exist:

- `ao_auto_threads` with columns: `id`, `owner_email`, `state`, `created_at`
- `ao_auto_messages` with columns: `id`, `thread_id`, `owner_email`, `role`, `content`, `created_at`

These tables should already exist from the previous version. If any columns are missing, tell me which ones before doing anything. Do not modify the database without telling me first.

---

## STEP 7 — Deploy to Vercel

Deploy the project. Tell me when the deployment is live.

---

## THAT IS ALL

Do not touch any other files. Do not refactor. Do not improve. Do not update the frontend. The only changes are the four actions above: install the SDK, add autoV2.js, rename the old chat.js, add the new chat.js.

If anything looks wrong or a step fails, stop and tell me what happened before trying to fix it.
