# ALI Survey Builder Logic

## Overview

The ALI Survey Builder is a **deterministic, system-generated** algorithm that creates immutable survey snapshots. It enforces strict composition rules and eliminates human decision-making from question selection.

## Core Principles

1. **Deterministic**: Same inputs always produce same output
2. **Reproducible**: Can regenerate any survey snapshot from seed
3. **Auditable**: Full traceability of selection logic
4. **Immutable**: Once generated, surveys never change
5. **System-Only**: No human intervention in question selection

---

## Seed Generation

### Seed Formula (Locked)
```
seed = hash(client_id + survey_index + instrument_version)
```

**Example:**
- `client_id`: `550e8400-e29b-41d4-a716-446655440000`
- `survey_index`: `"S1"`
- `instrument_version`: `"v1.0"`
- `seed`: `sha256("550e8400-e29b-41d4-a716-446655440000|S1|v1.0")`

**Properties:**
- Deterministic: Same inputs → same seed
- Unique: Different clients/surveys → different seeds
- Versioned: Instrument updates → new seed space

---

## Question Selection Algorithm

### Step 1: Load Question Bank

```sql
SELECT * FROM ali_question_bank
WHERE status = 'active'
  AND instrument_version = :instrument_version
ORDER BY stable_id;
```

### Step 2: Select 3 Anchor Questions

**Rule:** Exactly 3 anchors, one per role:
- 1 leader anchor (`role = 'leader' AND is_anchor = true`)
- 1 team anchor (`role = 'team_member' AND is_anchor = true`)
- 1 shared anchor (can be either role, but `is_anchor = true`)

**Selection:**
```javascript
// Use seed to deterministically select from anchor pool
const leaderAnchors = questionBank.filter(q => 
  q.is_anchor && q.role === 'leader'
);
const teamAnchors = questionBank.filter(q => 
  q.is_anchor && q.role === 'team_member'
);
const sharedAnchors = questionBank.filter(q => 
  q.is_anchor
);

// Deterministic selection using seed
const anchor1 = selectDeterministic(leaderAnchors, seed + "|anchor|leader");
const anchor2 = selectDeterministic(teamAnchors, seed + "|anchor|team");
const anchor3 = selectDeterministic(sharedAnchors, seed + "|anchor|shared");
```

### Step 3: Select 7 Pattern Questions

**Rule:** One question from each of the 7 patterns:
- Clarity
- Consistency
- Trust
- Communication
- Alignment
- Stability
- Leadership Drift

**Selection:**
```javascript
const patterns = [
  'clarity', 'consistency', 'trust', 'communication',
  'alignment', 'stability', 'leadership_drift'
];

const patternQuestions = [];

patterns.forEach((pattern, index) => {
  // Get all questions for this pattern (excluding anchors already selected)
  const candidates = questionBank.filter(q =>
    q.pattern === pattern &&
    !q.is_anchor &&
    !anchors.includes(q.stable_id)
  );
  
  // Deterministic selection using pattern-specific seed
  const selected = selectDeterministic(
    candidates, 
    seed + `|pattern|${pattern}|${survey_index}`
  );
  
  patternQuestions.push(selected);
});
```

### Step 4: Enforce Negative Item Constraint

**Rule:** 2-4 negative items total (including anchors if applicable)

**Validation:**
```javascript
const allQuestions = [...anchors, ...patternQuestions];
const negativeCount = allQuestions.filter(q => q.is_negative).length;

if (negativeCount < 2 || negativeCount > 4) {
  // Regenerate with different seed variation
  // (This should be extremely rare if question bank is balanced)
  throw new Error('Negative item constraint violation');
}
```

### Step 5: Randomize Order (Deterministic)

**Rule:** Randomize question order using seed, but maintain determinism

```javascript
function deterministicShuffle(array, seed) {
  // Use seed-based PRNG for shuffling
  const rng = seedToRNG(seed);
  const shuffled = [...array];
  
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  return shuffled;
}

const finalOrder = deterministicShuffle(
  allQuestions,
  seed + "|shuffle"
);
```

---

## Constraint Enforcement

### Pre-Generation Validation

Before generating a survey, validate:

1. **Question Bank Availability**
   - At least 3 anchor questions exist (1 leader, 1 team, 1 shared)
   - At least 1 question per pattern exists
   - Sufficient negative items (at least 2 available)

