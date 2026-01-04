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

