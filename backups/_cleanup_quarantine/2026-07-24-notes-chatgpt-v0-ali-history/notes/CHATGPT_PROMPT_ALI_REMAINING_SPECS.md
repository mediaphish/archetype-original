# ChatGPT Prompt: ALI Dashboard Remaining Specifications

Copy and paste this entire prompt to ChatGPT:

---

# **ALI DASHBOARD REMAINING SPECIFICATIONS — TECHNICAL REQUEST**

You are helping to complete the Archetype Leadership Index (ALI) dashboard implementation. The core scoring algorithms are already implemented based on the ALI Scoring Model v1.0 specification. I need you to provide the remaining specifications for 4 critical dashboard visualizations.

## **CONTEXT**

ALI is a leadership diagnostic tool for small businesses (10-250 employees) that measures leadership conditions through anonymous 10-question surveys. The scoring system is complete and includes:
- Pattern scores (7 patterns: Clarity, Consistency, Trust, Communication, Alignment, Stability, Leadership Drift)
- Anchor scores (3 anchors per survey)
- ALI Overall Score (30% anchors + 70% patterns)
- Rolling scores (4-survey window)
- Drift Index
- Perception gaps (leader vs. team member)
- Zone classification (Green/Yellow/Orange/Red)

**What's Already Implemented:**
- All core scoring algorithms
- Reverse scoring for negative items
- Normalization to 0-100 scale
- Role-based scoring (leader vs. team)
- Data quality controls

**What's Missing:**
- Team Experience Map coordinate calculations
- Three core scores (Alignment/Stability/Clarity) clarification
- Leadership Profile determination algorithm
- Leadership Mirror visualization specification

## **YOUR TASK**

Review the ALI documentation corpus (especially Section 7 Parts I-VII, Part XIII) and provide **exact, implementable specifications** for the 4 remaining visualizations. Be specific about:
- Exact formulas and calculations
- Thresholds and boundaries
- Visual representation methods
- Data requirements

---

## **QUESTION 1: TEAM EXPERIENCE MAP COORDINATES**

The Team Experience Map is a four-zone quadrant visualization showing where the team currently sits.

**Visual Design:**
- **Four-zone quadrant chart:**
  - X-axis: Clarity (Low → High)
  - Y-axis: Trust/Stability (Low → High)
  - Four zones:
    1. **Harmony Zone** (top-right) - Green
    2. **Strain Zone** (top-left) - Yellow
    3. **Stress Zone** (bottom-left) - Orange
    4. **Hazard Zone** (bottom-right) - Red

**Questions:**
1. How do we calculate the X-axis coordinate?
   - Is X = Clarity Score directly? (from `patternScores.clarity`)
   - Or is it a derived/composite score?
   - What's the exact formula?

2. How do we calculate the Y-axis coordinate?
   - Is Y = Stability Score? (from `patternScores.stability`)
   - Or Y = Trust Score? (from `patternScores.trust`)
   - Or Y = combination of Stability + Trust?
   - What's the exact formula?

3. What are the exact zone boundaries?
   - Harmony Zone: X > ? AND Y > ?
   - Strain Zone: X < ? AND Y > ?
   - Stress Zone: X < ? AND Y < ?
   - Hazard Zone: X > ? AND Y < ?
   - Are boundaries at specific score values? (e.g., 60, 70, 75?)

4. Are coordinates normalized?
   - Do we use the 0-100 scale directly?
   - Or normalize to 0-1 for visualization?
   - Any scaling/transformation needed?

5. Which scores should we use?
   - Current (snapshot) scores?
   - Rolling scores? (specification says zones are derived from rolling ALI)
   - Or different scores for X/Y?

**Provide:**
- X-axis calculation formula
- Y-axis calculation formula
- Zone boundary definitions (exact thresholds)
- Example: "If Clarity = 75, Stability = 60, Trust = 65, what are the X/Y coordinates and which zone?"
- Implementation notes

---

## **QUESTION 2: THREE CORE SCORES CLARIFICATION**

The dashboard displays three separate scores: Alignment Score, Stability Score, and Clarity Score (each 0-100).

**Current Implementation:**
- We have `patternScores.alignment` (0-100)
- We have `patternScores.stability` (0-100)
- We have `patternScores.clarity` (0-100)
- We have `ALI Overall Score` (30% anchors + 70% patterns)

**Questions:**
1. Are the three core scores just the pattern scores?
   - Alignment Score = `patternScores.alignment`?
   - Stability Score = `patternScores.stability`?
   - Clarity Score = `patternScores.clarity`?
   - Or are they calculated differently?

2. If they're different, what's the calculation?
   - Are they composite scores?
   - Do they include anchors?
   - Different weighting?
   - What's the exact formula for each?

3. Which scores should be displayed?
   - Current (snapshot) scores?
   - Rolling scores?
   - Both?

**Provide:**
- Exact definition of each score
- Calculation formulas (if different from pattern scores)
- Example calculations
- Clarification on current vs. rolling

---

## **QUESTION 3: LEADERSHIP PROFILES (6 PROFILES)**

The dashboard needs to determine which of the 6 Leadership Profiles a leader matches.

**The 6 Profiles (from Section 7 Part XIII):**
1. **Guardian** - High Honesty + High Clarity
2. **Aspirer** - High Honesty + Unstable Clarity
3. **Protector** - Selective Honesty + High Clarity
4. **Producer-Leader** - Courageous Honesty + Ambiguous Clarity
5. **Stabilizer** - Selective Honesty + Unstable Clarity
6. **Operator** - Protective Honesty + Ambiguous Clarity

