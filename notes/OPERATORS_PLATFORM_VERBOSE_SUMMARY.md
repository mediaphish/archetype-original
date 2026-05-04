# Operators Platform - Detailed User Guide & System Overview

## What Is This System?

The Operators Platform is a **business networking and event management system** designed for a community of business operators. Think of it like a private club where operators meet regularly, vote on each other's performance, and the best performer wins a cash prize (the "ROI pot").

The system manages the entire lifecycle of these networking events:
1. **Creating events** (monthly meetings, networking sessions, etc.)
2. **Managing RSVPs** (who's coming, waitlists when events fill up)
3. **Running the event** (checking people in, managing attendance)
4. **Voting** (operators vote on each other during the event)
5. **Calculating winners** (who gets the ROI pot based on votes)
6. **Managing members** (inviting new candidates, tracking offenses, promoting people)

---

## The Big Picture: How Events Work

Every event goes through **three states**:

1. **LIVE** - Event is announced, people can RSVP, but nothing has happened yet
2. **OPEN** - Event is happening right now! People are being checked in, voting is happening
3. **CLOSED** - Event is over, winner is calculated, everything is finalized

Think of it like a restaurant:
- **LIVE** = Taking reservations
- **OPEN** = Restaurant is open, people are eating
- **CLOSED** = Restaurant closed, bills are paid, winner announced

---

## User Roles: What Can Each Person Do?

### 1. **SUPER ADMIN** - The Boss

**Who they are:** The ultimate authority. Usually just one person (or a very small team) who runs the entire platform.

**What they can do:**

**User Management:**
- **Promote anyone to Chief Operator** - They can give someone the power to manage events
- **Reverse offenses** - If someone got a penalty card unfairly, Super Admin can remove it
- **View everyone** - See all users, their roles, card status, owed balances, everything

**Event Management:**
- **Everything a Chief Operator can do** (see below)
- Can access the Admin page (nobody else can)
- Can override any restriction

**Real-world example:** If someone got a red card (benched) but it was a mistake, Super Admin can reverse it. If someone needs to become a Chief Operator quickly, Super Admin can promote them instantly.

---

### 2. **CHIEF OPERATOR** - The Event Manager

**Who they are:** The people who actually run the events. They're like the event coordinators who make sure everything happens smoothly.

**What they can do:**

**Event Creation & Management:**
- **Create new events** - Set up a new networking meeting
  - Set date, time, location
  - Set max seats (how many people can come)
  - Set stake amount (how much everyone pays to attend)
  - Add host information (who's hosting this event)
  - Add sponsor information (if someone is sponsoring and adding money to the pot)
  - Upload logos for host/sponsor

- **Edit events** - Change details before the event starts (but only if it's LIVE state)
- **Start events** - When it's time, they click "Start Event" which moves it from LIVE → OPEN
- **Close events** - When the event is over, they close it (OPEN → CLOSED), which triggers ROI calculation
- **Reopen events** - If they closed it by mistake, they can reopen it (CLOSED → OPEN)
- **Revert to LIVE** - If they started an event too early, they can revert it back (OPEN → LIVE)

**RSVP Management:**
- **See all RSVPs** - View everyone who RSVP'd (confirmed and waitlisted)
- **Promote waitlist** - If someone drops out, they can move someone from waitlist to confirmed
- **Remove RSVPs** - If someone can't come, they can remove their RSVP

**Candidate Management:**
- **Approve candidates** - When an Operator invites someone new, Chief Operator reviews and approves/denies
- **Deny candidates** - Can reject candidates who don't meet standards

**Scenario Management:**
- **Generate scenarios** - Use AI to create discussion topics based on who's attending
- **Edit scenarios** - Modify the AI-generated topics if needed

**Voting & Attendance:**
- **View all votes** - See who voted for whom (aggregate counts)
- **View all attendance** - See who checked in, who was a no-show, etc.

**Real-world example:** Chief Operator creates "March 2026 Operators Meeting" for next month. Sets it for 20 seats at $120 each. Operators start RSVPing. When the event fills up, people go on waitlist. Chief Operator can promote waitlist people if spots open up. On the day of the event, they start it, and Accountants check people in. After the event, Chief Operator closes it, and the system calculates who won the ROI pot.

---

### 3. **OPERATOR** - The Regular Member

**Who they are:** The core members of the community. These are the people who attend events, vote, and can win the ROI pot.

**What they can do:**

**Event Participation:**
- **RSVP to events** - Sign up to attend LIVE events
- **Cancel RSVP** - If they can't make it (but only if it's more than 24 hours before the event)
- **View event details** - See all the information about upcoming events

**Voting (During OPEN Events):**
- **Cast votes** - During an OPEN event, they can vote on other attendees
  - **10 votes total** - They get exactly 10 votes per event
  - **Upvote or downvote** - They can give thumbs up or thumbs down
  - **Can vote multiple times** - They can vote for the same person multiple times (up to their 10 vote limit)
  - **Cannot vote for themselves** - Self-voting is blocked
  - **See remaining votes** - Counter shows how many votes they have left
  - **See vote counts** - See aggregate upvotes/downvotes for each person (but not who voted)

**Candidate Invitations:**
- **Invite candidates** - They can invite new people to become candidates
  - Enter candidate's email
  - Candidate writes an essay (200+ words minimum)
  - Candidate provides contact info
  - Chief Operator reviews and approves/denies

**Profile Management:**
- **Update their profile** - Add bio, role title, industry, business name, website, headshot

**What they CANNOT do:**
- Cannot check people in (that's Accountant's job)
- Cannot see individual votes (only aggregate counts)
- Cannot create or edit events
- Cannot approve/deny candidates

**Real-world example:** Operator sees "March 2026 Operators Meeting" is LIVE. They RSVP and get confirmed (seat 5/20). On the day of the event, Accountant checks them in. During the event, they see a list of other checked-in attendees. They use their 10 votes to upvote people they liked and downvote people they didn't. After the event closes, they see who won the ROI pot (it might be them!).

---

### 4. **ACCOUNTANT** - The Check-In Manager

**Who they are:** The people responsible for managing attendance and check-ins during events. They're like the door people at a club.

**What they can do:**

**Everything an Operator can do PLUS:**

**Check-In Management (During OPEN Events):**
- **Check people in** - When someone arrives, Accountant clicks "Check In"
  - **One-click check-in** - Cash payment is assumed, no confirmation needed
  - System marks them as checked in
  - They can now receive votes

- **Mark no-shows** - If someone RSVP'd but didn't show up
  - System automatically records an offense
  - Person gets a yellow card (first offense)
  - Person owes the stake amount

- **Check people out** - If someone leaves early
  - System records an offense
  - Person gets a yellow card (or progresses their card status)
  - Person owes the stake amount

**Event Management:**
- **Start events** - Can start an event (LIVE → OPEN)
- **Close events** - Can close an event (OPEN → CLOSED)
- **Reopen events** - Can reopen closed events
- **Revert to LIVE** - Can revert OPEN events back to LIVE

**Viewing:**
- **See all RSVPs** - View everyone who RSVP'd
- **See all attendance** - See check-in status for everyone
- **See all votes** - View aggregate vote counts

**What they CANNOT do:**
- Cannot vote (they're too busy managing check-ins)
- Cannot RSVP (they're working the event)
- Cannot create or edit events (that's Chief Operator's job)

**Real-world example:** Event starts at 6 PM. Accountant arrives early. As Operators show up, Accountant checks them in one by one. Someone RSVP'd but doesn't show - Accountant marks them as no-show, system gives them a yellow card. Someone leaves at 8 PM (event goes until 9 PM) - Accountant checks them out, system records an offense. At the end of the night, Accountant closes the event, system calculates ROI winner.

---

### 5. **CANDIDATE** - The New Person

**Who they are:** People who have been invited by Operators but haven't been approved yet. They're trying to join the community.

**What they can do:**

**Limited Participation:**
- **RSVP to events** - If they've been approved by Chief Operator, they can RSVP
- **View event details** - See information about events
- **Update profile** - Add bio, role title, industry (but NOT business name or website - those are for Operators only)

**What they CANNOT do:**
- Cannot vote (they're not full members yet)
- Cannot invite other candidates
- Cannot check people in
- Cannot see vote counts (they're not voting, so why would they need to see?)

**Real-world example:** Operator invites "john@example.com" as a candidate. John submits an essay and contact info. Chief Operator reviews and approves John. Now John can RSVP to events, but he can't vote yet. After attending events and proving himself, he might get promoted to Operator status.

---

## The Card System: How Penalties Work

Think of this like a soccer referee's card system, but for business events:

**No Card (Clean)** - You're good! No offenses.

**Yellow Card** - First offense
- What triggers it: No-show or early check-out
- What happens: You owe the stake amount (e.g., $120)
- Can you RSVP? Yes, you can still attend events

**Orange Card** - Second offense
- What triggers it: Another no-show or early check-out
- What happens: You owe more money (stake amount accumulates)
- Can you RSVP? Yes, but you're on thin ice

**Red Card** - Third offense
- What triggers it: Third no-show or early check-out
- What happens: 
  - You're **benched** - Cannot RSVP until the bench date passes
  - You owe even more money
  - You're essentially suspended
- Can you RSVP? No, not until your bench period ends

**How to get rid of cards:**
- Only Super Admin can reverse offenses
- If an offense was recorded incorrectly, Super Admin can remove it
- This reduces your card status and clears owed balance

**Real-world example:** Sarah RSVPs to an event but doesn't show up. Accountant marks her as no-show. Sarah gets a yellow card and owes $120. Next month, Sarah RSVPs again but leaves early. Accountant checks her out. Sarah gets an orange card and now owes $240. Third month, Sarah no-shows again. She gets a red card, is benched for 30 days, and owes $360. She cannot RSVP to any events until her bench period ends.

---

## The ROI System: How Winners Are Chosen

**What is ROI?** Return on Investment. The person who provides the most value to the group wins the pot.

**How it works:**

1. **Event closes** (OPEN → CLOSED)
2. **System calculates winner** using a deterministic algorithm:
   - Looks at everyone who was checked in AND stayed until the end
   - Excludes people with owed balances (they're in trouble)
   - Excludes people who are benched
   - Calculates upvote ratio for each person:
     - Upvote ratio = Upvotes received ÷ Total votes received
     - Example: 8 upvotes, 2 downvotes = 8/10 = 0.80 (80%)
   - Person with highest upvote ratio wins
   - If there's a tie, system uses a deterministic tiebreaker

3. **Pot breakdown:**
   - **25% to Host** - The person hosting the event
   - **25% to Area Operator (AO)** - The regional coordinator
   - **50% + Sponsor pot to ROI Winner** - The person who won the votes

**Example:** Event has $120 stake × 20 people = $2,400 base pot. Sponsor adds $500. Total pot = $2,900.
- Host gets: $725 (25%)
- AO gets: $725 (25%)
- ROI Winner gets: $1,450 (50% of base) + $500 (sponsor) = $1,950 total

**Real-world example:** 20 people attend. Everyone votes. John gets 15 upvotes and 2 downvotes (highest ratio). Event closes. System calculates: John wins! He gets $1,950. Everyone sees the results on the event page.

---

## Complete Workflow Examples

### Example 1: Creating and Running an Event

**Step 1: Chief Operator Creates Event**
- Chief Operator goes to Events page, clicks "Create Event"
- Fills in: "March 2026 Operators Meeting", March 30, 6 PM - 9 PM, 20 seats, $120 stake
- Adds host info: "John's Restaurant, 123 Main St"
- Adds sponsor info: "ABC Company, adding $500 to pot"
- Saves event
- **Event is now LIVE**

**Step 2: Operators RSVP**
- 20 Operators RSVP → All confirmed
- 21st Operator RSVPs → Goes to waitlist
- 22nd Operator RSVPs → Goes to waitlist

**Step 3: Chief Operator Manages Waitlist**
- Someone cancels → Chief Operator promotes waitlist person #1 to confirmed

**Step 4: Event Day - Accountant Starts Event**
- Accountant arrives, clicks "Start Event"
- **Event is now OPEN**
- Voting and check-ins are enabled

**Step 5: Check-In Process**
- Operators arrive, Accountant checks them in one by one
- Someone doesn't show → Accountant marks no-show (they get yellow card)
- Someone leaves early → Accountant checks them out (they get yellow card)

**Step 6: Voting Happens**
- Operators see list of checked-in attendees
- They use their 10 votes to upvote/downvote people
- Vote counts update in real-time

**Step 7: Event Closes**
- Accountant clicks "Close Event"
- **Event is now CLOSED**
- System calculates ROI winner
- Results displayed: "John won $1,950!"

---

### Example 2: Candidate Journey

**Step 1: Operator Invites Candidate**
- Operator goes to event detail page
- Fills in candidate form: "jane@example.com"
- Jane receives invitation

**Step 2: Candidate Submits Application**
- Jane goes to event page
- Sees she's been invited
- Writes essay (250 words about her business)
- Provides contact info
- Submits application
- **Status: Pending**

**Step 3: Chief Operator Reviews**
- Chief Operator goes to Candidates page
- Sees Jane's application
- Reviews essay and contact info
- Clicks "Approve"
- **Status: Approved**

**Step 4: Candidate Can Now RSVP**
- Jane can now RSVP to the event
- She attends but cannot vote (she's still a Candidate)
- After attending and proving herself, she might get promoted to Operator

---

### Example 3: Card System in Action

**Month 1:**
- Bob RSVPs to event
- Doesn't show up
- Accountant marks no-show
- **Bob gets Yellow Card, owes $120**

**Month 2:**
- Bob RSVPs again
- Shows up but leaves early (event goes until 9 PM, he leaves at 8 PM)
- Accountant checks him out
- **Bob gets Orange Card, owes $240**

**Month 3:**
- Bob RSVPs again
- Doesn't show up again
- Accountant marks no-show
- **Bob gets Red Card, benched for 30 days, owes $360**
- Bob cannot RSVP to any events for 30 days

**Month 4:**
- Bob tries to RSVP but system blocks him (still benched)
- After 30 days pass, bench is lifted
- Bob can RSVP again (but still has red card and owes $360)

**If mistake was made:**
- Super Admin can reverse Bob's most recent offense
- Bob's card goes from Red → Orange
- Owed balance reduces from $360 → $240
- Bench is cleared

---

## Key Features & Rules

### RSVP Rules
- **Only LIVE events** accept RSVPs
- **Seat limits** are enforced (if 20 seats, 21st person goes to waitlist)
- **Cancel deadline:** Must cancel more than 24 hours before event
- **Benched users** cannot RSVP until bench period ends
- **RSVP closed flag** can prevent new RSVPs (Chief Operator can close RSVPs)

### Voting Rules
- **Only OPEN events** allow voting
- **10 votes per Operator** per event
- **Cannot vote for yourself**
- **Can vote multiple times** for the same person (up to 10 total)
- **Votes are permanent** - once cast, cannot be changed
- **Only Operators can vote** (Candidates cannot vote)

### Check-In Rules
- **Only Accountants/Super Admins** can check people in
- **One-click check-in** - cash payment assumed
- **No-show = offense** - automatically recorded
- **Early check-out = offense** - automatically recorded
- **Must be checked in** to receive votes

### ROI Calculation Rules
- **Only CLOSED events** have ROI winners
- **Must be checked in** to be eligible
- **Must stay until end** (present_until_close = true)
- **Cannot have owed balance** (must be in good standing)
- **Cannot be benched** (must be active)
- **Upvote ratio determines winner** (not total votes, but ratio)
- **Deterministic algorithm** - same inputs always produce same result

### Event State Rules
- **LIVE events** can be edited
- **OPEN events** cannot be edited (must revert to LIVE first)
- **CLOSED events** cannot be edited (ever)
- **State changes require confirmation** (modal popup)
- **Only Chief Operators/Accountants/Super Admins** can change states

---

## Dashboard Metrics Explained

The Dashboard shows aggregate data (no individual names, just totals):

**Event Metrics:**
- **Total Events** - How many events have happened
- **Live/Open/Closed** - Current state breakdown
- **Seats Filled Rate** - What percentage of available seats were filled
- **Voting Completion** - What percentage of Operators used all 10 votes
- **Total Pot** - How much money has been in play

**Longitudinal Metrics:**
- **Active Operators** - How many Operators are currently active
- **Repeat Attendance** - How many people attend multiple events
- **Promotion Rate** - What percentage of Candidates become Operators
- **Positivity Index** - Overall positive sentiment (upvotes vs downvotes)
- **Signal Clarity** - How clear the voting signals are
- **Average Upvote Ratio** - Average upvote ratio across all events

---

## System Understanding Summary

**Yes, I understand the system we built!** Here's what makes it special:

1. **It's a complete event management system** - Not just RSVPs, but the full lifecycle from creation to winner calculation

2. **Role-based permissions are granular** - Each role has specific capabilities, and the system enforces them strictly

3. **The card system creates accountability** - People can't just no-show without consequences

4. **The ROI system rewards value** - Not just popularity, but upvote ratio (quality over quantity)

5. **State machine ensures order** - Events can't be edited when they shouldn't be, preventing chaos

6. **Deterministic calculations** - Same inputs always produce same results, ensuring fairness

7. **Real-time updates** - Vote counts, RSVP counts, attendance all update as things happen

8. **Comprehensive tracking** - Every action is tracked (votes, offenses, attendance, etc.)

9. **Flexible management** - Chief Operators can reopen events, revert states, manage waitlists

10. **Candidate pipeline** - System for bringing in new members with approval process

This is a **production-ready, enterprise-level event management platform** that handles complex workflows, enforces business rules, and provides a complete user experience from start to finish.
