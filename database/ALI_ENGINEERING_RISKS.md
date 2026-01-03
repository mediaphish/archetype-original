# ALI Engineering Risks & Mitigations

## Overview

This document identifies risks that could **quietly reintroduce human decision-making**, weaken determinism, or compromise longitudinal comparability. Each risk includes detection strategies and mitigation plans.

---

## Risk Category 1: Determinism Compromise

### Risk 1.1: Non-Deterministic Randomization

**Threat:** Using system `Math.random()` instead of seed-based PRNG

**Impact:** Same seed produces different surveys → breaks reproducibility

**Detection:**
- Unit test: Generate survey 1000 times with same seed → must be identical
- Integration test: Regenerate historical survey → must match exactly

**Mitigation:**
- Use `seedrandom` library (or equivalent) for all randomization
- Explicitly pass seed to all random functions
- Code review: Search for `Math.random()` usage
- Linter rule: Block `Math.random()` in survey builder code

**Code Example (Correct):**
```javascript
import seedrandom from 'seedrandom';

function deterministicShuffle(array, seed) {
  const rng = seedrandom(seed);
  // Use rng() instead of Math.random()
}
```

---

### Risk 1.2: Database Query Ordering

**Threat:** Question selection depends on non-deterministic SQL `ORDER BY`

**Impact:** Different database instances return questions in different order → different surveys

**Detection:**
- Test on multiple database instances
- Verify question selection is deterministic regardless of DB state

**Mitigation:**
- Always use explicit `ORDER BY stable_id` (or other deterministic column)
- Never rely on implicit row order
- Test with identical data on different DB instances

**Code Example (Correct):**
```sql
SELECT * FROM ali_question_bank
WHERE status = 'active'
ORDER BY stable_id; -- Explicit, deterministic ordering
```

---

### Risk 1.3: Race Conditions in Generation

**Threat:** Multiple simultaneous requests generate different surveys for same client/index

**Impact:** Client receives inconsistent surveys → breaks longitudinal analysis

**Detection:**
- Load test: 100 concurrent requests for same client/index
- Verify all return identical survey

**Mitigation:**
- Database unique constraint: `UNIQUE (client_id, survey_index, instrument_version)`
- Check for existing snapshot before generation
- Use database transaction with proper isolation level

**Code Example (Correct):**
```javascript
// Check for existing snapshot first
const existing = await getSurveySnapshot(clientId, surveyIndex, version);
if (existing) {
  return existing; // Return existing, don't regenerate
}

// Generate in transaction
await db.transaction(async (tx) => {
  // Check again inside transaction (prevent race)
  const stillExists = await tx.getSnapshot(...);
  if (stillExists) return stillExists;
  
  // Generate new snapshot
  const snapshot = await generateSurvey(...);
  await tx.insertSnapshot(snapshot);
  return snapshot;
});
```

---

## Risk Category 2: Human Decision Reintroduction

### Risk 2.1: Manual Override Endpoint

**Threat:** Admin endpoint allows manual question selection

**Impact:** Human-curated surveys enter production → breaks system consistency

**Detection:**
- Code review: Search for "manual", "override", "admin" in survey generation code
- Audit logs: Monitor for non-system survey creation
- Database query: Check `generated_by` field (should always be "system")

**Mitigation:**
- Disable manual override by default
- Require explicit feature flag: `ALLOW_MANUAL_SURVEYS=false`
- Log all manual overrides with admin user ID
- Mark manual surveys with `generated_by = "admin:{user_id}"`
- Exclude manual surveys from production analytics (separate table/flag)

**Code Example (Correct):**
```javascript
if (req.body.manual_questions && !process.env.ALLOW_MANUAL_SURVEYS) {
  return res.status(403).json({ 
    error: 'Manual survey creation is disabled' 
  });
}

if (req.body.manual_questions) {
  // Log admin action
  await logAdminAction({
    action: 'manual_survey_creation',
    admin_id: req.user.id,
    client_id: req.body.client_id
  });
  
  // Mark as manual
  snapshot.generated_by = `admin:${req.user.id}`;
  snapshot.is_manual = true;
}
```

