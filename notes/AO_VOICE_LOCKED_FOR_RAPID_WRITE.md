# AO voice — locked notes (for Rapid Write and agent handoff)

**Status:** Owner-approved summary (Bart). Use this as the reference for tone, stance, and reader bar when tuning prompts, fingerprints, or generated drafts.

**Full manuscripts (authoritative length):**

- *Accidental CEO* — about **44,000 words** (published KDP manuscript; e.g. `accidental-ceo-manuscript-published-kdp.pdf` on the author’s machine).
- *RemAIning Human* — about **30,000 words** author expectation; the Markdown manuscript checked in workspace was **~25,700 words** (`RemAIning Human.md` — line breaks/spacing can shift counts slightly).

**What the live site actually indexes today**

The Archetype Original app builds its searchable “library” from **`public/knowledge.json`**. That file is **not** a guaranteed byte-for-byte copy of every full book. For the two books:

| Work | Rough words in `knowledge.json` (book/chapter entries) | Full manuscript (above) |
|------|----------------------------------------------------------|-------------------------|
| *Accidental CEO* (chapters + related entries tagged for the book) | **~21,700** | **~44,000** |
| *RemAIning Human* (single book entry) | **~25,400** | **~25,700–30,000** |

So the words did not “disappear” — they were never all duplicated into the site bundle as full-length book text. *RemAIning Human* is largely present in one entry; *Accidental CEO* on the site is roughly **half** the published manuscript length in the indexed bodies, which can reflect web editing, chapter packaging, or material that lives in the print/PDF version but not in the same form online. **Rapid Write’s style context reads from `knowledge.json`**, so until the full manuscripts are imported (if you choose to), the model is calibrated partly on **site-shaped** excerpts, not automatically on every word of the PDF.

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

*Last updated: 2026-04-14 — voice notes locked per owner; manuscript vs site counts documented.*
