# ALI conditions — cross-surface alignment (per-condition bundles)

This document records **what ships besides each journal chapter** for the ALI conditions series, and gives an **artifact checklist** per surface so “done” is visible (files + index + live pages), not chat status.

**Scope stance for the shipped series (baseline):** The seven journal posts are the primary new long-form layer. Existing Culture Science corpus, ALI marketing copy, and FAQs already cover many of the same ideas; this matrix says **what we chose not to duplicate yet**, **what already backs Archy**, and **what to open if you expand later**.

---

## Surfaces (what “cross-surface” means here)

| Surface | What counts as an artifact | Where it lives |
|--------|----------------------------|----------------|
| **Journal** | Published chapter with front matter | `ao-knowledge-hq-kit/journal/ali-series-*.md` → indexed in `public/knowledge.json` |
| **FAQ** | Sourced Q&A markdown processed by the knowledge step | `ao-knowledge-hq-kit/faqs/*.md` |
| **ALI marketing page** | Copy and structure users see on the ALI page | `src/pages/cultureScience/ALI.jsx` |
| **Culture Science corpus** | Doctrine-level `.md` sources (Archy draws from built knowledge) | `ao-knowledge-hq-kit/knowledge/culture-science/` (anchors listed in `notes/ali-conditions-corpus-map.md`) |
| **Archy-facing knowledge** | Whatever landed after the knowledge refresh (journal + FAQs + corpus metadata in the index) | Output includes `public/knowledge.json` |
| **Quote / social pipeline** | Separate bounded workflow (not the journal file pipeline) | See `lib/ao/runDailyRun.js` and related quote tooling |

---

## Bundle matrix — decisions per condition (baseline ship)

Legend: **Ship** = included in this release. **Defer** = intentionally not part of this release; no contradiction with journal. **Already covered** = existing site content backs the story without a new file.

| Condition | Journal | New FAQ file | ALI.jsx edit | New corpus edit | Quote-card hook |
|-----------|---------|--------------|--------------|-----------------|-------------------|
| Clarity | Ship | Defer (see mapping below) | Defer | Defer | Defer |
| Consistency | Ship | Defer | Defer | Defer | Defer |
| Trust | Ship | Defer | Defer | Defer | Defer |
| Communication | Ship | Defer | Defer | Defer | Defer |
| Alignment | Ship | Defer | Defer | Defer | Defer |
| Stability | Ship | Defer | Defer | Defer | Defer |
| Drift | Ship | Defer | Defer | Defer | Defer |

**Why so many “defer” on FAQs:** General and ALI-specific FAQs already address drift, trust, clarity, stability, conditions vs sentiment, and what ALI measures. Adding seven **new** FAQ files risks overlap and contradicting tone unless each is narrowly scoped. When you want FAQ depth per condition, use the **expansion checklist** at the bottom of this file.

---

## Existing FAQ overlap map (alignment, not new artifacts)

Use this so journal language stays **one story** with Archy and the FAQ layer—spot-check these when editing a condition’s chapter.

| Condition | Illustrative existing FAQs (already in corpus) |
|-----------|--------------------------------------------------|
| Clarity | `philosophy-why-clarity.md`; ALI framing in `what-is-ali.md`, `ali-what-is-ali-measuring.md` |
| Consistency | `ali-strong-culture.md`, accountability-adjacent FAQs (`ali-accountability.md`); no single FAQ titled “consistency”—candidate if you add one later |
| Trust | `trust-as-output.md`, `philosophy-trust.md`; ALI trust posture in `ali-anonymity.md`, servant-leadership alignment in `ali-does-ali-align-with-servant-leadership.md` |
| Communication | `ali-communication.md` |
| Alignment | `ali-does-ali-align-with-servant-leadership.md`, `ali-leadership-problems.md`, `why-conditions-matter.md`, `what-is-ali.md`, `ali-why-measure-conditions-instead-of-sentiment.md` |
| Stability | `what-is-stability.md`, `teams-sense-instability-first.md` |
| Drift | `what-is-drift.md`, `why-drift-goes-unnoticed.md`, `ali-how-ali-reveals-leadership-drift.md`, `ali-leaders-struggle-to-see-drift.md` |

---

## Archy note (no separate “Archy corpus file” required)

Archy reads from the **same built knowledge** as the rest of the site. For this series:

- **Shipped:** Seven journal documents appear as journal-type entries in `public/knowledge.json` after the knowledge step.
- **Already present:** Culture Science Section 7 sources and FAQs remain in the index as before.
- **Contradiction check:** When you revise a journal chapter, skim the FAQ overlap rows above for that condition so wording stays compatible.

---

## Per-condition artifact checklist (when you expand beyond baseline)

Copy this block per condition when you intentionally add scope.

### Condition: ________

- [ ] **Journal:** Chapter path updated; `publish_date` not future-scheduled; summary and takeaways current.
- [ ] **FAQ:** New or edited file under `ao-knowledge-hq-kit/faqs/`; title/question aligned with ALI framing; no duplicate of an existing FAQ’s core answer.
- [ ] **ALI.jsx:** Copy change reviewed against `database/ALI_SURVEY_FOUNDATION.md` and Section 7 Part IV.
- [ ] **Corpus:** Edited `.md` in `ao-knowledge-hq-kit/knowledge/culture-science/` with front matter intact.
- [ ] **Knowledge step:** Run after content edits; `public/knowledge.json` committed with sources.
- [ ] **Live checks:** Journal post renders; FAQ appears where FAQs surface; ALI page matches intent if touched.
- [ ] **Quote hook:** If using the quote pipeline, record quote ID or draft row reference (separate from journal markdown).

---

## Revision history

- **2026-04-30:** Cross-surface bundle decisions and artifact checklists added to close the plan’s cross-surface-alignment deliverable.
