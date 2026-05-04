# ALI Phase 1: Implementation Summary

## ✅ Completed

### Database Schema
- **Location**: `database/ali-phase1-schema.sql`
- **Tables Created**:
  - `ali_companies` - Auto-created on signup
  - `ali_applications` - Pilot signups (existing, updated)
  - `ali_divisions` - Organizational divisions with sub-division support
  - `ali_contacts` - Multiple contacts per company (Account Owner, View Only)
  - `ali_surveys` - Survey definitions
  - `ali_survey_deployments` - Survey deployments with unique tokens
  - `ali_survey_responses` - Anonymous responses

### API Endpoints Created

1. **`/api/ali/signup`** (POST)
   - Auto-creates company and first contact (Account Owner)
   - Validates company name uniqueness
   - Validates email uniqueness across companies
   - Returns company and contact details

2. **`/api/ali/contacts`** (GET, POST, PATCH)
   - List contacts for a company
   - Add new contacts
   - Update contact details and permission levels
   - Supports Account Owner and View Only permissions

3. **`/api/ali/divisions`** (GET, POST, PATCH, DELETE)
   - List divisions for a company
   - Create divisions (supports sub-divisions)
   - Update division details
   - Delete divisions (prevents deletion if has sub-divisions)

4. **`/api/ali/deploy-survey`** (POST)
   - Creates survey deployment for company/division
   - Generates unique, secure deployment token
   - Supports company-wide (divisionId = null) or division-specific
   - Returns survey URL with token
   - Supports scheduled opening/closing dates

5. **`/api/ali/submit-response`** (POST)
   - Submits anonymous survey response
   - Validates deployment is open and accepting responses
   - Tracks response count
   - Returns whether minimum threshold (default: 5) is met
   - Links response to deployment and optional division

6. **`/api/ali/apply`** (POST) - Updated
   - Updated to use `supabaseAdmin` for consistency
   - Existing pilot application endpoint (unchanged functionality)

## 🔧 Next Steps

### 1. Run Database Migration
Execute the SQL schema in Supabase:
```sql
-- Run: database/ali-phase1-schema.sql
```

### 2. Create Survey Definitions
Insert Survey 1 into `ali_surveys` table:
- Set `auto_deploy: true` for Survey 1
- Define questions structure in JSONB format

### 3. Authentication System
- Implement third-party auth (Google, GitHub, etc.)
- Add RLS policies based on contact permissions
- Account Owners see survey links
- View Only see dashboard

### 4. Dashboard Access
- Build dashboard UI
- Filter by company/division
- Show aggregate results (only when threshold met)
- Display Team Experience Map

### 5. Survey 1 Auto-Deploy
- When company is approved/ready, auto-create deployment
- Generate token and send to Account Owner
- Link connects respondents to business structure

## 📋 API Usage Examples

### Company Signup
```javascript
POST /api/ali/signup
{
  "companyName": "Acme Corp",
  "companySize": "51-100",
  "website": "https://acme.com",
  "contactEmail": "ceo@acme.com",
  "contactName": "John Doe",
  "contactRole": "CEO",
  "pilotProgram": true
}
```

### Add Contact
```javascript
POST /api/ali/contacts
{
  "companyId": "uuid",
  "email": "hr@acme.com",
  "fullName": "Jane Smith",
  "role": "HR Director",
  "permissionLevel": "view_only"
}
```

### Create Division
```javascript
POST /api/ali/divisions
{
  "companyId": "uuid",
  "name": "Engineering",
  "description": "Engineering division"
}
```

### Deploy Survey
```javascript
POST /api/ali/deploy-survey
{
  "surveyId": "uuid",
  "companyId": "uuid",
  "divisionId": "uuid", // or null for company-wide
  "opensAt": "2026-01-15T00:00:00Z",
  "minimumResponses": 5
}
```

### Submit Response
```javascript
POST /api/ali/submit-response
{
  "deploymentToken": "unique-token-from-url",
  "divisionId": "uuid", // optional
  "responses": {
    "question1": "answer1",
    "question2": "answer2"
  },
  "deviceType": "desktop"
}
```

## 🔒 Security Notes

- All endpoints use `supabaseAdmin` (service role) for now
- RLS is enabled but policies need to be added with auth
- Deployment tokens are cryptographically secure (32 bytes, base64url)
- Email uniqueness enforced across companies
- Company name uniqueness enforced

## 📝 Database Notes

- All tables have `created_at` and `updated_at` timestamps
- Auto-updating `updated_at` via triggers
- Foreign keys with cascade deletes where appropriate
- Indexes on common query fields
- RLS enabled (policies to be implemented with auth)

