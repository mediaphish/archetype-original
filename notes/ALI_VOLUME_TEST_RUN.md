# ALI Volume Test Run

**Date:** 2026-01-29

## Run

```bash
FETCH_DEPLOYMENTS_EMAIL=bart@archetypeoriginal.com \
BASE_URL=https://www.archetypeoriginal.com \
NUM_USERS=50 \
node scripts/ali-volume-survey-runner.mjs
```

## Result (2026-01-29 initial run)

- **Outcome:** Token fetch failed (deployments API not yet deployed).
- **Output:** `Could not fetch tokens. Ensure GET /api/ali/deployments is deployed...`

## Result (2026-01-29 after deploy)

- **Outcome:** Success. 50 submitted, 0 failed, 100% success rate.
- **Metrics:** Total time 4.2 s; submit latency p50 282 ms, p95 1123 ms.
- **Data validation:** Before 5 responses, ALI 58.5, zone orange. After 55 responses, ALI 51.4, zone orange; scores and experience map updated.

## Re-run

To run again, use the same command as in "Run" above, then capture metrics from the output and validate data change (before/after counts, scores, zone).

## Alternative (manual tokens)

If you have deployment tokens from the Deploy UI "View Link":

```bash
DEPLOYMENT_TOKENS=token1,token2 \
BASE_URL=https://www.archetypeoriginal.com \
NUM_USERS=50 \
node scripts/ali-volume-survey-runner.mjs
```

---

## Data change validation (run after successful volume test)

1. **Before run:** For the test company (e.g. bart@archetypeoriginal.com), record:
   - Response count (Dashboard or Deploy "Active Deployments")
   - ALI score and zone (Dashboard)
2. **Run** the volume test (50–100 users).
3. **After run:** Record the same metrics.
4. **Confirm:** Response count increased; ALI score and zone updated as expected when crossing thresholds (e.g. 5, 10 responses).

**Status:** Completed 2026-01-29 (see "Result after deploy" above).
