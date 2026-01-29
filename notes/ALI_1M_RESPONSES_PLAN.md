# ALI Path to 1,000,000 Survey Responses (18–24 Months)

**Target:** 1M survey responses (rows in `ali_survey_responses`) within 18–24 months.

**Scale:** ~41.7k–55.6k responses/month (1M ÷ 24 vs 1M ÷ 18).

---

## 1. Growth model

**Simplified:** Responses = Companies × Surveys per company × Respondents per survey.

| Lever | Example | Effect |
|-------|---------|--------|
| More companies | 200 → 500 | Linear growth |
| Surveys per company per year | 4 (quarterly) | Fixed for cadence |
| Respondents per survey | 20 → 50 | Linear growth |

**Example:** 200 companies × 4 surveys/year × 50 respondents ≈ 40k responses/year. To reach ~50k/month, scale companies and/or respondents (e.g. 300+ companies, 50+ respondents per survey).

**Action:** Define explicit targets (X new companies/month, Y respondents/survey) and map to monthly response targets. Revisit as pilot data comes in.

---

## 2. Technical readiness

### Database

- Existing indexes: `idx_ali_survey_responses_deployment`, `idx_ali_survey_deployments_company`, etc. ([ali-phase1-schema-complete](../database/ali-phase1-schema-complete.sql)).
- Verify `ali_survey_responses (deployment_id, respondent_role)` (or similar) is indexed if dashboard/reports filter heavily by role.
- Avoid N+1 patterns when aggregating by deployment/company (dashboard, reports, super-admin).

### APIs

- Dashboard and reports already aggregate by company/deployment. Profile under load (e.g. 100+ responses per deployment, many deployments per company) and add indexes or denormalization if needed.

### Caching (later)

- Consider short-TTL caching (e.g. 1–5 min) for dashboard/report payloads per company if reads grow faster than writes.

---

## 3. Monitoring and operations

### Metrics to track

- Response throughput (responses/day or week).
- Submit-response and dashboard/report API latency (e.g. p95) and error rate.
- DB CPU, connections, and slow queries.

### Alerts

- Rising error rates or latency on submit-response and dashboard.
- DB saturation (connections, CPU).

### Review cadence

- Monthly check of response growth vs target and system health.

---

## 4. Rollout phases

1. **Now:** View Link live → manual and scripted volume tests (50–100 users) → validate load and data change.
2. **Short term:** Apply learnings (indexes, timeouts, limits). Run larger scripted runs (e.g. 500–1k submissions) and light load tests.
3. **Ongoing:** Grow companies, surveys, and respondents per the model; monitor toward ~41k–56k responses/month and adjust product and infra as needed.

---

## 5. References

- Volume runner: [ALI_VOLUME_SURVEY_RUNNER.md](ALI_VOLUME_SURVEY_RUNNER.md)
- Volume test run: [ALI_VOLUME_TEST_RUN.md](ALI_VOLUME_TEST_RUN.md)
