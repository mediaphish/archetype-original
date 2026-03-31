# AO Automation: logos vs quote cards

- **Logos:** Upload once in **AO Settings → Brand assets** (SVG or PNG). The system stores them and picks a default for light vs dark backgrounds when drawing cards.
- **Quote cards:** The app **generates** square SVG images using `lib/ao/quoteCardDesigner.js`—you do not upload finished card artwork for normal posting. The **minimal** style is a plain black or white background, quote text, and your mark at the bottom.
- **Code changes** to layouts or colors are made in this project (e.g. `quoteCardDesigner.js`), not by uploading new “template images.”

## Optional automation

Weekly cron `GET/POST /api/cron/ao/corpus-pull-seed` (with `CRON_SECRET` when set) can add a few **internal** Inbox rows from the same corpus pull-quote search Auto uses. Set env **`AO_CORPUS_SEED_EMAIL`** to your AO login email; optional: `AO_CORPUS_SEED_QUERY`, `AO_CORPUS_SEED_LIMIT`.
