# ChatGPT Prompt: ALI Score Calculation Algorithms

Copy and paste this entire prompt to ChatGPT:

---

# **ALI SCORE CALCULATION ALGORITHMS — TECHNICAL SPECIFICATION REQUEST**

You are helping to build the Archetype Leadership Index (ALI) dashboard system. I need you to provide the exact algorithms, formulas, and calculation methods for all ALI scores and visualizations based on the ALI documentation corpus.

## **CONTEXT**

ALI is a leadership diagnostic tool for small businesses (10-250 employees) that measures leadership conditions through anonymous 10-question surveys. Each survey contains:
- 7 leadership patterns (Clarity, Consistency, Trust, Communication, Alignment, Stability, Leadership Drift)
- 3 anchor questions (for longitudinal tracking)
- 2-4 negative items (reverse-scored)
- 5 leader questions + 5 team member questions (role-specific)

Responses are on a Likert scale (1-5, where 5 is most positive).

The dashboard needs to display:
1. **Four Core Scores:** Alignment, Stability, Clarity, Trajectory
2. **Team Experience Map:** Four-zone quadrant visualization
3. **Pattern Scores:** Individual scores for each of the 7 patterns
4. **Leadership Mirror:** Leader intention vs. team experience comparison
5. **Leadership Profiles:** Which of the 6 profiles a leader matches

## **YOUR TASK**

Review the ALI documentation corpus (especially Section 7 Parts I-VII) and provide **exact, implementable algorithms** for calculating all scores and visualizations. Be specific about:
- Which questions map to which scores
- How to combine leader vs. team member responses
- How to handle negative items (reverse-scoring)
- Exact formulas (averages, weighted, etc.)
- Thresholds and boundaries
- Comparison methods for trajectory

## **QUESTIONS TO ANSWER**

### **1. ALIGNMENT SCORE (0-100)**

**Questions:**
- How is Alignment Score calculated from survey responses?
- Which questions contribute to Alignment? (Which patterns? Which lenses?)
- How are leader responses and team member responses combined?
- Are negative items reverse-scored? How?
- Is it a simple average, weighted average, or more complex formula?
- What's the exact mathematical formula?

**Provide:**
- Step-by-step calculation algorithm
- Pseudocode or formula
- Example calculation with sample data

---

### **2. STABILITY SCORE (0-100)**

**Questions:**
- How is Stability Score calculated?
- Which questions/patterns contribute to Stability?
- How are leader vs. team responses combined?
- How are negative items handled?
- What's the exact formula?

**Provide:**
- Step-by-step calculation algorithm
- Pseudocode or formula
- Example calculation

---

### **3. CLARITY SCORE (0-100)**

**Questions:**
- How is Clarity Score calculated?
- Which questions/patterns contribute to Clarity?
- How are leader vs. team responses combined?
- How are negative items handled?
- What's the exact formula?

**Provide:**
- Step-by-step calculation algorithm
- Pseudocode or formula
- Example calculation

---

### **4. TRAJECTORY SCORE (Improving/Declining/Stable + Magnitude)**

**Questions:**
- How is Trajectory calculated? (Compare current quarter to previous quarter?)
- What's the threshold for "improving" vs "declining"? (e.g., >5 point change?)
- How is magnitude calculated? (rate of change? percentage change?)
- Which scores are used for trajectory? (All three? Just Alignment? Weighted combination?)
- How do we handle the first survey? (No trajectory until second survey?)

**Provide:**
- Step-by-step calculation algorithm
- Threshold definitions
- Magnitude calculation method
- Example: "If Alignment improved from 65 to 72, trajectory = ?"

---

### **5. TEAM EXPERIENCE MAP COORDINATES**

**Questions:**
- How do we calculate X-axis position? (Is it Clarity Score directly? Or derived?)
- How do we calculate Y-axis position? (Is it Stability Score? Trust Score? Combination?)
- What are the exact zone boundaries?
  - Harmony Zone: X > ? AND Y > ?
  - Strain Zone: X < ? AND Y > ?
  - Stress Zone: X < ? AND Y < ?
  - Hazard Zone: X > ? AND Y < ?
- Are coordinates normalized? (0-100 scale? 0-1 scale?)

**Provide:**
- X-axis calculation formula
- Y-axis calculation formula
- Zone boundary definitions
- Example: "If Clarity = 75, Stability = 60, what are the X/Y coordinates and which zone?"

---

### **6. PATTERN SCORES (7 Leadership Patterns)**

