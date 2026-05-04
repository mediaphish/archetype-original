# ALI Segmentation Architecture Analysis

## The Problem

We're currently mixing two different types of segmentation:
1. **Organizational** (departments, teams, divisions)
2. **Geographic** (locations, offices, regions, countries)

A single `division_id` field cannot handle both dimensions. For example:
- A person could be in "Engineering" (department) AND "Chicago Office" (location) AND "USA" (country)
- We need to segment by department, location, state, country, etc.
- Reporting needs to filter/group by any combination

**Current Schema Issues:**
- `ali_divisions` is described as "organizational divisions (not location-based)" but we need location data
- `ali_survey_responses.division_id` can only reference one division
- No way to segment by geographic location (town, state, country)
- No way to have multi-dimensional segmentation

---

## Current State

### What We Have:
```sql
ali_divisions:
  - id
  - company_id
  - name (e.g., "Engineering", "Sales")
  - parent_division_id (hierarchical)
  - description
  - NO location data

ali_survey_responses:
  - division_id (single reference)
  - NO location data
```

### What We Need:
- Segment by department/team
- Segment by location (office, city, state, country)
- Segment by multiple dimensions simultaneously
- Filter reports by any combination

---

## Solution Options

### Option 1: Separate Tables (Recommended)
**Create separate tables for organizational vs. geographic segmentation:**

```sql
-- Organizational structure (departments, teams)
ali_divisions:
  - id
  - company_id
  - name (e.g., "Engineering", "Sales", "HR")
  - parent_division_id
  - type: 'department' | 'team' | 'division'
  - description

-- Geographic structure (locations)
ali_locations:
  - id
  - company_id
  - name (e.g., "Chicago Office", "Remote")
  - parent_location_id (for regions/countries)
  - type: 'office' | 'region' | 'country'
  - address_line1
  - address_line2
  - city
  - state_province
  - postal_code
  - country
  - timezone

-- Response segmentation (many-to-many)
ali_response_segments:
  - response_id
  - segment_type: 'division' | 'location'
  - segment_id (references either ali_divisions or ali_locations)
```

**Pros:**
- Clear separation of concerns
- Flexible (can add more segment types later)
- Supports multi-dimensional segmentation
- Easy to query and report

**Cons:**
- More complex schema
- Requires join queries for reporting

---

### Option 2: Unified Segments Table
**Single table for all segmentation types:**

```sql
ali_segments:
  - id
  - company_id
  - name
  - parent_segment_id
  - segment_type: 'department' | 'team' | 'office' | 'region' | 'country'
  - metadata JSONB (flexible fields for location data, etc.)
  
ali_response_segments:
  - response_id
  - segment_id
```

**Pros:**
- Simpler schema (one table)
- Easy to add new segment types
- Flexible metadata field

**Cons:**
- Less type safety
- Harder to enforce location-specific fields
- Mixed concerns in one table

---

### Option 3: Add Location Fields to Divisions
**Extend existing divisions table:**

```sql
ali_divisions:
  - id
  - company_id
  - name
  - parent_division_id
  - division_type: 'department' | 'location' | 'hybrid'
  - city
  - state_province
  - country
  - (other location fields)
```

**Pros:**
- Minimal schema changes
- Backward compatible

**Cons:**
- Still can't handle multi-dimensional (person in Engineering + Chicago)
- Mixes organizational and geographic concepts
- Confusing (is "Engineering" a department or location?)

---

## Recommended Solution: Option 1 (Separate Tables)

### Schema Design

