/**
 * Work with Bart (/work-with-bart). DRAFT, 2026-10-19.
 *
 * Replaces the three separate offers (Advisory, Consulting, Fractional) with one
 * door. Since 2026-10-23 (Bart): the first conversation is free and is the only
 * way in; after it, a season ($1,500 a month for three months) or ongoing
 * ($3,000 a month). No per-conversation prices on the page ("reads like we are
 * nickel and diming everyone"), including for rising leaders.
 *
 * Why: the site sold a high-trust relationship to CEOs while the people who
 * actually showed up were readers, and nothing was sized for them. Zero
 * inquiries came through the form between October 4 and October 19. Bart's own
 * words for what he wants: "meet people where they are and use my 34 years of
 * being in business of some kind to help them navigate their own ecosystems."
 * And on up-and-comers: "They have a lot of my heart."
 *
 * Booking buttons go to Calendly via /engagement-inquiry (src/lib/booking.js);
 * rising leaders keep the short-note form.
 */
import React from 'react';
import SEO from '../components/SEO';
import SchemaJsonLd from '../components/SchemaJsonLd';
import { buildServiceSchema } from '../lib/schemaBuilders.js';

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

/** Bart-approved 2026-10-19, same wording as the home page. */
const WHY = [
  {
    title: 'I have carried what you are carrying.',
    body: 'I have built several businesses over thirty-four years. The longest was a software company I grew for twenty-nine years and sold in July 2022, and through it I was connected to 13 different industries.',
  },
  {
    title: 'Then I went back and checked my work.',
    body: 'I spent the four years since studying business, leadership and AI, and testing three decades of my own decisions against the research. I care about what works, not what sounds good in a meeting.',
  },
  {
    title: 'I do not live inside your ecosystem.',
    body: 'Everyone around you is shaped by the system you lead, and so is everything they tell you. I am not. I have a real stake in how this goes for you, but none of the pressure that comes from living inside it. That is what lets me tell you the truth and help you do something with it.',
  },
  {
    title: 'Your people matter more than the plan.',
    body: 'My favorite part of building businesses was never the product. It was developing people into real leaders. A plan that hits the number and diminishes the people doing the work is not one I will help you run.',
  },
];

const ORG_PATHS = [
  {
    name: 'Consulting',
    body: 'Consulting works with the organization: alignment, drift, culture, and the source of the problem instead of the symptoms.',
    link: 'How consulting works',
    path: '/consulting',
  },
  {
    name: 'Fractional roles',
    body: 'Fractional roles put me inside the organization, part-time, in a real seat. CTO, culture, operations.',
    link: 'See the roles',
    path: '/fractional-roles',
  },
];

/** After the free first conversation (Bart-approved wording, 2026-10-23). */
const OPTIONS = [
  {
    key: 'season',
    name: 'A season',
    body: 'For a stretch of growth, a transition or a rebuild, when the decisions keep coming. We meet twice a month for three months, and you can reach me in between when something will not wait.',
    price: '$1,500 a month, for three months',
  },
  {
    key: 'ongoing',
    name: 'Ongoing',
    body: 'A standing relationship for owners who want someone in their corner. We talk as often as you need, and the agenda is always yours.',
    price: '$3,000 a month',
    more: { label: 'How the advisory works', path: '/advisory' },
  },
];

