# Testing Guide: ROI Winners & Event Announcements

## Prerequisites

1. **Database Migration**: The `operators_roi_pot_amount.sql` migration has been run (you confirmed this)
2. **Test User**: You should be logged in as `bart@archetypeoriginal.com` with CO/Accountant roles
3. **Test Operators**: Have at least 2-3 test Operators in the system (can use existing ones or create new ones)

---

## Part 1: Testing ROI Winner Calculation & Display

### Test 1.1: Create and Close an Event with ROI Winner

**Goal**: Verify pot calculation works correctly when closing an event.

**Steps**:
1. Navigate to `/operators/events?email=bart@archetypeoriginal.com`
2. Click "Create Event"
3. Fill in event details:
   - Title: "Test ROI Event - [Today's Date]"
   - Date: Today or tomorrow
   - Start Time: 6:00 PM (18:00)
   - Finish Time: 9:00 PM (21:00)
   - Max Seats: 10
   - Stake Amount: $120
   - Sponsor Pot Value: $500
   - Add host and sponsor info (optional)
4. Save the event
5. **Start the Event** (click "Start Event" button) - this changes state to OPEN
6. **Check in attendees** (as Accountant):
   - Navigate to the event detail page
   - In "Check-In Management", check in at least 5-10 users
   - Make sure each checked-in user has used all 10 votes (you can verify in Voting section)
7. **Close the Event** (click "Close Event" button)
8. **Verify pot calculation**:
   - Expected total pot = (stake_amount × confirmed_attendees) / 2 + sponsor_pot_value
   - Example: If 10 confirmed RSVPs, stake $120, sponsor $500:
     - Total pot = (120 × 10) / 2 + 500 = 600 + 500 = $1,100
     - Winner's pot = $1,100 × 0.5 = **$550** (50% after 25% host and 25% AO)

**Expected Results**:
- Event closes successfully
- ROI winner is calculated and stored
- Pot amount is calculated correctly (50% of total pot)

---

### Test 1.2: Verify ROI Winner Display on Event Detail Page

**Goal**: Verify the event detail page shows winner name and pot amount correctly.

**Steps**:
1. Navigate to the closed event from Test 1.1
2. Scroll to "Event Outcomes" section
3. Check the ROI Winner display

**Expected Results**:
- Shows winner's name (business_name if available, otherwise formatted email)
- Shows pot amount won (e.g., "$550.00")
- Shows winner stats:
  - Net Score
  - Upvote Ratio (as percentage)
  - Total Votes
- All displayed in a green card/section

**If winner has business_name**:
- Should display the business name instead of email

**If winner doesn't have business_name**:
- Should display formatted email (e.g., "john.doe@example.com" → "John Doe")

---

### Test 1.3: Verify ROI Winners on Dashboard

**Goal**: Verify recent ROI winners appear on the dashboard.

**Steps**:
1. Navigate to `/operators/dashboard?email=bart@archetypeoriginal.com`
2. Scroll down past the metrics sections
3. Look for "Recent ROI Winners" section

**Expected Results**:
- Section appears below Longitudinal Metrics
- Shows up to 10 most recent ROI winners
- Each winner card displays:
  - Winner name (business_name or formatted email)
  - Pot amount won (formatted as currency: $X,XXX.XX)
  - Event title
  - Event date (formatted: "Jan 15, 2026")
- Cards are displayed in a grid (3 columns on large screens)
- Most recent winners appear first

**Verify Multiple Winners**:
- If you have multiple closed events with winners, they should all appear
- Most recent should be at the top

---

## Part 2: Testing Event Announcement System

### Test 2.1: Announce a LIVE Event

**Goal**: Verify event announcement sends emails to all Operators and approved Candidates.

**Prerequisites**:
- Have at least 2-3 Operators in the system
- Have at least 1-2 approved Candidates in the system
- Create a new LIVE event (or use existing one)

**Steps**:
1. Navigate to `/operators/events?email=bart@archetypeoriginal.com`
2. Create a new event OR select an existing LIVE event
3. Navigate to the event detail page
4. In the "Event Actions" panel (right sidebar), click **"Announce Event"** button
5. Confirm the action in the dialog
6. Wait for the success message

**Expected Results**:
- Success alert shows: "Event announced successfully! Emails sent to X recipients."
- If some emails fail, it will show: "Emails sent to X recipients. (Y failed)"
- Button shows loading state while sending
- Console logs show batch sending progress

---

### Test 2.2: Verify Email Content

**Goal**: Verify the announcement emails contain correct information and working links.

**Steps**:
1. Check your email inbox (or test Operator/Candidate email inboxes)
2. Look for email with subject: "New Operators Event: [Event Title]"
3. Open the email

**Expected Email Content**:
- **Subject**: "New Operators Event: [Event Title]"
- **Body includes**:
  - Event title (prominently displayed)
  - Event date (formatted: "Monday, January 15, 2026")
  - Event time (formatted: "6:00 PM - 9:00 PM")
  - Location (if provided)
  - Stake Amount (formatted as currency)
  - Max Seats
  - Host name (if provided)
  - Sponsor name (if provided)
  - Host description (if provided)
