/**
 * /mcdonald-county: the landing page for one talk. Bart Paden, "AI and
 * Leadership," McDonald County Chamber lunch and learn, Wednesday, November 11,
 * 2026. Chamber members reach it from the QR code on the last slide
 * (public/mcdonald-county/mcdonald-county-qr.svg and .png). Built like /occ (Bart, 2026-11-08):
 * what the talk said, five steps, a free copy of Remaining Human, and how to
 * reach him.
 *
 * Deliberately private-feeling: not linked from the nav, footer or any page,
 * noindex and nofollow here and in an X-Robots-Tag header (vercel.json),
 * disallowed in robots.txt, and left out of the sitemap and llms.txt.
 */
import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';

// The Remaining Human checkout with the room's code already applied, so the
// eBook is free and nobody types anything. The code lives in SamCart.
const BOOK_URL = 'https://aobooks.mysamcart.com/checkout/remaining-human?coupon=MCCFREE';

// Archetype Original's channels, exactly as the site footer lists them.
const SOCIAL = [
  { label: 'LinkedIn', href: 'https://www.linkedin.com/company/archetypeoriginal' },
  { label: 'Facebook', href: 'https://www.facebook.com/archetypeoriginal' },
  { label: 'Instagram', href: 'https://www.instagram.com/archetypeoriginal' },
  { label: 'X', href: 'https://x.com/archetypeog' },
];

// The talk's own type: Bebas Neue for headings, as on the big screen.
const display = "font-['AO_Display',Impact,sans-serif] uppercase tracking-wide";
const eyebrow = 'text-[11px] font-semibold uppercase tracking-[0.2em]';
const button =
  'inline-flex min-h-[48px] w-full items-center justify-center rounded-[2px] px-6 py-3 text-base font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DB0812] focus-visible:ring-offset-2 sm:w-auto';
const link = 'text-[#2B2929] no-underline hover:underline active:underline decoration-[#A8A9AD] underline-offset-4';

// The AI 101 Course (Bart, 2026-11-08): ten basic ideas to put AI to work.
const COURSE = [
  ['Know the difference between a search and a coworker.', 'Asking it a question is a search. Giving it a job, the background and a standard to meet is a coworker. An agent goes one step further: it carries out work on its own, inside limits you set.'],
  ['Start with one task that repeats every week.', 'Let AI do the first draft. You do the final one.'],
  ['Tell it what good looks like before it starts.', 'Clear goals get better work from people and from machines.'],
  ['Give it your context.', 'Your voice, your customers, your past work. Generic in, generic out.'],
  ['Read everything before it goes out under your name.', 'It is sometimes wrong with total confidence.'],
  ["Protect what's private.", 'Keep customer records, passwords and financial details out unless you know exactly where they go.'],
  ['Keep the human calls human.', 'Relationships, judgment and the hard conversations stay with you.'],
  ["Check its work like a sharp new hire's.", 'Often at first, then less as it earns your trust.'],
  ['Budget for it.', 'It costs real time and real money. There is no easy button.'],
  ['Bring your people with you.', 'The employees who learn to direct AI become more valuable. Help them get there.'],
];

// The course's second layer (Bart, 2026-11-08): prompts to copy and try. The
// first four build on each other; the rest are other helpful ideas.
const BUILD_COUNT = 4;

