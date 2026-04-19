# Auto intent router (quote-card flows)

## Purpose

Quote-card behavior used to depend on **user-facing regex** (`wantsUserSuppliedQuoteCards`, `wantsCorpusPullQuotes`, etc.). That forced specific wording.

`lib/ao/autoIntentRouter.js` adds a **small OpenAI JSON classification** step so natural language routes into the same **deterministic** branches (paste → cards, corpus pull, deliverables, publish). Regex remains as a **fast path** inside `routeAutoIntent` (when heuristics already match) or as secondary checks in `api/ao/auto/chat.js`—not something Bart has to memorize.

## Environment

| Variable | Effect |
|----------|--------|
| `AO_AUTO_INTENT_ROUTER_DISABLED=1` | Skip model routing; only heuristics apply. |
| `AO_AUTO_INTENT_ROUTER_MODEL` | Model for classification (default `gpt-4o-mini`). |
| `AO_AUTO_CONTINUATION_MODEL` | Model for “more lines, same style” generation (defaults to intent router model). |

## Flow

1. `resolveQuoteRoutingMessage` runs **unless** Rapid Write is active on the thread.
2. Continuation: if intent is `continue_quote_series`, a second call generates numbered lines from account/publish seeds, then the same paste → card pipeline runs.
3. Paste: if intent is `paste_quote_batch` with extracted quotes, a synthetic message adds an explicit card-build request so existing code paths fire.
4. `msgForQuoteRouting` is used in quote-related branches; the stored user message stays the **original** text.
