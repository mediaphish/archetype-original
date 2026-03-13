## AO Automation — newsroom model (roles, objects, handoffs)

This document is the single source of truth for how AO Automation behaves as a **newsroom** (not a conveyor belt).

The key idea is simple:

- **Scout reports facts** (what happened, where, and the most relevant context).
- **Analyst makes editorial decisions** (what matters, what to make, and why your readers care).
- **Librarian remembers** (dedupes, clusters, resurfacing, and lineage).
- **Studio produces** (drafts + branded assets).
- **Publisher distributes** (scheduling, formatting, and posting).

Everything should be traceable. Every piece of output should be able to answer: **“Where did this come from?”**

---

## Core objects (the “contract”)

These are conceptual objects. In the current live system, we map these onto existing rows/fields (see mapping below).

### Lead (Scout output)

A **Lead** is a clean report. It is not “is this good content.” It is “what is happening and what is the signal.”

**Lead must include (always):**
- **Source**: `source_name`, optional `person_or_org`
- **Working link** when it exists: `original_url` (and `canonical_url` if different)
- **Title**
- **Excerpt**: the best short slice (what you’d highlight)
- **Expanded context**: enough surrounding text to understand the claim
- **Detected topics** (small set)
- **Signal type**: quote | argument | debate | framework | story | trend | internal_theme | other
- **Dates**: `published_at` (if known), `discovered_at`
- **Confidence score**: how sure Scout is that this is leadership-relevant and not junk
- **Novelty hint**: “feels like something we’ve said before” vs “fresh”
- **Scout notes**: short, factual notes about what it found and why it flagged it
- **Status**: new | needs_review | discarded | escalated

**Lead rules:**
- Max **5/day**, ideally **2–3/day**
- No paywalls
- No rage bait
- If it can’t provide a working link for external, it should not escalate
- For internal, “working link” means “working reference” (see Internal trust rules below)

### Opportunity (Analyst output)

An **Opportunity** is the editorial desk’s decision. It’s where the intelligence lives.

One Lead can produce multiple opportunities. Analyst should designate:
- **1 primary opportunity**
- **up to 2 alternates**

**Opportunity must include (always):**
- **Summary** (what it is, in one paragraph)
- **Why it matters** (written in Bart/AO voice)
- **Reader value** (what your reader will get)
- **Originality / redundancy risk** (what’s new vs what’s repetitive)
- **Recommended format** (examples):
  - pull_quote_graphic
  - commentary_post
  - question_post
  - journal_seed
  - journal_post (rare; usually a seed first)
  - thread
  - series_seed
  - hold
  - discard
- **Recommended next step**: studio | publisher | librarian_hold | discard
- **Risk flags** (0–6): missing context, too generic, off brand, thin signal, etc.
- **Status**: review | approved | held | rejected | sent_to_studio | archived

**Opportunity rules:**
- Analyst may be conservative. It should reject or hold rather than force a post.
- Analyst must be able to say what’s strong **and** what’s weak.
- Analyst must be able to create multiple angles from one lead when warranted.

### Library item (Librarian output + storage)

A **Library item** is an idea/memory object with maturity.

Examples:
- raw idea
- shaped concept
- theme cluster
- series seed
- journal seed
- “we already said this” reference

**Library item must include:**
- Title
- Body / notes
- Tags
- Maturity: raw | reviewed | shaped | briefed | produced | published
- Status: active | held | archived | discarded | used
- Lineage links (what it came from / what it became)

### Creative brief (Analyst → Studio handoff)

A **Creative brief** is what makes Studio work fast and consistently.

**Brief must include:**
- Primary opportunity + alternates (if any)
- Audience value (what the reader should feel/learn)
- Tone targets (Bart voice constraints)
- Source material (pull quote, excerpt, link)
- Constraints (no politics, no rage, no dunking)
- Required assets (drafts by channel, quote card, etc.)

### Draft asset (Studio output)

A **Draft asset** is a “nearly publishable” piece.

Examples:
- platform-specific drafts (LinkedIn/Facebook/Instagram/X)
- quote card image
- journal starter or outline

**Draft asset must include:**
- Variant drafts by channel (not copy/paste)
- The “why” preserved (so it doesn’t drift from the opportunity)
- Status: draft | ready_for_review | approved | rejected | sent_to_publisher

### Published asset (Publisher output)

A **Published asset** is the record of “what went live, where, when, and how it performed.”

---

## Internal trust rules (this fixes the “internal missing link” issue)

Internal should be **high trust** by default. But internal still needs a reliable “source reference.”

For internal Leads/Opportunities, “working source link” can be any of these:
- A working site URL (journal or devotional post page)
- A stable internal reference (type + slug + title) when a public URL doesn’t exist

Internal items should not be penalized as “hard to verify/trust” just because they lack a public URL.

---

## Live-system mapping (no database changes yet)

We are not changing the database yet. We map the newsroom objects onto what already exists.

### Today’s storage (what we already have)

