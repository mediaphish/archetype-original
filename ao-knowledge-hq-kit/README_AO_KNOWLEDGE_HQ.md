
# AO Knowledge HQ — Quick Setup

1) Copy everything into your AO repo root.
2) Merge this into `package.json`:
```json
{
  "type": "module",
  "scripts": { "build:index": "node scripts/build-index.mjs" },
  "dependencies": { "gray-matter": "^4.0.3" }
}
```
3) Run:
```bash
npm install
npm run build:index
```
4) Verify `public/knowledge.json` exists.
5) Commit & push. Done.