**For each of the 7 patterns (Clarity, Consistency, Trust, Communication, Alignment, Stability, Leadership Drift):**

**Questions:**
- How is each pattern scored individually? (0-100)
- Which questions belong to each pattern? (From question bank metadata)
- How are leader vs. team member responses combined?
- How are negative items handled?
- Is it a simple average of questions in that pattern?

**Provide:**
- Calculation method for each pattern
- List of which questions contribute to each pattern
- Example calculation for one pattern

---

### **7. LEADERSHIP MIRROR VISUALIZATION**

**Questions:**
- Do we have leader responses? (Or is this inferred from team responses?)
- If we have leader responses, how do we compare them to team responses?
- What's the comparison method? (Gap analysis? Side-by-side? Ratio?)
- Which scores are compared? (All three? Just Alignment?)
- What's the visual format? (Gap bars? Overlay? Something else?)

**Provide:**
- Data requirements (do we need leader responses?)
- Comparison algorithm
- Visual representation method
- Example: "If leader thinks Alignment = 80, team experiences Alignment = 65, how do we visualize this?"

---

### **8. LEADERSHIP PROFILES (6 Profiles)**

**Questions:**
- How do we determine which profile a leader matches?
- Based on Honesty axis + Clarity axis scores?
- How do we calculate "Honesty" from responses? (Is it a derived score? Which questions?)
- How do we calculate "Clarity" for profiles? (Same as Clarity Score? Or different?)
- What are the exact thresholds?
  - Guardian: High Honesty + High Clarity (what are the thresholds?)
  - Aspirer: High Honesty + Unstable Clarity (thresholds?)
  - Protector: Selective Honesty + High Clarity (thresholds?)
  - Producer-Leader: Courageous Honesty + Ambiguous Clarity (thresholds?)
  - Stabilizer: Selective Honesty + Unstable Clarity (thresholds?)
  - Operator: Protective Honesty + Ambiguous Clarity (thresholds?)

**Provide:**
- Honesty axis calculation method
- Clarity axis calculation method (for profiles)
- Threshold definitions for each profile
- Decision tree or algorithm for profile determination
- Example: "If Honesty = 70, Clarity = 55, which profile?"

---

## **RESPONSE FORMAT**

For each question above, provide:

1. **Algorithm/Formula:** Exact mathematical formula or step-by-step algorithm
2. **Pseudocode:** If helpful, provide pseudocode for implementation
3. **Example Calculation:** Work through an example with sample data
4. **Edge Cases:** How to handle edge cases (missing data, first survey, etc.)
5. **Implementation Notes:** Any special considerations for coding

## **DOCUMENTATION TO REFERENCE**

You have access to the ALI documentation corpus, especially:
- Section 7 Part I: Introducing the ALI Model
- Section 7 Part II: How ALI Works
- Section 7 Part III: The ALI Scoring Model
- Section 7 Part IV: The 7 Leadership Patterns
- Section 7 Part VI: The Team Experience Map
- Section 7 Part VII: The Leadership Mirror
- Section 7 Part XIII: The 6 Leadership Profiles

Use these documents to inform your algorithms. If the documentation doesn't specify exact formulas, propose reasonable algorithms based on the principles described, and clearly mark them as "proposed" so they can be refined.

## **IMPORTANT NOTES**

- **Be specific:** Provide exact formulas, not general descriptions
- **Be implementable:** Algorithms should be code-ready
- **Be clear:** Use examples to illustrate calculations
- **Mark assumptions:** If you're making assumptions, clearly mark them
- **Consider edge cases:** First survey, missing data, small sample sizes

## **OUTPUT FORMAT**

Provide your response as a structured document with:
- Clear section headers for each score/visualization
- Formulas in mathematical notation
- Pseudocode where helpful
- Example calculations
- Implementation considerations

---

**END OF PROMPT**

---

## **HOW TO USE THIS PROMPT**

1. Copy the entire prompt above (from "# **ALI SCORE CALCULATION ALGORITHMS**" to "**END OF PROMPT**")
2. Paste it into ChatGPT
3. ChatGPT will review the ALI documentation and provide the algorithms
4. Share the response with me, and I'll implement the calculations in the dashboard

## **WHAT I'LL DO WITH THE RESPONSE**

Once you provide ChatGPT's response, I will:
1. Review the algorithms
2. Implement them as JavaScript functions
3. Create API endpoints to calculate scores
4. Build the dashboard visualizations using these calculations
5. Test with sample data
6. Refine based on your feedback

---

**Ready to send to ChatGPT!**

