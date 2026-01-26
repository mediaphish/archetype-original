# Operators System - Comprehensive Testing Plan

## Overview
This plan provides step-by-step testing procedures for The Operators system, covering all major functionality including RSVP/waitlist management, voting, check-in, ROI calculation, and user management.

## Prerequisites

### 1. Seed Data Setup
Run the SQL seed script in Supabase:
- File: `database/operators_test_seed_data.sql`
- This creates 35 test Operators with realistic states (clean, yellow, orange, red cards)
- Ensures `bart@archetypeoriginal.com` has all roles (Super Admin, Chief Operator, Operator, Accountant)

### 2. Test Events Setup
Create 3 test events through the UI (as `bart@archetypeoriginal.com`):

**Event 1: LIVE Event (RSVP Testing)**
- Navigate to `/operators/events/new?email=bart@archetypeoriginal.com`
- Title: "March 2026 Operators Meeting"
- Date: 30 days from today
- Max Seats: 20
- Stake Amount: $120
- Add host and sponsor info (optional)
- Create event

**Event 2: OPEN Event (Voting/Check-in Testing)**
- Create: "February 2026 Operators Meeting"
- Date: Today or yesterday
- Max Seats: 20
- Stake Amount: $120
- After creating, click "Start Event" to change state to OPEN

**Event 3: CLOSED Event (ROI Testing)**
- Create: "January 2026 Operators Meeting"  
- Date: 30 days ago
- Max Seats: 20
- Stake Amount: $120
- Start Event, then Close Event (to see ROI results)

---

## Test Scenarios

### Test 1: Event Creation and Editing
**Goal:** Verify event creation and editing functionality

**Steps:**
1. Navigate to `/operators/events?email=bart@archetypeoriginal.com`
2. Click "Create Event"
3. Fill in all required fields:
   - Title: "Test Event"
   - Date: Future date
   - Max Seats: 20
   - Stake Amount: $120
4. Add host information (name, location, description)
5. Add sponsor information (name, website, phone, pot value, description)
6. Upload host and sponsor logos
7. Save event
8. Verify event appears in events list
9. Click on event to view details
10. Click "Edit Event" button
11. Modify some fields (e.g., change max seats to 25)
12. Save changes
13. Verify changes are reflected

**Expected Results:**
- Event created successfully
- All fields saved correctly
- Edit functionality works
- Changes persist after save

---

### Test 2: RSVP and Waitlist Management
**Goal:** Test RSVP system and waitlist functionality

**Setup:**
- Use Event 1 (LIVE event, 20 max seats)

