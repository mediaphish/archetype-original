/**
 * Advisory — The Room book + private advisory landing (/advisory).
 * Visual rhythm: cinematic hero, dark problem band, light book/advisory/about, equal footer CTAs.
 */
import React, { useEffect, useState } from 'react';
import SEO from '../components/SEO';

const STORAGE_KEY = 'ao_advisory_seen';

const SAMCART_THE_ROOM_URL =
  import.meta.env.VITE_THE_ROOM_SAMCART_URL || 'https://aobooks.samcart.com/products/the-room';

function goToPath(event, path) {
  event.preventDefault();
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
  window.scrollTo({ top: 0, behavior: 'instant' });
}

function openArchyChat() {
  window.dispatchEvent(new CustomEvent('ao-open-chat'));
}

const btnPrimary =
  'inline-flex min-h-[52px] items-center justify-center rounded-lg bg-amber-700 px-7 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-amber-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2';

const btnEqual =
  'inline-flex min-h-[52px] w-full sm:w-auto min-w-[240px] items-center justify-center rounded-lg bg-stone-800 px-8 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-stone-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-500 focus-visible:ring-offset-2';

const btnContactPair =
  'inline-flex min-h-[48px] flex-1 items-center justify-center rounded-lg px-5 py-2.5 text-sm font-semibold shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 sm:min-w-[200px]';

