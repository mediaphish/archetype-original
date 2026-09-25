# Auto is running gpt-4o-mini in production for writing tasks

**Found:** 2026-09-23, incidentally, while looking for an Anthropic API key on
this machine for unrelated work on the Boyce Mouton archive.

**Changed:** nothing. No file in this repo was edited and no environment
variable was touched. This is a report.

Bart's stated intent: **OpenAI is only supposed to be used for image work.**

---

## What is actually happening

Model selection is env-driven with a hardcoded fallback, in this shape:

```js
model: process.env.AO_AUTO_MODEL || 'gpt-4o-mini'
```

**No model environment variable is set in Vercel, in any environment.** The
full list of env vars on the project contains `ANTHROPIC_API_KEY`,
`OPEN_API_KEY`, `ESV_API_KEY`, `RESEND_API_KEY` and the usual Postgres,
Supabase, Meta and LinkedIn entries — and not one `*_MODEL` variable.

So every fallback in the codebase is the live value. The Anthropic ones fall
back to Claude, which is fine. The OpenAI ones fall back to `gpt-4o-mini`,
which is not:

| Fallback | Call sites |
|---|---|
| `AUTO_ANTHROPIC_MODEL \|\| 'claude-opus-5'` | 12 |
| `AUTO_ANTHROPIC_MODEL \|\| 'claude-sonnet-5'` | 3 |
| `ARCHY_ANTHROPIC_MODEL \|\| 'claude-sonnet-5'` | 2 |
| `AUTO_EXAMPLE_CHECK_MODEL \|\| 'claude-opus-5'` | 1 |
| `AO_CAPTION_QUALITY_MODEL \|\| 'claude-haiku-4-5-...'` | 1 |
| **`AO_AUTO_MODEL \|\| 'gpt-4o-mini'`** | **9** |
| **`AO_SCOUT_MODEL \|\| 'gpt-4o-mini'`** | **2** |
| **`AO_IDEAS_MODEL \|\| 'gpt-4o-mini'`** | **2** |
| **`AO_AUTO_INTENT_ROUTER_MODEL \|\| 'gpt-4o-mini'`** | **2** |
| **`AO_ANALYST_MODEL \|\| 'gpt-4o-mini'`** | **2** |
| **`AO_STUDIO_MODEL`, `AO_EDITOR_MODEL`, `AO_AUTO_SCHEDULE_EXTRACT_MODEL`, `AO_AUTO_RAPID_WRITE_{INTENT,EXTRACT,VALIDATE}_MODEL`, `AO_RAPID_WRITE_IMAGE_REFINE_MODEL` — each `\|\| 'gpt-4o-mini'`** | **7** |

That is roughly **twenty call sites on gpt-4o-mini in production right now**.

These calls do execute. `OPEN_API_KEY` is set in Vercel, and
`lib/openaiKey.js` reads exactly that name:

```js
export function getOpenAiKey() {
  const key = process.env.OPEN_API_KEY;
  ...
}
```

Note the name is `OPEN_API_KEY`, not `OPENAI_API_KEY`. `lib/ao/corpusEmbeddings.js`
reads `process.env.OPENAI_API_KEY || process.env.OPEN_API_KEY`, covering both;
everything else goes through `getOpenAiKey()` and so depends on the shorter
name. Worth deciding whether that is intentional or a typo that has set.

---

## Which calls these are

Grouped by what they do, because they are not equally concerning.

### Writing in Bart's voice — the category that matters

- `lib/ao/draftQuotePost.js` — its own header says *"Uses OpenAI if configured;
  otherwise returns simple fallbacks."*
- `lib/ao/editorCompose.js`
- `lib/ao/rapidWriteMode.js`
- `lib/ao/readyPostSocialDrafts.js`
- `lib/ao/pullQuoteCaptions.js`
- `lib/ao/generateEpisodeClipCaption.js`
- `lib/ao/corpusPullQuotes.js`
- `lib/ao/corpusTldrReport.js`
- `lib/ao/shapeIdeaBrief.js`

