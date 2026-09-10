# Why a deploy takes 8 to 9 minutes

Measured 2026-09-10 against `dpl_39TN7vxr6hUXji5B3RUqfAPk8HWK` and
`dpl_ExmTn1QLW8inU2EbjV2QS8TydzHd`, both production builds on main.

**Supersedes `notes/DEPLOYMENT_TIME_ANALYSIS.md`, which is stale.** That note
blames an 11 minute npm install and a Puppeteer Chromium download. Install now
takes 27 seconds and pre-rendering runs on Vercel successfully, 29 routes in
about 65 seconds. Neither of its claims is true any more. Left in place as
history; do not act on it.

## Where the time goes

| Phase | Time | What it is |
|---|---|---|
| Clone | 9s | |
| npm install | 27s | 860 packages |
| vite build | 8s | 2,135 modules |
| build-knowledge and the nine verifiers | ~25s | |
| sitemap, RSS, static journal and FAQ HTML | ~5s | 352 + 148 files |
| notify-search-engines | 1s | |
| prerender | 65s | 29 routes, Puppeteer, serial |
| dist verifiers | 5s | |
| **Everything above** | **~2m 0s** | **our code** |
| Packaging functions | 2m 22s | silent, no log output |
| Deploying outputs | 4m 32s | |
| Build cache | 32s | 175 MB |
| **Total** | **~9m** | |

Our build scripts are about two minutes of a nine minute deploy. The other seven
are Vercel packaging and uploading serverless functions. Optimizing the scripts
would be optimizing the part that is already fast.

## The actual cause

`vercel.json` has one build entry, `api/**/*.js`, which produces **304 separate
serverless functions**. Confirmed in deployment metadata:
`lambdaRuntimeStats: {"nodejs":304}`.

Traced all 304 with `@vercel/nft`, the same tracer Vercel uses:

```
SUM of per-function bundles:   1,871.6 MB
UNION of all traced files:       215.8 MB  (3,671 files)
duplication factor:                  8.7x
median bundle:                     0.9 MB
```

The median is fine. The distribution is not. Twelve endpoints carry 1.33 GB of
the 1.87 GB between them:

```
  177.0 MB  api/ao/auto/chat.js
  175.9 MB  api/ao/auto/thread/new.js
  175.9 MB  api/ao/auto/upload-header-image.js
  168.6 MB  api/ao/auto/generate-card-image.js
  156.7 MB  api/ao/auto/reshare-journal.js
  130.5 MB  api/cron/publish-scheduled-journals.js
  130.5 MB  api/ao/auto/publish-journal.js
   44.6 MB  api/ao/daily-run-now.js
   44.5 MB  api/cron/ao/daily-run.js
   44.3 MB  api/ao/quotes/[id]/studio-assets.js
   42.0 MB  api/ao/weekly-pull-bundle-now.js
   42.0 MB  api/cron/ao/weekly-pull-quotes.js
```

Broken down, the weight is not the libraries:

```
api/cron/publish-scheduled-journals.js
  125.7 MB  public/images      <-- 
    2.3 MB  public/knowledge.json
    0.2 MB  lib/ao
    0.0 MB  everything else
```

**`public/images` is being bundled into serverless functions.** 126 MB of
JPEGs, shipped inside seven lambdas that will never open most of them.

### Why the tracer pulls in the whole directory

Three call sites join a static directory prefix to a dynamic filename:

- `lib/ao/seriesImageReferences.js:116,119,120`
- `lib/ao/publishJournalEntry.js:468`
- `api/ao/auto/reshare-journal.js:292`

```js
candidates.push(path.join(process.cwd(), 'public/images', base));
```

`base` is not knowable at build time, so the tracer resolves what it can and
includes the entire directory. Anything that transitively imports one of these
modules inherits all 126 MB. That is how `chat.js` ends up carrying archetype
portraits.

**These files are genuinely read at runtime.** Publishing reads the featured
image off disk; resharing reads a photo; plate cards read `public/images/cards`.
So the directory cannot simply be excluded with `excludeFiles`. Doing that
would produce a build that succeeds and a publish path that fails on the next
Friday resurface, which is the worst available outcome.

## Options, ranked by value against risk

### 1. Compress the images. Recommended.

Written as `scripts/optimize-images.mjs`. Dry run by default, not wired into the
build. Measured across all of `public/images` including subfolders, nothing
modified:

```
files scanned:      210
would shrink:       181
already optimal:     29
current:          125.7 MB
after:             43.4 MB
saved:             82.3 MB  (65%)
```

Rule: resize to a 2000px width cap only when the image is wider than that, then
re-encode (mozjpeg quality 82, PNG level 9 palette), and keep the original
whenever the new file is not smaller. Twenty-nine files fail that last test and
are left alone.

Individual reductions run 93 to 97%, which is high enough to be worth
explaining. Most of these are dark, smooth, painterly archetype images, largely
near-black gradient, which is close to the best case for JPEG. The originals
also appear to have been written at very high quality with no resize. The
sample pairs looked correct on inspection, but how they look is Bart's call,
which is what `--sample` is for.

`ali-hero.jpg` is the worst offender: 5712 x 4284, 5.1 MB, a full camera
resolution file served to browsers. It compresses to 282 KB.

This helps twice:

- Cuts roughly 82 MB out of each of seven lambdas, about 570 MB off the 1.87 GB
- Cuts the same weight off page loads

The second one matters more than the deploy time. We spent today fixing
discovery, and Core Web Vitals is a ranking input. A 2.4 MB hero image on a
page we are asking Google to rank harder is working against the rest of it.

Risk: it rewrites committed image files, so it wants a visual check on a sample
and a branch. Fully reversible through git.

### 2. Move runtime image reads to Supabase Storage.

Generated images already live there. If publishing pulled source images from
Storage instead of the repo, `public/images` would leave the lambdas entirely
and the union drops by 126 MB.

Larger change, touches the publish path, and the publish path is the one thing
that must not break. Worth doing eventually, not worth doing first.

### 3. Reduce the function count.

304 functions from one glob. Consolidating them, or moving off the legacy
`builds` config, would cut packaging time.

Highest risk by a distance. `builds` and `routes` have caused three silent
failures in this repo, where a missing route returned the homepage with a 200
instead of a 404 (`x-media-check`, `linkedin-check`, `draft-versions`).
`lib/__tests__/wiringContracts.test.js` now catches the missing-route class,
which lowers the risk but does not remove it. Given the median bundle is 0.9 MB,
the count is not where the weight is. Do the weight first, then decide whether
this is still worth it.

## What was not done

No image was modified, no code path changed, and `vercel.json` was not touched.
This note is measurement only. Option 1 needs a look at a few compressed files
before it is committed, and nobody should be reshaping the function config
without watching the deploy that follows.

## Reproducing the trace

`@vercel/nft` was installed in a scratch directory, not in this repo. Pass
absolute paths as inputs; `base` does not relocate them, and passing repo
relative paths makes every trace fail with "does not exist".

```js
const { fileList } = await nodeFileTrace([path.join(ROOT, 'api/x.js')], { base: ROOT });
```
