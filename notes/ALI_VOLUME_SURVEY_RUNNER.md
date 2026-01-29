# ALI Volume Survey Runner

Script: [`scripts/ali-volume-survey-runner.mjs`](../scripts/ali-volume-survey-runner.mjs)

Submits many simulated survey responses for load testing and data-change validation (e.g. 50–100 users).

## Getting deployment tokens

1. **From the Deploy UI:** Log in to ALI, open **Deploy**, click **View Link** for a deployment. The survey URL ends with the token, e.g. `…/ali/survey/Abc123XyZ…`.
2. **From the API:**  
   `GET /api/ali/deployments?email=your@company.com`  
   Response includes `deployments[].deploymentToken` for each deployment.

## Usage

```bash
DEPLOYMENT_TOKENS=token1,token2 NUM_USERS=100 BASE_URL=https://www.archetypeoriginal.com node scripts/ali-volume-survey-runner.mjs
```

### Env vars

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DEPLOYMENT_TOKENS` | Yes* | — | Comma-separated deployment tokens |
| `FETCH_DEPLOYMENTS_EMAIL` | No | — | If set and tokens empty, fetch tokens from `GET /api/ali/deployments?email=...` |
| `NUM_USERS` | No | `50` | Number of simulated respondents |
| `BASE_URL` | No | `https://www.archetypeoriginal.com` | API base URL (no trailing slash) |
| `CONCURRENCY` | No | `5` | Max concurrent submit requests (1–20) |

\* Either `DEPLOYMENT_TOKENS` or `FETCH_DEPLOYMENTS_EMAIL` (with deployments API deployed) is required.

### Examples

```bash
# 50 users, single token, production
DEPLOYMENT_TOKENS=your-token-here node scripts/ali-volume-survey-runner.mjs

# 100 users, two tokens, staging
DEPLOYMENT_TOKENS=t1,t2 NUM_USERS=100 BASE_URL=https://staging.example.com node scripts/ali-volume-survey-runner.mjs

# 50 users, fetch tokens from deployments API (no manual tokens)
FETCH_DEPLOYMENTS_EMAIL=bart@archetypeoriginal.com BASE_URL=https://www.archetypeoriginal.com NUM_USERS=50 node scripts/ali-volume-survey-runner.mjs

# 100 users, concurrency 10
DEPLOYMENT_TOKENS=t1 NUM_USERS=100 CONCURRENCY=10 node scripts/ali-volume-survey-runner.mjs
```

## Output

- Progress logs every 10 submissions.
- Final summary: **Total submitted**, **Failed**, **Success rate**, **Total time**, **Submit latency p50/p95**.

## Data-change validation

Before running: note response count, ALI score, and zone (e.g. from Dashboard) for the test company.  
After running: confirm response count increased, scores updated, and zone/insights changed as expected when crossing thresholds (e.g. 5, 10 responses).
