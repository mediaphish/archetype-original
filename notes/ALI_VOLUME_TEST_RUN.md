# ALI Volume Test Run

**Date:** 2026-01-29

## Run

```bash
FETCH_DEPLOYMENTS_EMAIL=bart@archetypeoriginal.com \
BASE_URL=https://www.archetypeoriginal.com \
NUM_USERS=50 \
node scripts/ali-volume-survey-runner.mjs
```

## Result

- **Outcome:** Script exited before submitting. Token fetch failed.
- **Reason:** `GET /api/ali/deployments` is not yet deployed to production. The runner uses that endpoint when `FETCH_DEPLOYMENTS_EMAIL` is set and `DEPLOYMENT_TOKENS` is empty.
- **Output:**
  ```
  Fetching deployment tokens from /api/ali/deployments...
  Could not fetch tokens. Ensure GET /api/ali/deployments is deployed and returns data for this email.
  ```

## Next steps

1. Deploy the latest code (including `api/ali/deployments.js` and `/api/ali/deployments` route).
2. Re-run the volume test:
   ```bash
   FETCH_DEPLOYMENTS_EMAIL=bart@archetypeoriginal.com \
   BASE_URL=https://www.archetypeoriginal.com \
   NUM_USERS=50 \
   node scripts/ali-volume-survey-runner.mjs
   ```
3. Capture metrics from the script output (total submitted, failed, success rate, latency p50/p95).
4. Validate data change: before/after response counts, ALI score, and zone on the Dashboard for the test company.

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

**Status:** Pending a successful volume run. Re-run the volume test after deploy, then perform this validation.
