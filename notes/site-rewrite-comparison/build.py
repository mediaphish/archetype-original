"""Builds the side-by-side comparison of original site wording and proposed
rewrites for the Work with Bart repositioning (2026-10-20). Output:
notes/site-rewrite-comparison/comparison.html. Nothing on the site changes from
this; it is the document Bart reviews before any copy is edited."""
import html, pathlib

GLOBAL = [
    ("Thirty-three years / 33 years", "Thirty-four years / 34 years",
     "Meet Bart (3 places), Advisory (2), Consulting, Fractional Roles (3), Culture Science, Archy (4), Journal intro, Podcast intro, Meet Bart search description, live home page."),
    ("more than twelve industries / 12+ industries", "thirteen industries / 13 industries",
     "Culture Science, live home page numbers strip."),
    ("No stake / No stakes in your outcomes", "Outside your ecosystem, with a real stake in how it goes for you (wording per page below)",
     "Advisory, Meet Bart (2 places), live home page."),
    ("Buttons that open the long inquiry form (Start the conversation, Start a Conversation, Contact Bart, Start an Inquiry)",
     "Each goes to the matching option: Book a conversation (one conversation), the Ongoing option from Advisory, Ways to work together from general pages",
     "About 40 buttons across the site. Listed per page below where the label changes."),
    ("Long dashes in visible text", "Commas, colons or periods",
     "Every passage below that is touched. Untouched passages keep their wording."),
]

