# ALI Instrument v2.0 — Light Validation Note (Pilot)

This is the proportionate validation pass for the v2.0 paired-architecture instrument. It is intentionally lightweight: the pilot is not an academic study and we are not freezing the corpus. The point is to catch wording, scale, and pairing issues before any human ever takes the survey.

The validation has three parts:

1. Automated audit (readability + scale uniformity + paired coverage).
2. Say-back read-through with a small group.
3. A short doctrine update to `ALI_SURVEY_FOUNDATION.md` (already done — see "v2.0 Paired Architecture (Pilot)" section).

---

## 1. Automated audit

Run the audit any time the v2.0 question bank changes:

```
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
  node scripts/ali/audit-instrument-v2.mjs --out notes/ali-instrument-v2-validation-audit.md
```

What it checks:

- **Readability** per question text (Flesch-Kincaid grade level). Comfort range 8–10. We flag anything outside 6–12 as worth a second look.
- **Response-scale uniformity** inside each construct (both halves of a pair must use the same scale).
- **Paired coverage**: every active v2.0 construct has at least one leader stem and one team-member stem.

The audit also runs `ali_v2_unpaired_constructs()` indirectly via the SQL view `ali_v2_construct_coverage` (declared in `database/ALI_INSTRUMENT_V2_SCHEMA.sql`). A clean exit code with no readability flags means the bank is launch-clean from the automated side.

### Audit results

The automated audit writes its results to `notes/ali-instrument-v2-validation-audit.md` so they can be reviewed and committed alongside this note.

> Re-run the audit after any change to the question bank and replace the audit file before deploying a new survey window.

---

## 2. Say-back read-through

Two small groups read the v2.0 stems aloud and "say back" what they think the question is asking. We are listening for ambiguity, jargon, or a leader/team-member pair that don't actually feel like the same idea.

### Cohort

- **Leader-type readers**: 3–5 people with direct-report experience.
- **Team-member readers**: 3–5 people who currently report to a leader.

(Readers can be peers, advisors, or trusted contacts. They don't need to be in any specific industry.)

### Procedure

For each construct:

1. Read the leader stem aloud. Reader says back: "What is this asking?"
2. Read the matching team-member stem aloud. Reader says back: "What is this asking?"
3. Note any of the following:
   - The two say-backs do not describe the same observable behavior.
   - A reader hesitated on a word or phrase.
   - The 1–5 scale felt unclear for that question.

### Capture format

Append a short section here for each round you run, using this template:

```
### Say-back round YYYY-MM-DD

- Cohort: <e.g., 4 leader readers, 3 team-member readers>
- Constructs reviewed: <count>
- Issues raised:
  - C-CLARITY-01 (leader): <wording note>
  - C-TRUST-02 (team_member): <pairing note>
- Decisions:
  - C-CLARITY-01: edited and re-curated via curate-instrument.mjs
  - C-TRUST-02: kept; reader concern resolved by …
```

> Decisions become curation edits (`scripts/ali/curate-instrument.mjs --plan` → human edit → `--apply --confirm`). v1.x lineage is preserved automatically.

---

## 3. Doctrine companion

The v2.0 doctrine companion lives in `database/ALI_SURVEY_FOUNDATION.md` under the "v2.0 Paired Architecture (Pilot)" heading. That section is the single source of truth for:

- What `construct_id`, `equivalence_note`, `lineage_*`, and `response_scale` mean.
- Why leader and team-member stems read differently while measuring the same thing.
- How the deterministic builder selects 10 constructs with 3 anchors per quarterly window.
- How the Leadership Mirror gap is now a paired calculation.
- What v2.0 deliberately does NOT change about the pilot's voice or cadence.

If a future change touches any of those rules, update the doctrine companion in the same commit so the audit, the corpus, and the doctrine never disagree.

---

## Definition of done (this note)

This note is "done" for a given pilot launch when:

- [ ] The automated audit has been run against the live v2.0 bank and the resulting `notes/ali-instrument-v2-validation-audit.md` has zero readability flags, zero scale mismatches, and zero pairing issues.
- [ ] At least one say-back round is recorded above with decisions resolved.
- [ ] The "v2.0 Paired Architecture (Pilot)" section in `ALI_SURVEY_FOUNDATION.md` matches the bank in production (same construct rules, same scale, same Mirror math).
