# Plan: the devotional channel runs on its own in 2027

Written 2026-11-11 by the Devotional session, at Bart's request: "I need a full executable plan that I need to setup to make this a completely automated channel for 2027."

Status: **draft for Bart's approval.** Nothing in this plan is built yet.

This plan builds on what already exists:
- `devotionals-2027/REWORK_AUDIT.md`, the September audit. Bart approved it on 2026-10-27 as the 2027 rework plan.
- `notes/PLAN-faith-teammate.md`, the plan for Lev. Lev is named and his picture is ready, but he has not been built yet.
- `notes/HANDOFF-DEVOTIONALS-2026-10.md`, Bart's earlier decisions.

Nothing in it replaces those documents. It turns them into one schedule with owners and dates.

---

## The goal in one paragraph

Starting at midnight on January 1, 2027, a devotional posts to the public Facebook Page every morning without anyone touching it. It also goes out by email and appears on /faith. Each post goes up with its first comment already attached. Comments are watched all day. Real people get real replies, and people who only came to fight are quietly handled. Easter, Thanksgiving and Advent land on the right days every year without anyone moving dates by hand. Bart's job shrinks to reading and approving days ahead of time and deciding the rare hard call. Meanwhile this session starts building a completely new year of devotionals for 2028.

---

## Who does what

| Who | Job |
|---|---|
| **Bart** | Creates the Facebook Page. Approves every day before it is scheduled. Makes the decisions listed at the end. Has the final word on any ban. |
| **Devotional session (this one)** | Finishes 2026 (November, then Advent). Works with Lev on the 2027 rework. Writes the specifications the AO.com session builds from. Owns the 2028 plan. |
| **AO.com session** (the main Claude Code chat for the site) | Builds Lev, the scheduler, the Page connection, and the comment watching and moderation tools inside Auto. |
| **Lev** (new teammate in Auto) | Does the 2027 rework one month at a time. Schedules the approved days. Drafts first comments and replies. Watches the comments every day. |
| **Bit** (existing teammate) | Checks every morning that the post went up, the comment attached and the email went out. Reports anything that didn't happen. |

---

## Part 1. Fix the duplicates (your item 1)

The audit already lists every duplicate from the first part of the year, before the overlap check existed.

- **38 posts get a new passage.** These repeat a passage, or say the same thing as another post. Most are in January (9), February (11) and March (9).
- **63 posts keep their passage but get a fuller reflection.** January through April were written much shorter than May onward (about 100 words compared with 200 or more). These get brought up to the same depth.
- **44 posts get light edits.** Examples: titles that start with "March 20:", leftover web links, missing "(ESV)" labels, and the weekly wording covered in Part 2.
- **126 posts stay exactly as they are.**

**Gap to close first:** the audit stopped at September 30. October, November and Advent 2026 went through the overlap check as they were written, but nobody has checked them against the whole year at once. Lev runs that full check before the rework starts. Bart decides on anything it finds.

**Rule for every replacement:** a new passage is checked against all 365 days, and against every other replacement, before it is written. That is the step that was missing in January.

---

## Part 2. Weekly wording (your item 2)

The problem: posts that say "this week has covered", "yesterday's passage" or "back in the first week" only make sense when they run in their original order and on their original weekday. In 2027 every date falls on a different weekday, and some months move around (Part 4).

What the audit found:
- **15 posts from August and September** refer to "this week" or "yesterday" as positions in the series. Each gets those sentences rewritten. The teaching stays exactly the same; only the reference to timing changes. For example, "This week has traced accountability from several directions" becomes "Accountability has come at leaders from several directions."
- **1 post refers to a specific date** ("back on September 21"). It gets the same fix.
- **Overviews that name a month or say "this month"** (March 1, March 31, April 30) need rewording, because the Easter fix moves those posts.

What stays: application lines like "Choose one conversation this week..." talk about the reader's own week, not the series. Those work in any year and stay as they are.

**Going forward:** one automatic check refuses any post that refers to another post by day or week. It already runs on every new devotional this session writes. It moves into Lev's checks too.

---

## Part 3. Month summaries and overviews as their own posts (your item 3)

Today the month's overview is stuck on top of the last day's devotional (for example, October 31 and November 28). You asked for them to be separate posts with more depth.

