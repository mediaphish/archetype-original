# ALI Backend Integration Status

## ✅ Completed Endpoints

### 1. GET /api/ali/survey/[token]
**File:** `api/ali/survey/[token].js`
**Status:** ✅ Complete
**Purpose:** Fetch survey questions for a deployment token
**Returns:**
- survey_index
- deployment_id
- questions array (with pattern, is_negative, is_anchor, order)
- closes_at

### 2. GET /api/ali/deploy/next
**File:** `api/ali/deploy/next.js`
**Status:** ✅ Complete
**Purpose:** Get next survey information
**Returns:**
- next_survey_index
- quarter
- year
- available_on
- can_deploy
- reason (if can't deploy)

## ⚠️ In Progress

### 3. GET /api/ali/dashboard
**File:** `api/ali/dashboard.js`
**Status:** 🔄 Needs Implementation
**Purpose:** Complete dashboard data with all calculations
**Complexity:** High - requires:
- Querying all completed surveys
- Transforming responses to scoring format
- Calculating scores for overall, leader, team_member
- Rolling scores (4-survey window)
- Perception gaps
- Leadership profile
- Experience map coordinates
- Data quality gating

## 📋 Remaining Endpoints

### 4. GET /api/ali/reports
**Status:** ⏳ Not Started
**Purpose:** Historical trend data across all years

### 5. POST /api/ali/auth/login
**Status:** ⏳ Not Started
**Purpose:** Authentication (map to ali_contacts)

### 6. GET /api/ali/billing
**Status:** ⏳ Not Started
**Purpose:** Stripe subscription data

## 📝 Notes

- All scoring functions exist in `lib/ali-scoring.js`
- Dashboard calculation helpers exist in `lib/ali-dashboard-calculations.js`
- Response structure: `ali_survey_responses.responses` is a JSON object with question stable_ids as keys
- Need to transform responses to format expected by scoring functions: `{question_id, response, is_negative, pattern, role}`

## 🔄 Next Steps

1. Implement `GET /api/ali/dashboard` - This is the most critical endpoint
2. Implement `GET /api/ali/reports` - Historical data
3. Implement authentication endpoints
4. Implement billing endpoint