```sql
-- ============================================
-- ORGANIZATIONAL SEGMENTS (Departments, Teams)
-- ============================================
CREATE TABLE IF NOT EXISTS ali_divisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES ali_companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  parent_division_id UUID REFERENCES ali_divisions(id),
  division_type TEXT DEFAULT 'department' CHECK (division_type IN ('department', 'team', 'division', 'unit')),
  description TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, name)
);

-- ============================================
-- GEOGRAPHIC SEGMENTS (Locations, Offices, Regions)
-- ============================================
CREATE TABLE IF NOT EXISTS ali_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES ali_companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- e.g., "Chicago Office", "Remote", "HQ"
  parent_location_id UUID REFERENCES ali_locations(id), -- For regions/countries
  location_type TEXT DEFAULT 'office' CHECK (location_type IN ('office', 'region', 'country', 'remote')),
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state_province TEXT,
  postal_code TEXT,
  country TEXT, -- ISO country code (e.g., "US", "CA")
  timezone TEXT, -- e.g., "America/Chicago"
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, name)
);

-- ============================================
-- RESPONSE SEGMENTATION (Many-to-Many)
-- ============================================
CREATE TABLE IF NOT EXISTS ali_response_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id UUID NOT NULL REFERENCES ali_survey_responses(id) ON DELETE CASCADE,
  segment_type TEXT NOT NULL CHECK (segment_type IN ('division', 'location')),
  segment_id UUID NOT NULL, -- References either ali_divisions or ali_locations
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- Ensure segment_id exists in appropriate table (enforced via application logic or triggers)
  UNIQUE(response_id, segment_type, segment_id)
);

-- ============================================
-- UPDATE EXISTING TABLES
-- ============================================

-- Remove division_id from responses (replaced by ali_response_segments)
ALTER TABLE ali_survey_responses DROP COLUMN IF EXISTS division_id;

-- Keep division_id in deployments for backward compatibility (optional)
-- Or migrate to segment-based approach:
-- ALTER TABLE ali_survey_deployments DROP COLUMN IF EXISTS division_id;
-- CREATE TABLE ali_deployment_segments (
--   deployment_id UUID REFERENCES ali_survey_deployments(id),
--   segment_type TEXT CHECK (segment_type IN ('division', 'location')),
--   segment_id UUID,
--   UNIQUE(deployment_id, segment_type, segment_id)
-- );
```

### Migration Strategy

**Phase 1: Add New Tables (Non-Breaking)**
- Create `ali_locations` table
- Create `ali_response_segments` table
- Keep existing `division_id` columns for backward compatibility

**Phase 2: Migrate Data**
- Migrate existing `division_id` references to `ali_response_segments`
- Create location records for companies that need them

**Phase 3: Update Application**
- Update APIs to support both division and location
- Update UI to allow selecting both dimensions
- Update reporting to filter by both

**Phase 4: Remove Old Columns (Breaking)**
- Remove `division_id` from `ali_survey_responses` (after migration complete)
- Update all queries to use new segmentation

---

## Usage Examples

### Creating Segments

```javascript
// Create organizational division
POST /api/ali/divisions
{
  "companyId": "uuid",
  "name": "Engineering",
  "divisionType": "department",
  "parentDivisionId": null
}

// Create geographic location
POST /api/ali/locations
{
  "companyId": "uuid",
  "name": "Chicago Office",
  "locationType": "office",
  "city": "Chicago",
  "stateProvince": "IL",
  "country": "US",
  "timezone": "America/Chicago"
}
```

### Deploying Survey with Segments

```javascript
POST /api/ali/deploy-survey
{
  "companyId": "uuid",
  "surveyIndex": "S1",
  "segments": [
    { "type": "division", "id": "engineering-division-uuid" },
    { "type": "location", "id": "chicago-office-uuid" }
  ],
  // OR company-wide (no segments)
  "segments": []
}
```

### Submitting Response with Segments

```javascript
POST /api/ali/submit-response
{
  "deploymentToken": "token",
  "segments": [
    { "type": "division", "id": "engineering-division-uuid" },
    { "type": "location", "id": "chicago-office-uuid" }
  ],
  "responses": { ... }
}
```

### Reporting with Filters

```javascript
GET /api/ali/dashboard/:companyId?division=engineering&location=chicago&state=IL&country=US
```

---

## Reporting Implications

### Multi-Dimensional Filtering

**Dashboard Filters:**
- Division (dropdown)
- Location (dropdown)
- City (dropdown, filtered by location)
- State/Province (dropdown)
- Country (dropdown)
- Multiple selections (AND/OR logic)

**Report Views:**
- By Division (all locations)
- By Location (all divisions)
- By Division + Location (intersection)
- By State/Country (geographic rollup)
- Company-wide (no filters)

**Visualizations:**
- Division comparison chart
- Location comparison chart
- Division × Location heatmap
- Geographic map (if locations have coordinates)

