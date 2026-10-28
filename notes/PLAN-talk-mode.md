# Talk mode: plan (approved 2026-10-28)

The first talk is AI and Leadership at the Neosho, Missouri Chamber of Commerce
on Wed, Nov 11, 2026. It's a lunch and learn on a big screen: about 45 minutes
of talk and demo, then about 15 minutes of questions, and Bart stays after for
longer conversations.

Bart: "Maybe instead of a slide deck. We have the whole talk built out in
Auto?" and "Let's explore voice. I think that would blow them away." He is
using a Logitech R500s clicker.

The talk is a demo of what he built. It is not a pitch, and there is no "come
talk to me" ([[project-auto-for-clients]] in memory).

## Themes (Bart's)

- AI isn't scary and isn't going to kill you.
- It's imperfect.
- There is power in it, but you have to own it.
- "I don't trust you." Constant diligence and accountability.
- The machine never has a complete dataset. The human factor is always missing.
- It's not an easy button. It's a real financial investment and takes a lot of
  monitoring to get right.

## Running order (45 min)

| Minutes | Section |
|---|---|
| 4 | Opening, with Ada |
| 5 | Headlines vs. what's real |
| 5 | Most of you are using 5% of it |
| 5 | What I built |
| 8 | Live demo ("Live from the room": photo, team, real post) |
| 7 | Why I don't trust it (real examples: the logo, the false alarm, the missing plan) |
| 5 | The machine never has the whole picture |
| 4 | Not an easy button |
| 2 | Close on leadership |

## Build

1. **Talk view** at `/ao/talk?slug=...`. Full screen, one idea per screen, and
   none of Auto's controls show. The clicker sends Page Down / Page Up (arrow
   keys and space also work).
2. **Voice.** Holding the clicker's Back button, or the V key, listens through
   the browser's own speech recognition, which costs nothing.
   - Commands like next, back, first slide, go to slide N and start the demo
     run on the page itself, with no AI and no cost.
   - Anything addressed to a teammate gets a short real reply through
     /api/ao/talk/ask.
3. **Voices** through /api/ao/talk/speak (OpenAI speech; Anthropic sells no
   voices). Each teammate has their own voice.
4. **The demo** opens a #demo chat ("Live from the room"). That comes next.
5. **A phone page** as a backup clicker. That comes next.
6. **Rehearsal mode** (never posts) and an offline backup file. Those come next.
7. **Content.** Jot drafts the sections, Red challenges them, and Bart approves
   every word.

## Cost

About $1 to $3 a talk.
