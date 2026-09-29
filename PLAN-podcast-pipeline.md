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

### Principle

One row per person. Six buttons that appear as the work progresses. Every
artifact is additive: making the show never destroys the brief, publishing never
destroys the show. No screen exists that only forwards you to another screen.

**And one explicit state column**, so the row can say where things are instead of
five tables being cross-referenced to guess. Something like
`intake → brief_building → brief_ready → show_ready → published`, plus the error
text when a step fails. Every button lights up off that one field. This is the
piece that makes the other five steps simple rather than the other way round.

### Step 1: intake loads them into the system

Already true. `insertGuestIntake` writes the row today, and the mentor
submission from Matthew Burgess proves it end to end.

What is missing is that the admin list cannot tell a mentor from a guest.

**Work:** add `session_type` and the mentor columns to the `listGuestsPaginated`
select, and show a small track label on the row. Half an hour.

### Step 2: the brief builds itself

A cron, not an on-insert trigger. Reason: the research call uses web search and
takes 30 to 90 seconds, and the intake request already sends three emails. A
slow or failed generation must never make a person's submission fail.

**Work:**
- `api/cron/ao/build-guest-briefs.js`, every 15 minutes, matching the cadence of
  the existing publish crons.
- Claims any guest whose brief is missing, oldest first, one per run, so a
  failure cannot spin.
- Writes a real status on the row rather than leaving null: `pending`,
  `building`, `ready`, `failed`, with the error text kept. The current silent
  `console.error` is how the Theis prep failures stayed invisible.
- **Uses the mentor answers for a mentor, the guest answers for a guest.** This
  is the substance of the request. A mentor brief is built on the situation,
  what they tried, what they think the honest answer is, and the stakes. It is a
  different prompt and a different shape from a guest brief.

**Decision for Bart:** kill `processEpisodeResearchSignal` as part of this, so
one generator owns the column. I recommend deleting it and the
`[EPISODE_PROCESS]` signal together.

### Step 3: the Brief button

**Work:** a `Brief` button on the guest row, enabled when status is `ready`,
showing a spinner on `building` and the error on `failed`. It opens the brief.

**The brief gets shorter.** Today it is a research brief plus a producer brief
plus ten rationalised questions, 15,000 characters across two documents that
overlap. One document, and for a mentor session it should fit on a screen. The
old producer brief's opening paragraph was genuinely good, Bart read it on air
almost verbatim, so that section stays. The rest compresses.

### Step 4: Create Show

This is the new thing, and it is a **run sheet, not a transcript summary**.

What Bart works through live: an opening he can read, the four or five moves of
the conversation in order, the questions that matter with the throwaways cut,
and what to avoid. It is written to be glanced at while talking, not read.

**Work:** a new generator and a `show` record. It reads the brief and the
intake answers. It does not need a transcript, which is the whole point.

**Decision for Bart:** where to store it. Recommend a new `ao_episode_shows`
table keyed to the guest, rather than `ao_auto_threads.state`, which is where the
Riverside link and combined show notes currently hide and which nothing else can
see.

### Step 5: the Show button

**Work:** once a show exists, `Show` appears on the row next to `Brief`. Both
remain. Clicking `Show` opens the run sheet, editable, because Bart will want to
cut a question the morning of.

### Step 6: Publish

**Work:** `Publish` opens one page with every field the markdown needs, laid out
in the order the frontmatter uses, pre-filled from everything already known.
Guest name, title, bio and links come off the guest row. Summary, show notes and
takeaways come off the show. Bart fills in what only he has: YouTube id, Spotify,
Apple URL, duration, season and episode number, publish date.

Then it calls the existing `episode-publish` endpoint. That code already works.

Two things to fix while building it:

- **The transcript stops being a chat message.** A file or paste field on the
  publish page, going straight to `episode-process`. No signal tag, no
  500-character heuristic, no silent failure. This alone removes the most
  fragile link in the current chain.
- **Approve and Publish become one button.** Today Approve mints a token held
  only in React state, so a refresh silently greys out Publish with no
  explanation on screen. The token has a real purpose as a server-side guard, so
  keep it, and mint it inside the publish call rather than making Bart click
  twice for it.

**Multi-guest is designed in from the start**, because Theis is the case that
broke it. The publish page takes a list of guests, and `episode-publish` already
accepts `guest_ids`.

---

## The open question from tonight

For a two-guest episode: **one merged brief from the start, or one per person
that gets combined when Bart decides they share an episode?**

My recommendation is per person, combined at the Create Show step. Research is
genuinely per person, and Bart does not always know at intake who is pairing with
whom. Erik and Adam submitted a day apart. But this changes the data model, so it
is the first thing to settle tomorrow.

---

## Sequence

| | Work | Why in this order |
|---|---|---|
| 1 | The state column, and the guest list reading it | Every button lights up off this. Nothing else is simple without it |
| 2 | Guest list shows track and real status | Matthew Burgess currently looks like a guest |
| 3 | Brief cron writing real status and real errors | He is waiting with no brief, and today a failure is invisible |
| 4 | One brief generator, delete the duplicate | Do it before building on top of it |
| 5 | Brief button, and the shorter brief | First visible win |
| 6 | Create Show and the run sheet | The genuinely new thing, and the real design work |
| 7 | Show button | Small once 6 exists |
| 8 | Publish page, with the transcript field on it | Endpoint already works |
| 9 | Delete the dead code | Safe only once the new path is proven |

Steps 1 through 5 are about a day. Step 6 is where the thinking goes. Steps 7 and
8 are mostly UI against endpoints that already exist.

### What this replaces

21 clicks, four screens, and a chat conversation become: open the row, read the
brief, make the show, publish. The external excursions to Riverside, YouTube and
Spotify stay, because those are real tools and their output has to be pasted
somewhere. Everything else collapses.

---

## What I will not do without a decision

- Delete `processEpisodeSignal.js`, the `[EPISODE_PROCESS]` signal,
  `PodcastGuestAdminCombined.jsx`, `PodcastGuestAdmin.jsx`, or the broken "Edit
  in Auto" button. All are dead or broken by the evidence, but they are Bart's to
  remove.
- Change the existing guest-track questions or brief format.
- Touch `ao_episode_drafts` rows that already exist.
- Retire the Episode Admin screen. The plan makes the guest row the spine, which
  leaves that screen's Riverside invite and scheduling without an obvious home.
  Worth deciding tomorrow whether those move onto the row or the screen stays for
  them.

---

## Two questions to settle before writing code

1. **Multi-guest briefs.** One merged brief from the start, or one per person,
   combined at Create Show? I recommend per person combined at Create Show, since
   research is genuinely per person and Erik and Adam submitted a day apart. This
   changes the data model, so it goes first.
2. **Does the mentor session publish as a normal episode?** The plan assumes yes,
   same markdown, same public page. If mentor sessions should look different
   publicly, say so now, because it changes the publish page and the frontmatter.
