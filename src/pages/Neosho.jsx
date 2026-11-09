/**
 * /neosho: the landing page for one talk. Bart Paden, "AI and Leadership,"
 * Neosho Chamber of Commerce lunch and learn, Wednesday, November 11, 2026.
 * Chamber members reach it from the QR code on the last slide
 * (public/neosho/neosho-qr.svg and .png). Built like /occ (Bart, 2026-11-08):
 * what the talk said, five steps, a free copy of Remaining Human, and how to
 * reach him.
 *
 * Deliberately private-feeling: not linked from the nav, footer or any page,
 * noindex and nofollow here and in an X-Robots-Tag header (vercel.json),
 * disallowed in robots.txt, and left out of the sitemap and llms.txt.
 */
import React from 'react';
import { Helmet } from 'react-helmet-async';

// The Remaining Human checkout with the room's code already applied, so the
// eBook is free and nobody types anything. The code lives in SamCart.
const BOOK_URL = 'https://aobooks.mysamcart.com/archetype-original/?coupon=NEOSHO';

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

const STEPS = [
  'Pick one task that repeats every week. Let AI do the first draft. You do the final one.',
  'Tell it what good looks like before it starts. Clear goals get better work from people and from machines.',
  'Read everything before it goes out under your name.',
  'Keep the human calls human: relationships, judgment and the hard conversations stay with you.',
  "Check its work like you'd check a sharp new hire: often at first, then as trust is earned.",
];

export default function Neosho() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-white text-[#2B2929]">
      <Helmet>
        <title>AI and Leadership | Archetype Original</title>
        <meta name="robots" content="noindex, nofollow" />
        <meta name="googlebot" content="noindex, nofollow" />
        <meta name="description" content="AI and Leadership, a talk by Bart Paden at the Neosho Chamber of Commerce." />
      </Helmet>
      <style>{"@font-face{font-family:'AO Display';src:url('/fonts/BebasNeue-Regular.ttf') format('truetype');font-display:swap}"}</style>

      <main>
        <header className="bg-black text-white">
          <div className="mx-auto max-w-2xl px-5 pb-12 pt-12 sm:px-8 sm:pt-16">
            <img src="/brand/archetype-original-lockup.svg" alt="Archetype Original" className="mb-10 h-10 w-auto" style={{ filter: 'brightness(0) invert(1)' }} />
            <h1 className={`${display} text-6xl leading-[0.95] sm:text-7xl`}>AI and Leadership</h1>
            <p className="mt-4 text-base text-gray-300">Neosho Chamber of Commerce · Lunch and Learn · November 11, 2026</p>
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
              Forget the headlines. AI isn’t coming for your job, it won’t replace your people, and it isn’t magic. Set up
              well, it helps people with real work. It reads fast, writes fast, and is sometimes wrong with total confidence.
              If the plan is to replace employees with it, that’s the wrong plan.
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
            <p className={`${eyebrow} mb-6 text-[#2B2929]`}>Five steps for this week</p>
            <ol className="list-none space-y-5 pl-0 text-lg leading-relaxed">
              {STEPS.map((s, i) => (
                <li key={s} className="flex gap-4">
                  <span className={`${display} text-3xl leading-none text-[#DB0812]`}>{i + 1}</span>
                  <span>{s}</span>
                </li>
              ))}
            </ol>
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
                Free for Neosho Chamber members.
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