- **RSVP Button**: Blue button that says "RSVP to Event"
- **RSVP Link**: Should be a full URL like:
  `https://www.archetypeoriginal.com/operators/events/[event-id]?email=[recipient-email]`

**Verify RSVP Link**:
1. Click the "RSVP to Event" button in the email
2. Should navigate to the event detail page
3. Should be pre-filled with the recipient's email
4. Should show RSVP button if user is eligible

---

### Test 2.3: Verify Recipients Received Emails

**Goal**: Verify all Operators and approved Candidates received the announcement.

**Steps**:
1. Check email inboxes for:
   - All Operators (users with 'operator' or 'chief_operator' role)
   - All approved Candidates (candidates with status = 'approved')
2. Verify each recipient received exactly one email
3. Verify email addresses are correct

**Expected Results**:
- All Operators received email
- All approved Candidates received email
- No duplicate emails
- No emails sent to denied/pending candidates
- No emails sent to non-Operators/non-Candidates

**Note**: If you have many recipients, check a sample (3-5 emails) to verify they all received it.

---

### Test 2.4: Verify Announcement Button Permissions

**Goal**: Verify only CO/Accountant can see and use the Announce Event button.

**Steps**:
1. As `bart@archetypeoriginal.com` (CO/Accountant), verify "Announce Event" button is visible
2. If possible, test as a regular Operator:
   - Should NOT see "Announce Event" button
   - Should only see "RSVP" button if eligible

**Expected Results**:
- CO/Accountant: Can see and click "Announce Event"
- Regular Operators: Cannot see "Announce Event" button
- Button only appears for LIVE events

---

### Test 2.5: Test Announcement Error Handling

**Goal**: Verify the system handles email failures gracefully.

**Steps**:
1. Announce an event (from Test 2.1)
2. Check the success message
3. If there are failures, check console logs

**Expected Results**:
- If all emails succeed: Shows "Emails sent to X recipients"
- If some fail: Shows "Emails sent to X recipients. (Y failed)"
- System doesn't crash if some emails fail
- Failed emails are logged with error details
- Event is still marked as announced (announced_at timestamp set)

---

## Part 3: Integration Testing

### Test 3.1: Full Workflow - Create, Announce, RSVP, Close, View Winner

**Goal**: Test the complete workflow from event creation to ROI winner display.

**Steps**:
1. **Create Event**: Create a new event with stake $120, sponsor $500, max seats 10
2. **Announce Event**: Click "Announce Event" button
3. **Verify Emails**: Check that Operators/Candidates received emails
4. **RSVP**: As a test Operator, RSVP to the event (use email link from announcement)
5. **Start Event**: Change event state to OPEN
6. **Check In**: Check in the RSVP'd users
7. **Vote**: Have users cast all 10 votes
8. **Close Event**: Close the event
9. **Verify Winner**: Check event detail page for ROI winner and pot amount
10. **Verify Dashboard**: Check dashboard for recent ROI winner

**Expected Results**:
- All steps complete successfully
- Winner is calculated correctly
- Pot amount is correct (50% of total)
- Winner appears on dashboard
- Winner name and pot display correctly

---

## Troubleshooting

### ROI Winner Not Showing
- **Check**: Event must be CLOSED state
- **Check**: At least one eligible winner (checked in, used all votes, present until close, no offenses)
- **Check**: Database migration was run (pot_amount_won column exists)

### Pot Amount Incorrect
- **Verify**: Confirmed RSVP count matches expected
- **Verify**: Calculation: (stake × confirmed) / 2 + sponsor_pot × 0.5
- **Check**: Database for stored pot_amount_won value

### Emails Not Sending
- **Check**: RESEND_API_KEY is configured in Vercel environment variables
- **Check**: Console logs for error messages
- **Verify**: Recipients exist in database (Operators and approved Candidates)
- **Check**: Rate limits (Resend has 10 req/sec limit, batches handle this)

### Announce Button Not Visible
- **Check**: User has CO or Accountant role
- **Check**: Event is in LIVE state
- **Check**: User is logged in with correct email

---

## Quick Test Checklist

- [ ] Create event with stake and sponsor pot
- [ ] Start event (change to OPEN)
- [ ] Check in attendees
- [ ] Close event
- [ ] Verify ROI winner calculated
- [ ] Verify pot amount correct (50% of total)
- [ ] Verify winner displays on event detail page
- [ ] Verify winner displays on dashboard
- [ ] Create new LIVE event
- [ ] Announce event
- [ ] Verify emails sent to Operators
- [ ] Verify emails sent to approved Candidates
- [ ] Verify email content is correct
- [ ] Verify RSVP links work
- [ ] Test full workflow end-to-end

---

## Notes

- **Pot Calculation**: Winner gets 50% of total pot (after 25% host and 25% AO)
- **Email Batching**: Resend sends up to 100 emails per batch automatically
- **Rate Limits**: System handles Resend rate limits with retries
- **Winner Name**: Uses business_name if available, otherwise formats email nicely
- **Dashboard Display**: Shows last 10 ROI winners, most recent first
