# Deployment Time Analysis - Root Cause

## The Real Problem

Looking at the build logs, the issue is **NOT** the build itself - it's **npm install taking 11 minutes**:

```
16:39:50.743 Installing dependencies...
...
16:50:22.524 added 64 packages, and changed 498 packages in 11m
```

**The actual build is fast** (3-4 seconds), but npm install is killing deployment time.

## Root Causes

### 1. **Puppeteer Downloads Chromium** (Biggest Issue)
- Puppeteer downloads ~300MB of Chromium during `npm install`
- This happens on **every deployment** even though we skip pre-rendering on Vercel
- **Impact**: 8-10 minutes of the 11-minute install time

### 2. **498 Packages Changed**
- Something is causing npm to reinstall/update 498 packages
- This suggests cache isn't working or dependencies are changing
- **Impact**: 1-2 minutes

### 3. **Pre-rendering Script Running on Vercel**
- The logs show prerender.mjs is being called even though it should be skipped
- It fails (expected), but it's still being invoked
- **Impact**: Minimal (fails fast), but indicates build script issue

## Solutions

### Solution 1: Remove Puppeteer from Production Build (Recommended)
**Impact**: 8-10 minute reduction (11 min → 1-2 min)

Since pre-rendering doesn't work on Vercel anyway, we should:
1. Move Puppeteer to optional dependencies
2. Or use `puppeteer-core` with system Chrome (but Vercel doesn't have Chrome)
3. Or remove it entirely and use a service like Prerender.io

**Best approach**: Make Puppeteer optional and skip it on Vercel

### Solution 2: Fix Build Script
The build command in package.json doesn't match what's running. Need to ensure prerender.mjs is NOT called on Vercel.

### Solution 3: Optimize npm Install
- Use `npm ci` instead of `npm install` (faster, more reliable)
- Ensure Vercel cache is working
- Lock dependency versions

## Immediate Fixes

### Fix 1: Make Puppeteer Optional (5 minutes)
```json
{
  "optionalDependencies": {
    "puppeteer": "^21.6.1"
  }
}
```

Then update prerender.mjs to check if puppeteer exists:
```js
let puppeteer;
try {
  puppeteer = await import('puppeteer');
} catch (err) {
  console.log('Puppeteer not available, skipping pre-rendering');
  process.exit(0);
}
```

### Fix 2: Update Build Script (2 minutes)
Ensure prerender.mjs is NOT in the build command, or add Vercel check:

```json
{
  "build": "node scripts/generate-sitemap.mjs && vite build && npm run build-knowledge"
}
```

And ensure prerender.mjs exits early on Vercel:
```js
if (process.env.VERCEL) {
  console.log('⚠️  Skipping pre-rendering on Vercel');
  process.exit(0);
}
```

### Fix 3: Use npm ci (1 minute)
Update Vercel build command to use `npm ci` instead of `npm install`

## Expected Results

### Before
- npm install: 11 minutes
- Build: 3-4 seconds
- **Total: ~11 minutes**

### After (with Puppeteer optional)
- npm install: 1-2 minutes (no Chromium download)
- Build: 3-4 seconds
- **Total: ~1-2 minutes**

**Improvement: 80-90% faster deployments**

## Implementation Priority

1. **Make Puppeteer optional** (immediate, biggest impact)
2. **Fix build script** (ensure prerender doesn't run on Vercel)
3. **Use npm ci** (optimize install process)

## Files to Modify

1. `package.json` - Move puppeteer to optionalDependencies
2. `scripts/prerender.mjs` - Add early exit for Vercel, handle missing puppeteer
3. `vercel.json` - Ensure build command is correct (or add buildCommand override)