**Proposed shape:**
- **Month in Review.** Its own post, about 400 to 600 words. It walks back through the month's arc by week, names the thread that ties it together, and ends with one question for the comments: which day stayed with you, and why. That gives the review a job of its own: it starts a conversation.
- **Month Ahead.** Its own post. It introduces the next month's theme, why it follows from the last one, and what to watch for. It's shorter, about 250 to 350 words.
- **Both are written for the book too.** You already decided the monthly intros and summaries are written separately for the book. This makes them the same pieces.
- **The daily devotional on those days goes back to being only a devotional.** The 2026 overviews get lifted out into their own posts, and January and February, which never had one, get one written.

**Decision needed (when do they post):** they could post as a second post on the last day of the month, for example in the evening, or the Review could go out on the last day and the Month Ahead on the morning of the 1st, before the devotional. My recommendation is the Review in the evening of the last day and the Month Ahead early on the 1st. That puts each one on the day it belongs to without crowding out the devotional.

---

## Part 4. Holidays that move (your item 4)

**What went wrong in 2026:** Easter was April 5, but the resurrection post ran April 28, because the whole story was laid out by calendar date starting April 1.

**The fix: posts tied to an event, not a date.** Every post gets a small tag that says what it is tied to:
- **Fixed date:** New Year's Day, February 14, July 4, Christmas Day.
- **Counted from Easter:** the whole passion story. "It is finished" is always the Friday before Easter, the burial is always Saturday, and "He Has Risen" is always Easter Sunday.
- **Counted from Thanksgiving:** the Thanksgiving Day post, always the fourth Thursday of November.
- **Counted from the first Sunday of Advent:** the Advent series, which always starts on the fourth Sunday before Christmas.
- **Fill:** everything else, which flows into the open days around those anchors, in order.

Each year a program lays out all 365 days from those tags. Nobody moves dates by hand again.

**2027 dates:** Palm Sunday March 21, Good Friday March 26, Easter March 28. Thanksgiving November 25. Advent starts November 28.

**What that means for 2027:**
- The passion story starts March 1 and lands on Easter Sunday, March 28.
- The self-control month, which ran in March 2026, moves to April.
- That is the audit's recommendation (Option 1 for 2027, built on Option 3 so 2028 also works). It still needs your yes.

**A built-in safety check:** before anything is scheduled for a year, the program confirms that "He Has Risen" is on Easter Sunday, that the Thanksgiving post is on Thanksgiving and that Advent starts on the right Sunday. If any of those is wrong, nothing gets scheduled until it's fixed. That is the guarantee the story lands on Easter.

**The catch this creates, and the fix:** the seasons change length from year to year.
- November has 28 days before Advent in 2026, 27 in 2027 and 32 in 2028.
- The days available for self-control around Easter also change each year.

So a few posts in each of those series are marked "flexible." They can be left out in a short year, and a few extra flexible posts are written for long years. I write the Advent 2026 posts with this in mind now.

**Holy Week, a possible upgrade (decision):** the story could also be arranged so Palm Sunday carries the entry into Jerusalem and the week follows the real days, instead of only the last three days lining up. It is a bigger rearrangement. I'd do the guaranteed landing first and treat this as a later improvement, unless it matters to you for 2027.

---

## Part 5. First comments and real conversation (your item 5)

Views are a weak signal. Comments, and especially comments that get replies, are the strong one. Facebook also shows posts with active conversation to more people, so conversation is how the Page grows.

**Rules for every first comment:**
- One question a person can answer from their own life in a sentence or two. "What is one thing God has done that you never wrote down?" works. "Do you agree?" does not.
- Never a yes or no question. Never a theology debate starter. Never a quiz about the passage.
- Personal, but safe to answer in public.
- It posts automatically within a minute of the devotional, from the Page, so it is the first thing people see. The site can already post first comments on Facebook, so this part mostly exists.

**Ways to get people talking, beyond the first comment:**
- **Reply fast to the first few commenters.** The first hour matters most, and early replies make others more willing to join in.
- **The Month in Review question** (Part 3) brings back people who read all month.
- **A standing prayer thread** once a week, a separate short post that asks how people can be prayed for. These tend to draw the most honest replies on faith Pages. It needs a careful moderation plan, because people share real pain there (Part 7).
- **Learn what works.** Lev keeps a running record of which questions drew the most replies and which drew none. Each month he shows you the top five and bottom five, so future questions are written like the ones that worked.

**What we measure** (monthly, in plain numbers):
- Comments per post.
- How many people commented for the first time.
- How many came back to comment again.
- Replies between readers, which is the best sign of all.
- Shares.
- Email opens.

