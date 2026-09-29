# Podcast pipeline: intake to published episode

Written 2026-09-29 for discussion and execution the next day. Research is
complete and cited. Nothing in here is built yet.

---

## What Bart asked for

1. The intake loads the person into the system.
2. A process builds a brief from their four answers, automatically, on arrival
   or by cron.
3. A **Brief** button next to their name, to read it.
4. A **Create Show** button on the brief, producing show notes to work through
   with them live.
5. A **Show** button next to their name afterwards. The brief survives.
6. A **Publish** button next to Show, opening a page to fill in the blanks and
   publish to the public podcast page.

That is six states on one row.

The current system has **21 clicks across four admin screens**, six tab switches
inside one of them, three excursions to external tools, and **no state field
anywhere**. Progress today is inferred from side effects scattered across five
tables: `episode_thread_id`, `recording_link_sent_at`, whether a schedule row
exists, the `post_recording_*` columns, and draft status. Nothing says which step
an episode is on, and no screen lists episodes in flight.

**Bart's six buttons are the state machine this system never had.** That is the
real content of the request, and it is why the answer is not "add buttons to the
existing flow."

---

## Why the Theis episode felt the way it did

Measured, not guessed.

Episode 3 had **two** guests, Erik and Adam Theis, who submitted the intake
separately. Everything downstream is keyed one guest per row, so it produced two
of everything:

| | Erik | Adam |
|---|---|---|
| Research brief | 6,947 chars | 3,574 chars |
| Producer brief | 8,148 chars | 7,351 chars |
| Suggested questions | 10, in 2 categories, each with a rationale | 10, same |

About 26,000 characters and 20 questions for one conversation. Nothing merged
them. Someone built a `/ao/podcast/guest-combined/` route to cope, which tells
me the problem was noticed and worked around rather than fixed.

Then the pipeline stopped. `ao_episode_drafts` has held **three rows ever**. All
three are `episode_type: solo`, all three have `guest_id: null`, none is
published, and two are failures titled "No Transcript, No Episode" and "Untitled
Episode - Transcript Unreadable." The Theis episode is live because Bart wrote
the markdown by hand.

**The guest pipeline and the episode pipeline have never once connected.**

### The deeper mismatch

Everything the system builds today happens **after** recording, from a
transcript. What step 4 asks for is a document to work through **during**
recording. That artifact does not exist anywhere in the code. This is the single
biggest gap and the reason the current flow feels inside out.

### The rest of the 21 steps

The worst of it, in order of how much it would have cost on Theis:

- **Publishing is gated behind a chat conversation.** There is no "attach
  transcript" anywhere. Bart pastes the transcript into the Auto chat box, and
  the client only fires if *the model's reply* contains an `[EPISODE_PROCESS]`
  tag and his own message passes a heuristic that includes a bare "longer than
  500 characters" check. If Auto forgets the tag, nothing happens and no error is
  shown.
- **The tab named `Episode Setup → Show page` says "Publishing workflow coming in
  a later phase."** Publishing already exists, in the Auto artifact pane, on a
  different screen. A tab that disclaims the thing it is named after is the
  single biggest misdirection in the flow.
- **Date, time and timezone are entered twice**, in two separate forms with
  separate state hitting separate endpoints, for the same recording.
- **"Edit in Auto" does not go to Auto.** It navigates to `/ao/studio`, which
  resolves to the Writing page, and passes no draft id. The button cannot do what
  it says.
- **"View" is two buttons in one**, routing to either the episode admin or the
  legacy guest page depending on hidden state, so identical-looking rows go to
  structurally different screens.
- **A guest right after "Build episode" shows a `No episode` badge next to a
  button reading `Continue episode`**, because the badge and the button read
  different tables.
- **Guest identity is established twice.** The artifact pane re-resolves the
  guest *by name* against the API, even though `episode-seed` writes a
  `[GUEST_ID: …]` tag into the very message it is reading. A rename or a name
  collision breaks it.
- **"New guest" sends Bart to the guest's own public intake form**, release
  checkbox and all.
- **The same content renders two and three times per screen.** The producer brief
  and questions appear in the Guests tab and again in Hosting. Scheduling
  preferences appear in three places.

---

## What exists today

### The chain, and what gates what

```
intake → ao_podcast_guests row
           │
           └─ research_brief ──┬─→ suggested_questions  (hard-gated on research)
              (web search)     └─→ producer_brief       (gated on research)
                    │
                    ▼   requires a transcript
              episode-process → ao_episode_drafts (draft)
                    │
                    ├─ PATCH to edit
                    ├─ mint approval token
                    ▼
              episode-publish → GitHub commit → Vercel build → public page
```

Publishing is a **git commit**, not a database flag.
`api/ao/auto/episode-publish.js` commits to
`ao-knowledge-hq-kit/journal/podcast/{slug}.md`, `build-knowledge.mjs` skips
anything whose frontmatter status is not exactly `published`, and the public
page reads `/api/knowledge?type=podcast-episode`. The kit is a normal tracked
directory in this repo, not a submodule, so one commit does trigger the deploy.

### There is no automation

Nineteen crons in `vercel.json`. **Not one touches a guest or an episode.** Every
step today is Bart clicking something.

The one exception is request-scoped and worth knowing: `episode-seed` runs the
whole prep chain inline, up to three Claude calls per guest including a
web-search call, synchronously inside one HTTP request. All three failure paths
are `console.error` only, surfacing to Bart as the sentence "Not available.
Something went wrong generating it."

### What is already built and should be reused

- `api/ao/auto/episode-publish.js` commits the markdown, handles multiple
  guests, mints and validates an approval token. Routed and working.
- `lib/ao/buildEpisodeFrontmatter.js` builds the full 19-field YAML.
- `lib/ao/generateGuestResearch.js` holds the research, questions and producer brief
  generators, including the only web-search call in the system.
- The guest list row in `listGuestsPaginated`. This is where the buttons go.

Step 6 is in far better shape than steps 1 through 5.

---

## What is broken or dead, found while mapping

Ranked by how much it matters to this plan.

1. **Two research-brief generators write the same column with different
   prompts.** `generateGuestResearchBrief` uses web search and returns a
   five-section structured brief. `processEpisodeResearchSignal` uses no web
   search, `max_tokens: 1000`, and asks for 400 to 600 words of second-person
   prose. Whichever ran last wins. Same story for `suggested_questions`.
2. **`[EPISODE_PROCESS]` is advertised to Auto as a live signal but nothing
   consumes it.** `lib/ao/processEpisodeSignal.js` is 386 orphaned lines, and
   `api/ao/auto/chat.js` carries a comment explaining why it is deliberately not
   called. Auto can emit a signal that does nothing, which is exactly the
   fabrication the response-rule guard exists to catch.
3. **Three admin UIs hit the same four endpoints.** `PodcastGuestAdmin.jsx` (25
   KB), `PodcastGuestAdminCombined.jsx` (46 KB) and `episodeAdminBodies.jsx` have
   near-identical fetch blocks. `Combined` is **unreachable by clicking**: no
   component builds a link to it, and the only way in is if Auto decides to emit
   a `[NAVIGATE_TO]` signal. The shared component carries a comment saying "leave
   that file in place for now."
4. **`guest_brief_questions`** is written by nothing and read by nothing.
5. **`guest.title` is a phantom field.** It does not exist on the table, yet
   `episode-seed` hardcodes an empty title line into every seed message and
   `processEpisodeTranscript` formats it into a prompt where it is always
   undefined.
6. **`episode_status` on the guest list is always "No episode"**, because it
   joins on `ao_episode_drafts.guest_id`, which is null on every row that exists.
7. **The guest list does not select `session_type`**, so today's real mentor
   submission is indistinguishable from a guest.
8. Fixed already: the `session_type` and `mentor_*` columns existed only in
   production, with no migration file. A fresh database would have failed on the
   first intake. Committed tonight.

---

## The plan

### The operating principle, which changed everything below it

Bart, 2026-09-29: Auto is progressing toward being his CMO, and the model for how
it talks to him is a CEO talking to a fellow C-suite member. There is no question
of who is the boss. A directive can be assumed. A high functioning CMO does not
need guardrails, they own the processes in their sphere.

That draws a line I had not been drawing, and it decides most of the design:

**Checks on Auto's own work stay. Gates on Bart's decisions go.**

Staying, because this is a professional reviewing their own output before it
reaches him: the repetition check, voiceGuardrails, the corpus check on examples,
publish health.

Going, because this is a subordinate second-guessing the boss: the stage
approval gate, and prior-coverage refusing a topic he asked for.

### The shape

One thread per person, in the Auto chat he already uses, with the five stages as
tabs in the artifact panel:

```
Intake  →  Research  →  Brief  →  Show Notes  →  Published Episode
```

Conversation at every stage. The row in the guest list becomes the launcher and
the status board: its buttons deep link into the right tab.

Every artifact is additive. Making the show never destroys the brief, publishing
never destroys the show.

**One explicit state column** so the row can say where things are, instead of
five tables being cross-referenced to guess. Every button and every tab lights up
off that one field. This is what makes the rest simple.

### Approval: delete the gate, do not widen it

The requirement was always "Auto does not publish or schedule on its own
initiative." What got built was "Auto must prove Bart approved before believing
him." Only the first is real.

Measured 2026-09-29, the current phrase list accepts 11 of 34 plausible
approvals. It accepts "Approved" and "Ship it". It rejects **"Yes"**, "Yep", "Do
it", "Send it", "Sounds good", "OK", "Sure", "That works". The magic-word problem
Bart described was real and I wrote it.

**Work:**
- Delete the approval gate. No phrase list, no classifier, no confirmation
  question.
- Keep one deterministic hard stop on explicit refusal: not yet, hold off, wait,
  don't. A false advance there is the only expensive error.
- Everything else is a directive. Auto acts, then states in one line what it did.
  **Reversibility replaces permission.**
- Auto never asks him to repeat himself in different words. If it cannot tell
  what he meant, that is Auto's problem.

Note what this does to the plan's complexity: the largest piece of logic in the
old flow becomes a four-word refusal check.

### Stage 1: Intake

Already true. `insertGuestIntake` writes the row, and the mentor submission from
Matthew Burgess on 2026-09-29 proves it end to end.

**Work:** add `session_type` and the mentor columns to the `listGuestsPaginated`
select so the list can tell a mentor from a guest, and show the track on the row.
Half an hour.

### Stage 2: Research

Auto is wearing the Producer hat, building a show for the host. So research is
**complete, not short**. Everything findable goes in front of Bart.

Two questions, both asked, because the tracks need different things:

- **Who they are.** For anyone: what they have built, what is findable that most
  interviewers miss. Driven by the intake answers, the website, the socials.
- **What the problem is.** For a mentor session especially: what this problem
  actually is, how it usually goes wrong, what the web says, and **what Bart's
  own corpus already says about it**. The corpus half is what makes the answer
  his rather than generic.

A mentor session gets both. Bart, 2026-09-29: "I want to be prepared for the
problem he brought before we talk... be able to communicate clearly about it on
air."

**Work:** a cron, not an on-insert trigger, because the research call uses web
search, takes 30 to 90 seconds, and the intake request already sends three
emails. A slow generation must never make someone's submission fail.

- `api/cron/ao/build-guest-research.js`, every 15 minutes.
- Claims the oldest unbuilt guest, one per run, so a failure cannot spin.
- Writes a real status and keeps the error text. Today a failure is a
  `console.error` that surfaces as the sentence "Not available." That is how the
  Theis prep failures stayed invisible.

### Stage 3: Brief

The producer's synthesis for the host. Complete and organized.

**Correcting my earlier instinct:** I proposed making the brief shorter. That was
wrong. The Theis problem was never length. It was two unmerged documents, times
two people, with nothing synthesizing them, and **no short artifact to actually
host from**. Bart was trying to run a show off a producer's prep doc. The answer
is not a shorter brief, it is show notes that did not exist.

Scheduling and the Riverside invite fold in here, since this is the morning-of
stage. And they stop asking for the date twice: one form, one set of values, both
the schedule row and the invite email reading from it.

There is no Riverside API integration anywhere in the codebase, and none is
proposed. Bart creates the studio, pastes the link, Auto emails it out with each
guest's magic link attached. That division is right.

### Stage 4: Show Notes

The genuinely new thing, and the real design work.

A run sheet, not a transcript summary: an opening he can read, the four or five
moves of the conversation in order, the questions that matter with the throwaways
cut, what to avoid. Written to be glanced at while talking.

**This tab opens as its own screen.** Full width, no chat, no chrome. Bart runs
the show from it while looking at a person on camera. It is the one place the
chat metaphor actively hurts.

Editable, because he will cut a question the morning of.

### Stage 5: Published Episode

**Work:** one page with every field the markdown needs, in frontmatter order,
pre-filled from everything already known. Guest name, title, bio and links from
the guest row. Summary, show notes and takeaways from stage 4. Bart fills in only
what he alone has: YouTube id, Spotify, Apple URL, duration, season and episode
number, publish date.

Then it calls the existing `episode-publish` endpoint, which already works.

Two things to fix while building it:

- **The transcript stops being a chat message.** A paste or file field on this
  tab, going straight to `episode-process`. No signal tag, no 500-character
  heuristic, no silent failure. This removes the most fragile link in the chain.
- **Approve and Publish become one button.** The token has a real purpose as a
  server-side guard, so keep it and mint it inside the publish call rather than
  making him click twice for it.

**Multi-guest is designed in from the start**, because Theis is the case that
broke it. `episode-publish` already accepts `guest_ids`.

---

## Sequence

| | Work | Why in this order |
|---|---|---|
| 1 | The state column, and the guest list reading it | Every tab and button lights up off this |
| 2 | Delete the approval gate, keep the refusal check | Foundational, and it shrinks everything after it |
| 3 | Guest list shows track and real status | Matthew Burgess currently looks like a guest |
| 4 | Research cron, with real status and real errors | He is waiting, and today a failure is invisible |
| 5 | One research generator, delete the duplicate | Do it before building on top of it |
| 6 | The tabbed artifact panel, Research and Brief tabs live | First visible win |
| 7 | Show Notes, generator plus the full-screen view | The real design work |
| 8 | Published Episode tab, with the transcript field | Endpoint already works |
| 9 | Delete the dead code | Safe only once the new path is proven |

### What this replaces

21 clicks, four screens, and a chat conversation that has to emit the right tag
become: open the row, read the brief, run the show, publish. The trips to
Riverside, YouTube and Spotify stay, because those are real tools whose output
has to land somewhere. Everything else collapses.

---

## What I will not do without a decision

- Delete `processEpisodeSignal.js`, the `[EPISODE_PROCESS]` signal,
  `PodcastGuestAdminCombined.jsx`, `PodcastGuestAdmin.jsx`, or the broken "Edit
  in Auto" button. All are dead or broken by the evidence, but they are Bart's to
  remove.
- Touch `ao_episode_drafts` rows that already exist.
- Retire the Episode Admin screen. The plan makes the guest row the spine and
  folds scheduling into Brief, which leaves that screen with nothing of its own.
  Probably it goes, but that is his call.

---

## The one question still open

**Multi-guest briefs.** One merged from the start, or one per person combined at
the Show Notes stage? I recommend per person combined at Show Notes, since
research is genuinely per person and Erik and Adam submitted a day apart. It
changes the data model, so it goes first.