// A good prompt, part by part, like a good assignment for a new hire.
const ANATOMY = [
  ['Role', 'who you want it to be.', 'Act as an operations advisor for small businesses.'],
  ['Context', 'who you are and what is going on, like your business summary from prompt 1.', 'Here is a summary of my business: …'],
  ['Task', 'exactly what you want done.', 'Find three ways to save time on scheduling.'],
  ['Standard', 'what good looks like: length, tone, audience, format.', 'Plain language, one page, a short list.'],
  ['Guardrails', 'what to avoid and how to handle gaps.', "Ask me if something is missing. Mark anything you're unsure of."],
];
const PROMPTS = [
  {
    title: 'Teach it about your business',
    text: 'Act as a business consultant getting to know a new client. I want you to understand my business so you can help me well. Interview me one question at a time about my industry, what my business does and who it serves, my customers, my team, how we make money, my goals for the next year, what takes up most of my week, and how I like to communicate. Wait for my answer before you ask the next question. After about 15 questions, or when I say "done," write a one-page summary titled "About My Business" that I can paste at the start of future conversations. Keep it plain and specific. Do not guess at anything I have not told you.',
    after: 'Save that summary. The next prompts use it.',
  },
  {
    title: 'Find where AI can help',
    text: "Act as an advisor who helps small businesses put AI to work. Here is a summary of my business: [paste your About My Business summary]. Research how businesses like mine are using AI today, and find the five best opportunities for my business. Rank them by how quickly I'd see a result. For each one, give me a short plain-language entry: what it is, what it would save or improve, what kind of AI tool does it, roughly what it costs, and what to watch out for. If you can search the web, use current sources and tell me where each idea came from. Mark anything you're not sure of, and don't make up numbers.",
  },
  {
    title: 'Put it to work',
    text: "Act as my assistant who knows my business. Here is a summary of my business: [paste your About My Business summary]. From the opportunities you found for me, let's start with [the one you picked]. Do the first real piece of it now: [for example, draft the email, build the checklist, or write the schedule]. Write it the way I talk, ready for me to use with light edits. Before you start, ask me up to three questions if anything important is missing. When you finish, list anything you assumed so I can check it, and tell me the next step.",
  },
  {
    title: 'Check its work',
    text: "Act as a tough editor. Here is something an AI wrote for me, for [who will read it and why]: [paste it]. Point out anything that might be wrong, made up, unclear, or that doesn't sound like a real person wrote it. Give me a short list, with a suggested fix for each item. Don't rewrite the whole thing, and say so if you can't tell whether a fact is true.",
  },
  {
    title: 'Turn a meeting into action',
    text: 'Act as my operations assistant. Here are my notes from a meeting about [the topic]: [paste your notes]. Pull out every decision we made, each next step with who owns it, and any deadlines. Then write a short, friendly follow-up email I can send to everyone who was there. If something in my notes is unclear, flag it instead of guessing.',
    after: 'Leave out anything private, like customer details, health information or pay.',
  },
  {
    title: 'Prepare for a hard conversation',
    text: "Act as a leadership coach. I need to have a difficult conversation with [a role, like \"an employee\" or \"a customer\"] about [the issue]. Help me prepare in plain language: What's the one point I need to make clear? How might they react? What questions should I ask so I understand their side? How do I keep it respectful and direct? Don't write me a script, and don't take sides before you've asked me what I know. Help me think it through.",
  },
  {
    title: 'Learn something fast',
    text: 'Act as a patient teacher. I run a small business in [your industry] and have ten minutes. Teach me about [a topic, like "what an AI agent is"] using a simple example from my industry. Keep it short and plain, explain any technical word the first time you use it, and end with one thing I can try this week.',
  },
];

function PromptCard({ n, title, text, after }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };
  return (
    <div className="rounded-[2px] border border-[#D9D3C8] bg-white p-5">
      <p className="mb-3 text-lg font-semibold text-[#2B2929]">
        <span className={`${display} mr-2 text-2xl text-[#DB0812]`}>{n}</span>
        {title}
      </p>
      {/* A copy-and-paste box (Bart, 2026-11-08): the whole prompt selects on a
          tap, and the Copy button sits inside the box. */}
      <div className="relative rounded-[2px] border border-[#BDB6A8] bg-[#F7F4EE]">
        <textarea
          readOnly
          value={text}
          onFocus={(e) => e.target.select()}
          aria-label={`Prompt: ${title}`}
          rows={Math.min(14, Math.ceil(text.length / 48) + 1)}
          className="block w-full resize-y bg-transparent p-4 pb-14 font-mono text-[15px] leading-relaxed text-[#2B2929] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DB0812]"
        />
        <button
          type="button"
          onClick={copy}
          className="absolute bottom-3 right-3 min-h-[40px] rounded-[2px] bg-[#2B2929] px-4 text-sm font-semibold text-white hover:opacity-90"
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      {after ? <p className="mt-3 text-sm italic text-[#6B6B6B]">{after}</p> : null}
    </div>
  );
}

