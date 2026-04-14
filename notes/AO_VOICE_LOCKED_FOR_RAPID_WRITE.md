# AO voice — locked notes (for Rapid Write and agent handoff)

**Status:** Owner-approved summary (Bart). Use this as the reference for tone, stance, and reader bar when tuning prompts, fingerprints, or generated drafts.

**Full manuscripts (authoritative length):**

- *Accidental CEO* — about **44,000 words** (published KDP manuscript; e.g. `accidental-ceo-manuscript-published-kdp.pdf` on the author’s machine).
- *RemAIning Human* — about **30,000 words** author expectation; the Markdown manuscript checked in workspace was **~25,700 words** (`RemAIning Human.md` — line breaks/spacing can shift counts slightly).

**Where the manuscript lives vs what the site searches**

- **Source of truth on disk:** Full *Accidental CEO* text is in **`ao-knowledge-hq-kit/knowledge/accidental-ceo/`** — one markdown file per chapter (including `a-note-to-the-reader` and `chapter-1` … `chapter-24`). The site does **not** read those files directly at runtime.
- **What the app and Rapid Write actually use:** Everything is compiled into **`public/knowledge.json`** by **`scripts/build-knowledge.mjs`**. That script walks the whole knowledge folder and pulls every `.md` file. **If that JSON file is out of date in git, searches and tone tools only see an old snapshot** — even when your local markdown is complete.

**Why earlier counts looked “half” of *Accidental CEO* (and searches missed chapters 14–24)**

1. **`public/knowledge.json` had not been rebuilt** after Part II (Fundamentals) chapters were added — so the live bundle was missing a big block of words until the knowledge build was run again and committed.
2. **Slugs in the bundle don’t match filenames for Part II.** Files are named `chapter-14-clarity-beats-chaos.md`, etc., but each file’s front matter sets something like `slug: fundamentals-clarity-beats-chaos`. In `knowledge.json` those pieces appear under **`fundamentals-*`**, not `chapter-14-*`. Grepping for `chapter-14` in the JSON will find nothing even when the text is there.

**After a fresh knowledge build**, *Accidental CEO* body text in `knowledge.json` (note + Part I chapters + Part II fundamentals) lands at **about 44,000 words**, aligned with the full manuscript. *RemAIning Human* remains a single long entry (~25–26k words in the bundle, depending on version).

**Operational habit:** Whenever you add or change markdown under `ao-knowledge-hq-kit/knowledge/`, run the knowledge build and commit the updated **`public/knowledge.json`** so the live site and Rapid Write stay in sync with your files.

**Rapid Write guardrails (in code):** `lib/ao/rapidWriteMode.js` includes discipline rules for **default industry setting** (avoid unnecessary tech/software specificity that invites “is this about us?”) and **name rotation** (no default Sarah/Mark every post; limited names per post; standalone fiction unless a labeled series). Adjust there when taste shifts.

---

## Voice and tone — locked characterization

### 1. Leader speaking to leaders, from the inside

Writing sounds like someone who has carried real outcomes, not a detached commentator. Claims are anchored in **how organizations behave under pressure** — what gets postponed, renamed, or absorbed by whom.

### 2. Systems before slogans

A recurring move is to **reframe a fuzzy problem as structure**: accountability as design, pressure routing upward, culture as what you protect when heat arrives. That yields **grounded, patient** prose even when the topic is emotional.

### 3. Psychological clarity without therapy-speak

Fear, threat, avoidance, and self-protection appear as **patterns with consequences**, not as labels dumped on the reader. Observational and serious, not clinical or cutesy.

### 4. Rhythm: setup → distinction → implication

**Clean contrasts** are common (“not X — Y,” “what fails isn’t…”). Short lines often **land after** a longer build. Paragraphs carry weight; voice avoids stacking one-liners for social feed pacing.

### 5. Moral weight without preaching

Willing to say **this is corrosive or wrong** without sounding like scolding individuals. Indictment targets **behaviors and systems**; the reader is invited into **recognition**, not humiliation.

### 6. First-person when it earns trust

Memoir-forward material uses **specific years, stakes, family, humor about the path**. Other pieces open from **culture or a scene** and pivot to a sharp thesis. Long-form book voice can be **more cumulative and definitional** — fewer punchy lines, more sustained argument.

### 7. Research as support, not as identity

Studies land **one clear point**, then the voice moves on in the author’s own terms — practitioner who checks reality against data, not “the research guy.”

### 8. Packaging vs core (journal)

Some journal content includes **social/video hook lines** before the essay. The **core** reads as analytical AO voice; hooks are packaging. Decide deliberately whether generated drafts should mimic that outer layer.

---

## How the three streams differ

| Stream | Dominant feel |
|--------|----------------|
| **Journal** | Sharp essays on leadership pathology and repair; strong openers; memorable lines; often series-driven. |
| **Accidental CEO** | Personal story + lesson; conversational; vulnerability and specifics ground authority. |
| **RemAIning Human** | Manifesto / book voice: slower burn, more abstraction, explicit distinctions (e.g. people vs systems vs efficiency). |

---

## Optional gold exemplars (manual)

If automatic tone matching is still off on specific posts, short owner-curated paragraphs can be added per `notes/ao-rapid-write-gold-exemplars.md` (between the HTML markers only).

---

*Last updated: 2026-04-14 — voice notes locked per owner; corrected: full ACEO is in repo markdown; stale `knowledge.json` and `fundamentals-*` slugs explained.*