**Steps:**
1. As `bart@archetypeoriginal.com`, navigate to Event 1 detail page
2. Verify you can see RSVP button (you're an Operator)
3. Click "RSVP" - you should be confirmed (seat 1/20)
4. Open 19 more browser windows/tabs (or use different test accounts)
5. For each window, navigate to Event 1 and RSVP as different operators:
   - Use emails: `operator01@test.com` through `operator19@test.com`
   - Note: These users need to exist in the system (from seed data)
6. After 20 RSVPs, the next RSVP should go to waitlist
7. As `operator20@test.com`, RSVP - should be waitlisted
8. As `operator21@test.com`, RSVP - should be waitlisted
9. As `bart@archetypeoriginal.com`, view Event 1 detail page
10. Check RSVP sidebar - should show "Confirmed: 20/20" and "Waitlisted: 2"
11. As Chief Operator, promote one waitlisted user:
    - This requires a promote-waitlist API call or UI button (if implemented)
    - Or manually update in database for testing

**Expected Results:**
- First 20 RSVPs are confirmed
- 21st+ RSVP goes to waitlist
- RSVP counts display correctly
- Waitlist promotion works (if UI exists)

---

### Test 3: Candidate Submission and Approval
**Goal:** Test candidate invitation and approval workflow

**Steps:**
1. As `bart@archetypeoriginal.com` (Operator), navigate to Event 1 detail page
2. Scroll to "Invite Candidate" section
3. Fill in candidate form:
   - Candidate Email: `candidate01@test.com`
   - Essay: Write 200+ words (minimum requirement)
   - Contact Info: "Phone: 555-0101, LinkedIn: linkedin.com/in/candidate01"
4. Submit candidate
5. Verify candidate appears in "Pending Candidates" section (as Chief Operator)
6. Click "Approve" on the candidate
7. Verify candidate status changes to "approved"
8. Navigate to `/operators/candidates?email=bart@archetypeoriginal.com`
9. Verify candidate appears in candidates list with "approved" status
10. Filter by "Pending" - candidate should not appear
11. Filter by "Approved" - candidate should appear

**Expected Results:**
- Candidate submission works
- Essay validation (200+ words) enforced
- Chief Operator can approve candidates
- Candidates page shows all candidates with filtering

---

### Test 4: Voting Interface (OPEN Event)
**Goal:** Test voting functionality during OPEN events

**Setup:**
- Use Event 2 (OPEN event)
- Ensure at least 5-10 users have RSVP'd and been checked in

**Steps:**
1. As `bart@archetypeoriginal.com`, navigate to Event 2 detail page
2. Verify "Voting" section is visible (event is OPEN, you're an Operator)
3. Check "Remaining Votes: X / 10" display
4. See list of checked-in attendees (excluding yourself)
5. For each attendee:
   - Click upvote (thumbs up) button
   - Verify button highlights (green background)
   - Verify vote counts update (upvotes increase)
6. Click downvote on same person - should change from upvote to downvote
7. Continue voting on different attendees
8. After 10 votes, verify you cannot vote anymore (buttons disabled or error message)
9. Check vote summary shows correct upvote/downvote counts per person

**Expected Results:**
- Voting interface displays correctly
- Up/down votes work
- Vote counts update in real-time
- 10 vote limit enforced
- Cannot vote for yourself
- Remaining votes counter decreases

---

### Test 5: Check-in Management (Accountant)
**Goal:** Test check-in functionality for Accountants

**Setup:**
- Use Event 2 (OPEN event)
- Ensure multiple users have RSVP'd

**Steps:**
1. As `bart@archetypeoriginal.com` (Accountant), navigate to Event 2 detail page
2. Verify "Check-In Management" section is visible
3. See list of all RSVP'd users with their status
4. For first user:
   - Click "Check In" button
   - Confirm cash payment dialog
   - Verify user status changes to "Checked In"
5. For second user:
   - Click "Mark No-Show"
   - Verify user status changes to "No Show"
   - Verify user gets card status (yellow) and owed balance
6. For third user (already checked in):
   - Click "Check Out" (early departure)
   - Confirm the action
   - Verify user status shows "Checked Out"
   - Verify offense is recorded
7. Check attendance records update correctly

**Expected Results:**
- Check-in interface visible to Accountants
- Check In works with cash confirmation
- No-Show marking works and triggers offenses
- Check Out works and records early departure offense
- Status badges update correctly

---

### Test 6: Event State Transitions
**Goal:** Test event state machine (LIVE → OPEN → CLOSED)

**Steps:**
1. Create a new event (LIVE state)
2. Verify "Start Event" button is visible (Chief Operator/Accountant)
3. Click "Start Event"
4. Confirm dialog
5. Verify event state changes to OPEN
6. Verify "Start Event" button is replaced with "Close Event" button
7. Verify voting and check-in interfaces appear
8. Click "Close Event"
9. Confirm dialog
10. Verify event state changes to CLOSED
11. Verify ROI winner and promotions are calculated and displayed
12. Verify event cannot be edited (CLOSED events are locked)

**Expected Results:**
- State transitions work correctly
- Appropriate UI elements appear/disappear based on state
- CLOSED events show outcomes
- CLOSED events cannot be edited

---

### Test 7: ROI Calculation and Outcomes
**Goal:** Verify ROI winner calculation and promotion logic

**Setup:**
- Use Event 3 (CLOSED event)
- Ensure event has:
  - Multiple checked-in attendees
  - Votes cast during OPEN state
  - At least one approved candidate who attended

**Steps:**
1. Navigate to Event 3 detail page (CLOSED event)
2. Verify "Event Outcomes" section is visible
3. Check ROI winner is displayed
4. Verify ROI calculation is deterministic (same inputs = same result)
5. Check promotions list shows which candidates were promoted
6. Verify promoted candidates now have "operator" role

**Expected Results:**
- ROI winner calculated correctly
- Promotions displayed
- Candidate-to-Operator promotion works

---

### Test 8: Dashboard View
**Goal:** Test dashboard functionality

**Steps:**
1. Navigate to `/operators/dashboard?email=bart@archetypeoriginal.com`
2. Verify metrics cards display:
   - Total Events
   - Seats Filled Rate
   - Voting Completion
   - Active Operators
3. Scroll down to "Upcoming Events" section
4. Verify events are listed
5. For each event, verify:
   - Event details display
   - RSVP button (if eligible and not already RSVP'd)
   - Invite Candidate form (if Operator)
   - Rules section
   - "View Details" button works
6. Click "View Details" on an event
7. Verify navigation to event detail page works

**Expected Results:**
- Dashboard metrics display correctly
- Upcoming events show with read-only view
- Navigation works
- RSVP and Invite Candidate work from dashboard

---

### Test 9: Candidates Page
**Goal:** Test candidate management page

**Steps:**
1. Navigate to `/operators/candidates?email=bart@archetypeoriginal.com`
2. Verify all candidates are listed
3. Test filters:
   - Click "All" - shows all candidates
   - Click "Pending" - shows only pending
   - Click "Approved" - shows only approved
   - Click "Denied" - shows only denied
   - Click "Promoted" - shows only promoted
4. For a pending candidate:
   - Click "Approve" button
   - Verify status changes to approved
5. For another pending candidate:
   - Click "Deny" button
   - Confirm action
   - Verify status changes to denied
6. Verify candidate details display:
   - Email
   - Essay
   - Contact info
   - Event information
   - Status badge

**Expected Results:**
- All candidates listed
- Filters work correctly
- Approve/Deny actions work
- Candidate details display correctly

---

### Test 10: Admin Page (Super Admin)
**Goal:** Test Super Admin controls

**Steps:**
1. Navigate to `/operators/admin?email=bart@archetypeoriginal.com`
2. Verify page loads (you're Super Admin)
3. Test "Promote to Chief Operator":
   - Enter email: `operator01@test.com`
   - Click "Promote"
   - Confirm action
   - Verify user now has "chief_operator" role
4. Test "Reverse Offense":
   - Enter email: `operator34@test.com` (has red card, benched)
   - Click "Reverse"
   - Confirm action
   - Verify user's card status resets, bench removed, owed balance cleared
5. Scroll to "All Users" section
6. Verify all users are listed with:
   - Email
   - Roles (badges)
   - Card status
   - Benched status
   - Owed balance
7. Verify non-Super-Admin users cannot access this page

**Expected Results:**
- Promote functionality works
- Reverse offense works correctly
- All users listed with correct information
- Access control enforced

---

### Test 11: Card Status Progression
**Goal:** Test offense recording and card progression

**Steps:**
1. As Accountant, check in users to an OPEN event
2. Mark one user as "No-Show"
3. Verify user gets:
   - Yellow card (first offense)
   - Owed balance = stake amount
4. Mark same user as "No-Show" in another event (or manually record offense)
5. Verify user gets:
   - Orange card (second offense)
   - Owed balance increases
6. Record third offense
7. Verify user gets:
   - Red card (third offense)
   - Benched until date set
   - Owed balance continues to increase
8. As Super Admin, reverse one offense
9. Verify card status decreases appropriately

**Expected Results:**
- Card progression: none → yellow → orange → red
- Owed balance accumulates
- Red card triggers bench
- Reverse offense works correctly

---

### Test 12: Waitlist Promotion
**Goal:** Test waitlist to confirmed promotion

**Steps:**
1. Create event with max_seats = 5
2. Have 7 users RSVP (5 confirmed, 2 waitlisted)
3. As Chief Operator or Accountant, promote one waitlisted user
4. Verify:
   - Waitlisted user becomes confirmed
   - Waitlist count decreases
   - Confirmed count increases
5. Verify only Operators can be promoted (not Candidates)

**Expected Results:**
- Waitlist promotion works
- Counts update correctly
- Only Operators eligible for promotion

---

## Browser Automation Tests (For AI Execution)

These tests can be automated using browser tools:

### Automated Test 1: Event Creation Flow
1. Navigate to events page
2. Click "Create Event"
3. Fill form fields
4. Submit
5. Verify success

### Automated Test 2: RSVP Flow
1. Navigate to event detail
2. Click RSVP button
3. Verify confirmation

### Automated Test 3: Voting Flow
1. Navigate to OPEN event
2. Click upvote on first attendee
3. Verify vote count updates
4. Click downvote on same attendee
5. Verify vote changes

### Automated Test 4: Check-in Flow
1. Navigate to OPEN event as Accountant
2. Click "Check In" on first RSVP
3. Confirm cash payment
4. Verify status update

---

## Manual Test Checklist

For manual execution, use this checklist:

- [ ] Event creation works
- [ ] Event editing works
- [ ] RSVP system works (confirmed/waitlisted)
- [ ] Waitlist promotion works
- [ ] Candidate submission works
- [ ] Candidate approval works
- [ ] Voting interface works (OPEN events)
- [ ] Vote limits enforced (10 votes)
- [ ] Check-in works (Accountant)
- [ ] No-show marking works
- [ ] Check-out works
- [ ] Event state transitions work (LIVE → OPEN → CLOSED)
- [ ] ROI calculation works
- [ ] Promotions work
- [ ] Dashboard displays correctly
- [ ] Candidates page works
- [ ] Admin page works (Super Admin)
- [ ] Card status progression works
- [ ] Reverse offense works

---

## Cleanup: Removing Test Data Before Launch

**IMPORTANT:** Run this cleanup process before launching The Operators system to production. This removes all test data while preserving real user accounts and production data.

### Identifying Test Data

Test data is identified by:
- **Test Users:** Email pattern `operator##@test.com` (where ## is 01-35) and `candidate##@test.com`
- **Test Events:** Events with titles containing "Test" or specific test event names (e.g., "January 2026 Operators Meeting", "February 2026 Operators Meeting", "March 2026 Operators Meeting")
- **Test Candidates:** Candidates with email pattern `candidate##@test.com` or invited by test users

### Cleanup SQL Script

**File:** `database/operators_cleanup_test_data.sql`

Run this script in Supabase SQL Editor. It deletes data in the correct order to respect foreign key constraints:

```sql
-- Operators System - Cleanup Test Data
-- Run this in Supabase SQL Editor to remove all test data before launch
-- WARNING: This will permanently delete test data. Review carefully before executing.

-- ============================================================================
-- STEP 1: Delete test data from child tables (respecting foreign keys)
-- ============================================================================

-- Delete test votes (votes by or for test users)
DELETE FROM operators_votes
WHERE voter_email LIKE '%@test.com'
   OR target_email LIKE '%@test.com';

-- Delete test attendance records
DELETE FROM operators_attendance
WHERE user_email LIKE '%@test.com';

-- Delete test offenses (offenses by or for test users)
DELETE FROM operators_offenses
WHERE user_email LIKE '%@test.com'
   OR recorded_by_email LIKE '%@test.com';

-- Delete test promotions
DELETE FROM operators_promotions
WHERE candidate_email LIKE '%@test.com';

-- Delete test ROI winners (if any test users won)
DELETE FROM operators_roi_winners
WHERE winner_email LIKE '%@test.com';

-- Delete test candidates
DELETE FROM operators_candidates
WHERE candidate_email LIKE '%@test.com'
   OR invited_by_email LIKE '%@test.com';

-- Delete test RSVPs
DELETE FROM operators_rsvps
WHERE user_email LIKE '%@test.com';

-- ============================================================================
-- STEP 2: Delete test events (this will cascade delete related data)
-- ============================================================================

-- Delete test events (identified by title patterns)
-- Adjust these patterns based on your actual test event names
DELETE FROM operators_events
WHERE title LIKE '%Test%'
   OR title LIKE '%January 2026 Operators Meeting%'
   OR title LIKE '%February 2026 Operators Meeting%'
   OR title LIKE '%March 2026 Operators Meeting%'
   OR created_by LIKE '%@test.com';

-- ============================================================================
-- STEP 3: Delete test users
-- ============================================================================

-- Delete test Operators (operator##@test.com)
DELETE FROM operators_users
WHERE email LIKE 'operator%@test.com';

-- Delete test Candidates (candidate##@test.com)
DELETE FROM operators_users
WHERE email LIKE 'candidate%@test.com';

-- ============================================================================
-- STEP 4: Verify cleanup
-- ============================================================================

-- Check remaining test users (should return 0 rows)
SELECT COUNT(*) as remaining_test_users
FROM operators_users
WHERE email LIKE '%@test.com';

-- Check remaining test events (should return 0 rows)
SELECT COUNT(*) as remaining_test_events
FROM operators_events
WHERE title LIKE '%Test%'
   OR title LIKE '%January 2026 Operators Meeting%'
   OR title LIKE '%February 2026 Operators Meeting%'
   OR title LIKE '%March 2026 Operators Meeting%';

-- Check remaining test RSVPs (should return 0 rows)
SELECT COUNT(*) as remaining_test_rsvps
FROM operators_rsvps
WHERE user_email LIKE '%@test.com';

-- Check remaining test candidates (should return 0 rows)
SELECT COUNT(*) as remaining_test_candidates
FROM operators_candidates
WHERE candidate_email LIKE '%@test.com'
   OR invited_by_email LIKE '%@test.com';

-- Verify bart@archetypeoriginal.com is preserved
SELECT email, roles, card_status
FROM operators_users
WHERE email = 'bart@archetypeoriginal.com';
```

### Cleanup Process Steps

1. **Backup First (Recommended)**
   - Export current database state if you want to keep a backup
   - Or ensure you have the seed script to recreate test data if needed

2. **Review Test Data**
   - Run verification queries to see what test data exists
   - Confirm you're comfortable deleting it

3. **Execute Cleanup Script**
   - Copy the cleanup SQL script above
   - Run it in Supabase SQL Editor
   - Execute section by section if you want to be cautious

4. **Verify Cleanup**
   - Run the verification queries at the end of the script
   - All counts should be 0 (except bart@archetypeoriginal.com verification)
   - Confirm no test data remains

5. **Check Production Data**
   - Verify real user accounts are preserved
   - Verify any real events are preserved
   - Verify bart@archetypeoriginal.com still has all roles

### What Gets Preserved

The cleanup script **preserves**:
- `bart@archetypeoriginal.com` and all other real user accounts
- Any events not matching test event title patterns
- Any real RSVPs, candidates, votes, etc. from real users
- All system configuration and schema

### What Gets Deleted

The cleanup script **deletes**:
- All users with email pattern `operator##@test.com` (01-35)
- All users with email pattern `candidate##@test.com`
- All events with titles containing "Test" or specific test event names
- All RSVPs, votes, attendance, offenses, candidates, promotions, ROI winners associated with test users or test events

### Alternative: Selective Cleanup

If you want to be more selective, you can modify the cleanup script to:
- Only delete specific test users by listing their emails
- Only delete specific test events by ID
- Keep some test data for reference

Example selective cleanup:
```sql
-- Delete only specific test users
DELETE FROM operators_users
WHERE email IN (
  'operator01@test.com',
  'operator02@test.com',
  -- ... list specific emails
);

-- Delete only specific test events by ID
DELETE FROM operators_events
WHERE id IN (
  'event-uuid-1',
  'event-uuid-2',
  -- ... list specific event IDs
);
```

### Post-Cleanup Checklist

After running cleanup, verify:
- [ ] No test users remain in `operators_users` table
- [ ] No test events remain in `operators_events` table
- [ ] No test RSVPs remain
- [ ] No test candidates remain
- [ ] No test votes remain
- [ ] No test offenses remain
- [ ] `bart@archetypeoriginal.com` still exists with correct roles
- [ ] Any real production data is intact
- [ ] System is ready for launch

---

## Notes

- All test users use the pattern `operator##@test.com` where ## is 01-35
- Seed data creates users with realistic states for comprehensive testing
- Events should be created through UI to ensure proper data structure
- Some tests require multiple browser sessions or test accounts
- ROI calculation is deterministic - same inputs always produce same results
- **Always backup before cleanup** - test data deletion is permanent
