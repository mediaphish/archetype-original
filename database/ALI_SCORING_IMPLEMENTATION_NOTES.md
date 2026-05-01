# ALI Scoring Implementation Notes

## ✅ What We Have (From Specification)

The scoring specification provides:

1. **Core Scoring Algorithms:**
   - Reverse scoring for negative items
   - Normalization to 0-100 scale
   - Pattern scores (per survey, one question per pattern)
   - Anchor scores (3 anchors per survey)
   - ALI Overall Score (30% anchors + 70% patterns)

2. **Longitudinal Scoring:**
   - Rolling scores (4-survey window ≈ 1 year)
   - Drift Index (quarter-over-quarter deltas)
   - Historical trend analysis

3. **Role-Based Scoring:**
   - Leader vs. team member splits
   - Perception gap calculation
   - Gap severity classification

4. **Data Quality:**
   - Minimum N thresholds (5 for team, 10 for org)
   - Standard deviation calculation
   - Zone classification (Green/Yellow/Orange/Red)

5. **API Shape:**
   - Complete output structure defined
   - Ready for frontend consumption

## ✅ Implementation Status

**Created:** `/lib/ali-scoring.js`
- All core functions implemented
- Pure functions (deterministic)
- Matches specification exactly
- Ready for API integration

## ❓ What We Still Need

### 1. Team Experience Map Coordinates

**Question:** How do we calculate X/Y positions for the quadrant?

The specification defines:
- Zones (Green/Yellow/Orange/Red) based on rolling ALI score
- But doesn't define the X/Y coordinates for the Team Experience Map

**From Dashboard Requirements:**
- X-axis: Clarity (Low → High)
- Y-axis: Trust/Stability (Low → High)
- Four zones in quadrant

**Need to know:**
- Is X = Clarity Score directly?
- Is Y = Stability Score? Or Trust Score? Or combination?
- What are the exact zone boundaries in X/Y space?
- Are coordinates normalized? (0-100? 0-1?)

### 2. Leadership Mirror Visualization

**Question:** How do we show leader intention vs. team experience?

The specification provides:
- Role-based scoring (leader vs. team)
- Perception gap calculation
- Gap severity classification

**But we need:**
- Visual representation method
- Which scores to compare? (ALI? Patterns? All?)
- Format: Gap bars? Side-by-side? Overlay?

### 3. Leadership Profiles (6 Profiles)

**Question:** How do we determine which profile a leader matches?

The specification doesn't include:
- Honesty axis calculation
- Clarity axis calculation (for profiles - may differ from Clarity Score)
- Threshold definitions for each profile
- Decision tree for profile determination

**From documentation:**
- Guardian: High Honesty + High Clarity
- Aspirer: High Honesty + Unstable Clarity
- Protector: Selective Honesty + High Clarity
- Producer-Leader: Courageous Honesty + Ambiguous Clarity
- Stabilizer: Selective Honesty + Unstable Clarity
- Operator: Protective Honesty + Ambiguous Clarity

**Need to know:**
- How to calculate "Honesty" from responses
- How to calculate "Clarity" for profiles (same as Clarity Score?)
- What are the thresholds? (e.g., High = >70? Unstable = variance >X?)

### 4. Alignment, Stability, Clarity as Separate Scores

**Question:** The spec defines "ALI Overall Score" but dashboard shows three separate scores.

The specification provides:
- ALI Overall Score (single score)
- Pattern scores (7 individual patterns)

**But dashboard requirements show:**
- Alignment Score (0-100)
- Stability Score (0-100)
- Clarity Score (0-100)

**Clarification needed:**
- Is "Alignment Score" = `patternScores.alignment`?
- Is "Stability Score" = `patternScores.stability`?
- Is "Clarity Score" = `patternScores.clarity`?
- Or are these composite scores calculated differently?

## Next Steps

1. **Implement API endpoint** using the scoring functions
2. **Get clarification** on the 4 questions above
3. **Build visualizations** once coordinates/formulas are defined
4. **Test with sample data** to validate calculations

## Questions for You

1. **Team Experience Map:** How do we calculate X/Y coordinates? (X = Clarity Score? Y = Stability Score? Zone boundaries?)

2. **Three Core Scores:** Are Alignment/Stability/Clarity just the pattern scores, or calculated differently?

3. **Leadership Profiles:** How do we calculate Honesty axis and determine profile thresholds?

4. **Leadership Mirror:** What's the visual format for showing leader vs. team comparison?