# (page, address, [(original, proposed, note)])
PAGES = [
 ("Menu and footer (every page)", "all pages", [
  ("Menu: Leadership Advisory ▾ (Leadership Advisory, Fractional Roles, Consulting)",
   "Menu: Work with Bart ▾ (Ways to work together, Leadership Advisory, Consulting, Fractional Roles)",
   "The model you approved. Nothing is removed, Work with Bart becomes the door."),
  ("Red button: WORK TOGETHER (opens the long form)", "Red button: BOOK A CONVERSATION (opens the one-conversation booking)", "Already showing on the two draft pages."),
  ("Footer, Methods column: Consulting · Fractional Roles · Leadership Advisory · The Room (book)",
   "Footer, Work with Bart column: Ways to work together · Leadership Advisory · Consulting · Fractional Roles · The Room (book)", ""),
  ("Footer, Connect column: Work Together", "Footer, Connect column: Book a conversation", ""),
  ("The Operators page has its own copy of the old footer", "Same changes as the main footer", ""),
 ]),
 ("Home page", "archetypeoriginal.com", [
  ("The whole current home page (Leadership Advisory opening, the honest-room scenarios, 'The book. Or the room.', 33 years, 12+ industries, 'No stake in your outcomes')",
   "Replaced by the approved draft at /home-preview", "You have already approved its wording section by section. Search title and description below."),
  ("Search title: Archetype Original | Leadership Advisory — The Honest Conversation Hasn't Happened Yet",
   "Search title: Bart Paden | Work with Bart | Archetype Original",
   "The old one is 86 characters; Google cuts at about 60."),
  ("Search description: Private leadership advisory outside your system — and The Room by Bart Paden ($27): why no internal room can be fully honest, and where the conversation actually begins.",
   "Search description: Thirty-four years of building businesses, on your side of the table. Bart Paden writes about leadership and works with leaders where they are: one conversation, a season, or ongoing.",
   ""),
 ]),
 ("Work with Bart draft (opening and middle section)", "/work-with-bart", [
  ("I have built companies, led them, and sold two of them, across more industries than most people work in over a whole career.",
   "I have built several businesses over thirty-four years. The longest was a software company I grew for twenty-nine years and sold in July 2022, and through it I was connected to 13 different industries.",
   "Your approved wording from the home page."),
  ("Every organization is its own ecosystem. The people, the history, the pressure, the things that work and the things everyone has quietly learned to work around. No program built for everyone fits yours. / So there is no curriculum here. No deliverables list. No arc you have to finish. We work on what is real for you, at the size you need, for as long as it is useful. / Some people need one conversation. Some need a season. A few want someone in their corner for the long haul. / Pick the size that fits. You can always change it.",
   "There is no program here, because your situation was not built from one. You bring what is actually in front of you, and we work it until you can see it clearly. Then we work the next thing. Followed by your four approved blocks: I have carried what you are carrying · Then I went back and checked my work · I do not live inside your ecosystem · Your people matter more than the plan.",
   "Matches the home page exactly."),
  ("Three ways to work together.", "Ways to work together.", "There are four, counting Rising leaders."),
  ("Ongoing option button: Start the conversation", "Ongoing option button: Start an ongoing relationship, plus a link under it: How the advisory works", "Ties Advisory to the Ongoing option."),
  ("(new)", "New section after Rising leaders: FOR YOUR ORGANIZATION. Some of the work is not one leader's situation. It is the whole system. Consulting works with the organization. Fractional roles put me inside it, part-time, in a real seat. → Consulting · Fractional roles",
   "From the model you approved."),
 ]),
 ("Leadership Advisory", "/advisory", [
  ("(new)", "Small line at the top: Part of Work with Bart · See all the ways to work together →", "So nobody gets lost."),
  ("The person across from you has no stake in the outcome of your decisions. No position inside your organization. No team that will be affected by what you choose. No execution burden that increases or decreases based on what direction you take. Nothing about their professional life shifts based on what you say or where you land.",
   "The person across from you does not live inside your organization. No position in it. No team that will be affected by what you choose. No execution burden that rises or falls with the direction you take. Bart has a real stake in how this goes for you, but none of the pressure that comes from living inside it.",
   "The page speaks about you in the third person, so this keeps that, using your approved line."),
  ("Thirty-three years of building and leading companies across manufacturing, medical, insurance, legal, retail, law enforcement, education, government, nonprofit, real estate, and more.",
   "Thirty-four years of building and leading companies, connected to thirteen industries: manufacturing, medical, insurance, legal, retail, law enforcement, education, government, nonprofit, real estate, and more.", ""),
  ("This is not a retained consulting engagement. Bart is not coming into your organization to diagnose it, build systems, or manage implementation. That is a different offer for a different situation.",
   "This is not a retained consulting engagement. Bart is not coming into your organization to diagnose it, build systems, or manage implementation. That is Consulting, a different offer for a different situation.",
   "'Consulting' links to the Consulting page."),
  ("This is not a large-group offering. The advisory is available to a limited number of leaders at any given time. That limit is intentional. The depth of the relationship requires it.",
   "Same, plus a new paragraph: The advisory is the Ongoing relationship on Work with Bart, $3,000 a month. If you would rather start smaller, one conversation is ninety minutes on one real situation, for $500.",
   "Your decision: do you want the price on this page? I recommend yes, it matches Work with Bart."),
  ("Built a software engineering firm from a home office to more than 100 people across multiple locations before its acquisition in 2022. Has spent thirty-three years inside the leadership rooms of organizations across nearly every industry — not as an outside observer but as the person responsible for outcomes that affected real people.",
   "Built several businesses over thirty-four years. The longest, a software engineering firm, grew over twenty-nine years from a home office to more than 100 people across multiple locations before its sale in July 2022. Through it he was inside the leadership rooms of organizations across thirteen industries, not as an outside observer but as the person responsible for outcomes that affected real people.", ""),
  ("Buttons: Start the Conversation · Contact Bart (open the long form)", "Same labels, open the Ongoing booking", ""),
  ("Option 02 — The advisory", "Option 02 · The advisory", "Long dash removed."),
 ]),
 ("Meet Bart", "/meet-bart", [
  ("Thirty-three years inside organizations where leadership either held or broke.", "Thirty-four years inside organizations where leadership either held or broke.", "The page's main headline."),
  ("Buttons: Start a Conversation · Read The Room ($27)", "Buttons: Work with Bart · Read my books", "The Room is now one of three books, not the front door."),
  ("That's the through line of thirty-three years.", "That's the through line of thirty-four years.", ""),
  ("But the work that matters most happens in one room. Outside your system. With one leader who finally has somewhere honest to think. That's what I built Archetype Original to be. Not a consulting firm. Not a coaching practice. A room where the truth finally has somewhere to go.",
   "But the work that matters most to me happens across a table. One leader, one real situation, and somewhere honest to think it through. That's what I built Archetype Original to be. Not a program. Not a framework. A place where the truth finally has somewhere to go.",
   "'Not a consulting firm' no longer fits, since you offer Consulting."),
  ("One of the most reliable drivers of trust and performance I've seen in thirty-three years.", "One of the most reliable drivers of trust and performance I've seen in thirty-four years.", ""),
  ("Four ways to work together. (Only three cards show.)", "Ways to work together.", ""),
  ("(new card)", "01 · Ways to work together. One conversation, a season, or an ongoing relationship, plus a rate for rising leaders. Start with the size that fits. → See the options", "Renumbers the others 02 to 04."),
  ("Card, Leadership Advisory: One room, outside your system. The honest conversation that cannot happen inside your building. No stakes in your outcomes. No deliverables list.",
   "Card, Leadership Advisory: One room, outside your ecosystem. The honest conversation that cannot happen inside your building, with someone who cares how it goes and carries none of its pressure. No deliverables list.", ""),
  ("One room. Outside your system. No stakes in your outcomes. Just the truth, spoken somewhere it has room to go.",
   "One room, outside your ecosystem. Someone with a real stake in how it goes for you, and none of the pressure. Just the truth, spoken somewhere it has room to go.", ""),
  ("Buttons: Start a Conversation · How Advisory Works", "Buttons: Book a conversation · Ways to work together", ""),
  ("Search description: Thirty-three years inside organizations where leadership either held or broke. Bart Paden on the story, the posture, advisory, consulting, and fractional leadership.",
   "Search description: Thirty-four years inside organizations where leadership either held or broke. Bart Paden on the story, the posture, and the ways to work with him.", ""),
 ]),
 ("Consulting", "/consulting", [
  ("(new)", "Small line at the top: Part of Work with Bart · See all the ways to work together →", ""),
  ("Most consultants bring frameworks built elsewhere and hope they fit. Thirty-three years of lived leadership — building companies, leading teams through collapse and recovery, navigating pressure, and understanding how culture actually responds to leadership behavior.",
   "Most consultants bring frameworks built elsewhere and hope they fit. Thirty-four years of lived leadership: building companies, leading teams through collapse and recovery, navigating pressure, and understanding how culture actually responds to leadership behavior.", ""),
  ("Consulting addresses what happens inside the system. Advisory is for the conversation that cannot happen there — outside your organization, where consequence doesn't follow what you say.",
   "Consulting addresses what happens inside the system. Advisory is for the conversation that cannot happen there: outside your organization, where consequence does not follow what you say.", "The Advisory link stays."),
  ("Button: Explore working together (long form)", "Button: Ways to work together (Work with Bart page)", ""),
  ("Buttons: Start a Conversation (long form)", "QUESTION FOR YOU, see the end", "Should organization work start with the $500 conversation, or a free first call?"),
 ]),
 ("Fractional Roles", "/fractional-roles", [
  ("(new)", "Small line at the top: Part of Work with Bart · See all the ways to work together →", ""),
  ("Thirty-three years building companies, leading teams, rebuilding culture, and serving clients across industries.", "Thirty-four years building companies, leading teams, rebuilding culture, and serving clients across thirteen industries.", ""),
  ("I was the marketing department for twenty-seven of my thirty-three years in business.", "I was the marketing department for twenty-seven of my thirty-four years in business.", "Check: is twenty-seven still the right number?"),
  ("I have spent thirty-three years in and around software. For the last four I have been learning something specific: how to lead the building of real applications with AI doing most of the typing.",
   "I have spent thirty-four years in and around software. For the last four I have been learning something specific: how to lead the building of real applications with AI doing most of the typing.", "The rest of the CTO wording stays, per your note that being a CTO is fine."),
  ("Advisory path box (same wording as Consulting)", "Same change as Consulting", ""),
 ]),
 ("Fractional CTO and CCO", "/fractional-roles/cto · /fractional-roles/cco", [
  ("CCO: link labelled 'Mentorship' that opens Leadership Advisory", "Label: Leadership Advisory", "The label was wrong."),
  ("Shared box on both: Consulting and speaking address what happens inside the system. Advisory is for the conversation that cannot happen there — outside your hierarchy, without consequence to your political reality.",
   "Consulting and speaking address what happens inside the system. Advisory is for the conversation that cannot happen there: outside your hierarchy, without consequence to your political reality.", ""),
  ("Button: Explore working together (long form)", "Button: Ways to work together", ""),
 ]),
 ("Every journal entry and podcast episode (the box at the end)", "/journal/… · /podcast/…", [
  ("The conversation starts here. If something in this piece landed because your own room cannot say it out loud, private advisory exists for exactly that gap. → How advisory works · Read The Room first",
   "The conversation starts here. If something in this piece landed close to home, you do not have to work it out alone. One conversation is ninety minutes on the situation you are actually in. → Ways to work together · Book a conversation",
   "The highest-traffic change on the site: 1,732 visits to journal entries since September 10."),
  ("Side link on leadership posts: Advisory — How I work with leaders and teams", "Side link: Work with Bart · How I work with leaders and teams", ""),
 ]),
 ("Contact", "/contact", [
  ("If you are ready to explore advisory or a specific engagement, the Engagement Inquiry is the better starting point.",
   "If you are ready to work together, the Work with Bart page shows the options and how to book.", ""),
  ("If you are exploring an advisory or consulting engagement, use the Engagement Inquiry form.", "If you are exploring working together, start on the Work with Bart page.", ""),
  ("Response box: Advisory · Limited availability", "Response box: Working together · See the options", ""),
  ("Ready for the real conversation? Advisory is available to a limited number of leaders at any given time. When you are ready, the inquiry starts here.",
   "Ready for the real conversation? One conversation is ninety minutes on one real situation. When you are ready, start there.", ""),
  ("Buttons: Go to Engagement Inquiry · Start an Inquiry · How advisory works", "Buttons: Ways to work together · Book a conversation · How the advisory works", ""),
 ]),
 ("The Room (book page)", "/the-room", [
  ("Already updated today by another session to match the revised edition and Work with Bart.", "Only the buttons: Start the Conversation and Contact Bart open the booking instead of the long form", ""),
 ]),
 ("Books, Accidental CEO, Remaining Human", "/books · /accidental-ceo · /remaining-human", [
  ("Books: …or begin with advisory if you already know you need an outside-the-building conversation. Button: Start a conversation",
   "…or begin with a conversation if you already know you need someone outside your building. Button: Book a conversation", ""),
  ("Accidental CEO: If what you are carrying is also structural — the room itself cannot stay honest — read The Room or explore private advisory as the next step. Button: Leadership advisory",
   "If what you are carrying is also structural, and the room itself cannot stay honest, read The Room or start with a conversation. Button: Work with Bart", ""),
  ("Remaining Human: When the problem is not speed — it is honesty inside the room. … If you also need a space where the conversation can be fully true — outside your hierarchy — that is what private advisory is for. Button: Leadership advisory",
   "When the problem is not speed, it is honesty inside the room. … If you also need a space where the conversation can be fully true, outside your hierarchy, that is what the advisory is for. Button: Leadership Advisory",
   "Only the long dashes change here; the advisory still exists."),
 ]),
 ("Culture Science, Scoreboard Leadership, Bad Leader Project", "/culture-science …", [
  ("Culture Science: Thirty-three years of building and leading companies across more than twelve industries.", "Thirty-four years of building and leading companies across thirteen industries.", ""),
  ("Scoreboard: The conversation that cannot happen here, outside your organization, where consequence disappears, is where the work actually starts. That conversation happens in the advisory room. Buttons: Start a Conversation · How Advisory Works",
   "Same wording. Buttons: Book a conversation · How Advisory Works", "The advisory still exists, so only the button target changes."),
  ("Bad Leader Project buttons: Start a Conversation (contact form) · How Advisory Works", "Book a conversation · How Advisory Works", ""),
 ]),
 ("Archy page", "/archy", [
  ("thirty-three years (four places)", "thirty-four years", "Only the years. Archy's page is your other session's area, so I would change nothing else."),
 ]),
 ("Journal and Podcast intros", "/journal · /podcast", [
  ("Journal: Thoughts, insights, and lessons learned from 33 years of building companies and growing people.", "Thoughts, insights, and lessons learned from 34 years of building companies and growing people.", ""),
  ("Podcast: Two kinds of episodes: solo conversations drawn from 33 years of building companies and…", "…34 years…", ""),
 ]),
 ("Inquiry form side panel", "/engagement-inquiry", [
  ("Not ready for this? Read The Room first · How advisory works · General contact form. Advisory: Available to a limited number of leaders at any given time. That limit is intentional.",
   "Not ready for this? Ways to work together · How the advisory works · General contact form. Same advisory line.", "The form itself is a separate decision (see questions)."),
  ("Search title: Work Together | Archetype Original. Description: Start a conversation with Bart Paden about advisory, consulting, or partnership work…",
   "Title: Work with Bart | Archetype Original. Description: Tell Bart what you are carrying. The start of an ongoing relationship, consulting, or a fractional role.", ""),
 ]),
]

