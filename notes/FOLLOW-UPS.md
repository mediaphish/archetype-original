# Follow-ups

Running list of work Bart has asked for that is not started yet. Newest first.
When something here gets built, move it to "Done" with the date.

## Open

### Auto: every chat is a group chat (Bart, 2026-10-25, not started)
"I don't think we need separate chats for the agents in Auto. Every chat can
be a full group chat with everyone being able to speak up at will or on
request. It brings all the experience we have to the table for every project.
No different than in my company as we self organized around a project."
Then: "Auto is my Slack with my Team." So the model is Slack: channels per
project or topic, everyone in them, threads, @mentions, and the team posting
updates there instead of only answering.
Then, the full picture (Bart, 2026-10-25): "Projects needs to be part of it.
I could interact with any of the tabs in Auto as a chat." Examples he gave:
- A thread asking for quote card metrics: Auto answers with charts, Cam and
  Reach talk design and content for social, Jot does a post mortem on a
  journal entry that flopped.
- A thread asking for an update on Reshares or Quote Cards to spot check
  quality.
- Auto breaks in on its own: a podcast episode is blowing up; Reach is pulled
  in to build on it. "Two way communication."
- "All in chat. No dashboard. But I could call for a dashboard in chat!"
(He may rename some teammates.) So: chat is the front door to everything in
Auto; screens become cards shown inside a message (charts, the Queue items,
a dashboard) on request; the team starts threads when something needs Bart.
Today each teammate (Auto, Jot, Reach, Cam) has its own chats, and @mentions
bring one in. To plan with Bart before building: who answers by default, when
a teammate speaks up unasked (only with something real to add), how to keep
replies from piling up on a phone, and what happens to the existing separate
chats.

### Reshares: auto-approve still off (2026-10-24)
Reshares now use only Bart's approved photos (public/images/reshare-backgrounds/,
listed with their open side in lib/ao/reshareBackgrounds.js), untouched, with
the site adding the text and logo. Bart is sending a 007. Auto-approve stays
off until Bart OKs the new look; the Accountability Comes First reshare is
waiting in the Queue with its new image.

### ALI fresh look (Bart, 2026-10-24: "this next week")
Take a fresh look at ALI and make sure it still accomplishes the goal of
understanding how leadership works in an organization. The CRM only flags
clients with a team of 5 or more as candidates for now; deeper ALI
integration waits for this review.

### Apps (tabled by Bart 2026-10-24, "I'm not agreeing with you")
Clients' Archy as an app and the Auto dashboard as an app on his devices.
Bart wants to discuss before any direction is chosen. Phone notifications
wait with this. (Private Archy per client was built 2026-10-24 as a web page.)

### Client CRM, next pieces (planned 2026-10-23)
- Watch the first real Zoom call: the transcript should arrive on its own
  (Zoom app "Archetype Original Auto transcripts", webhook /api/zoom/webhook).
  Not yet seen with a real recording.
- Tiers (rising leaders / season / ongoing): access levels, from the
  2026-10-23 brainstorm table.
- Test rows to remove when Bart is done looking: "Jordan Test" and "Riley Test"
  in Auto > Clients (both email bart+...@archetypeoriginal.com).

### Smaller items
- Shorten the rising leaders form (page promises "a short note"; form has nine questions).
- Site visitor stats are off (needs Bart's OK to turn on).

## Done
- 2026-10-25 Infographics: four more designs (pyramid of up to seven stages with an optional This week box, lessons, pillars, comparison table). Hard rule: nothing borrowed from the examples Bart shares. A word check (lib/ao/infographicOriginality.js) and a second reader send borrowed or reworded lines back to the writer; after three tries the graphic is refused. The same rule is in the team's instructions.
- 2026-10-24 Infographic posts (3 a week, Bart approves each): built from one published piece each, drawn by the site in brand fonts (lib/ao/infographicCanvas.js; layouts framework, paths, myths), waiting in Auto > Queue with editable captions, Approve / Redo / Set aside. Approved ones post Tue, Wed, Thu at 12:30 Central on all five channels. A weekday job keeps three waiting. Reference images in notes/reference-images/ are inspiration only and are never given to the writer.
- 2026-10-24 Transcripts arrive on their own: Zoom cloud recordings by webhook; Wispr Flow and Echo emailed to bart+transcripts@archetypeoriginal.com (picked up by the Gmail sync script). Unmatched ones wait in "Transcripts to match" on Clients.
- 2026-10-24 Private Archy per client (/archy/you, signed link sent from the Archy tab in Auto). Uses their conversations with Bart, never his private notes. Hand-offs to Bart: ongoing within a day, season two days, rising leaders five. Log and answers in Auto; Archy use in the Monday summary. Test messages are in Jordan Test's Archy.
- 2026-10-24 Client email on the timeline: Apps Script "Archetype Original client email sync" in Bart's Google account (script.google.com, code in notes/gmail-sync/), read-only, every 15 minutes, only client addresses. A reply holds the next check-in due within 7 days and emails Bart.
- 2026-10-24 Links to Bart's writing beside his own action items; suggested next moves on Clients home and each person; Monday summary email (skipped until there are real clients).
- 2026-10-24 Email records: one SPF record (Google + Resend), duplicate removed by Bart.
- 2026-10-24 Quote cards build and schedule themselves (no review); journal reshares fixed after failing since July 22.
- 2026-10-24 Old addresses forward again (/methods, /philosophy, etc.); What I Do archived (forwards to Work with Bart); main menu stays on one line at 1024-1280.
- 2026-10-23 Client CRM: Before we talk form (auto-emailed after booking), permissions kept word for word, transcript to summary/action items/thank-you, check-in plans that send only after approval, client timeline. Client tables locked to server-only.
- 2026-10-23 Auto > Clients phase 1: Waiting on you, Upcoming, Everyone by stage.
- 2026-10-23 Research brief on each person who books.
- 2026-10-23 Work with Bart offer: free first conversation, softer presentation.