export default function WorkWithBart() {
  return (
    <>
      <SEO pageKey="work-with-bart" />
      <SchemaJsonLd
        schema={buildServiceSchema({
          name: 'Work with Bart',
          serviceType: 'Leadership and business advisory',
          pageKey: 'work-with-bart',
          path: '/work-with-bart',
        })}
      />
      <main className="min-h-screen bg-stone-50 text-stone-900 [text-rendering:geometricPrecision]">
        {/* Hero. Bart, 2026-10-23: text must never sit on his face. On wide screens
            the photo fills the right side and fades into a solid panel behind the
            copy, which lines up with the logo; on phones it is a taller frame on
            him with the copy below. Same treatment as the home page. */}
        <section className="relative overflow-hidden border-b border-stone-200 bg-stone-950">
          <div className="relative h-[min(58vh,460px)] min-h-[300px] w-full lg:hidden">
            <img
              src="/images/bart-room-standing-2026-v3.jpg"
              alt="Bart Paden, founder of Archetype Original"
              className="h-full w-full object-cover object-[60%_25%]"
              loading="eager"
            />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-b from-transparent to-stone-950" />
          </div>
          <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[62%] overflow-hidden lg:block xl:w-full" aria-hidden="true">
            <img
              src="/images/bart-room-standing-2026-v3.jpg"
              alt=""
              className="h-full w-full object-cover object-[58%_25%]"
              loading="eager"
            />
            <div
              className="absolute inset-0 xl:hidden"
              style={{
                background:
                  'linear-gradient(to right, rgba(12, 10, 9, 1) 0%, rgba(12, 10, 9, 1) 4%, rgba(12, 10, 9, 0.75) 22%, rgba(12, 10, 9, 0.3) 38%, rgba(12, 10, 9, 0) 52%)',
              }}
            />
            {/* Wide screens: the photo runs under the text with a light fade (Bart, 2026-10-23: too dark on the left). */}
            <div
              className="absolute inset-0 hidden xl:block"
              style={{
                background:
                  'linear-gradient(to right, rgba(12, 10, 9, 0.72) 0%, rgba(12, 10, 9, 0.58) 26%, rgba(12, 10, 9, 0.25) 44%, rgba(12, 10, 9, 0) 60%)',
              }}
            />
          </div>
          <div className="relative z-10 mx-auto max-w-[1600px] lg:px-10 xl:px-14">
            <div className="max-w-[640px] px-4 pb-14 pt-4 sm:px-6 sm:pb-20 lg:max-w-[480px] lg:px-0 lg:py-28 xl:max-w-[560px]">
              <p className="mb-4 text-[11px] uppercase tracking-[0.22em] text-[#C8B8A8]">Work with Bart</p>
              <h1 className="font-serif text-4xl leading-[1.08] text-white sm:text-5xl xl:text-6xl">
                Thirty-four years of building things. On your side of the table.
              </h1>
              <div className="mt-8 space-y-6 text-lg leading-relaxed text-stone-300">
                <p>
                  I have built several businesses over thirty-four years. The longest was a software company I grew for
                  twenty-nine years and sold in July 2022, and through it I was connected to 13 different industries.
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
                <a href="/books" onClick={(e) => goToPath(e, '/books')} className={btnGhost}>
                  Read my books
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="border-b border-stone-200 bg-stone-50 py-14 sm:py-20 md:py-24">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 md:grid-cols-2 md:items-center md:gap-14 md:px-10">
            <figure className="order-last md:order-first">
              <img
                src="/images/bart-room-table-2026-v2.jpg"
                alt="Bart Paden in conversation across a table"
                className="w-full border border-stone-200 object-cover shadow-sm"
                loading="lazy"
              />
            </figure>
            <div>
            <h2 className="font-serif text-3xl leading-tight text-stone-900 sm:text-4xl">
              I meet you where you are.
            </h2>
            <div className="mt-8 space-y-6 text-lg leading-relaxed text-stone-700">
              <p>
                There is no program here, because your situation was not built from one. You bring what is actually in front
                of you, and we work it until you can see it clearly. Then we work the next thing.
              </p>
            </div>
            <div className="mt-10 space-y-8">
              {WHY.map((w) => (
                <div key={w.title} className="border-l-2 border-ao-red pl-5">
                  <h3 className="mb-2 font-serif text-xl leading-snug text-stone-900">{w.title}</h3>
                  <p className="text-base leading-relaxed text-stone-700">{w.body}</p>
                </div>
              ))}
            </div>
            </div>
          </div>
        </section>

        {/* Start with a conversation, then the two ways to keep going */}
        <section id="options" className="scroll-mt-24 border-b border-stone-200 bg-white py-14 sm:py-20 md:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 md:px-10">
            <div className="max-w-3xl">
              <h2 className="font-serif text-3xl leading-tight text-stone-900 sm:text-4xl">Start with a conversation.</h2>
              <p className="mt-6 text-lg leading-relaxed text-stone-700">
                The first conversation is free. It is a full session, up to ninety minutes, and you can bring as many things
                as you want to talk through. There is no pitch at the end. If there is more to do, we will both know it, and we
                can decide together what comes next.
              </p>
              <div className="mt-8">
                <button type="button" onClick={(e) => goToPath(e, '/engagement-inquiry?option=conversation')} className={btnPrimary}>
                  Book a conversation
                </button>
              </div>
            </div>

            <div className="mt-16 max-w-3xl">
              <h2 className="font-serif text-3xl leading-tight text-stone-900 sm:text-4xl">If we keep going.</h2>
              <p className="mt-6 text-lg leading-relaxed text-stone-700">
                Some people want help through a hard stretch. Some want someone in their corner for the long haul. Here is how
                each of those works.
              </p>
            </div>
            <div className="mt-10 grid gap-6 md:grid-cols-2">
              {OPTIONS.map((o) => (
                <div key={o.key} className="flex flex-col border border-stone-200 bg-stone-50 p-6 sm:p-8">
                  <h3 className="font-serif text-2xl text-stone-900">{o.name}</h3>
                  <p className="mt-4 flex-1 text-base leading-relaxed text-stone-700">{o.body}</p>
                  <p className="mt-6 border-t border-stone-200 pt-4 text-sm font-medium text-stone-600">{o.price}</p>
                  {o.more ? (
                    <a
                      href={o.more.path}
                      onClick={(e) => goToPath(e, o.more.path)}
                      className="mt-3 text-sm font-semibold text-ao-red hover:underline"
                    >
                      {o.more.label} →
                    </a>
                  ) : null}
                </div>
              ))}
            </div>
            <p className="mt-10 max-w-3xl text-lg leading-relaxed text-stone-700">
              You do not need to choose either of these now. Both start with the free conversation.
            </p>
            <div className="mt-6">
              <button type="button" onClick={(e) => goToPath(e, '/engagement-inquiry?option=conversation')} className={btnPrimary}>
                Book a conversation
              </button>
            </div>
          </div>
        </section>

        {/* Rising leaders */}
        <section className="border-b border-stone-800/80 bg-stone-900 py-14 sm:py-20 md:py-24">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 md:px-10">
            <p className="mb-4 text-[11px] uppercase tracking-[0.22em] text-[#C8B8A8]">Rising leaders</p>
            <h2 className="font-serif text-3xl leading-tight text-white sm:text-4xl">
              Some of the best leaders I know started out unsure they were one.
            </h2>
            <div className="mt-8 space-y-6 text-lg leading-relaxed text-stone-300">
              <p>
                My favorite part of building a company was never the revenue. It was developing young people into real leaders.
                It still is.
              </p>
              <p>
                If you are early in your career and carrying more than your title says, I want to hear from you. Your first
                conversation is free. If we keep meeting after that, we will work out something that fits where you are.
              </p>
              <p>
                Send me a short note. Tell me where you are and what you are carrying. I read every one myself.
              </p>
              <p className="font-medium text-stone-100">You do not need to be sure it counts as leadership. If you are asking, it probably does.</p>
            </div>
            <div className="mt-10">
              <button type="button" onClick={(e) => goToPath(e, '/engagement-inquiry?option=rising')} className={btnPrimary}>
                Tell me about you
              </button>
            </div>
          </div>
        </section>

        {/* For your organization (Bart, 2026-10-20: keep Consulting and Fractional under Work with Bart) */}
        <section className="border-b border-stone-200 bg-white py-14 sm:py-20 md:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 md:px-10">
            <p className="mb-4 text-[11px] uppercase tracking-[0.22em] text-ao-red">For your organization</p>
            <h2 className="max-w-3xl font-serif text-3xl leading-tight text-stone-900 sm:text-4xl">
              Some of the work is not one leader&apos;s situation. It is the whole system.
            </h2>
            <div className="mt-10 grid gap-6 md:grid-cols-2">
              {ORG_PATHS.map((o) => (
                <a
                  key={o.path}
                  href={o.path}
                  onClick={(e) => goToPath(e, o.path)}
                  className="group block border border-stone-200 bg-stone-50 p-6 transition hover:border-stone-400 sm:p-8"
                >
                  <h3 className="font-serif text-2xl text-stone-900 group-hover:text-ao-red">{o.name}</h3>
                  <p className="mt-3 text-base leading-relaxed text-stone-700">{o.body}</p>
                  <p className="mt-6 text-sm font-semibold text-ao-red">{o.link} →</p>
                </a>
              ))}
            </div>
          </div>
        </section>

        {/* Close */}
        <section className="bg-stone-50 py-14 sm:py-20 md:py-24">
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 md:px-10">
            <h2 className="font-serif text-3xl leading-tight text-stone-900 sm:text-4xl">Not sure which one fits?</h2>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-stone-700">
              Start with the free conversation. By the end of it, we will both know whether there is more to do.
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