---

### Risk 2.2: Question Bank Edits in Production

**Threat:** Active questions edited directly in database

**Impact:** Historical surveys reference changed questions → breaks comparability

**Detection:**
- Database trigger: Log all updates to active questions
- Alert on any update to `question_text` for active questions
- Periodic audit: Compare question bank to version history

**Mitigation:**
- Database trigger prevents updates to active questions (see schema)
- All question changes require new `stable_id`
- Version history table tracks all changes
- Read-only access to production question bank (write via migration only)

**Database Enforcement:**
```sql
-- Trigger prevents updates (see ALI_QUESTION_BANK_SCHEMA.sql)
CREATE TRIGGER prevent_active_question_updates_trigger
BEFORE UPDATE ON ali_question_bank
FOR EACH ROW
EXECUTE FUNCTION prevent_active_question_updates();
```

---

### Risk 2.3: A/B Testing or Feature Flags

**Threat:** Different survey generation logic for different clients

**Impact:** Non-deterministic variation → breaks comparability

**Detection:**
- Code review: Search for feature flags in survey builder
- Database query: Check for variation in `generation_seed` format
- Audit: Verify all clients use same builder version

**Mitigation:**
- Single builder code path (no feature flags)
- Version instrument, not builder logic
- All clients use same algorithm (only seed differs)

**Anti-Pattern (Avoid):**
```javascript
// BAD: Feature flag changes builder logic
if (client.feature_flag === 'new_builder') {
  return generateSurveyV2(...);
} else {
  return generateSurveyV1(...);
}
```

**Correct Pattern:**
```javascript
// GOOD: Version is in instrument, not builder
const version = client.instrument_version || 'v1.0';
return generateSurvey(client, surveyIndex, version);
```

---

## Risk Category 3: Longitudinal Comparability

### Risk 3.1: Question Wording Changes

**Threat:** Question text updated without new `stable_id`

**Impact:** Historical surveys reference "updated" questions → breaks analysis

**Detection:**
- Database trigger: Prevent updates to active questions
- Version history: Track all wording changes
- Audit: Compare current question bank to historical snapshots

**Mitigation:**
- Immutability enforcement (database triggers)
- New wording = new `stable_id`
- Historical surveys reference original `stable_id` (never changes)

---

### Risk 3.2: Instrument Version Drift

**Threat:** Clients on different instrument versions compared directly

**Impact:** Incomparable surveys → invalid analysis

**Detection:**
- Database query: Check for version mixing in analysis
- Dashboard: Display instrument version prominently
- Analysis: Block cross-version comparisons

**Mitigation:**
- Always filter by `instrument_version` in analysis
- UI warnings when comparing different versions
- Version migration path (explicit, documented)

---

### Risk 3.3: Baseline Date Manipulation

**Threat:** `baseline_date` changed after S1 sent

**Impact:** Future survey cadence shifts → breaks longitudinal tracking

**Detection:**
- Database trigger: Prevent updates to `baseline_date` after first survey
- Audit log: Track all `baseline_date` changes
- Validation: Check cadence consistency

**Mitigation:**
- Lock `baseline_date` after first survey sent
- Only allow updates in exceptional cases (with admin approval + audit)
- Recalculate all future survey dates on any change