export default function Advisory() {
  const [isReturnVisitor, setIsReturnVisitor] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      return window.localStorage.getItem(STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (typeof window !== 'undefined' && typeof window.fbq === 'function') {
      window.fbq('track', 'ViewContent');
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (localStorage.getItem(STORAGE_KEY) === '1') return;

    const markSeen = () => {
      try {
        localStorage.setItem(STORAGE_KEY, '1');
      } catch {
        /* ignore */
      }
    };

    const t = window.setTimeout(markSeen, 20000);
    const onHide = () => {
      if (document.visibilityState === 'hidden') markSeen();
    };
    window.addEventListener('beforeunload', markSeen);
    document.addEventListener('visibilitychange', onHide);

    return () => {
      window.clearTimeout(t);
      window.removeEventListener('beforeunload', markSeen);
      document.removeEventListener('visibilitychange', onHide);
    };
  }, []);

  useEffect(() => {
    if (!isReturnVisitor) return;
    const id = window.setTimeout(() => {
      document.getElementById('advisory-offer')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 400);
    return () => window.clearTimeout(id);
  }, [isReturnVisitor]);

  const problemCopy = (
    <>
      <p className="mb-6 text-lg leading-relaxed text-stone-200">You have built something real.</p>
      <p className="mb-6 leading-relaxed text-stone-300">
        You have earned the trust of the people around you. You have created an environment where feedback is welcome
        and honest conversation is valued. You have worked hard to be the kind of leader people can speak to directly.
      </p>
      <p className="mb-8 font-medium text-stone-100">And still.</p>
      <p className="mb-6 leading-relaxed text-stone-300">
        The decision that had full consensus in the room costs something six months later that nobody saw coming. The
        hire that felt right reveals misalignment three months into execution. The strategy that generated no pushback
        struggles to take hold. The person who left never fully explained why.
      </p>
      <p className="mb-6 leading-relaxed text-stone-300">
        This is not a failure of your leadership. It is not a failure of your culture.
      </p>
      <p className="mb-8 text-lg font-medium text-stone-100">
        It is a structural reality that exists in every room where authority is present.
      </p>
      <p className="mb-6 leading-relaxed text-stone-300">
        Everyone in that room lives inside the system your decisions shape. They need their jobs. They want to show up
        and move the needle. They are navigating their relationships, their responsibilities, and their read of the
        moment every time they decide what to say and what to leave unsaid.
      </p>
      <p className="mb-6 leading-relaxed text-stone-300">That navigation happens before the words leave their mouths.</p>
      <p className="mb-8 leading-relaxed text-stone-200 font-medium">
        Which means what reaches you has already been shaped by consequence before it arrives.
      </p>
      <p className="mb-6 leading-relaxed text-stone-300">
        The healthier your culture, the harder this is to see. Because in a healthy culture people engage. They push back
        on smaller things. They ask good questions. The conversation feels alive and productive. The leader leaves
        feeling heard.
      </p>
      <p className="mb-6 leading-relaxed text-stone-300">
        And still the largest concerns, the sharpest risks, the alternative someone was considering but decided not to
        raise, those do not reliably make it to the table.
      </p>
      <p className="mb-4 leading-relaxed text-stone-300">Not because the culture failed.</p>
      <p className="leading-relaxed text-stone-200">
        Because the system is working exactly as systems work when human beings operate inside them.
      </p>
    </>
  );

  const bookCopy = (
    <>
      <p className="font-serif text-3xl sm:text-4xl text-stone-900">The Room</p>
      <p className="mt-4 text-lg text-stone-600">
        A short, direct book about the structural limitation every leader operates inside — and what exists outside of it.
      </p>
      <div className="mt-8 space-y-6 text-base leading-relaxed text-stone-700">
        <p>
          The Room is not a leadership manual. It does not offer a framework or a methodology or a set of practices to
          implement on Monday morning.
        </p>
        <p className="font-semibold text-stone-900">It makes a case.</p>
        <p>
          The case that it is impossible to have a fully honest room when consequence is present. That the internal
          responses leaders instinctively reach for — surveys, open doors, town halls, deeper conversations — are all
          internal solutions to a structural problem. That the fix is not inside the room.
        </p>
        <p className="font-medium text-stone-900">It is outside of it.</p>
        <p>
          The book is built on organizational behavior research, lived experience across thirty-three years of building
          and leading companies, and a single argument that becomes impossible to unsee once you have read it.
        </p>
        <p className="text-stone-900 font-medium">Seventy pages. No filler. Every chapter earns the next one.</p>
      </div>
      <blockquote className="mt-10 border-l-4 border-amber-700 pl-6 text-lg italic leading-relaxed text-stone-800">
        &ldquo;It is impossible to have a fully honest room. Not because your people are dishonest. Not because your
        culture is broken. Because everyone in that room lives inside the system your decisions shape, and no one inside a
        system is ever fully free of its consequences.&rdquo;
      </blockquote>
      <div className="mt-10">
        <a href={SAMCART_THE_ROOM_URL} target="_blank" rel="noopener noreferrer" className={btnPrimary}>
          Get The Room — $27
        </a>
      </div>
    </>
  );

  return (
    <>
      <SEO pageKey="advisory" />
      <main className="min-h-screen bg-stone-50 text-stone-900 [text-rendering:geometricPrecision]">
        {/* Hero */}
        <section id="advisory-hero" className="relative overflow-hidden border-b border-stone-200">
          <div className="absolute inset-0">
            <img
              src="/images/advisory/the-room-cover.png"
              alt=""
              aria-hidden="true"
              className="h-full min-h-[420px] w-full object-cover object-center sm:min-h-[520px]"
            />
            <div className="absolute inset-0 bg-[linear-gradient(105deg,rgba(15,15,18,0.93)_0%,rgba(28,25,23,0.82)_42%,rgba(41,37,36,0.55)_100%)]" />
          </div>

          <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24 md:px-10 lg:py-28">
            <p className="mb-4 text-[11px] uppercase tracking-[0.22em] text-amber-200/90">The Room · Advisory</p>
            <h1 className="max-w-[22ch] font-serif text-4xl leading-[1.08] text-white sm:text-5xl md:text-6xl">
              The room you think you have is not the room that is actually operating around you.
            </h1>
            <p className="mt-8 max-w-2xl text-lg leading-relaxed text-stone-200 sm:text-xl">
              Every leader believes they are getting honest input. The research says otherwise. Not because of culture
              failure. Not because of weak leadership. Because of something structural that no culture initiative, open door
              policy, or anonymous survey has ever been able to fully fix.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <a href={SAMCART_THE_ROOM_URL} target="_blank" rel="noopener noreferrer" className={btnPrimary}>
                Read The Room — $27
              </a>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById('advisory-offer')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                className="inline-flex min-h-[52px] items-center justify-center rounded-lg border border-white/40 bg-white/10 px-6 py-3 text-base font-semibold text-white backdrop-blur-sm transition hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
              >
                Explore advisory
              </button>
            </div>
          </div>
        </section>

        {/* Section 1 — Problem */}
        <section
          id="advisory-problem"
          className="relative overflow-hidden border-b border-stone-800/80 bg-stone-950 py-14 sm:py-20 md:py-24"
        >
          <div className="pointer-events-none absolute inset-0 opacity-[0.14]">
            <img
              src="/images/advisory/chapter-3-atmosphere.png"
              alt=""
              className="h-full w-full object-cover object-center"
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-b from-stone-950 via-stone-950/97 to-stone-950" />

          <div className="relative mx-auto max-w-3xl px-4 sm:px-6 md:px-10">
            <details className="rounded-2xl border border-white/10 bg-stone-950/60 backdrop-blur-sm open:shadow-[0_24px_80px_rgba(0,0,0,0.35)]" open={!isReturnVisitor}>
              <summary className="cursor-pointer list-none px-6 py-5 font-serif text-xl text-stone-100 marker:content-none sm:text-2xl [&::-webkit-details-marker]:hidden">
                <span className="flex items-center justify-between gap-4">
                  <span>The gap most leaders never fully see</span>
                  <span className="shrink-0 text-xs font-normal uppercase tracking-wider text-stone-400">
                    {isReturnVisitor ? 'Expand' : 'Overview'}
                  </span>
                </span>
              </summary>
              <div className="border-t border-white/10 px-6 pb-8 pt-2">{problemCopy}</div>
            </details>
          </div>
        </section>

        {/* Section 2 — Book */}
        <section id="advisory-book" className="border-b border-stone-200 bg-stone-50 py-14 sm:py-20 md:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 md:px-10">
            <details className="rounded-2xl border border-stone-200 bg-white shadow-sm open:shadow-md" open={!isReturnVisitor}>
              <summary className="cursor-pointer list-none px-6 py-5 font-serif text-xl text-stone-900 marker:content-none sm:text-2xl [&::-webkit-details-marker]:hidden">
                <span className="flex items-center justify-between gap-4">
                  <span>About the book</span>
                  <span className="shrink-0 text-xs font-normal uppercase tracking-wider text-stone-500">
                    {isReturnVisitor ? 'Expand' : 'Overview'}
                  </span>
                </span>
              </summary>
              <div className="border-t border-stone-100 px-6 pb-10 pt-6">
                <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
                  <div>{bookCopy}</div>
                  <div className="relative mx-auto w-full max-w-sm lg:mx-0">
                    <div className="rounded-xl border border-stone-200 bg-stone-100 p-4 shadow-inner">
                      <img
                        src="/images/advisory/the-room-cover.png"
                        alt="The Room book cover"
                        className="w-full rounded-lg object-cover shadow-md"
                        loading="lazy"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </details>
          </div>
        </section>

        {/* Section 3 — Advisory */}
        <section id="advisory-offer" className="border-b border-stone-200 bg-white py-14 sm:py-20 md:py-24">
          <div className="mx-auto grid max-w-6xl gap-12 px-4 sm:px-6 md:grid-cols-2 md:items-start md:gap-16 md:px-10">
            <div className="order-2 md:order-1">
              <h2 className="font-serif text-3xl leading-tight text-stone-900 sm:text-4xl">
                If the book resonates, there is a next step.
              </h2>
              <p className="mt-5 text-lg text-stone-600">
                One room. Outside the system. Built for leaders who are ready to think freely without consequence.
              </p>
              <div className="mt-8 space-y-6 text-base leading-relaxed text-stone-700">
                <p className="font-medium text-stone-900">
                  The Room describes the problem. The advisory is the structural response to it.
                </p>
                <p>
                  This is not consulting. It is not coaching. It is not a program with a defined curriculum and a set of
                  deliverables.
                </p>
                <p>
                  It is one relationship, built around your ability to say out loud the things you cannot say inside your
                  organization. To think through the decisions that carry real weight with someone who has no stake in
                  the outcome, no position inside your system, and no consequence to manage.
                </p>
                <p>
                  The person across from you in that room has spent thirty-three years building companies, leading
                  people, making decisions under pressure, and carrying the cost of the ones that did not land. He has
                  been inside the leadership rooms of organizations across manufacturing, medical, insurance, legal,
                  retail, law enforcement, education, government, nonprofit, real estate, and more industries than most
                  advisors encounter in a lifetime.
                </p>
                <p>He has also failed. Built through it. Lost parts of it. Rebuilt.</p>
                <p>
                  That full range of experience — the wins, the losses, and everything carried in between — is what he
                  brings into the room.
                </p>
                <p className="font-semibold text-stone-900">Not a framework.</p>
                <p>
                  Pattern recognition that only comes from having been inside enough rooms to understand what they cannot
                  produce on their own.
                </p>
                <p>
                  The advisory is available to a limited number of leaders, executives, and founders at any given time.
                  If you are leading an organization and you sense that something important is not fully reaching you,
                  this is the conversation worth having.
                </p>
              </div>
              <div className="mt-10">
                <button type="button" onClick={(e) => goToPath(e, '/engagement-inquiry')} className={btnPrimary}>
                  Start the Conversation
                </button>
              </div>
            </div>
            <div className="order-1 md:order-2">
              <div className="sticky top-8 overflow-hidden rounded-2xl border border-stone-200 shadow-lg">
                <img
                  src="/images/advisory/chapter-6-advisory.png"
                  alt=""
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Section 4 — About Bart */}
        <section id="advisory-bart" className="border-b border-stone-200 bg-stone-100 py-14 sm:py-20 md:py-24">
          <div className="mx-auto grid max-w-6xl gap-12 px-4 sm:px-6 md:grid-cols-[minmax(0,340px)_1fr] md:items-center md:gap-14 md:px-10">
            <div className="overflow-hidden rounded-2xl border border-stone-200 shadow-md">
              <img
                src="/images/advisory/bart-52.png"
                alt="Bart Paden"
                className="aspect-[4/5] w-full object-cover object-[center_20%]"
                loading="lazy"
              />
            </div>
            <div>
              <h2 className="font-serif text-3xl text-stone-900 sm:text-4xl">Bart Paden</h2>
              <div className="mt-8 space-y-6 text-base leading-relaxed text-stone-700">
                <p>
                  Bart Paden is the founder of Archetype Original and the author of three books on leadership,
                  organizational behavior, and the human cost of the decisions leaders make every day.
                </p>
                <p>
                  He built a software engineering firm from a home office to more than 100 people across multiple
                  locations before its acquisition in 2022. He has spent thirty-three years inside the leadership rooms
                  of organizations across nearly every industry, not as an outside observer but as the person responsible
                  for outcomes that affected real people.
                </p>
                <p>
                  His work — the books, the research, the writing, and the tools he is building — is designed to give
                  leaders a deeper and more honest understanding of what leading people actually requires. Whether a reader
                  ever engages with him directly or not, the work is built to be useful.
                </p>
                <p className="font-medium text-stone-900">For the leaders who want to go further, the room is available.</p>
              </div>
              <div className="mt-10 max-w-xl rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
                <p className="text-sm font-medium text-stone-900">Get in touch</p>
                <p className="mt-2 text-sm leading-relaxed text-stone-600">
                  There is no public email here on purpose. You can send a message through the site&apos;s contact form,
                  or open Archy—the owl in the lower-right—and ask about the book, advisory, or what might fit.
                </p>
                <p className="mt-4 text-sm text-stone-600">
                  <button
                    type="button"
                    onClick={(e) => goToPath(e, '/')}
                    className="font-medium text-amber-800 underline-offset-4 hover:underline"
                  >
                    archetypeoriginal.com
                  </button>
                </p>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <button type="button" onClick={(e) => goToPath(e, '/contact')} className={`${btnContactPair} bg-amber-700 text-white hover:bg-amber-800`}>
                    Open contact form
                  </button>
                  <button type="button" onClick={openArchyChat} className={`${btnContactPair} border border-stone-300 bg-stone-50 text-stone-900 hover:bg-stone-100`}>
                    Chat with Archy
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Footer CTA — equal weight */}
        <section id="advisory-start" className="bg-stone-900 py-16 sm:py-20">
          <div className="mx-auto max-w-5xl px-4 text-center sm:px-6 md:px-10">
            <h2 className="font-serif text-3xl text-white sm:text-4xl">Two ways to start.</h2>
            <div className="mt-12 grid gap-10 sm:grid-cols-2 sm:gap-8 sm:text-left">
              <div className="flex flex-col rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm">
                <p className="text-xs font-semibold uppercase tracking-wider text-amber-200/90">Option 1</p>
                <p className="mt-3 font-semibold text-white">Read the book first.</p>
                <p className="mt-4 text-sm leading-relaxed text-stone-300">
                  Seventy pages. $27. The argument that changes how you see every room you will ever sit in.
                </p>
                <a
                  href={SAMCART_THE_ROOM_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${btnEqual} mt-8 justify-center sm:justify-center`}
                >
                  Get The Room
                </a>
              </div>
              <div className="flex flex-col rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm">
                <p className="text-xs font-semibold uppercase tracking-wider text-amber-200/90">Option 2</p>
                <p className="mt-3 font-semibold text-white">Start the conversation directly.</p>
                <p className="mt-4 text-sm leading-relaxed text-stone-300">
                  If you already know you need this room, skip the book and reach out.
                </p>
                <button type="button" onClick={(e) => goToPath(e, '/engagement-inquiry')} className={`${btnEqual} mt-8 justify-center`}>
                  Contact Bart
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
