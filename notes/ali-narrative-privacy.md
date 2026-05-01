# ALI Narrative Privacy Rules

This note is the privacy contract for ALI narrative follow-ups. It applies to every endpoint, helper, and dashboard view that touches `ali_narratives`. If any of the rules below change, update both this note and `lib/ali-narrative-privacy.js` in the same commit so the doctrine and the code never disagree.

## Promises (what the storyteller can rely on)

1. **Stories never link to identity.** `ali_narratives` does not store `respondent_id`, `leader_id`, `contact_id`, `email`, or IP. The `ali_narrative_block_identity_trigger` (in `database/ALI_NARRATIVE_SCHEMA.sql`) refuses any insert that smells like identity. The join from a story back to a person is structurally impossible at the database level.
2. **Stories are not neutralized or rewritten.** We apply lightweight de-identification only (emails, phone numbers, "my name is …" / "I'm …" patterns). Voice, sequence, and meaning are preserved.
3. **Stories never reach a leader-facing view alone.** Exposure is gated by an N-threshold and a small-tenant guardrail (below). Until both are met, stories are admin-review-only.

## Aggregation rules (encoded in `lib/ali-narrative-privacy.js`)

The defaults live in `config/ali-narrative-privacy.json`. Each rule has a per-tenant override slot for cases where a tenant negotiates stricter or looser terms — overrides apply via `tenant_overrides[<tenant_id>]`.

### Rule 1 — N-threshold for exposure

A narrative becomes visible on a leader-facing dashboard only when, for the same `(deployment_id, condition)` bucket, the count of `moderation_status='approved'` narratives is at least `exposure_n_threshold` (default **3**).

- A bucket below the threshold sits in admin-review only.
- A bucket at or above the threshold is *eligible* for exposure but still requires Rule 2.
- Increasing the threshold is always safe; decreasing it requires explicit user approval.

### Rule 2 — Small-tenant guardrail

Even when a bucket has met the N-threshold, the deployment as a whole must have at least `small_tenant_min_respondents` total respondents (default **8**) before any narrative from that deployment is exposed.

This protects very small tenants from a situation where 3 of, say, 4 respondents wrote a narrative on the same condition — the math could imply who said what. The guardrail forces narratives in small tenants to be admin-review-only until additional deployments accumulate enough respondents that the population is no longer identifiable.

### Rule 3 — Forced exposure is audit-logged

The admin `expose` endpoint accepts a `force: true` flag for the rare case where exposure is required despite the gate (e.g., a regulator request). When `force` is used, the per-narrative `ali_narrative_audit` row records `actor=<admin email>` and `notes='forced exposure (audit-logged override)'`. Use this sparingly. The forced-exposure audit row is the trail.

### Rule 4 — Reject is irreversible (within the public-facing surface)

A narrative moved to `moderation_status='rejected'` is never exposed and never made visible, regardless of subsequent threshold changes. Reverting a reject requires a fresh moderation pass and a clear audit note.

### Rule 5 — Light de-identification only at intake

Intake (`api/ali/narrative/submit.js`) applies regex passes for emails, phone numbers, and self-name patterns. We do not run AI rewriting at intake. Heavier redaction is admin-only via the `edit_for_redaction` moderation action, and changes the stored `text` (with a corresponding audit row).

### Rule 6 — No cross-tenant leakage

ALI narratives are filtered by `tenant_id` everywhere. The admin endpoints exist for super-admin operators only and do not aggregate stories across tenants in any leader-facing surface. Any future cross-tenant analytics must be added on top of an explicit anonymization layer; do not bypass the per-tenant filter.

## Where each rule is enforced

| Rule | Database | Code | Notes |
| --- | --- | --- | --- |
| No identity columns | `ali_narrative_block_identity_trigger` | `api/ali/narrative/submit.js` | Trigger refuses insert if identity columns exist on the table. |
| Light de-id at intake | — | `api/ali/narrative/submit.js#lightlyDeidentify` | Regex pass. |
| N-threshold | `ali_narrative_exposure_counts` view | `lib/ali-narrative-privacy.js#evaluateExposureGate` | Used by `api/ali/narrative/admin/expose.js`. |
| Small-tenant guardrail | — | `lib/ali-narrative-privacy.js#evaluateExposureGate` | Looks at `ali_survey_responses` count for the deployment. |
| Audit trail | `ali_narrative_audit` table | `api/ali/narrative/admin/moderate.js`, `api/ali/narrative/admin/expose.js` | Inserted on every action. |
| Per-tenant scope | — | All admin endpoints filter by `tenant_id` | No cross-tenant aggregation in leader-facing views. |

## Configuration

Edit `config/ali-narrative-privacy.json` to adjust defaults. Example:

```json
{
  "version": 1,
  "exposure_n_threshold": 3,
  "small_tenant_min_respondents": 8,
  "tenant_overrides": {
    "00000000-0000-0000-0000-000000000000": {
      "exposure_n_threshold": 5,
      "small_tenant_min_respondents": 12
    }
  }
}
```

After changing the config, no migration is required; the helper picks it up on the next request.
