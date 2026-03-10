# Pre-rendering (SEO)

Pre-rendering turns each route into static HTML so search engines and first-time visitors get the right content. The list of routes is in `scripts/prerender.mjs` (including `/ao`, `/ao/login`, and all AO dashboard paths).

## Why it’s not on every commit

Pre-rendering used to run automatically after every commit (via a git hook). That made commits take 8–10 minutes, which was unacceptable. It was moved off the commit hook so that:

- Commits and pushes stay fast.
- Pre-rendering is run only when you choose to refresh it (or on a schedule elsewhere).

## When to run it

Run pre-rendering when you’ve added or changed pages (including AO routes) and you want the live site to serve static HTML for those URLs:

1. **Locally (with Puppeteer):**  
   `npm run prerender:local`  
   Then commit and push the updated `dist/` if you want those files deployed.

2. **One-off full build + prerender:**  
   `npm run build:prerender`  
   Same idea: run when you want fresh pre-rendered HTML, then commit/push `dist/` if needed.

Pre-rendering is skipped on Vercel (no Puppeteer there). So either:

- Run it locally when you need it and commit the generated `dist/` files, or  
- Use another service (e.g. scheduled job or Prerender.io) to produce and serve the static HTML.

## If your commits are still slow

If a post-commit hook is still running prerender and slowing commits, disable it once per clone:

```bash
node scripts/disable-prerender-on-commit.mjs
```

After that, run `npm run prerender:local` (or `build:prerender`) only when you want to refresh pre-rendered HTML.
