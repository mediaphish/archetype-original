# Agent handoff: Preparing for major system updates (2026-03-10)

This note captures the *reusable* context from the transcript `cursor_preparing_for_major_system_updat.md` (exported 2026-03-10). The full transcript is long; this is the practical “source of truth” summary for how to work and what matters.

---

## How to work with the user (non‑negotiables)

- **Plan first, then get explicit approval**: Do not start making changes until the user approves the plan. If the user says “Continue” or “I don’t care”, treat that as approval.
- **Don’t silently switch modes**: The user was burned by the agent “starting work” when they believed they were still planning. Be extra explicit about whether you’re still planning or you’re executing.
- **No surprise UI moves**: If something’s in a “terrible location” (buttons, panels, controls), the user wants a proposed layout *before* changes happen.
- **Give step-by-step testing instructions**: The user regularly asks for “steps for testing all this new stuff.” Provide a checklist that reads like instructions a non-engineer can follow on the live site.

Key quotes to remember:
- “These are things I need you to plan before you execute.”
- “You have to stay in Plan mode until I click build.”
- “Give me steps for testing all this new stuff.”

---

## Product intent: “Topics → Topics & Scenarios”

The user wants “Topic Insights” evolved into **scenario-based** output.

### Scenario generation model (what the scenarios should be based on)

1. Look at attendees’ **bios**
2. Look at each attendee’s **current problem / current challenge** field (the transcript references `current_challenge`)
3. Use that data to create insights
4. Present the result as a **brief, one‑paragraph story** describing the problem being solved (not just a topic label)

### Scenario content constraints

- **Grounded in insights**: scenarios must be derived from the data, not random prompts.
- **Realistic**: plausible workplace/leadership situations.
- **No real company references**: neutralize specifics even if a “current challenge” includes identifying details.
- **Reduce duplicates across meetings**: if the same people meet multiple times, avoid repeating the same scenarios.

Labeling:
- The UI label should be **“Topics & Scenarios”** (user explicitly requested this wording).

---

## Event lifecycle expectations (re-open / state toggles)

The user hit a painful edge case: an event can look “re-opened” but still behave “closed” in parts of the UI.

What they expect:
- Re-opening an event must restore **all** behaviors that depend on “live/open” state (example: Operators being able to RSVP again).
- Avoid partial toggles where the event displays one state but still blocks actions with “closed” rules.

---

## Roadmap items mentioned (context, not automatically approved scope)

These were raised as “next” items; do not treat them as already approved work unless the user explicitly asks again:

- **Close event + pot calculation + display**: user wants the winner’s name visible (not email). Also they questioned whether pot math includes the splits (host share and AO share).
- **Announce events + requests/waitlist**: Operators and eligible Candidates can see upcoming events and request to join; overflow goes to a waitlist; also expects email notifications.

---

## Browser-based testing expectation (process)

The user expects the agent to be able to run through workflows in a real browser “like a real user would” when asked, and to share the test results.

