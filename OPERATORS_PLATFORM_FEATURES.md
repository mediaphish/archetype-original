# Operators Platform - Complete Feature Summary

## Overview
The Operators Platform is a comprehensive event management and networking system for business operators. It manages events, RSVPs, voting, check-ins, candidate applications, ROI calculations, and user role management.

---

## User Roles & Permissions

### 1. **Super Admin** (`super_admin`)
- **Full system access**
- Can promote users to Chief Operator
- Can reverse offenses for any user
- Can view all events, RSVPs, votes, and attendance
- Can manage all events (create, edit, start, close, reopen)
- Can approve/deny candidates
- Can access Admin page

### 2. **Chief Operator** (`chief_operator`)
- **Event management authority**
- Can create and edit events
- Can start events (LIVE → OPEN)
- Can close events (OPEN → CLOSED)
- Can reopen events (CLOSED → OPEN)
- Can revert events (OPEN → LIVE)
- Can promote waitlist users to confirmed
- Can remove RSVPs
- Can approve/deny candidates
- Can view all RSVPs, votes, and attendance
- Can manage scenarios/topics for events
- Can announce events

### 3. **Operator** (`operator`)
- **Standard member access**
- Can RSVP to LIVE events
- Can cancel RSVP (if >24 hours before event)
- Can vote during OPEN events (10 votes max)
- Can invite candidates to events
- Can view event details
- Can view own RSVP status
- Can view own votes
- Cannot view other users' votes (aggregate only)
- Cannot check in users

### 4. **Accountant** (`accountant`)
- **Check-in management**
- All Operator permissions PLUS:
- Can check in attendees (with cash payment confirmation)
- Can mark no-shows
- Can check out attendees (early departure)
- Can view all attendance records
- Can view all RSVPs
- Cannot vote or RSVP

### 5. **Candidate** (`candidate`)
- **Limited access**
- Can RSVP to events (if invited)
- Can view event details
- Cannot vote
- Cannot invite other candidates
- Cannot check in users

---

## Pages & Navigation

### 1. **Dashboard** (`/operators/dashboard`)
**Purpose:** Overview of platform metrics and upcoming events

**Features:**
- **Event Metrics:**
  - Total events count
  - Live events count
  - Open events count
  - Closed events count
  - Seats filled rate (%)
  - Voting completion rate (%)
  - Total pot value

- **Longitudinal Metrics:**
  - Active operators count
  - Repeat attendance count
  - Promotion rate (%)
  - Positivity index
  - Signal clarity
  - Average upvote ratio

- **Upcoming Events Section:**
  - List of LIVE events (future dates only)
  - Quick RSVP button (if eligible)
  - Quick "Invite Candidate" form (if Operator)
  - "View Details" button
  - Event information (date, time, location, seats)

- **Empty State:** Shows retry button if data fails to load

**Access:** All authenticated users

---

### 2. **Events** (`/operators/events`)
**Purpose:** Browse and filter all events

