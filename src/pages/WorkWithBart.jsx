/**
 * Work with Bart (/work-with-bart). DRAFT, 2026-10-19.
 *
 * Replaces the three separate offers (Advisory, Consulting, Fractional) with one
 * door and four sizes, agreed with Bart the same day:
 *
 *   One conversation   $500, 90 minutes, one real situation
 *   A season           $1,500 a month, three months, two conversations a month
 *   Ongoing            $3,000 a month, a standing relationship
 *   Rising leaders     $150, three spots a month, apply with a short note
 *
 * Why: the site sold a high-trust relationship to CEOs while the people who
 * actually showed up were readers, and nothing was sized for them. Zero
 * inquiries came through the form between October 4 and October 19. Bart's own
 * words for what he wants: "meet people where they are and use my 34 years of
 * being in business of some kind to help them navigate their own ecosystems."
 * And on up-and-comers: "They have a lot of my heart."
 *
 * Held back from search and from the navigation until Bart approves it. Booking
 * buttons go to the existing inquiry form until paid checkout is set up.
 */
import React from 'react';
import { Helmet } from 'react-helmet-async';

const SAMCART_THE_ROOM_URL =
  import.meta.env.VITE_THE_ROOM_SAMCART_URL || 'https://aobooks.samcart.com/products/the-room';

function goToPath(event, path) {
  event.preventDefault();
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
  window.scrollTo({ top: 0, behavior: 'instant' });
}

const btnPrimary =
  'inline-flex min-h-[44px] items-center justify-center rounded-[3px] bg-ao-red px-7 py-3 text-base font-semibold text-white shadow-sm transition hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ao-red focus-visible:ring-offset-2';

const btnGhost =
  'inline-flex min-h-[44px] items-center justify-center rounded-[3px] border border-white/40 bg-white/10 px-6 py-3 text-base font-semibold text-white backdrop-blur-sm transition hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60';

const btnDark =
  'inline-flex min-h-[44px] w-full items-center justify-center rounded-[3px] bg-stone-900 px-6 py-3 text-base font-semibold text-white transition hover:bg-stone-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 focus-visible:ring-offset-2';

const OPTIONS = [
  {
    key: 'conversation',
    name: 'One conversation',
    price: '$500',
    unit: 'one time',
    who: 'For anyone carrying one real situation.',
    body: [
      'Ninety minutes on the thing in front of you. A decision. A person. A plan that is not working the way it looked on paper.',
      'You bring the situation. We work it until you can see it clearly. No intake process. No program to join.',
    ],
    cta: 'Book a conversation',
    path: '/engagement-inquiry?option=conversation',
  },
  {
    key: 'season',
    name: 'A season',
    price: '$1,500',
    unit: 'a month, for three months',
    who: 'For the leader in a stretch.',
    body: [
      'Growth, a transition, a rebuild. The kind of stretch where the decisions keep coming and the stakes keep rising.',
      'Two conversations a month, and you can reach me in between when something will not wait.',
    ],
    cta: 'Start a season',
    path: '/engagement-inquiry?option=season',
  },
  {
    key: 'ongoing',
    name: 'Ongoing',
    price: '$3,000',
    unit: 'a month',
    who: 'For owners who want someone in their corner.',
    body: [
      'A standing relationship. When the weight shows up, you are not carrying it alone.',
      'As often as you need it. No agenda except yours.',
    ],
    cta: 'Start the conversation',
    path: '/engagement-inquiry?option=ongoing',
  },
];