2. **Client Readiness**
   - `baseline_date` is set (for S1) or previous survey exists (for S2+)
   - Company status is 'active'

3. **Instrument Version**
   - Specified version exists in question bank
   - Version is 'active' (not deprecated)

### Post-Generation Validation

After generating a survey, validate:

1. **Composition Rules**
   - Exactly 10 questions total
   - Exactly 3 anchors
   - Exactly 7 pattern questions (1 per pattern)
   - 2-4 negative items
   - No duplicate questions

2. **Question Validity**
   - All question stable_ids exist in question bank
   - All questions are active for specified instrument version
   - Question metadata matches snapshot

3. **Determinism**
   - Regenerating with same seed produces identical result
   - Question order is deterministic

---

## Failure Modes & Handling

### Scenario 1: Insufficient Questions in Bank

**Error:** Not enough questions for pattern X

**Handling:**
- Log error with full context
- Prevent survey generation
- Alert system administrators
- Do NOT fall back to manual selection

### Scenario 2: Negative Item Constraint Violation

**Error:** Generated survey has < 2 or > 4 negative items

**Handling:**
- Attempt regeneration with seed variation: `seed + "|retry|1"`
- Maximum 3 retry attempts
- If still failing, log error and prevent generation
- Do NOT relax constraint

### Scenario 3: Question Deprecated Mid-Survey

**Error:** Question in active survey is deprecated

**Handling:**
- Survey snapshot remains immutable (never changes)
- New surveys use updated question bank
- Historical surveys remain valid for analysis
- No retroactive changes

### Scenario 4: Instrument Version Mismatch

**Error:** Client requests survey with deprecated instrument version

**Handling:**
- Use latest active version instead
- Log version override
- Document in survey snapshot metadata

---

## Performance Considerations

### At Scale (Millions of Respondents)

1. **Question Bank Caching**
   - Cache active question bank in memory
   - Refresh on instrument version changes
   - Cache TTL: 1 hour

2. **Seed-Based Lookup**
   - Index surveys by `generation_seed`
   - Check for existing snapshot before generating
   - Avoid duplicate generation

3. **Batch Generation**
   - Generate surveys for multiple clients in batch
   - Use connection pooling for database
   - Parallel generation (with seed isolation)

4. **Deterministic Shuffle Optimization**
   - Pre-compute shuffle patterns for common seeds
   - Use efficient PRNG (e.g., xorshift)

---

## Audit Trail

Every survey generation must log:

1. **Inputs**
   - `client_id`
   - `survey_index`
   - `instrument_version`
   - `generation_seed`

2. **Outputs**
   - `snapshot_id`
   - `question_stable_ids` (ordered)
   - `question_order` (full metadata)
   - Composition counts (anchors, patterns, negatives)

3. **Timing**
   - `generated_at`
   - Generation duration

4. **Validation Results**
   - All constraints passed
   - Any warnings or retries

---

## Testing Requirements

### Unit Tests

1. **Determinism**
   - Same seed → same survey (1000 iterations)
   - Different seeds → different surveys

2. **Constraint Enforcement**
   - Always 3 anchors
   - Always 7 pattern questions (1 per pattern)
   - Always 2-4 negative items
   - Always 10 questions total

3. **Edge Cases**
   - Minimum question bank (exactly 3 anchors, 7 pattern questions)
   - Maximum question bank (100+ questions per pattern)
   - Version transitions

### Integration Tests

1. **End-to-End Generation**
   - Generate S1 for new client
   - Generate S2 for existing client
   - Verify immutability (attempt update → fail)

2. **Scale Testing**
   - Generate 10,000 surveys
   - Verify uniqueness
   - Measure performance

---

## Implementation Notes

### Language: JavaScript (Node.js)

- Use `crypto.createHash('sha256')` for seed generation
- Use `seedrandom` library for deterministic PRNG
- Use PostgreSQL for question bank queries

### Database Transactions

- Generate survey in transaction
- Validate constraints before commit
- Rollback on any failure

### Error Messages

- Explicit: "Cannot generate survey: insufficient questions for pattern 'trust'"
- Actionable: "Add at least 1 active question for pattern 'trust' in instrument version 'v1.0'"
- Never: Generic "Generation failed" messages