export default function McDonaldCounty() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-white text-[#2B2929]">
      <Helmet>
        <title>AI and Leadership | Archetype Original</title>
        <meta name="robots" content="noindex, nofollow" />
        <meta name="googlebot" content="noindex, nofollow" />
        <meta name="description" content="AI and Leadership, a talk by Bart Paden at the McDonald County Chamber." />
      </Helmet>
      <style>{"@font-face{font-family:'AO Display';src:url('/fonts/BebasNeue-Regular.ttf') format('truetype');font-display:swap}"}</style>

      <main>
        <header className="bg-black text-white">
          <div className="mx-auto max-w-2xl px-5 pb-12 pt-12 sm:px-8 sm:pt-16">
            <img src="/brand/archetype-original-lockup.svg" alt="Archetype Original" className="mb-10 h-10 w-auto" style={{ filter: 'brightness(0) invert(1)' }} />
            <h1 className={`${display} text-6xl leading-[0.95] sm:text-7xl`}>AI and Leadership</h1>
            <p className="mt-4 text-base text-gray-300">McDonald County Chamber · Lunch and Learn · November 11, 2026</p>
          </div>
        </header>

        <section className="mx-auto max-w-2xl px-5 py-12 sm:px-8">
          <figure>
            <blockquote className="text-2xl font-semibold leading-snug text-[#2B2929] sm:text-3xl">
              “AI won’t replace good leadership. It’ll expose the lack of it, faster than anything I’ve ever seen.”
            </blockquote>
            <figcaption className="mt-4 text-sm font-semibold text-[#DB0812]">Bart Paden</figcaption>
          </figure>
        </section>

        <section className="mx-auto max-w-2xl px-5 pb-12 sm:px-8">
          <p className={`${eyebrow} mb-4 text-[#A8A9AD]`}>The talk in short</p>
          <div className="space-y-4 text-lg leading-relaxed">
            <p>
              Forget the headlines. AI isn’t coming for every job, and it isn’t magic. Set up well, it helps people with real
              work. It reads fast, writes fast, and is sometimes wrong with total confidence.
            </p>
            <p>
              But be honest about it: some jobs will change and some will go away. Work built on the same steps every day
              goes first. The people who learn to direct AI become more valuable, not less, and the business that waits is
              the one that gets caught off guard.
            </p>
            <p>
              Most of us use about 5% of it. The rest is work that keeps going when you’re not in the room, but only if
              someone leads it.
            </p>
            <p>Lead it the way you lead people.</p>
          </div>
        </section>

        <section className="bg-[#F0ECE4]">
          <div className="mx-auto max-w-2xl px-5 py-12 sm:px-8">
            <p className={`${eyebrow} mb-2 text-[#2B2929]`}>AI 101 Course</p>
            <h2 className={`${display} mb-8 text-4xl leading-tight text-[#2B2929] sm:text-5xl`}>Ten ideas to put AI to work in your business</h2>
            <ol className="list-none space-y-6 pl-0 text-lg leading-relaxed">
              {COURSE.map(([head, body], i) => (
                <li key={head} className="flex gap-4">
                  <span className={`${display} w-8 flex-shrink-0 text-3xl leading-none text-[#DB0812]`}>{i + 1}</span>
                  <span>
                    <strong className="font-semibold">{head}</strong> {body}
                  </span>
                </li>
              ))}
            </ol>
            <p className="mt-10 text-lg leading-relaxed">
              Want to go deeper? Bart&rsquo;s book{' '}
              <a href={BOOK_URL} className="font-semibold text-[#DB0812] underline underline-offset-4">
                RemAIning Human
              </a>{' '}
              picks up where this course leaves off, and it&rsquo;s free for McDonald County Chamber members with code{' '}
              <strong>{BOOK_CODE}</strong>.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-2xl px-5 py-12 sm:px-8">
          <p className={`${eyebrow} mb-2 text-[#A8A9AD]`}>Try it this week</p>
          <h2 className={`${display} mb-3 text-4xl leading-tight text-[#2B2929] sm:text-5xl`}>The anatomy of a good prompt</h2>
          <p className="mb-5 text-lg leading-relaxed">A good prompt is like a good assignment for a new hire. It has five parts:</p>
          <ul className="mb-8 list-none space-y-3 pl-0 text-lg leading-relaxed">
            {ANATOMY.map(([part, what, example]) => (
              <li key={part}>
                <strong className="font-semibold">{part}:</strong> {what} <em className="text-[#6B6B6B]">&ldquo;{example}&rdquo;</em>
              </li>
            ))}
          </ul>
          <p className="mb-10 text-lg leading-relaxed">
            Every prompt below uses these parts. Copy one into whichever AI you use: ChatGPT, Claude, Gemini, Copilot or Grok,
            and fill in the parts in [brackets].
          </p>
          <h3 className={`${display} mb-2 text-3xl text-[#2B2929]`}>Build it, step by step</h3>
          <p className="mb-5 text-base text-[#6B6B6B]">Do these in order. Each one builds on the one before.</p>
          <div className="space-y-5">
            {PROMPTS.slice(0, BUILD_COUNT).map((p, i) => (
              <PromptCard key={p.title} n={i + 1} {...p} />
            ))}
          </div>
          <h3 className={`${display} mb-5 mt-12 text-3xl text-[#2B2929]`}>Other helpful prompt ideas</h3>
          <div className="space-y-5">
            {PROMPTS.slice(BUILD_COUNT).map((p, i) => (
              <PromptCard key={p.title} n={BUILD_COUNT + i + 1} {...p} />
            ))}
          </div>
        </section>

        <section className="bg-black">
          <div className="mx-auto max-w-2xl px-5 py-12 sm:px-8">
            <p className={`${display} text-4xl leading-tight text-white sm:text-5xl`}>
              Set the goal. Check the work. <span className="text-[#DB0812]">Keep the human in it.</span>
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-2xl px-5 py-12 sm:px-8">
          <p className={`${eyebrow} mb-4 text-[#A8A9AD]`}>A gift for the room</p>
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
            <img src="/images/remaining-human/cover-front.png" alt="Remaining Human, by Bart Paden" className="w-36 flex-shrink-0 rounded shadow-md" />
            <div>
              <p className={`${display} text-3xl text-[#2B2929]`}>Remaining Human</p>
              <p className="mt-2 text-lg leading-relaxed">
                A field guide for leaders navigating speed, pressure and AI without losing clarity, trust or responsibility.
                Free for McDonald County Chamber members.
              </p>
              <a href={BOOK_URL} target="_blank" rel="noopener" className={`${button} mt-5 bg-[#DB0812] text-white hover:opacity-90`}>
                Get your free copy
              </a>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-2xl px-5 pb-12 sm:px-8">
          <p className={`${eyebrow} mb-4 text-[#A8A9AD]`}>Keep the conversation going</p>
          <p className="mb-5 text-lg leading-relaxed">
            Want to talk about what AI could look like in your own business? Bart helps leaders build a plan and put it to
            work. He doesn’t build custom apps. His work is helping you lead it.
          </p>
          <p className={`${display} mb-3 text-3xl text-[#2B2929]`}>Bart Paden</p>
          <ul className="list-none space-y-3 pl-0 text-lg leading-relaxed">
            <li>
              <a href="mailto:bart@archetypeoriginal.com" className={link}>
                bart@archetypeoriginal.com
              </a>
            </li>
            <li>
              <a href="tel:+14173880680" className={link}>
                (417) 388-0680
              </a>
            </li>
            {SOCIAL.map((s) => (
              <li key={s.label}>
                <a href={s.href} target="_blank" rel="noopener noreferrer" className={link}>
                  Archetype Original on {s.label}
                </a>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="mx-auto max-w-2xl px-5 pb-24 pt-4 sm:px-8">
        <p className="text-xs text-[#A8A9AD]">Archetype Original, Carthage, Missouri</p>
      </footer>
    </div>
  );
}
