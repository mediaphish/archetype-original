# Pre-rendering (SEO)

Pre-rendering turns each route into static HTML so search engines and first-time visitors get the right content. The list of routes is in `scripts/prerender.mjs` (including `/ao`, `/ao/login`, and all AO dashboard paths).

## Automated pre-rendering

A **GitHub Action** (`.github/workflows/prerender.yml`) runs pre-rendering automatically:

- **Daily** at 3:00 AM UTC
- **On push to main** when source or scripts change (`src/`, `public/`, `scripts/prerender.mjs`, etc.)
- **Manually** from the GitHub Actions tab: “Pre-render all URLs” → “Run workflow”

The workflow builds the site, visits every URL with Puppeteer, saves the rendered HTML into `dist/`, then commits and pushes so the live site serves the pre-rendered pages. No local step required.

## Why it’s not on every commit

Pre-rendering used to run automatically after every commit (via a git hook). That made commits take 8–10 minutes, which was unacceptable. It was moved off the commit hook so that:

- Commits and pushes stay fast.
- Pre-rendering runs in GitHub Actions on a schedule and when relevant files change.

## When to run it yourself

If you want fresh pre-rendered HTML without waiting for the schedule or a push:

1. **Locally (with Puppeteer):**  
   `npm run prerender:local`  
   Then commit and push the updated `dist/` if you want those files deployed.

2. **Trigger the workflow:**  
   GitHub → Actions → “Pre-render all URLs” → “Run workflow”.

Pre-rendering is skipped on Vercel (no Puppeteer there). The automated workflow runs on GitHub’s runners and commits the generated `dist/` so the next deploy serves the static HTML.

## If your commits are still slow

If a post-commit hook is still running prerender and slowing commits, disable it once per clone:

```bash
node scripts/disable-prerender-on-commit.mjs
```

After that, run `npm run prerender:local` (or `build:prerender`) only when you want to refresh pre-rendered HTML.