- **Analyst inbox rows**: `ao_quote_review_queue`
- **Scout pass state**: `ao_scout_runs`, `ao_scout_frontier`, `ao_scout_pages`, `ao_scout_pending_sources`
- **Ideas inbox**: `ao_ideas`
- **Studio routing**: `ao_quote_review_queue.next_stage = studio`
- **Publisher routing**: `ao_quote_review_queue.next_stage = publisher` and scheduled posts tables

### Mapping table: newsroom object → live row/fields

**Lead (Scout output)** maps onto a row in `ao_quote_review_queue` using:
- Lead.source: `source_name`, `source_author`
- Lead.link: `source_url` (preferred), fallback `source_slug_or_url`
- Lead.title: `source_title`
- Lead.excerpt: `source_excerpt` (preferred) or `quote_text` (fallback)
- Lead.expanded_context: `raw_content`
- Lead.detected_topics: `topic_tags`
- Lead.signal_type: `content_kind`
- Lead lineage/trail: `scout_*` fields

**Opportunity (Analyst output)** maps onto the same `ao_quote_review_queue` row using:
- Opportunity.summary: `summary_interpretation`
- Opportunity.why_it_matters: `why_it_matters`
- Opportunity.primary_format: `best_move`
- Opportunity.risks: `risk_flags`
- Opportunity.next_step: `next_stage`
- Opportunity.alternates: `alt_moves`

**Creative brief** maps onto:
- For now: the same row fields + a disciplined “Brief” section in the Studio view.
- Later: its own brief object if needed.

**Draft asset (Studio output)** maps onto:
- `drafts_by_channel`, `quote_card_svg`, `quote_card_caption`

**Published asset (Publisher output)** maps onto:
- scheduled posts records + posting logs

---

## Phase 3 spec — Scout + Analyst behave like a newsroom (first milestone)

This is the “make it feel dramatically better” spec.

### Scout spec (reporting)

- Scout escalates **Lead records**, not raw scraped pages.
- Scout should favor:
  - full articles (not topic/landing pages)
  - clear leadership relevance
  - enough context to understand the claim
- Scout daily cap remains 5/day with “aim for 2–3/day.”

**Definition of success for Scout:**
- Analyst is seeing fewer items, but the items are “real.”
- When you open an item, it reads like a clean report, not a fragment dump.

### Analyst spec (editorial desk)

Analyst must always produce a “decision-ready brief” for anything that’s meant to be reviewed.

**Minimum brief fields that must be present before an item is considered reviewable:**
- pull_quote (or a reason why it didn’t find one)
- why_it_matters
- summary_interpretation
- best_move
- topic_tags + ao_lane
- risk_flags (or empty)

**Multiple opportunities per lead (lightweight, without new tables):**
- Primary = `best_move`
- Alternates = `alt_moves` (2 entries)

**“What’s good / weak / next step” should stop looking the same** because:
- It will be driven by real brief content, not just generic checks.

**Definition of success for Analyst:**
- “Approve → Studio” feels plausible at least a few times a week.
- Held items are actually worth holding (they have a clear future use).
- Rejected items are clearly junk or off-mission.

---

## Librarian definition (concept + UX using Ideas as the first shelf)

We treat **Ideas** as the first visible Librarian surface.

### Librarian responsibilities

- Capture ideas fast (text, files, links)
- Dedupe (“we already have this”)
- Cluster (“these 6 ideas are the same theme”)
- Resurface (“you haven’t used this in months”)
- Track maturity (raw → shaped → briefed → produced → published)
- Maintain lineage (what it came from, what it turned into)

### Minimal Librarian UX (using current Ideas)

- Two lanes:
  - **Idea seeds** (raw or shaped concepts)
  - **Ready posts** (already written, need routing/distribution)
- Three “states” that matter to you:
  - Active (workable)
  - Held (good, not now)
  - Archived (done / no longer relevant)

### Librarian success definition

- You can dump ideas in without friction.
- The system helps you avoid repeating yourself.
- The system can surface old gold when you need it.

---

## Later: database evolution decision (not now)

When we’re ready to evolve storage, we choose between:

### Option 1 — Minimal new tables

Add only what the current system can’t represent cleanly:
- Dedicated **Leads**
- Dedicated **Opportunities**
- Dedicated **Library items**

Keep `ao_quote_review_queue` as a compatibility layer during transition.

### Option 2 — Broader schema (like the suggestion)

Adopt the larger source/corpus/leads/opportunities/studio/publisher schema.

### Checklist: what would force the broader approach

We stay minimal unless one of these becomes true:
- We need many-to-many lineage that can’t be represented cleanly
- We need robust theme graphs/clustering persisted in storage
- We need multiple opportunities per lead as first-class objects (not just JSON)
- We need per-agent prompt/versioning and audit trails at scale
- We need performance feedback loops stored and queried as a core feature

If none of the above is true yet, don’t migrate — improve behavior first.

---

## Notes to add (from you)

Paste your notes under these headings when ready:
- Scout notes:
- Analyst notes:
- Librarian notes:
- Studio notes:
- Publisher notes:
