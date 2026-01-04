# ALI Seed Data Summary

## ✅ Successfully Created

### 1. Test Company
- **Company ID:** `0fb5c648-cf1e-4a31-9df4-8e620e52ab88`
- **Company Name:** "Test Company Inc"
- **Contact Email:** test-owner@testcompany.com
- **Contact ID:** `0a646ea4-c962-4096-9d5c-ca873209422e`
- **Contact Name:** Test Company Owner
- **Contact Role:** CEO
- **Company Size:** 51-100 employees

### 2. Survey Snapshot (S1)
- **Snapshot ID:** `0cb85757-e535-4309-93b5-62b0b2f43999`
- **Survey Index:** S1
- **Instrument Version:** v1.0
- **Generation Seed:** `b2a80e2252d856cb3f449f48cbf0d361db132ab5f872dc0e164f479f8ea54475`
- **Questions:** 10 total
  - 3 anchors (1 leader, 1 team_member, 1 either)
  - 7 patterns covered
  - 3 negative items
- **Question Stable IDs:**
  1. Q-LEADERSHIP_DRIFT-008
  2. Q-TRUST-004
  3. Q-STABILITY-003 (anchor)
  4. Q-TRUST-002 (anchor)
  5. Q-CLARITY-006
  6. Q-CONSISTENCY-006
  7. Q-ALIGNMENT-007
  8. Q-CLARITY-001 (anchor)
  9. Q-STABILITY-010
  10. Q-COMMUNICATION-006

### 3. Survey Deployment
- **Status:** ✅ Successfully created
- **Survey Index:** S1
- **Baseline Date:** Set automatically
- **Deployment Token:** Generated (check Supabase for actual token)

## 🔧 Technical Fixes Applied

1. **Fixed `survey_id` NOT NULL constraint**
   - Created SQL migration: `database/ALI_FIX_SURVEY_ID_NULLABLE.sql`
   - Made `survey_id` nullable in `ali_survey_deployments` table
   - This allows deployments to use `snapshot_id` instead of deprecated `survey_id`

2. **Improved deploy-survey endpoint**
   - Better error handling with detailed error messages
   - Automatic baseline_date setting for S1
   - Proper refresh of company data after baseline_date update
   - Fallback for available_at calculation

## 📊 What You Can Test Now

### API Endpoints Ready for Testing:

1. **Dashboard Data**
   ```
   GET /api/ali/dashboard?companyId=0fb5c648-cf1e-4a31-9df4-8e620e52ab88
   ```
   - Will show "insufficient data" until responses are created
   - Once you have 5+ responses, will show scores and visualizations

2. **Next Survey Info**
   ```
   GET /api/ali/deploy/next?companyId=0fb5c648-cf1e-4a31-9df4-8e620e52ab88
   ```
   - Shows next survey index (should be S2)
   - Shows when it will be available based on cadence

3. **Survey Questions**
   ```
   GET /api/ali/survey/{deployment_token}
   ```
   - Get the deployment token from Supabase `ali_survey_deployments` table
   - Returns the 10 questions for that deployment

4. **Submit Response**
   ```
   POST /api/ali/submit-response
   Body: {
     deploymentToken: "...",
     responses: { "Q-CLARITY-001": 4, "Q-TRUST-002": 5, ... },
     role: "leader" | "team_member"
   }
   ```

5. **Reports/Historical Trends**
   ```
   GET /api/ali/reports?companyId=0fb5c648-cf1e-4a31-9df4-8e620e52ab88
   ```
   - Will show trends once you have multiple surveys with responses

## 🎯 Next Steps to Complete Seed Data

To fully test the dashboard, you'll need to:

1. **Get the deployment token** from Supabase:
   ```sql
   SELECT deployment_token, id, survey_index, status 
   FROM ali_survey_deployments 
   WHERE company_id = '0fb5c648-cf1e-4a31-9df4-8e620e52ab88';
   ```

2. **Create test responses** (minimum 5, ideally 10+):
   - Use the `/api/ali/submit-response` endpoint
   - Mix of leader and team_member roles
   - Varied scores (1-5 Likert scale)
   - Responses should map question stable_ids to scores

3. **Test the dashboard**:
   - Once you have 5+ responses, the dashboard should show:
     - ALI Overall Score
     - Pattern Scores (7 patterns)
     - Anchor Scores
     - Team Experience Map coordinates
     - Leadership Profile (if 3+ surveys)
     - Perception Gaps (leader vs team)

## 📝 Files Changed

- `api/ali/deploy-survey.js` - Fixed deployment creation
- `database/ALI_FIX_SURVEY_ID_NULLABLE.sql` - SQL migration for survey_id

## 🔍 Database Queries for Verification

```sql
-- Check company
SELECT * FROM ali_companies WHERE id = '0fb5c648-cf1e-4a31-9df4-8e620e52ab88';

-- Check snapshot
SELECT * FROM ali_survey_snapshots WHERE id = '0cb85757-e535-4309-93b5-62b0b2f43999';

-- Check deployment
SELECT * FROM ali_survey_deployments WHERE company_id = '0fb5c648-cf1e-4a31-9df4-8e620e52ab88';

-- Check responses (once created)
SELECT COUNT(*) as response_count, 
       COUNT(DISTINCT deployment_id) as deployment_count
FROM ali_survey_responses 
WHERE deployment_id IN (
  SELECT id FROM ali_survey_deployments 
  WHERE company_id = '0fb5c648-cf1e-4a31-9df4-8e620e52ab88'
);
```

