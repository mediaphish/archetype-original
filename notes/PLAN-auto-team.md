# Auto's team: plan

Written 2026-10-25 at Bart's direction: "Plan it all and get to work."

## What Bart asked for, in his words

- "The writer is named Jot. I had a team of 104 and could keep them straight."
- "What I need is for them to work as closely to how my team worked. I could pull
  them all into a room, lay out the vision, give insight, tell them exactly what I
  want, etc. Then they run autonomously until they need me again. The more
  autonomous the better."
- Background work: "I desperately need this."
- "In any response from you I can highlight the text and reply. This would be
  perfect when I am reviewing something that was written and need to give
  specific notes."
- "I'm not worried about the monthly bill. When we need to back off, I'll tell
  you. Until then I want efficiency. That means the highest quality at the
  highest speed. No errors."
- "Pure marketing based on an already established voice ... should already be
  close to 100% autonomous. It needs to be smart enough, like my team was, to
  figure issues out or ask real questions of me during our sessions."

## The team

| Name | Role | Reports to |
|---|---|---|
| Bart | Vision, final word on everything | |
| Auto | CMO. Decides what is said and why. Runs the team. | Bart |
| Jot | Writer. Research, briefs, outlines, drafts, revisions. | Auto |
| Reach | Publicist. Where, when, how often. | Auto |
| (later) Producer | Podcast flow | Auto |

One shared memory: every agent reads the same corpus, stated preferences,
guardrails, series memory, Reach's calendar and voice rules. Separate agents
that each know a slice contradict each other; this prevents it.

Rules that hold for every agent: Bart's direction wins and checks never override
him; the curtain stays closed; OpenAI only for images; nothing goes to a client
until Bart presses Send; no em dashes or AI phrasing; no word limits.

## How work moves

1. **The room.** Bart briefs the team in one conversation. Auto turns it into
   assignments for Jot and Reach, says who is doing what, and the work starts.
2. **Background tasks.** An assignment runs on its own on the server. Bart can
   leave, switch chats, or close the app. Results land in the agent's
   conversation and the Queue.
3. **Asking Bart.** When an agent needs a real decision, it asks one clear
   question and the task waits. Bart sees it in "Needs you" and by
   notification; his answer resumes the work.
4. **Talking direct.** Bart can open Jot or Reach directly, or address them by
   name in any conversation.
5. **Team board.** One view of who is working on what, what is waiting on Bart,
   and what is done.

## Build order

1. Background task engine: tasks table, a runner that uses Auto's own engine
   and tools, resume after interruption, safety-net cron.
2. Jot and Reach as agents: identity, tools, their own conversations, address
   by name, the room.
3. Asking Bart, notifications, team board.
4. Highlight-and-reply in Auto's conversations and draft reviews.
5. Reach step two: Thursday look-ahead, Monday report, "Life through my eyes"
   nudge, run as scheduled team tasks.
6. Bridges: chat to Queue to Reach and back.
7. Producer for the podcast flow (see PLAN-podcast-pipeline.md).