---

## Part 6. Handing the work to Auto (your item 6)

**What the AO.com session builds**, in this order:

1. **Lev, the teammate.** His instructions, his voice (your devotional voice, not your leadership voice), and the faith side of your writing to learn from. He also gets every rule this session follows:
   - your review format;
   - approval per date;
   - real ESV text only;
   - nothing added to a passage;
   - no week wording;
   - the overlap check;
   - no em dashes;
   - power is never written as good;
   - nothing that reveals how the work is made.
2. **A private place for the drafts.** The site's code is public, so drafts can never live there. The 2027 working copies and the guide documents now in your Downloads folder move into the private database, where Lev can read them. This also backs them up beyond the Mac.
3. **The scheduler.** It lays out the year from the tags (Part 4), runs the safety check, and holds each approved day until its date.
4. **The Page connection.** It connects the new Page the same way the company Page is connected and posts a test.
5. **The morning run.** Each morning it publishes the day's devotional to the Page, adds the first comment, sends the email and puts the post on /faith. Then Bit confirms all of it.
6. **Editing after scheduling.** Fixing a post that is already scheduled or published, on the Page and on /faith. You asked for this earlier.
7. **The comment tools** (Part 7).

**How I work with the AO.com session:**
- I write each piece as a specification: what it must do, what done looks like, and how to test it.
- I send it to that session and check the result against the live site, not against what the session says it did.
- Nothing goes live until it has been tested on a real post.

**Dress rehearsal:** for the last two weeks of December, the system runs fully on the new Page, either privately or as test posts, while the Group still gets posted by hand. Midnight on January 1 is the first public post, not the first attempt.

**How you review, once Lev is running:** Lev brings you each month in batches of seven days, in the same review format you get now. You approve by date. Nothing you haven't read gets scheduled.

---

## Part 7. Watching comments, replying and moderating (your item 7)

A public Page will draw people who disagree, and some who only want a fight. The plan treats those two groups differently. Someone who is honestly offended and says so respectfully is part of the conversation. Someone being belligerent is not.

**Layer 1, Facebook's own filters** (you switch these on in the Page settings; I'll give you the exact list):
- The profanity filter, set to strong.
- A blocked-words list for slurs, common attacks and spam phrases. Comments containing them are hidden automatically.
- Links from strangers held back.
- **Page rules posted in the About section**, short and plain. For example: we welcome questions and disagreement, and we remove personal attacks, mockery, spam and hate. Having the rules posted gives every hide or ban a clear reason.

**Layer 2, Lev reads every comment, every day.** He sorts each one into one of these groups:

| Kind of comment | What happens |
|---|---|
| Thanks, "Amen", short encouragement | A warm short reply, or a like |
| A real answer to the question | A personal reply that continues the conversation |
| A sincere question about faith or the passage | A drafted reply for you to approve |
| Respectful disagreement | Stays up. A gracious drafted reply for you, or no reply if replying would only feed an argument |
| A prayer request or personal pain | A gentle reply, and you're told about it |
| Someone who may be in danger (self-harm, abuse) | You're alerted right away. No automatic reply, ever. Crisis resources are ready for you to use |
| Hostile, mocking, insulting, trolling | Hidden. Hiding keeps it visible to the person who wrote it and their friends, so they usually don't realize it was hidden and have nothing to escalate. No reply |
| Spam and scams | Hidden and reported |

**Layer 3, the ladder for repeat offenders:**
1. First hostile comment: hidden, no reply.
2. Second: hidden, and the person is put on a watch list.
3. Third, or any threat or hate: Lev asks you to ban them, with the comments attached. **You make every ban decision.** Nobody is banned automatically.

**Layer 4, records and a daily digest.**
- Every hide, reply and ban request is logged.
- Once a day you get a short note covering: the conversations worth seeing, what was hidden and why, anything waiting on you, and anyone on the watch list.
- Anything urgent comes right away instead of waiting for the daily note.

**Replies speak as the Page, in your voice.** They never mention AI, tools or how the work is made.

**Decision needed (how much Lev replies on his own):** my recommendation is to start with Lev replying on his own only to simple thanks and to real answers to the day's question. Everything else waits for your OK. After a month, look at what he wrote and decide whether to give him more.

