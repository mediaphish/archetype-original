# Culture Science Knowledge Base

This directory contains the foundational knowledge corpus for Culture Science, which powers:
- Archy's responses to user questions
- The Archetype Leadership Index (ALI) methodology
- Research and measurement frameworks

## File Format

All files should be Markdown (`.md`) with YAML frontmatter. See `CULTURE_SCIENCE_CORPUS_GUIDE.md` in the project root for complete formatting instructions.

## Quick Template

```markdown
---
title: "Your Section Title"
slug: your-section-slug
type: culture-science
tags: ["culture-science", "ali", "relevant-tag"]
status: final
created_at: 2025-12-10
updated_at: 2025-12-10
summary: >
  A concise 2-3 sentence summary of this section.
source:
  kind: internal
takeaways:
  - Key point 1
  - Key point 2
related:
  - related-section-slug
---

Your content here...
```

## Structure

Add your 12 sections as individual `.md` files in this directory. The build script will automatically process them and make them available to Archy and ALI.

