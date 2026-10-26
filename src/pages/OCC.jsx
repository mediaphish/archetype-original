/**
 * /occ: the landing page for one talk. Bart Paden, "People First Leadership,"
 * Ozark Christian College, Foundations for Organizational Leadership,
 * Monday, October 26, 2026. Students reach it from the QR code on the last
 * slide (public/occ/occ-qr.svg and .png).
 *
 * Deliberately private-feeling: not linked from the nav, footer or any page,
 * noindex and nofollow here and in an X-Robots-Tag header (vercel.json),
 * disallowed in robots.txt, and left out of the sitemap and llms.txt.
 */
import React from 'react';
import { Helmet } from 'react-helmet-async';

const SLIDES_URL = '/occ/people-first-leadership-slides.pdf';

// Archetype Original's channels, exactly as the site footer lists them
// (src/components/Footer.jsx).
const SOCIAL = [
  { label: 'LinkedIn', href: 'https://www.linkedin.com/company/archetypeoriginal' },
  { label: 'Facebook', href: 'https://www.facebook.com/archetypeoriginal' },
  { label: 'Instagram', href: 'https://www.instagram.com/archetypeoriginal' },
  { label: 'X', href: 'https://x.com/archetypeog' },
  // The footer's YouTube link (youtube.com/@aovideolibrary) returns "not found",
  // so it is left out here.
];

// The deck's type: Rubik Bold for headings and quotes, Nunito Sans for labels
// and body text (Bart, 2026-10-25: "fonts need to align with the presentation").
const display = "font-['Rubik',sans-serif] font-bold";

function openArchy() {
  window.dispatchEvent(new CustomEvent('ao-open-chat'));
}

const eyebrow = 'text-[11px] font-semibold uppercase tracking-[0.2em]';
const button =
  'inline-flex min-h-[48px] w-full items-center justify-center rounded-[2px] px-6 py-3 text-base font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DB0812] focus-visible:ring-offset-2 sm:w-auto';

function DashList({ children }) {
  return <ul className="list-none space-y-3 pl-0">{children}</ul>;
}

function DashItem({ children }) {
  return (
    <li className="flex gap-3">
      <span aria-hidden="true" className="text-[#DB0812]">
        —
      </span>
      <span>{children}</span>
    </li>
  );
}

