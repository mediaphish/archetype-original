# ChatGPT Prompt: Culture Science Corpus File Structure

Use this prompt when creating Culture Science corpus files for the knowledge base:

---

## PROMPT FOR CHATGPT

When creating Culture Science corpus files, you MUST follow this exact structure. These files will be used by Archy (an AI assistant) and form the foundation for the Archetype Leadership Index (ALI).

### CRITICAL REQUIREMENTS:

1. **File Format**: Markdown (`.md`) with YAML frontmatter
2. **File Location**: Files go in `ao-knowledge-hq-kit/knowledge/culture-science/`
3. **File Naming**: Use kebab-case (e.g., `section-title-here.md`)

### REQUIRED FRONTMATTER (Copy this exact structure):

```yaml
---
title: "Your Section Title Here"
slug: your-section-slug-here
type: culture-science
tags: ["culture-science", "ali", "relevant-tag-1", "relevant-tag-2"]
status: final
created_at: "YYYY-MM-DD"
updated_at: "YYYY-MM-DD"
summary: >
  A concise 2-3 sentence summary of this section. This is CRITICAL for Archy to quickly understand and reference the content. Make it clear and descriptive.
source:
  kind: internal
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
```

### FRONTMATTER FIELD REQUIREMENTS:

- **`title`**: The main title of the section (required)
- **`slug`**: URL-friendly identifier, lowercase kebab-case (required)
- **`type`**: MUST be `culture-science` (required)
- **`tags`**: Array of tags. MUST include `"culture-science"` and `"ali"`. Use kebab-case for multi-word tags (e.g., `"leadership-reality"` not `"leadership reality"`)
- **`status`**: `final`, `revised`, or `draft` (required)
- **`created_at`**: Date in `"YYYY-MM-DD"` format (required)
- **`updated_at`**: Date in `"YYYY-MM-DD"` format (required, match `created_at` for new files)
- **`summary`**: 2-3 sentence summary using `>` YAML block scalar. This is CRITICAL for Archy's understanding (required)
- **`source.kind`**: `internal` for content written by Bart, `external` if from published source (required)
- **`takeaways`**: Array of key insights/lessons (required)
- **`applications`**: Array of how concepts can be practically applied (required)
- **`related`**: Array of `slug`s of related sections for internal linking (optional but recommended)

### CONTENT BODY:

- Use standard Markdown formatting
- Headers: `#` for main title, `##` for major sections, `###` for subsections
- Bold for emphasis: `**text**`
- Italic for subtle emphasis: `*text*`
- Lists: Use `-` for bullet points
- Code blocks: Use triple backticks if needed
- Large sections (20,000+ words) are fully supported

### WHAT NOT TO INCLUDE:

- ❌ Conversation artifacts like "Continue", "Just say:", "You said:", "ChatGPT said:"
- ❌ Meta-commentary about the writing process
- ❌ Instructions to continue to next sections
- ❌ Any text that isn't the actual content

### TAG NAMING CONVENTIONS:

- Use kebab-case: `"culture-science"` not `"culture science"`
- Always include: `"culture-science"` and `"ali"`
- Examples of good tags: `"leadership-reality"`, `"environmental-forces"`, `"diagnostic-model"`, `"trust-density"`

### SUMMARY WRITING GUIDELINES:

The `summary` field is CRITICAL. Archy uses this for quick reference. Write 2-3 sentences that:
- Capture the essence of the section
- Include key concepts and their relationships
- Are clear and descriptive
- Help Archy understand what this content covers

### EXAMPLE OF GOOD SUMMARY:

```yaml
summary: >
  Culture Science establishes that culture is not a vibe or feeling, but the environment people operate in daily—shaped by leadership behavior. It treats culture as a measurable, structural system governed by forces like pressure, clarity, trust, and alignment, not personalities or sentiment. Culture must be measured before it can be led, and it becomes predictable through consistent communication, stable expectations, and steady leadership behavior.
```

### CHECKLIST BEFORE SUBMITTING:

- [ ] All required frontmatter fields are present
- [ ] `type: culture-science` is set
- [ ] Tags include `"culture-science"` and `"ali"`
- [ ] All tags use kebab-case (no spaces)
- [ ] `summary` is 2-3 sentences and descriptive
- [ ] `status: final` is set (unless it's a draft)
- [ ] `created_at` and `updated_at` match for new files
- [ ] No conversation artifacts in content
- [ ] Content is clean, professional, and ready for corpus
- [ ] File name matches slug (kebab-case)

---

## END OF PROMPT

Use this structure for ALL Culture Science corpus files. Consistency is critical for Archy's understanding and the knowledge base's effectiveness.

