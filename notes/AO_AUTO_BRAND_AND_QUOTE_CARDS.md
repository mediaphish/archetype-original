# AO Automation: logos vs quote cards

- **Logos:** Upload once in **AO Settings → Brand assets** (SVG, PNG, or JPEG). The system stores them and picks a default for light vs dark backgrounds when drawing cards.
- **Quote cards:** The app **generates** square SVG images using `lib/ao/quoteCardDesigner.js`—you do not upload finished card artwork for normal posting. The **minimal** style is a plain black or white background, quote text, and your mark at the bottom.
- **Code changes** to layouts or colors are made in this project (e.g. `quoteCardDesigner.js`), not by uploading new “template images.”

## Auto: pull quotes vs thematic search

- **Pull quotes:** Ask for pull quotes / quote cards **from your corpus** → short lines, optional minimal card preview.
- **Thematic search:** Ask where you discussed a topic **in your corpus / published writing** (e.g. “where in my corpus… pitfalls of servant leadership”) → **paragraph excerpts** with source links; **no** quote-card preview. Matching is **keyword overlap** over the knowledge index, so unusual synonyms may miss until a future embeddings pass.

## Optional automation

Weekly cron `GET/POST /api/cron/ao/corpus-pull-seed` (with `CRON_SECRET` when set) can add a few **internal** Inbox rows from the same corpus pull-quote search Auto uses. Set env **`AO_CORPUS_SEED_EMAIL`** to your AO login email; optional: `AO_CORPUS_SEED_QUERY`, `AO_CORPUS_SEED_LIMIT`.