QUESTIONS = [
  "Advisory page: show the $3,000 a month price there? (I recommend yes.)",
  "Consulting and Fractional: should organization work start with the paid $500 conversation, or a free first call?",
  "Fractional Roles: is 'twenty-seven of my thirty-four years' as the marketing department still right?",
  "The old 'What I Do' page (not in any menu, still reachable): leave it, or forward it to Work with Bart?",
]

def esc(s): return html.escape(s)

rows = []
for page, addr, items in PAGES:
    rows.append(f'<section><h2>{esc(page)}</h2><p class="addr">{esc(addr)}</p>')
    for o, p, n in items:
        rows.append('<div class="pair">'
                    f'<div class="col old"><span class="tag">Now</span><p>{esc(o)}</p></div>'
                    f'<div class="col new"><span class="tag">Proposed</span><p>{esc(p)}</p></div>'
                    + (f'<p class="note">{esc(n)}</p>' if n else '') + '</div>')
    rows.append('</section>')

g = ''.join(f'<tr><td>{esc(a)}</td><td>{esc(b)}</td><td>{esc(c)}</td></tr>' for a, b, c in GLOBAL)
q = ''.join(f'<li>{esc(x)}</li>' for x in QUESTIONS)

doc = f"""<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Site rewrite comparison</title>
<style>
:root{{--bg:#fafaf9;--fg:#1c1917;--muted:#57534e;--line:#e7e5e4;--old:#fff7ed;--new:#f0fdf4;--accent:#b91c1c}}
@media (prefers-color-scheme:dark){{:root{{--bg:#1c1917;--fg:#f5f5f4;--muted:#a8a29e;--line:#44403c;--old:#2a2119;--new:#16241b;--accent:#f87171}}}}
body{{margin:0;background:var(--bg);color:var(--fg);font:16px/1.55 -apple-system,system-ui,Segoe UI,Roboto,sans-serif}}
main{{max-width:1100px;margin:0 auto;padding:24px 16px 64px}}
h1{{font-family:Georgia,serif;font-weight:400;font-size:30px;margin:0 0 6px}}
h2{{font-family:Georgia,serif;font-weight:400;font-size:22px;margin:40px 0 2px}}
.addr,.lede{{color:var(--muted);margin:0 0 12px}}
.pair{{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:12px 0;border-top:1px solid var(--line);padding-top:12px}}
.col{{border-radius:6px;padding:10px 12px}} .col p{{margin:4px 0 0}}
.old{{background:var(--old)}} .new{{background:var(--new)}}
.tag{{font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}}
.note{{grid-column:1/-1;margin:0;color:var(--muted);font-size:14px}}
table{{width:100%;border-collapse:collapse;font-size:15px}} td,th{{border-bottom:1px solid var(--line);padding:8px;text-align:left;vertical-align:top}}
th{{font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted)}}
.q{{border-left:3px solid var(--accent);padding:4px 16px;margin-top:40px}}
@media (max-width:700px){{.pair{{grid-template-columns:1fr}} table,tbody,tr,td{{display:block}} th{{display:none}} td{{border:0;padding:4px 0}} tr{{border-bottom:1px solid var(--line);padding:8px 0}}}}
</style></head><body><main>
<h1>Site rewrite comparison</h1>
<p class="lede">Every place the site's wording would change under the Work with Bart model, original next to proposed. Nothing has been changed on the site. Prepared October 20, 2026.</p>
<div class="q"><h2>Questions for you</h2><ol>{q}</ol></div>
<h2>Changes that repeat across the site</h2>
<table><thead><tr><th>Now</th><th>Proposed</th><th>Where</th></tr></thead><tbody>{g}</tbody></table>
{''.join(rows)}
</main></body></html>"""

out = pathlib.Path(__file__).with_name('comparison.html')
out.write_text(doc, encoding='utf-8')
print(out, len(doc))