**Questions:**
1. How do we calculate the "Honesty" axis?
   - Is Honesty a derived score from responses?
   - Which questions/patterns contribute to Honesty?
   - What's the exact formula?
   - Is it a single score (0-100) or categorical (Protective/Selective/Courageous)?

2. How do we calculate the "Clarity" axis for profiles?
   - Is it the same as `patternScores.clarity`?
   - Or calculated differently?
   - For "Unstable Clarity" - how do we measure instability? (variance? trend?)

3. What are the exact thresholds for each profile?
   - High Honesty: > ? (e.g., >70?)
   - Selective Honesty: ? to ? (e.g., 50-70?)
   - Protective Honesty: < ? (e.g., <50?)
   - High Clarity: > ? (e.g., >70?)
   - Unstable Clarity: variance > ? or trend < ? (what's the threshold?)
   - Ambiguous Clarity: < ? (e.g., <60?)

4. How do we determine the profile?
   - Decision tree algorithm?
   - Matrix lookup?
   - Priority order if multiple profiles match?

5. Do we need leader responses to calculate profiles?
   - Or can we infer from team responses?
   - What data is required?

**Provide:**
- Honesty axis calculation method (formula)
- Clarity axis calculation method (for profiles)
- Threshold definitions for each profile dimension
- Decision tree or algorithm for profile determination
- Example: "If Honesty = 70, Clarity = 55, Clarity Variance = 12, which profile?"
- Data requirements

---

## **QUESTION 4: LEADERSHIP MIRROR VISUALIZATION**

The Leadership Mirror compares leader intention vs. team experience (from Section 7 Part VII).

**Core Concept:**
- Leaders see: intent, motivation, work ethic, vision, context
- Teams see: behavior, tone, stability, clarity, alignment
- The Mirror shows the gap between these two perspectives

**Questions:**
1. What data do we need?
   - Do we have leader responses? (or is this inferred from team responses?)
   - If we have leader responses, how do we compare them?
   - What scores are compared? (ALI? Patterns? All?)

2. What's the comparison method?
   - Gap analysis? (leader_score - team_score)
   - Ratio? (leader_score / team_score)
   - Side-by-side comparison?
   - Something else?

3. What's the visual format?
   - Gap bars? (showing the difference)
   - Side-by-side bars? (leader vs. team)
   - Overlay visualization?
   - Mirror metaphor visualization?
   - What does the documentation suggest?

4. Which scores should be compared?
   - ALI Overall Score?
   - Individual pattern scores?
   - All three core scores (Alignment/Stability/Clarity)?
   - All 7 patterns?

5. How do we handle the visualization?
   - Single view showing all comparisons?
   - Expandable sections?
   - Focus on largest gaps?

**Provide:**
- Data requirements (what responses/scores needed)
- Comparison algorithm (how to calculate gaps)
- Visual representation method (format, layout)
- Which scores to compare
- Example: "If leader thinks Alignment = 80, team experiences Alignment = 65, how do we visualize this?"
- Implementation guidance

---

## **RESPONSE FORMAT**

For each of the 4 questions above, provide:

1. **Specification:** Exact formulas, thresholds, or algorithms
2. **Calculation Method:** Step-by-step process
3. **Example:** Work through an example with sample data
4. **Visual Design:** How it should look/be represented
5. **Implementation Notes:** Special considerations for coding
6. **Edge Cases:** How to handle missing data, first survey, etc.

## **DOCUMENTATION TO REFERENCE**

You have access to the ALI documentation corpus, especially:
- Section 7 Part I: Introducing the ALI Model
- Section 7 Part II: How ALI Works
- Section 7 Part III: The ALI Scoring Model
- Section 7 Part IV: The 7 Leadership Patterns
- Section 7 Part VI: The Team Experience Map
- Section 7 Part VII: The Leadership Mirror
- Section 7 Part XIII: The 6 Leadership Profiles

Use these documents to inform your specifications. If the documentation doesn't specify exact formulas, propose reasonable specifications based on the principles described, and clearly mark them as "proposed" so they can be refined.

## **IMPORTANT NOTES**

- **Be specific:** Provide exact formulas, not general descriptions
- **Be implementable:** Specifications should be code-ready
- **Be clear:** Use examples to illustrate
- **Mark assumptions:** If making assumptions, clearly mark them
- **Consider edge cases:** First survey, missing data, small sample sizes

## **OUTPUT FORMAT**

Provide your response as a structured document with:
- Clear section headers for each of the 4 questions
- Formulas in mathematical notation
- Step-by-step algorithms
- Example calculations
- Visual design descriptions
- Implementation considerations

---

**END OF PROMPT**

---

## **HOW TO USE THIS PROMPT**

1. Copy the entire prompt above (from "# **ALI DASHBOARD REMAINING SPECIFICATIONS**" to "**END OF PROMPT**")
2. Paste it into ChatGPT
3. ChatGPT will review the ALI documentation and provide the missing specifications
4. Share the response with me, and I'll implement the visualizations

## **WHAT I'LL DO WITH THE RESPONSE**

Once you provide ChatGPT's response, I will:
1. Review the specifications
2. Implement the coordinate calculations
3. Build the Team Experience Map visualization
4. Implement Leadership Profile determination
5. Build the Leadership Mirror visualization
6. Complete the dashboard with all visualizations
7. Test with sample data
8. Refine based on your feedback

---

**Ready to send to ChatGPT!**