export default function OCC() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-white font-['Nunito_Sans',sans-serif] text-[#2B2929]">
      <Helmet>
        <title>People First Leadership | Archetype Original</title>
        <meta name="robots" content="noindex, nofollow" />
        <meta name="googlebot" content="noindex, nofollow" />
        <meta name="description" content="People First Leadership, a talk by Bart Paden at Ozark Christian College." />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Nunito+Sans:wght@400;700&family=Rubik:wght@700&display=swap"
        />
      </Helmet>

      <main>
        <header className="mx-auto max-w-2xl px-5 pb-10 pt-12 sm:px-8 sm:pt-16">
          <img src="/brand/archetype-original-lockup.svg" alt="Archetype Original" className="mb-10 h-10 w-auto" />
          <h1 className={`${display} text-4xl leading-[1.08] text-[#2B2929] sm:text-5xl`}>People First Leadership</h1>
          <p className="mt-3 text-base text-[#6B6B6B]">Ozark Christian College, October 26, 2026</p>
        </header>

        <section className="mx-auto max-w-2xl px-5 pb-12 sm:px-8">
          <figure>
            <blockquote className={`${display} text-2xl leading-snug text-[#2B2929] sm:text-3xl`}>
              “If you grow people, you grow the organization. If you use people, you lose it.”
            </blockquote>
            <figcaption className="mt-4 text-sm font-semibold text-[#DB0812]">Bart Paden</figcaption>
          </figure>
        </section>

        <section className="mx-auto max-w-2xl px-5 pb-12 sm:px-8">
          <p className={`${eyebrow} mb-4 text-[#A8A9AD]`}>The talk in short</p>
          <div className="space-y-4 text-lg leading-relaxed">
            <p>
              Serving comes first. Robert Greenleaf called his work The Servant as Leader, not The Leader as Servant, and
              the order matters. He said the servant leader starts with a natural desire to serve, then chooses to lead.
            </p>
            <p>
              His best test: do the people you serve grow as people? Do they become healthier, wiser, freer, more autonomous,
              and more likely to serve others?
            </p>
            <p>
              The world pulls the other way, toward scoreboards, followers, grades and titles, and people first is a choice
              you make again and again. So ask one question this week: who did I make better?
            </p>
          </div>
        </section>

        <section className="bg-[#E1DED8]">
          <div className="mx-auto max-w-2xl px-5 py-12 sm:px-8">
            <p className={`${eyebrow} mb-5 text-[#2B2929]`}>Take this with you</p>
            <p className={`${display} text-3xl leading-tight text-[#2B2929] sm:text-4xl`}>Faith. Curiosity. Humility.</p>
            <p className={`${eyebrow} mb-2 mt-10 text-[#2B2929]`}>One question for the week</p>
            <p className={`${display} text-2xl leading-snug text-[#DB0812] sm:text-3xl`}>Who did I make better this week?</p>
          </div>
        </section>

        <section className="bg-[#2B2929]">
          <div className="mx-auto max-w-2xl px-5 py-12 sm:px-8">
            <p className={`${eyebrow} mb-5 text-[#A8A9AD]`}>In Greenleaf’s words</p>
            <figure>
              <blockquote className={`${display} text-xl leading-relaxed text-white sm:text-2xl`}>
                “The servant-leader is servant first… It begins with the natural feeling that one wants to serve, to serve
                first. Then conscious choice brings one to aspire to lead.”
              </blockquote>
              <figcaption className="mt-5 text-sm text-[#A8A9AD]">Robert K. Greenleaf, The Servant as Leader, 1970</figcaption>
            </figure>
          </div>
        </section>

        <section className="mx-auto max-w-2xl px-5 py-12 sm:px-8">
          <div className="flex flex-col gap-3 sm:flex-row">
            <a href={SLIDES_URL} target="_blank" rel="noopener" className={`${button} bg-[#DB0812] text-white hover:opacity-90`}>
              Download the slides
            </a>
            <button type="button" onClick={openArchy} className={`${button} border border-[#2B2929] bg-white text-[#2B2929] hover:bg-[#F0ECE4]`}>
              Ask Archy about this talk
            </button>
          </div>
          <p className="mt-3 text-sm text-[#6B6B6B]">Archy is an AI trained on what Bart has written.</p>
        </section>

        <section className="mx-auto max-w-2xl px-5 pb-12 sm:px-8">
          <p className={`${eyebrow} mb-5 text-[#A8A9AD]`}>Keep the conversation going</p>
          <p className={`${display} mb-4 text-2xl text-[#2B2929]`}>Bart Paden</p>
          <div className="text-lg leading-relaxed">
            <DashList>
              <DashItem>
                <a href="mailto:bart@archetypeoriginal.com" className="underline decoration-[#DB0812] underline-offset-4">
                  bart@archetypeoriginal.com
                </a>
              </DashItem>
              <DashItem>
                <a href="tel:+14173880680" className="underline decoration-[#DB0812] underline-offset-4">
                  (417) 388-0680
                </a>
              </DashItem>
              {SOCIAL.map((s) => (
                <DashItem key={s.label}>
                  <a href={s.href} target="_blank" rel="noopener noreferrer" className="underline decoration-[#DB0812] underline-offset-4">
                    Archetype Original on {s.label}
                  </a>
                </DashItem>
              ))}
            </DashList>
          </div>
        </section>
      </main>

      <footer className="mx-auto max-w-2xl px-5 pb-24 pt-4 sm:px-8">
        <p className="text-xs text-[#A8A9AD]">Archetype Original, Carthage, Missouri</p>
      </footer>
    </div>
  );
}
