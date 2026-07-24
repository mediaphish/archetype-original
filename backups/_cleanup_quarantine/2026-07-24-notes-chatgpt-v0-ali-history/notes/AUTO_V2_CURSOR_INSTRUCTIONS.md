# Auto V2 — Cursor Implementation Instructions

These are step-by-step instructions for dropping Auto V2 into the existing
archetypeoriginal.com codebase. Follow them in order. Do not skip steps.

---

## STEP 1: Install the Anthropic SDK

In the project root, run:

```bash
npm install @anthropic-ai/sdk
```

---

## STEP 2: Add the brain file

Copy `autoV2.js` into:

```
/lib/ao/autoV2.js
```

Do not rename it. The route handler imports it by this exact path.

---

## STEP 3: Replace the chat route

The existing file at `/api/ao/auto/chat.js` is 3,819 lines.
**Do not delete it yet.** Rename it first as a backup:

```
/api/ao/auto/chat-v1-backup.js
```

Then copy `chat-v2.js` into:

```
/api/ao/auto/chat.js
```

This is the only file the frontend calls. The rename ensures you can roll back
instantly if anything goes wrong.

---

## STEP 4: Verify the environment variable

Confirm `ANTHROPIC_API_KEY` exists in Vercel environment variables.
It should already be there. The new code reads it as:

```js
process.env.ANTHROPIC_API_KEY
```

Same pattern as `AO_AUTO_MODEL` and other existing vars.

---

## STEP 5: Check the database tables

The new chat handler uses these two Supabase tables:

- `ao_auto_threads` — needs columns: `id` (uuid, pk), `owner_email` (text), `state` (jsonb), `created_at` (timestamptz)
- `ao_auto_messages` — needs columns: `id` (uuid, pk), `thread_id` (uuid, fk), `owner_email` (text), `role` (text), `content` (text), `created_at` (timestamptz)

These tables likely already exist from V1. Verify they exist in Supabase.
If any columns are missing, add them. The new code does not require any
schema changes beyond what V1 already used.

---

## STEP 6: No frontend changes needed for first deploy

The existing frontend (`CommandCenter.jsx` or whichever component calls
`/api/ao/auto/chat`) sends `{ message, thread_id }` in the POST body and
expects `{ ok, thread_id, reply }` back.

The new handler returns exactly that shape. No frontend changes required
to get the new brain running.

---

## STEP 7: Deploy and test

Deploy to Vercel. Then open the Auto chat interface and send this message:

```
Tell me what you know about my approach to servant leadership and what content 
I've written on it.
```

Expected behavior: Auto should respond with a grounded, conversational answer
that references actual content from the corpus. It should sound like a CMO
who has read everything, not a keyword matcher returning database rows.

If the response sounds like that, V2 is working.

---

## WHAT CHANGED AND WHY

**Old system:**
- 3,819 lines in chat.js
- 232 regex patterns deciding what the user "meant"
- Routes to different modes: plan, write, package, recall, training, publish
- Each mode called different helper functions with different logic
- Result: brittle, context-unaware, easy to break with natural language

**New system:**
- ~80 lines in chat.js
- One call to Claude (claude-sonnet-4-6)
- System prompt carries all the intelligence
- Conversation history provides all the context
- Result: natural language, context-aware, handles anything Bart says

**What is NOT changing in this deploy:**
- Quote card generation (still uses OpenAI — Design agent stays on OpenAI)
- Publishing to social channels (unchanged)
- Library/Review Queue UI (unchanged)
- Scout, publishing schedule, all other routes (unchanged)
- Auth system (unchanged)

Only the chat brain changes. Everything else continues working.

---

## ROLLBACK PLAN

If something breaks:

1. Rename `/api/ao/auto/chat.js` back to `/api/ao/auto/chat-v2.js`
2. Rename `/api/ao/auto/chat-v1-backup.js` back to `/api/ao/auto/chat.js`
3. Deploy

You are back to V1 in two minutes.

---

## NEXT PHASE (after V2 is confirmed working)

Once the conversation brain is running correctly, the next steps are:

1. **UI rebuild** — Replace the current chat UI with a clean, conversation-first
   interface. The current CommandCenter.jsx needs significant work.

2. **Corpus search improvement** — Add semantic search so Auto loads the most
   relevant corpus content for each conversation, not just keyword-matched files.

3. **Design agent integration** — Wire the quote card generator to call from
   inside an Auto conversation, not as a separate flow.

4. **Publisher coordination** — Build the scheduling conversation into Auto
   directly, so Bart can say "let's schedule this week's posts" and Auto handles it.

These come after V2 is stable. One thing at a time.
