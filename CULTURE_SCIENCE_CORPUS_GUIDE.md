# Culture Science Corpus - File Format & Structure Guide

## Overview
This guide provides the exact format and structure for adding your 12 Culture Science sections to the knowledge corpus. These files will power Archy's responses and serve as the foundation for the Archetype Leadership Index (ALI).

## File Location
All Culture Science corpus files should be placed in:
```
ao-knowledge-hq-kit/knowledge/culture-science/
```

## File Format: Markdown with YAML Frontmatter

Each section should be a separate `.md` file with the following structure:

```markdown
---
title: "Section Title"
slug: section-title
type: culture-science
tags: ["culture-science", "ali", "leadership", "organizational-behavior"]
status: final
created_at: 2025-12-10
updated_at: 2025-12-10
summary: >
  A concise 2-3 sentence summary of this section. This will be used by Archy 
  for quick reference and in search results. Make it clear and descriptive.
source:
  kind: internal
  citation_keys: ["culture-science-section-01"]
takeaways:
  - Key takeaway point 1
  - Key takeaway point 2
  - Key takeaway point 3
applications:
  - How this applies to leadership practice
  - How this applies to organizational culture
related:
  - slug-of-related-section
  - another-related-section-slug
---

Your full content goes here. This can be as long as needed (including 20,000+ words).

Use standard Markdown formatting:
- **Bold** for emphasis
- *Italic* for subtle emphasis
- Headers (# ## ###) for structure
- Lists for key points
- Code blocks for examples if needed

The content will be processed and made searchable by Archy.
```

## Required Frontmatter Fields

### Essential Fields (Required)
- **`title`**: The section title (e.g., "The Foundation of Culture Science")
- **`slug`**: URL-friendly identifier (lowercase, hyphens, no spaces)
- **`type`**: Use `"culture-science"` for all sections
- **`tags`**: Array of relevant tags. Always include `"culture-science"` and `"ali"`
- **`status`**: `"final"` when ready, `"draft"` while editing
- **`created_at`**: Date in YYYY-MM-DD format
- **`updated_at`**: Date in YYYY-MM-DD format
- **`summary`**: 2-3 sentence summary (critical for Archy's quick reference)

### Optional but Recommended Fields
- **`source`**: Object with `kind: "internal"` and optional `citation_keys`
- **`takeaways`**: Array of 3-5 key takeaways (helps Archy extract main points)
- **`applications`**: Array of practical applications
- **`related`**: Array of slugs linking to related sections

## Recommended File Naming Convention

For your 12 sections, use a clear numbering and naming system:

```
culture-science/
  ├── 01-foundation.md
  ├── 02-core-principles.md
  ├── 03-measurement-framework.md
  ├── 04-organizational-behavior.md
  ├── 05-leadership-dynamics.md
  ├── 06-trust-and-safety.md
  ├── 07-communication-systems.md
  ├── 08-accountability-structures.md
  ├── 09-culture-drift.md
  ├── 10-intervention-strategies.md
  ├── 11-ali-methodology.md
  ├── 12-implementation-guide.md
```

Or use descriptive names:
```
culture-science/
  ├── foundation.md
  ├── core-principles.md
  ├── measurement-framework.md
  ├── organizational-behavior.md
  ├── leadership-dynamics.md
  ├── trust-and-safety.md
  ├── communication-systems.md
  ├── accountability-structures.md
  ├── culture-drift.md
  ├── intervention-strategies.md
  ├── ali-methodology.md
  ├── implementation-guide.md
```

## Example: Complete File Structure

```markdown
---
title: "The Foundation of Culture Science"
slug: foundation
type: culture-science
tags: ["culture-science", "ali", "foundation", "organizational-behavior", "research"]
status: final
created_at: 2025-12-10
updated_at: 2025-12-10
summary: >
  Culture Science is built on decades of research in organizational psychology, 
  neuroscience, and leadership. This section establishes the theoretical and 
  empirical foundation that informs all measurement, assessment, and intervention work.
source:
  kind: internal
  citation_keys: ["culture-science-foundation"]
takeaways:
  - Culture Science integrates research from multiple disciplines
  - Evidence-based approach distinguishes it from generic consulting
  - Foundation supports both Archy's knowledge and ALI's methodology
applications:
  - Informs how Archy answers questions about culture and leadership
  - Provides research backing for ALI assessment questions
  - Guides intervention strategies based on established principles
related:
  - core-principles
  - measurement-framework
  - ali-methodology
---

# The Foundation of Culture Science

[Your 20,000 words of content here...]

## Subsection 1

Content...

## Subsection 2

More content...

[Continue with full content...]
```

## Content Guidelines

### For Large Sections (20,000 words)
- Use clear headers (`##`, `###`) to break up content
- Include subsections for major topics
- Use lists for key points
- Bold important concepts for emphasis
- Keep paragraphs readable (3-5 sentences)

### For Smaller Sections
- Still use the same frontmatter structure
- Content can be shorter but should be complete
- Maintain the same quality and depth

## Tag Recommendations

Common tags to use across sections:
- `"culture-science"` (always include)
- `"ali"` (always include for ALI foundation)
- `"leadership"`
- `"organizational-behavior"`
- `"research"`
- `"measurement"`
- `"trust"`
- `"communication"`
- `"accountability"`
- `"culture-drift"`
- `"intervention"`

## Processing & Integration

Once files are added:
1. Files are automatically processed by `scripts/build-knowledge.mjs`
2. Creates/updates `public/knowledge.json`
3. Archy can immediately access the content via `/api/chat.js`
4. Content is searchable by title, summary, body, and tags

## Testing Your Files

After adding files, you can:
1. Run `node scripts/build-knowledge.mjs` to rebuild the corpus
2. Check `public/knowledge.json` to verify your sections are included
3. Test Archy's responses to see if content is being used
4. Use `/api/knowledge?q=your-search-term` to test search

## Next Steps

1. Create the `culture-science/` directory if it doesn't exist
2. Add your 12 `.md` files with proper frontmatter
3. Run the build script to process them
4. Test with Archy to ensure content is accessible

## Questions?

If you need clarification on:
- Frontmatter fields
- File naming
- Content structure
- Tag usage
- Related section linking

Just ask!