**Database Enforcement:**
```sql
CREATE OR REPLACE FUNCTION prevent_baseline_date_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- If company has any surveys, prevent baseline_date changes
  IF EXISTS (
    SELECT 1 FROM ali_survey_snapshots 
    WHERE client_id = NEW.id
  ) THEN
    IF NEW.baseline_date != OLD.baseline_date THEN
      RAISE EXCEPTION 'Cannot change baseline_date after first survey. Contact admin.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## Risk Category 4: Scale & Performance

### Risk 4.1: Question Bank Query Performance

**Threat:** Slow question bank queries at scale

**Impact:** Survey generation fails or times out

**Detection:**
- Load test: Generate 10,000 surveys
- Monitor query execution time
- Set query timeout (e.g., 5 seconds)

**Mitigation:**
- Index question bank properly (see schema)
- Cache active question bank in memory
- Use connection pooling
- Consider read replicas for question bank queries

---

### Risk 4.2: Survey Snapshot Storage

**Threat:** Large `question_order` JSONB fields bloat database

**Impact:** Slow queries, storage costs

**Detection:**
- Monitor database size growth
- Check JSONB field sizes
- Set storage alerts

**Mitigation:**
- Store only `stable_ids` in array (lightweight)
- Store full metadata in `question_order` JSONB (for audit)
- Consider archiving old snapshots
- Use JSONB compression (PostgreSQL 14+)

---

## Risk Category 5: Operational Errors

### Risk 5.1: Accidental Survey Regeneration

**Threat:** Survey regenerated for existing client/index

**Impact:** New survey overwrites old → breaks historical analysis

**Detection:**
- Database unique constraint prevents duplicates
- Log all generation attempts
- Alert on duplicate generation attempts

**Mitigation:**
- Unique constraint: `UNIQUE (client_id, survey_index, instrument_version)`
- Check for existing snapshot before generation
- Return existing snapshot if found (don't regenerate)

---

### Risk 5.2: Question Bank Depletion

**Threat:** Too many questions deprecated → insufficient for generation

**Impact:** Survey generation fails

**Detection:**
- Monitor question bank health
- Alert when < 10 active questions per pattern
- Alert when < 3 active anchors

**Mitigation:**
- Pre-generation validation (check availability)
- Graceful degradation (use older instrument version if needed)
- Proactive question bank maintenance

---

## Monitoring & Alerts

### Required Alerts

1. **Determinism Violation**
   - Same seed produces different survey
   - Alert: CRITICAL

2. **Manual Survey Creation**
   - Survey created with `generated_by != "system"`
   - Alert: WARNING

3. **Question Bank Edit**
   - Active question updated
   - Alert: CRITICAL

4. **Baseline Date Change**
   - `baseline_date` changed after first survey
   - Alert: WARNING

5. **Constraint Violation**
   - Survey generated with invalid composition
   - Alert: CRITICAL

6. **Generation Failure**
   - Survey generation fails > 3 times
   - Alert: WARNING

---

## Code Review Checklist

Before merging survey builder code, verify:

- [ ] No `Math.random()` usage (use seed-based PRNG)
- [ ] All SQL queries have explicit `ORDER BY`
- [ ] Unique constraint on survey snapshots
- [ ] Transaction isolation for generation
- [ ] No feature flags in builder logic
- [ ] Manual override disabled by default
- [ ] Immutability triggers in place
- [ ] Audit logging for all generations
- [ ] Constraint validation before commit
- [ ] Error messages are explicit and actionable

---

## Testing Requirements

### Mandatory Tests

1. **Determinism Test**
   - Generate survey 1000 times with same seed
   - Verify 100% identical results

2. **Constraint Test**
   - Generate 100 surveys
   - Verify all meet composition rules

3. **Immutability Test**
   - Generate survey
   - Attempt update → must fail

4. **Race Condition Test**
   - 100 concurrent requests for same client/index
   - Verify all return identical survey

5. **Version Test**
   - Generate surveys with different instrument versions
   - Verify correct questions selected

---

## Conclusion

The risks above are **preventable** with proper engineering discipline:

1. **Database constraints** enforce immutability
2. **Code patterns** enforce determinism
3. **Monitoring** detects violations
4. **Testing** verifies correctness

The key is **rigor from day one**—these patterns must be established before scale, not retrofitted later.