**Features:**
- **Event List:**
  - All events or filtered by state (LIVE, OPEN, CLOSED)
  - Event cards showing:
    - Title
    - Date and time
    - Location
    - State badge (color-coded)
    - Seats filled (X/Y)
    - RSVP status (if user has RSVP'd)
    - Stake amount

- **Filtering:**
  - All Events
  - LIVE only
  - OPEN only
  - CLOSED only

- **Actions:**
  - "Create Event" button (Chief Operator/Super Admin only)
  - Click event card to view details

**Access:** All authenticated users

---

### 3. **Event Detail** (`/operators/events/[id]`)
**Purpose:** View and manage individual event details

**Features:**

#### **Event Information:**
- Title, date, time, location
- Host information (name, location, description, logo)
- Sponsor information (name, website, phone, pot value, description, logo)
- State badge (LIVE/OPEN/CLOSED)
- Max seats and current counts
- Stake amount
- RSVP closed status

#### **RSVP Management:**
- **RSVP Button** (Operators/Candidates, LIVE events only)
- **Cancel RSVP** (if >24 hours before event)
- **RSVP List** (visible to Chief Operators/Accountants/Super Admins):
  - Confirmed attendees
  - Waitlisted attendees
  - Promote waitlist button
  - Remove RSVP button

#### **Voting Interface** (OPEN events only):
- **Vote Summary:**
  - Remaining votes counter (10 max)
  - List of checked-in attendees (excluding self)
  - Upvote/Downvote buttons per attendee
  - Vote counts display (upvotes/downvotes)
  - Vote limit enforcement (disabled when 10 votes used)

#### **Check-In Management** (Accountants/Super Admins only):
- **Check-In Interface:**
  - List of all RSVP'd users
  - "Check In" button (with cash payment confirmation)
  - "Mark No-Show" button
  - "Check Out" button (for checked-in users)
  - Status badges (Checked In, No Show, Checked Out)

#### **Candidate Management:**
- **Invite Candidate Form** (Operators only, LIVE events):
  - Candidate email
  - Essay (200+ words required)
  - Contact info
  - Submit button

- **Candidate List:**
  - Pending candidates
  - Approved candidates
  - Denied candidates
  - Approve/Deny buttons (Chief Operators/Super Admins)

#### **Scenarios/Topics** (LIVE/OPEN events):
- **AI-Generated Scenarios:**
  - Based on attendee bios and current challenges
  - Brief problem statements (1 paragraph stories)
  - Collapsible prompts section
  - Generate scenarios button
  - Edit scenarios (Chief Operators/Super Admins)
  - Scenarios hidden when event is OPEN

#### **Event State Management** (Chief Operators/Super Admins):
- **Start Event** (LIVE → OPEN):
  - Enables voting and check-ins
  - Locks scenarios
  - Confirmation modal

- **Close Event** (OPEN → CLOSED):
  - Finalizes outcomes
  - Calculates ROI winner
  - Processes promotions
  - Cannot be undone
  - Confirmation modal

- **Reopen Event** (CLOSED → OPEN):
  - Unlocks scenarios
  - Re-enables voting/attendance
  - Confirmation modal

- **Revert to LIVE** (OPEN → LIVE):
  - Unlocks scenarios
  - Allows editing
  - Disables voting/check-ins
  - Confirmation modal

#### **ROI Winner Display** (CLOSED events):
- Winner email and business name
- Pot amount won
- Upvote ratio
- Calculation details

**Access:** All authenticated users (with role-based feature visibility)

---

### 4. **Create Event** (`/operators/events/new`)
**Purpose:** Create a new event

**Features:**
- **Event Details:**
  - Title (required)
  - Event date (required)
  - Start time (required)
  - Finish time (required)
  - Max seats (required)
  - Stake amount (required)
  - Location (optional)

- **Host Information:**
  - Host name
  - Host location
  - Host description
  - Host logo upload

- **Sponsor Information:**
  - Sponsor name
  - Sponsor website
  - Sponsor phone
  - Pot value
  - Sponsor description
  - Sponsor logo upload

- **Form Validation:**
  - Required field validation
  - Date/time validation
  - File upload validation (image types, size limits)
  - URL validation

**Access:** Chief Operators, Super Admins

---

### 5. **Edit Event** (`/operators/events/[id]/edit`)
**Purpose:** Edit existing event details

**Features:**
- Same form as Create Event
- Pre-populated with existing data
- Cannot edit CLOSED events
- Cannot edit when event is OPEN (must revert to LIVE first)

**Access:** Chief Operators, Super Admins

---

### 6. **Candidates** (`/operators/candidates`)
**Purpose:** Manage all candidate applications

**Features:**
- **Candidate List:**
  - All candidates across all events
  - Candidate details:
    - Email
    - Essay
    - Contact info
    - Event information
    - Status badge (Pending/Approved/Denied/Promoted)
    - Invited by (Operator email)
    - Created date

- **Filtering:**
  - All candidates
  - Pending only
  - Approved only
  - Denied only
  - Promoted only

- **Actions:**
  - Approve button (Chief Operators/Super Admins)
  - Deny button (Chief Operators/Super Admins)
  - Confirmation modal for deny action

**Access:** All authenticated users (approve/deny: Chief Operators/Super Admins)

---

### 7. **Admin** (`/operators/admin`)
**Purpose:** Super Admin controls for user management

**Features:**
- **Promote to Chief Operator:**
  - Email input
  - Promote button
  - Confirmation modal

- **Reverse Offense:**
  - Email input
  - Reverse button
  - Confirmation modal
  - Removes most recent offense
  - Updates card status
  - Clears bench status
  - Clears owed balance

- **All Users List:**
  - Email
  - Roles (badges)
  - Card status (none/yellow/orange/red)
  - Benched status
  - Owed balance
  - Last offense date

**Access:** Super Admins only

---

### 8. **Profile** (`/operators/profile`)
**Purpose:** User profile management

**Features:**
- **Profile Fields:**
  - Role title
  - Industry
  - Bio (character count, recommended length)
  - Headshot upload (low resolution, crop/scale)
  - Business name (Operators only, not Candidates)
  - Website URL (Operators only, not Candidates)

- **File Upload:**
  - Headshot image upload
  - Validation (file type, size)
  - Preview after upload

- **Form Validation:**
  - Character limits
  - URL validation
  - Required field validation

**Access:** All authenticated users

---

## Core Features & Workflows

### 1. **RSVP System**

**Workflow:**
1. Operator/Candidate views LIVE event
2. Clicks "RSVP" button
3. System checks seat availability
4. If seats available → Confirmed RSVP
5. If seats full → Waitlisted RSVP
6. User can cancel RSVP if >24 hours before event

**Features:**
- Automatic waitlist when seats full
- RSVP counts displayed (confirmed/waitlisted)
- Chief Operators can promote waitlist to confirmed
- Chief Operators can remove RSVPs
- RSVP closed flag (prevents new RSVPs)

---

### 2. **Voting System**

**Workflow:**
1. Event transitions to OPEN state
2. Accountant checks in attendees
3. Operators see list of checked-in attendees (excluding self)
4. Operators cast upvotes/downvotes (10 votes max)
5. Vote counts displayed in real-time
6. Remaining votes counter decreases

**Features:**
- 10 votes per Operator per event
- Cannot vote for yourself
- Can change vote (upvote → downvote or vice versa)
- Vote summary shows aggregate counts
- Vote limit enforcement (buttons disabled at limit)
- Only visible during OPEN events

---

### 3. **Check-In System**

**Workflow:**
1. Event is OPEN
2. Accountant views event detail page
3. Sees list of RSVP'd users
4. Clicks "Check In" → Confirms cash payment → User marked checked in
5. Or clicks "Mark No-Show" → User marked no-show, offense recorded
6. Or clicks "Check Out" → User marked checked out, offense recorded

**Features:**
- One-click check-in (cash payment assumed)
- No-show marking triggers offense
- Check-out (early departure) triggers offense
- Status badges for visual clarity
- Only Accountants/Super Admins can check in

---

### 4. **Card Status System**

**Card Progression:**
- **None** → Clean slate
- **Yellow** → First offense (no-show or check-out)
- **Orange** → Second offense
- **Red** → Third offense (benched until date)

**Features:**
- Automatic progression on offense
- Owed balance accumulates with each offense
- Red card triggers bench (cannot RSVP until bench date passes)
- Super Admin can reverse offenses
- Card status displayed on user profile and admin page

---

### 5. **ROI Calculation**

**Workflow:**
1. Event closes (OPEN → CLOSED)
2. System calculates ROI winner using deterministic algorithm
3. Factors:
   - Upvote ratio (upvotes / total votes received)
   - Minimum votes threshold
   - Excludes self-votes
   - Excludes no-shows
4. Winner receives pot amount
5. Pot breakdown:
   - 25% to Host
   - 25% to Area Operator (AO)
   - 50% + Sponsor pot to ROI winner

**Features:**
- Deterministic calculation (same inputs = same result)
- Displays winner email and business name
- Shows pot amount won
- Shows upvote ratio
- Only calculated for CLOSED events

---

### 6. **Candidate System**

**Workflow:**
1. Operator invites candidate to LIVE event
2. Candidate submits application:
   - Email
   - Essay (200+ words minimum)
   - Contact info
3. Chief Operator/Super Admin reviews
4. Approve → Candidate can RSVP to event
5. Deny → Candidate cannot RSVP
6. After event closes, approved candidates may be promoted to Operator

**Features:**
- Essay validation (200+ words)
- Contact info collection
- Status tracking (Pending/Approved/Denied/Promoted)
- Filter by status
- Approve/Deny actions

---

### 7. **Event State Machine**

**States:**
- **LIVE:** Event is open for RSVPs, can be edited
- **OPEN:** Event is active, voting enabled, check-ins enabled, scenarios locked
- **CLOSED:** Event is finalized, ROI calculated, outcomes displayed, cannot be edited

**Transitions:**
- LIVE → OPEN: "Start Event" (Chief Operator/Super Admin)
- OPEN → CLOSED: "Close Event" (Chief Operator/Super Admin)
- CLOSED → OPEN: "Reopen Event" (Chief Operator/Super Admin)
- OPEN → LIVE: "Revert to LIVE" (Chief Operator/Super Admin)

**Features:**
- State-based feature visibility
- Cannot edit CLOSED events
- Cannot edit OPEN events (must revert to LIVE)
- Confirmation modals for state changes

---

### 8. **Scenario Generation**

**Workflow:**
1. Event is LIVE or OPEN
2. Chief Operator clicks "Generate Scenarios"
3. AI analyzes:
   - Attendee bios
   - Current challenge fields
4. Generates scenarios:
   - Brief problem statements (1 paragraph stories)
   - Realistic but neutralized (no real company names)
   - Based on insights from attendee data
5. Scenarios displayed with collapsible prompts
6. Can be edited (Chief Operators/Super Admins)
7. Hidden when event is OPEN (visible in LIVE only)

**Features:**
- AI-powered generation
- Based on attendee insights
- Neutralized content (no real companies)
- Collapsible prompts section
- Edit capability
- Duplicate reduction across meetings

---

## Technical Features

### 1. **Accessibility (A11y)**
- ARIA labels on all interactive elements
- Keyboard navigation support
- Screen reader compatibility
- Focus management
- WCAG compliance

### 2. **Performance**
- Code splitting (lazy loading for all Operators pages)
- Component memoization (React.memo)
- Hook optimization (useMemo, useCallback)
- API request deduplication
- Response caching (tiered TTLs)

### 3. **Error Handling**
- Error boundary component
- Toast notifications for user feedback
- API error tracking
- Graceful degradation

### 4. **User Experience**
- Toast notifications (success, error, warning, info)
- Confirmation modals (replaces native confirm dialogs)
- Empty states for all pages
- Loading states
- Form validation with helpful error messages

### 5. **Testing**
- Unit tests (Jest)
- Integration tests (API endpoints)
- E2E tests (Cypress) - test files created
- Component tests

### 6. **Monitoring**
- Error tracking to `/api/monitoring/errors`
- Performance tracking (page load, API response times)
- User interaction tracking

---

## API Endpoints Summary

### Events (20+ endpoints)
- List, create, update, get detail
- RSVP management (RSVP, cancel, remove, promote waitlist)
- State management (open, close, reopen, revert)
- Voting (cast vote, get remaining votes)
- Check-in (check in, no-show, check out)
- ROI (get winner, recalculate)
- Scenarios (generate, update)
- Announcements

### Candidates (4 endpoints)
- List, submit, approve, deny

### Users (4 endpoints)
- Get current user, list all users, promote, reverse offense

### Dashboard (1 endpoint)
- Get aggregate metrics

### Offenses (1 endpoint)
- Record offense

### Uploads (2 endpoints)
- Upload headshot, upload logo

**Total: 30+ API endpoints**

---

## Summary

The Operators Platform is a **complete, production-ready event management system** with:

✅ **5 user roles** with granular permissions  
✅ **8 main pages** covering all functionality  
✅ **8 core workflows** (RSVP, Voting, Check-in, Cards, ROI, Candidates, States, Scenarios)  
✅ **30+ API endpoints** for all operations  
✅ **Full accessibility** support  
✅ **Performance optimizations** throughout  
✅ **Comprehensive testing** infrastructure  
✅ **Error tracking and monitoring**  
✅ **Modern UX** with toasts, modals, empty states  

The platform is **feature-complete** and ready for production use.