### Classification and routing — defensible, still not the stated intent

- `lib/ao/autoIntentRouter.js`
- `lib/ao/publishChannelClassifier.js`
- `lib/ao/publishScheduleExtract.js`
- `lib/ao/evaluateCandidate.js`
- `lib/ao/analystDecision.js`
- `lib/ao/runScoutPass.js`
- `lib/ao/autoExternalSources.js`
- `lib/ao/autoBundle.js`

### Outside Auto — separate apps, some still on plain `gpt-4`

- `api/ali/generate-insights.js` (`gpt-4`)
- `api/ali/zone-recommendations.js`
- `api/ao/analyst/chat.js`
- `api/ao/quotes/[id]/studio-chat.js`
- `api/ao/writing/[id]/draft.js`
- `api/chat/assess-threat.js` (`gpt-4`)
- `api/operators/events/[id]/generate-scenarios.js` (`gpt-4`)
- `lib/badLeaderAi.js`

### Legitimately image work — leave alone

`gpt-image-1` in `generateQuoteCardImage.js`, `generatePlateCard.js`,
`generateLikenessCard.js`, `rapidWriteImage.js`, `recentApprovedHeader.js`,
`autoV2.js`. `text-embedding-3-small` in `corpusEmbeddings.js` is also OpenAI
but is embeddings, not writing — a separate decision.

---

## The part worth sitting with

**`lib/ao/voiceGuardrails.js` runs on Claude. The drafting it checks runs on
gpt-4o-mini.**

Bart's standing rule is that nothing goes out under his name carrying
AI-signature phrasing. The model enforcing that standard is Claude; the model
producing the prose it inspects never saw the standard at all. The guardrail is
downstream of the problem it exists to prevent.

---

## How to verify all of this

```bash
cd ~/archetype-original

# every model fallback in the codebase
grep -rhoE "process\.env\.[A-Z_]*MODEL[A-Z_]*\s*\|\|\s*'[^']+'" \
  --include="*.js" --include="*.mjs" lib api | sort | uniq -c | sort -rn

# what is actually set in Vercel
npx vercel env ls --scope mediaphishs-projects

# which files call OpenAI for text rather than images
grep -rl "chat/completions" --include="*.js" lib api | grep -v node_modules
```

---

## Open questions — answer before changing anything

1. **Was this deliberate?** `gpt-4o-mini` is cheap and fast. This may have been
   a considered cost decision that outlived its reasoning, or it may be drift.
   The git history on `lib/ao/` will say when these defaults were written and
   whether Claude was ever on the other side of them.

2. **Do the model env vars exist somewhere else?** They are absent from Vercel.
   If the intended values live only in a local `.env.local`, then local and
   production have been running different models — which would explain a lot of
   "it behaved differently in production" if that has ever come up.

3. **Is `OPEN_API_KEY` the intended name**, or a typo that got enshrined because
   setting it made things work?

4. **What is the correct default when a model variable is missing?** Falling
   back to a different provider silently is the underlying fault here, worse
   than the specific model chosen. Failing loudly, or falling back to a Claude
   model, are both defensible. Silently switching vendor is not.

5. **Does embeddings count as image work?** `text-embedding-3-small` is OpenAI
   and is not images. It may be fine, but it is not covered by the stated rule
   either. (Related: there is a known finding that corpus retrieval is keyword
   rather than semantic, and that a 3,000-character cap leaves about half the
   corpus out of the index. Whoever touches embeddings should look at that at
   the same time.)

---

## Suggested order of work

1. Decide the policy — which tasks may use which provider — before editing.
2. Set the model env vars explicitly in Vercel for every environment, so
   nothing depends on a fallback.
3. Change the fallbacks so a missing variable cannot silently change provider.
4. Move the voice-writing call sites first; they are the ones producing text
   under his name.
5. Routing and classification second, as a cost and quality judgment.
6. Leave `gpt-image-1` alone.