export default function WorkWithBart() {
  return (
    <>
      <Helmet>
        <title>Work with Bart | Archetype Original</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <main className="min-h-screen bg-stone-50 text-stone-900 [text-rendering:geometricPrecision]">
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-stone-200 bg-stone-950">
          <div className="mx-auto grid max-w-7xl lg:grid-cols-2 lg:items-stretch lg:gap-0">
            <div className="relative z-10 flex flex-col justify-center px-4 py-14 sm:px-6 sm:py-20 md:px-10 lg:py-24 lg:pr-8">
              <p className="mb-4 text-[11px] uppercase tracking-[0.22em] text-[#C8B8A8]">Work with Bart</p>
              <h1 className="font-serif text-4xl leading-[1.08] text-white sm:text-5xl md:text-6xl">
                Thirty-four years of building things. On your side of the table.
              </h1>
              <div className="mt-8 space-y-6 text-lg leading-relaxed text-stone-300">
                <p>
                  I have built companies, led them, and sold two of them. Thirty-four years across more industries than most
                  people work in over a career.
                </p>
                <p>
                  That is what I bring. Not a framework. Not a program. Someone who has been where you are and can help you see
                  your own situation more clearly than you can from inside it.
                </p>
                <p className="font-medium text-stone-100">You bring what you are actually carrying.</p>
                <p className="font-medium text-stone-100">We start there.</p>
              </div>
              <div className="mt-10 flex flex-wrap items-center gap-4">
                <a href="#options" className={btnPrimary}>
                  See how we can work together
                </a>
                <a href={SAMCART_THE_ROOM_URL} target="_blank" rel="noopener noreferrer" className={btnGhost}>
                  Read The Room First, $27
                </a>
              </div>
            </div>
            <div className="relative min-h-[380px] lg:min-h-[560px]">
              <img
                src="/images/Bart-32.jpg"
                alt="Bart Paden, founder of Archetype Original"
                className="absolute inset-0 h-full w-full object-cover object-[center_top]"
                loading="eager"
              />
              <div className="pointer-events-none absolute inset-0 bg-black/10 lg:bg-transparent lg:bg-gradient-to-r lg:from-stone-950 lg:to-transparent" />
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="border-b border-stone-200 bg-stone-50 py-14 sm:py-20 md:py-24">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 md:px-10">
            <h2 className="font-serif text-3xl leading-tight text-stone-900 sm:text-4xl">
              I meet you where you are.
            </h2>
            <div className="mt-8 space-y-6 text-lg leading-relaxed text-stone-700">
              <p>
                Every organization is its own ecosystem. The people, the history, the pressure, the things that work and the
                things everyone has quietly learned to work around. No program built for everyone fits yours.
              </p>
              <p>
                So there is no curriculum here. No deliverables list. No arc you have to finish. We work on what is real for
                you, at the size you need, for as long as it is useful.
              </p>
              <p>
                Some people need one conversation. Some need a season. A few want someone in their corner for the long haul.
              </p>
              <p className="font-semibold text-stone-900">Pick the size that fits. You can always change it.</p>
            </div>
          </div>
        </section>

        {/* Options */}
        <section id="options" className="scroll-mt-24 border-b border-stone-200 bg-white py-14 sm:py-20 md:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 md:px-10">
            <h2 className="font-serif text-3xl leading-tight text-stone-900 sm:text-4xl">Three ways to work together.</h2>
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {OPTIONS.map((o) => (
                <div key={o.key} className="flex flex-col border border-stone-200 bg-stone-50 p-6 sm:p-8">
                  <h3 className="font-serif text-2xl text-stone-900">{o.name}</h3>
                  <p className="mt-1 text-sm text-stone-600">{o.who}</p>
                  <p className="mt-6">
                    <span className="font-serif text-4xl text-stone-900">{o.price}</span>
                    <span className="ml-2 text-sm text-stone-600">{o.unit}</span>
                  </p>
                  <div className="mt-6 flex-1 space-y-4 text-base leading-relaxed text-stone-700">
                    {o.body.map((line) => (
                      <p key={line}>{line}</p>
                    ))}
                  </div>
                  <button type="button" onClick={(e) => goToPath(e, o.path)} className={`mt-8 ${btnDark}`}>
                    {o.cta}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Rising leaders */}
        <section className="border-b border-stone-800/80 bg-stone-900 py-14 sm:py-20 md:py-24">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 md:px-10">
            <p className="mb-4 text-[11px] uppercase tracking-[0.22em] text-[#C8B8A8]">Rising leaders</p>
            <h2 className="font-serif text-3xl leading-tight text-white sm:text-4xl">
              If you are early in this, I want to hear from you.
            </h2>
            <div className="mt-8 space-y-6 text-lg leading-relaxed text-stone-300">
              <p>
                My favorite part of building a company was never the revenue. It was developing young people into real leaders.
                It still is.
              </p>
              <p>
                If you are early in your career and carrying more than your title says, the one-conversation session is $150
                for you. I hold three of these a month.
              </p>
              <p>
                Send me a short note. Tell me where you are and what you are carrying. I read every one myself.
              </p>
              <p className="font-medium text-stone-100">You do not need to be sure it counts as leadership. If you are asking, it probably does.</p>
            </div>
            <div className="mt-10">
              <button type="button" onClick={(e) => goToPath(e, '/engagement-inquiry?option=rising')} className={btnPrimary}>
                Tell me about you, $150
              </button>
            </div>
          </div>
        </section>

        {/* Close */}
        <section className="bg-stone-50 py-14 sm:py-20 md:py-24">
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 md:px-10">
            <h2 className="font-serif text-3xl leading-tight text-stone-900 sm:text-4xl">Not sure which one fits?</h2>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-stone-700">
              Start with one conversation. If there is more to do, we will both know it by the end of the hour and a half.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <button
                type="button"
                onClick={(e) => goToPath(e, '/engagement-inquiry?option=conversation')}
                className={btnPrimary}
              >
                Book a conversation
              </button>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