**A permission to watch for:** reading and hiding comments on a Page needs extra permissions from Facebook beyond posting. Facebook may need to review the app before it allows that, which can take days or weeks. This is the item most likely to slip, so the AO.com session asks for those permissions first, before anything else in this part.

---

## Part 8. Getting ready for a new year in 2028 (your item 8)

2028 is a fresh 365, not another rework of the 2027 set. You decided earlier to keep a running record for exactly this purpose.

What this session does:
1. **The used-passage list.** Every passage used in 2026 and 2027, by the full section of text it belongs to, not just the verse numbers. A 2028 passage is only used if its whole section is clear of everything on the list. This list already exists as the devotional index, and it grows with every post.
2. **The 2028 themes.** Twelve monthly themes, plus the Easter, Thanksgiving and Advent series, built on the same event tags (2028: Easter April 16, Thanksgiving November 23, Advent starts December 3). The themes come to you as one plan to approve, ideally by March 2027.
3. **A passage bank.** For each approved theme, a checked list of possible passages, built well ahead of the writing. Possible means it has passed the overlap check and has been read in full context, not pulled from memory.
4. **A writing pace that stays ahead.** Starting around April 2027, about one month of 2028 is written each month alongside the 2027 work. That keeps two to three months finished ahead of the calendar by the time 2028 starts, so there's no scramble like this December.
5. **Lessons carried forward.** A short file of every rule learned in 2026 and 2027 goes into the 2028 writing from day one. Examples: the January length problem, the weekly wording, the Easter landing.

Whether Lev or this session writes the 2028 drafts can be decided later. The plan works either way.

---

## The calendar

| When | What | Who |
|---|---|---|
| Now to Nov 25 | Finish November. Bring you the Advent plan before Thanksgiving | Devotional session |
| Now to Nov 20 | Your decisions on this plan (list below). You create the Facebook Page | Bart |
| Nov 16 to Dec 1 | Specifications to the AO.com session. Build Lev, the private draft storage and the scheduler. Ask Facebook for the comment permissions | Devotional session, AO.com session |
| Nov 29 to Dec 31 | Advent 2026 published, written with the event tags | Devotional session |
| Dec 1 to Dec 15 | Full overlap check of all 365 days. January 2027 reworked (9 new passages, 22 fuller reflections, plus the January Month Ahead and Review). January to you in batches of seven | Lev with the Devotional session, Bart reviews |
| Dec 15 to Dec 31 | Dress rehearsal on the Page. Comment tools tested on test posts. February rework under way | AO.com session, Lev, Bit |
| Jan 1, 2027 | First public post on the Page. The Group posting ends once the Page has carried a full month | Automatic |
| January | February finished and approved by Jan 20. March (the passion story, which starts Mar 1) by Feb 10 | Lev, Bart |
| February to April | March to May reworked, each at least three weeks ahead | Lev, Bart |
| March 28, 2027 | "He Has Risen" posts on Easter Sunday | Automatic |
| By March 2027 | 2028 themes to you for approval | Devotional session |
| April 2027 on | 2028 writing starts, one month at a time | Devotional session or Lev |

**Your review load, honestly:** January to April is where most of the rework sits, roughly 25 to 30 changed days each month, plus the month posts. After April it drops to a handful of light edits each month, because most of May to September stays as written.

---

## Decisions I need from you, one at a time

1. **Does the Facebook Page exist yet?** If not, it's yours to create (I can't create accounts or Pages), and it's the first thing everything else waits on.
2. **Easter:** the story starts March 1 and lands on Easter Sunday, March 28, with self-control moving to April (the audit's recommendation).
3. **When the month posts go out:** the Review in the evening of the last day and the Month Ahead early on the 1st, or another arrangement.
4. **How much Lev replies on his own** at the start (recommendation in Part 7).
5. **The weekly prayer thread:** yes or no.
6. **The open questions left over from the audit** (for example, the February 14 personal piece about Carie on a public Page, and a few pairs of posts where you choose which one to keep).

---

## Answers so far

- 2026-11-11: the devotional Facebook Page does not exist yet. Bart creates it.
- 2026-11-11, Easter: "I need it to land on Easter every year, so yes. Whatever that takes." Approved: event tags with a safety check that blocks scheduling if Easter is wrong (Part 4). 2027 runs the passion story from Mar 1 to Easter Mar 28, and self-control moves to April.

## Changed files for this plan

- `notes/PLAN-devotionals-2027-automation.md` (this file)
