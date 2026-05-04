# ALI Dashboard Specification (LOCKED)

**Status:** Final, locked specification. No changes without explicit approval.

**Date:** 2025-01-XX

**Purpose:** Complete technical specification for ALI dashboard calculations and visualizations.

---

## GLOBAL RULES (NON-NEGOTIABLE)

1. **Rolling scores drive all visuals** - Never use snapshot scores for dashboard
2. **No leader-only classifications** - Profiles use team responses only
3. **No metaphor-driven logic** - Pure calculations, no symbolic interpretations
4. **No single-survey conclusions** - Minimum 3 surveys for profile determination
5. **All outputs deterministic and auditable** - Same inputs → same outputs, always

---

## QUESTION 1: TEAM EXPERIENCE MAP

### Calculation (ROLLING SCORES ONLY)

**X-Axis:** Clarity
```
X = PatternRolling(clarity)
```

**Y-Axis:** Stability + Trust Composite
```
Y = (PatternRolling(stability) + PatternRolling(trust)) / 2
```

### Zones (0-100 scale)

| Zone | Condition |
|------|-----------|
| Harmony (Green) | X ≥ 70 AND Y ≥ 70 |
| Strain (Yellow) | X < 70 AND Y ≥ 70 |
| Stress (Orange) | X < 70 AND Y < 70 |
| Hazard (Red) | X ≥ 70 AND Y < 70 |

### Example

- Clarity = 75
- Stability = 60
- Trust = 65

**Calculation:**
- X = 75
- Y = (60 + 65) / 2 = 62.5

**Result:** → Hazard Zone (X ≥ 70 AND Y < 70)

---

## QUESTION 2: THREE CORE SCORES

**These are NOT composites. They are explicitly pattern scores.**

| Display | Calculation |
|---------|-------------|
| Alignment | `PatternRolling(alignment)` |
| Stability | `PatternRolling(stability)` |
| Clarity | `PatternRolling(clarity)` |

### Rules:
- ✅ Rolling only
- ✅ No anchors
- ✅ No blending
- ✅ No weighting
- ✅ Direct pattern score mapping

---

## QUESTION 3: LEADERSHIP PROFILES

### Data Source
- **Team responses only**
- **Leader self-report is explicitly excluded**

### Axis 1: HONESTY (Computed Exposure Score)

```
Honesty = (
  PatternRolling(trust)
  + PatternRolling(communication)
  + (100 − abs(Gap_Trust))
) / 3
```

Where:
- `Gap_Trust = Trust_leader − Trust_team`

### Honesty Bands

| Score | State |
|-------|-------|
| ≥ 70 | Courageous Honesty |
| 55–69 | Selective Honesty |
| < 55 | Protective Honesty |

### Axis 2: CLARITY STATE

**Level:**
```
ClarityLevel = PatternRolling(clarity)
```

**Variance:**
```
ClarityVariance = stddev(PatternScore(clarity)) over last 4 surveys
```

### Clarity Classification

| Condition | State |
|-----------|-------|
| Level ≥ 70 AND Variance < 8 | High Clarity |
| Level ≥ 60 AND Variance ≥ 8 | Unstable Clarity |
| Level < 60 | Ambiguous Clarity |

### Profile Matrix (LOCKED)

| Honesty \ Clarity | High | Unstable | Ambiguous |
|-------------------|------|----------|-----------|
| **Courageous** | Guardian | Aspirer | Producer-Leader |
| **Selective** | Protector | Stabilizer | Operator |
| **Protective** | Operator | Operator | Operator |

### Rules:
- ✅ Protective honesty **never** maps to Guardian/Aspirer
- ✅ Profiles update quarterly only
- ✅ <3 surveys → "Profile forming"

---

## QUESTION 4: LEADERSHIP MIRROR

### Comparison Formula

For any score S:
```
Gap_S = S_leader − S_team
```

### Required Scores

1. ALI Overall
2. Alignment
3. Stability
4. Clarity

### Visual Rules

- **Side-by-side bars** (leader vs team)
- **Gap number displayed**
- **Severity classification:**

| |Gap| | Severity |
|-------|----------|
| < 8 | neutral |
| 8–14 | caution |
| ≥ 15 | critical |

---

## IMPLEMENTATION STATUS

✅ **Core Scoring Functions** (`/lib/ali-scoring.js`)
- Reverse scoring
- Normalization
- Pattern scores
- Anchor scores
- ALI Overall Score
- Rolling scores
- Drift Index
- Perception gaps

✅ **Dashboard Calculations** (`/lib/ali-dashboard-calculations.js`)
- Three core scores
- Team Experience Map coordinates
- Leadership Profile determination
- Leadership Mirror gaps

✅ **All Specifications Locked**
- No ambiguity
- No optional paths
- Deterministic calculations
- Ready for UI/UX implementation

---

## NEXT STEPS

1. ✅ Scoring algorithms implemented
2. ✅ Dashboard calculations implemented
3. ⏳ Create API endpoint (`/api/ali/dashboard/:companyId`)
4. ⏳ Build UI visualizations
5. ⏳ Test with sample data

---

**This specification is locked and ready for implementation.**