Once we have these answers, I can complete the full dashboard implementation.

---

## v2.0 Paired Scoring (Instrument v2.0)

The v2.0 instrument introduces a paired-construct architecture (see `database/ALI_SURVEY_FOUNDATION.md`, "v2.0 Paired Architecture (Pilot)"). The Leadership Mirror is now computed at the construct level, then aggregated up. The math lives in `lib/ali-paired-scoring.js` and is exposed by `api/ali/dashboard.js` as a new top-level `pairedScoring` block on the dashboard payload.

### Step 1 — Likert mean per construct, per role

For every construct that received responses in a deployment, gather the leader-side responses (from leader-role respondents who answered that construct's leader stem) and the team-side responses (from team-member respondents who answered that construct's team stem).

For each side independently:

1. Apply reverse scoring for items flagged `is_negative` (`score = 6 - response`).
2. Take the simple mean of the resulting 1–5 values.
3. Map to 0–100 with `((mean - 1) / 4) * 100` so the result lines up with the existing dashboard scale.

If a side has no responses, it is `null` and that construct's gap is not computed.

### Step 2 — Per-construct Mirror gap

`mirror_gap = leader_score - team_score`

- Sign is preserved on purpose: positive means the leader rates themselves higher than the team rates them; negative means the team rates the leader higher than the leader rates themselves. Both directions matter.
- Magnitude is reported in 0–100 score units (so a gap of 20 means a 20-point spread on the same scale the dashboard uses elsewhere).

### Step 3 — Per-condition (pattern) Mirror

For each of the seven leadership patterns:

- `leader_score` = mean of leader-side construct scores in that pattern.
- `team_score` = mean of team-side construct scores in that pattern.
- `mirror_gap = leader_score - team_score`.
- `construct_count` is reported alongside so consumers know how thin the data is.

### Step 4 — Overall Mirror

The overall Mirror is the simple mean of the per-construct gaps where both sides exist. We do not weight by pattern; the construct itself is already the unit of measurement, and weighting would re-introduce the question-level imbalance v2.0 set out to fix.

### Step 5 — Anchor trajectory

Anchor trajectory uses anchor `construct_id`s, not raw stable_ids. Per deployment we record `{period, leader_score, team_score, mirror_gap}` for each anchor construct. The dashboard returns these as `pairedScoring.anchorTrajectory` so the UI can plot a line per anchor without re-deriving anything.

### Snapshot integrity

Snapshots store per-construct paired aggregates so wording revisions inside a construct never break historical comparison. Practically, that means: if we re-curate `C-CLARITY-01` between S2 and S3 (rewording the leader stem for clarity), the prior `C-CLARITY-01` aggregate from S2 remains directly comparable to the new `C-CLARITY-01` aggregate from S3 because the construct id is the comparison key, not the stable_id of any single stem.

### Output shape (dashboard `pairedScoring`)

```jsonc
{
  "pairedScoring": {
    "constructs": [
      {
        "construct_id": "C-CLARITY-01",
        "pattern": "clarity",
        "is_anchor": true,
        "leader_score": 78.0,
        "team_score": 62.5,
        "leader_n": 1,
        "team_n": 6,
        "mirror_gap": 15.5
      }
    ],
    "conditionMirror": {
      "clarity": { "leader_score": 78.0, "team_score": 62.5, "mirror_gap": 15.5, "construct_count": 1 }
    },
    "overallMirror": { "leader_score": 78.0, "team_score": 62.5, "mirror_gap": 15.5, "construct_count": 1 },
    "anchorTrajectory": [
      { "construct_id": "C-CLARITY-01", "points": [{ "period": "2026-Q2", "leader_score": 78.0, "team_score": 62.5, "mirror_gap": 15.5 }] }
    ],
    "perDeployment": [ { "period": "2026-Q2", "survey_index": "S1", "deployment_id": "...", "constructMirrorGaps": [ ... ], "conditionMirror": { ... }, "overallMirror": { ... } } ]
  }
}
```

### Coexistence with v1.x scoring

`pairedScoring` is additive. The v1.x `scores`, `coreScores`, `experienceMap`, `leadershipProfile`, `leadershipMirror`, `drift`, and `trajectory` fields keep working exactly as before. Any item without a `construct_id` (i.e., v1.x rows still in the bank during the cutover) is ignored by paired scoring but counted by the v1.x calculations, so the rollover is non-destructive.
