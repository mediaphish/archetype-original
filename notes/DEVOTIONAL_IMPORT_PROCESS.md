# Devotional Import Process

## Overview
This document describes the standard process for importing new devotional markdown files into the archetype-original system. This process should be followed every time new devotionals are added.

## System Architecture

- **Devotionals Location**: `/Users/mediaphish/archetype-original/ao-knowledge-hq-kit/journal/devotionals/`
- **Build Script**: `scripts/build-knowledge.mjs` (run from archetype-original directory)
- **Output File**: `public/knowledge.json` (updated by build script)
- **ESV API**: Already integrated at `/api/esv/passage.js` - fetches scripture dynamically
- **Display Route**: Devotionals appear on `/faith` route via knowledge.json
- **Publish Date Logic**: Build script skips devotionals with `publish_date` in the future (they'll be included when their publish date arrives)

## Required File Structure

Each devotional markdown file must have:

### Front Matter (YAML between `---` markers)
```yaml
---
title: "Devotional Title"
slug: devotional-slug
date: "YYYY-MM-DD"
type: devotional
categories: ["servant-leadership", "devotional"]
status: published
publish_date: "YYYY-MM-DD"
scripture_reference: "Book Chapter:Verse–Verse (ESV)"
summary: "Brief summary text"
---
```

### Content Sections
- `## Scripture` - Heading with scripture reference and ESV.org link
- `## Reflection` - Main reflection content
- `## Practical Application` - Bullet points for application
- `## Takeaways` - Key takeaways (bullet points)
- `## Closing Thought` - Closing statement

**Note**: The full scripture text is NOT embedded in the markdown. The `ScriptureBlock` component fetches it dynamically from ESV API using the `scripture_reference` from frontmatter.

## Import Process Steps

### Step 1: Copy Markdown Files
1. Locate the devotional markdown files (usually in Downloads or provided by user)
2. Copy all files to: `/Users/mediaphish/archetype-original/ao-knowledge-hq-kit/journal/devotionals/`
3. Verify files are in place using `ls` command

### Step 2: Verify File Structure
Check that each file has:
- ✅ Correct frontmatter with all required fields
- ✅ `scripture_reference` in frontmatter (format: "Book Chapter:Verse–Verse (ESV)")
- ✅ `publish_date` set correctly (YYYY-MM-DD format)
- ✅ All content sections present (Scripture, Reflection, Practical Application, Takeaways, Closing Thought)

### Step 3: Run Build Script
```bash
cd /Users/mediaphish/archetype-original
node scripts/build-knowledge.mjs
```

**Expected Behavior**:
- Script processes all markdown files in devotionals directory
- Devotionals with `publish_date` in the future will be skipped (this is expected)
- Script outputs: "✅ Processed devotional: [Title]" or "⏰ Skipping future devotional: [Title]"
- Build completes with: "✅ Knowledge corpus built successfully!"

### Step 4: Verify Import
1. Check build script output for any errors
2. Verify that devotionals were processed (even if skipped due to future dates)
3. Confirm `public/knowledge.json` was updated

## Important Notes

### Publish Date Handling
- Devotionals with `publish_date` in the future are **correctly skipped** by the build script
- This is expected behavior - they will be included in knowledge.json when their publish date arrives
- Do NOT change publish dates to make them appear immediately unless user specifically requests it

### ESV API Integration
- Scripture text is fetched **dynamically** when devotionals are viewed
- No need to embed full scripture text in markdown files
- The `ScriptureBlock` component calls `/api/esv/passage?reference=...` automatically
- Scripture references in frontmatter should include "(ESV)" suffix - the API handles normalization

### File Naming Convention
- Files should follow pattern: `YYYY-MM-DD-slug.md`
- Example: `2026-02-01-leading-from-love-not-urgency.md`

## Troubleshooting

### Build Script Fails with Permission Error
- Run with `required_permissions: ['all']` to allow file system writes

### Devotionals Not Appearing
- Check `publish_date` - if in future, they're correctly being skipped
- Verify files are in correct directory
- Check build script output for errors
- Ensure `status: published` in frontmatter (not `draft`)

### Scripture Not Loading
- Verify `scripture_reference` is in frontmatter
- Check ESV API key is configured in environment variables
- Scripture loads dynamically - check browser console for API errors

## Quick Reference Checklist

When user provides new devotional files:

- [ ] Copy all markdown files to devotionals directory
- [ ] Verify frontmatter structure (title, slug, date, type, categories, status, publish_date, scripture_reference, summary)
- [ ] Verify content sections are present
- [ ] Run build script: `cd /Users/mediaphish/archetype-original && node scripts/build-knowledge.mjs`
- [ ] Check build output for successful processing
- [ ] Confirm files are in place and build completed

## Example Workflow

```
User: "I have 6 new devotionals to import"
AI: [Reads files, copies to devotionals directory, runs build script]
AI: "✅ All 6 devotionals imported successfully. They are scheduled for [dates] and will appear on /faith when their publish dates arrive."
```

## Related Files

- Build Script: `/Users/mediaphish/archetype-original/scripts/build-knowledge.mjs`
- ESV API Route: `/Users/mediaphish/archetype-original/api/esv/passage.js`
- Scripture Component: `/Users/mediaphish/archetype-original/src/components/ScriptureBlock.jsx`
- Devotionals Directory: `/Users/mediaphish/archetype-original/ao-knowledge-hq-kit/journal/devotionals/`