---

## UI/UX Considerations

### Segment Selection Interface

**Survey Deployment:**
- Two tabs or sections:
  1. **Organizational** (divisions)
  2. **Geographic** (locations)
- Multi-select checkboxes
- "Select All" options
- Visual hierarchy (parent/child relationships)

**Response Submission:**
- Auto-detect segments from deployment
- Allow override (if person is in different segment)
- Show selected segments before submission

**Dashboard Filters:**
- Sidebar with filter controls
- Clear active filters (chips/badges)
- "Clear All" button
- Save filter presets

---

## Data Integrity Considerations

### Validation Rules

1. **Response Segments:**
   - Must match deployment segments (or be subset)
   - At least one segment required
   - All segments must belong to same company

2. **Location Hierarchy:**
   - Office → Region → Country
   - Validate parent relationships
   - Prevent circular references

3. **Division Hierarchy:**
   - Team → Department → Division
   - Validate parent relationships
   - Prevent circular references

### Minimum Response Threshold

**Per Segment Combination:**
- If filtering by Division + Location, need ≥5 responses for that combination
- If filtering by Division only, aggregate across all locations
- If filtering by Location only, aggregate across all divisions

**Example:**
- Engineering + Chicago: 3 responses (below threshold)
- Engineering (all locations): 15 responses (above threshold)
- Show aggregate when combination is below threshold

---

## Migration Path

### Step 1: Add New Tables (No Breaking Changes)
```sql
-- Run migration script to add:
-- 1. ali_locations table
-- 2. ali_response_segments table
-- 3. Keep existing division_id columns
```

### Step 2: Update APIs (Backward Compatible)
- Add location management endpoints
- Update deploy-survey to accept segments array
- Update submit-response to accept segments array
- Keep division_id support for existing deployments

### Step 3: Migrate Existing Data
```sql
-- Migrate existing division_id references
INSERT INTO ali_response_segments (response_id, segment_type, segment_id)
SELECT id, 'division', division_id
FROM ali_survey_responses
WHERE division_id IS NOT NULL;
```

### Step 4: Update UI
- Add location management interface
- Update deployment form
- Update response form
- Update dashboard filters

### Step 5: Remove Old Columns (After Migration Complete)
```sql
-- Only after all data migrated and tested
ALTER TABLE ali_survey_responses DROP COLUMN division_id;
```

---

## Recommendations

### Immediate Actions:
1. ✅ **Adopt Option 1 (Separate Tables)** - Cleanest separation
2. ✅ **Create migration script** - Add new tables without breaking existing
3. ✅ **Update API endpoints** - Support both old and new format during transition
4. ✅ **Plan UI updates** - Design segment selection interface

### Future Considerations:
- **Custom Segments:** Allow companies to define custom segment types (e.g., "Project Teams", "Tenure Groups")
- **Segment Templates:** Pre-built segment structures for common org types
- **Auto-Detection:** Use IP address or other signals to auto-detect location segments
- **Segment Analytics:** Track segment health over time

---

## Questions to Answer

1. **Can a person belong to multiple divisions?** (e.g., Engineering + Product)
   - **Recommendation:** Yes, via multiple segment entries

2. **Can a person belong to multiple locations?** (e.g., Remote + Chicago)
   - **Recommendation:** Yes, for hybrid/remote workers

3. **Should location be required?** (for all responses)
   - **Recommendation:** No, optional. Some companies may not need location segmentation

4. **How to handle "Remote" as a location?**
   - **Recommendation:** Create a "Remote" location with no address, or use location_type='remote'

5. **Should we support custom segment types?**
   - **Recommendation:** Not in MVP, but design schema to allow future extension

---

## Summary

**Current Problem:** Mixing organizational and geographic segmentation in a single `division_id` field.

**Solution:** Separate tables for organizational (`ali_divisions`) and geographic (`ali_locations`) segments, with a many-to-many relationship table (`ali_response_segments`) linking responses to segments.

**Benefits:**
- Clear separation of concerns
- Multi-dimensional segmentation
- Flexible reporting
- Scalable (can add more segment types)

**Migration:** Phased approach to avoid breaking changes, with backward compatibility during transition.

