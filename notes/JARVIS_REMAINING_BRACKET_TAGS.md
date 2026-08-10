# JARVIS — remaining bracket tags (inventory)

Phase 1 maps eight primary tools (+ `verify_quote` in Phase 2). Auto still emits / chat.js still parses some bracket tags. This inventory is the follow-up list after the tool migration.

## Migrated to native tools (2026-08-10)

| Tag / path | Tool | Status |
|---|---|---|
| SAVE ON PRODUCE via content blocks | `save_draft` | Tool writes DB; produce-path skipped when tool succeeded |
| Approval regex + promote | `approve_draft` | Tool live; regex remains as fallback for plain "approved" |
| `[PUBLISH_JOURNAL]` UI bar | `publish_journal` | Tool records intent; UI confirmation still required |
| schedule-journal-launch | `schedule_captions` | Shared helper; native insert |
| `[CORPUS_FETCH_FULL_TEXT]` / `[DRAFT_FETCH_FULL_TEXT]` | `fetch_full_text` | Mid-turn tool; legacy restart skipped when tool ran |
| `[TRIGGER_RESHARE]` | `trigger_reshare` | Native `runReshareCycle`; legacy tag skipped when tool ran |
| `[DALLE_GENERATE]` | `generate_image` | Native `generateDesignImage` + intent enum; legacy skipped when tool ran |
| `[CARD]...[/CARD]` | `generate_quote_card` | Native card PNG; requires `verify_quote` gate |

## Still tag-only (not in Phase 1 eight-tool set) — schedule follow-ups

- `[PUBLISH_DEVOTIONAL]`
- `[RESHARE_EDIT]`, `[RESHARE_APPROVE]`, `[RESHARE_DISCARD]`
- `[OPPORTUNITY_WRITE_POST]`, `[OPPORTUNITY_GENERATE_IMAGE]`, `[OPPORTUNITY_COMPLETE]`, `[OPPORTUNITY_IMAGE_RESULT]`
- `[UPDATE_SCHEDULED_CAPTIONS]`
- `[EPISODE_PROCESS]` / episode research signals
- `[IMAGE_GENERATED]` / `[IMAGES_GENERATED]` / `[RESHARE_RESULT]` result blocks (server-authored; keep)
- Content-constraint logging (removal instructions)
- Any Scout/Inbox/Ready-Post packaging tags still used outside Auto V2

## Cleanup rule (Step 7)

Migrated tools no longer re-run their old parsers when the matching tool already succeeded this turn. Full deletion of leftover regex fallbacks waits for live confirmation that the model consistently calls tools instead of tags.

Date: 2026-08-10
