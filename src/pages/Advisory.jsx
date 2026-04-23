/**
 * Advisory — Private leadership advisory (/advisory).
 * Conversion-focused layout per site restructure (relationship offer, distinct from /the-room book landing).
 */
import React, { useEffect } from 'react';
import SEO from '../components/SEO';

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

export default function Advisory() {
  useEffect(() => {
    if (typeof window !== 'undefined' && typeof window.fbq === 'function') {
      window.fbq('track', 'ViewContent');
    }
  }, []);

  return (
    <>
      <SEO pageKey="advisory" />
      <main className="min-h-screen bg-stone-50 text-stone-900 [text-rendering:geometricPrecision]">
        {/* Section 1 — Hero */}
        <section className="relative overflow-hidden border-b border-stone-200 bg-stone-950">
          <div className="mx-auto grid max-w-7xl lg:grid-cols-2 lg:items-stretch lg:gap-0">
            <div className="relative z-10 flex flex-col justify-center px-4 py-14 sm:px-6 sm:py-20 md:px-10 lg:py-24 lg:pr-8">
              <p className="mb-4 text-[11px] uppercase tracking-[0.22em] text-[#C8B8A8]">The Advisory</p>
              <h1 className="font-serif text-4xl leading-[1.08] text-white sm:text-5xl md:text-6xl">
                You already know your room isn&apos;t fully honest.
              </h1>
              <p className="mt-6 text-xl font-medium leading-relaxed text-stone-200">The question is what you do about it.</p>
              <div className="mt-8 space-y-6 text-lg leading-relaxed text-stone-300">
                <p>
                  Most leaders sense it before they can name it. The consensus that felt too clean. The decision that had full
                  support and still cost something six months later. The thing nobody said in the meeting that got said in the
                  parking lot.
                </p>
                <p>
                  You are not wrong to sense it. The room you have built is real. The trust is real. And the gap is still there
                  — because everyone in that room lives inside the system your decisions shape. What reaches you has already been
                  shaped by consequence before it arrives.
                </p>
                <p className="font-medium text-stone-100">That gap does not close from inside the system.</p>
                <p className="font-medium text-stone-100">It closes from outside it.</p>
              </div>
              <div className="mt-10 flex flex-wrap items-center gap-4">
                <button type="button" onClick={(e) => goToPath(e, '/engagement-inquiry')} className={btnPrimary}>
                  Start the Conversation
                </button>
                <a href={SAMCART_THE_ROOM_URL} target="_blank" rel="noopener noreferrer" className={btnGhost}>
                  Read The Room First — $27
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

        {/* Section 2 — What the advisory is */}
        <section className="border-b border-stone-200 bg-stone-50 py-14 sm:py-20 md:py-24">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 md:px-10">
            <h2 className="font-serif text-3xl leading-tight text-stone-900 sm:text-4xl">
              One room. Outside the system. No consequence.
            </h2>
            <div className="mt-8 space-y-6 text-lg leading-relaxed text-stone-700">
              <p>
                The advisory is not consulting. It is not coaching. There is no curriculum, no deliverables list, no program with
                a defined arc.
              </p>
              <p>
                It is one relationship built around a single condition that no internal room can replicate.
              </p>
              <p>
                The person across from you has no stake in the outcome of your decisions. No position inside your organization.
                No team that will be affected by what you choose. No execution burden that increases or decreases based on what
                direction you take. Nothing about their professional life shifts based on what you say or where you land.
              </p>
              <p>
                Which means what gets said in that room can be completely different from anything that gets said inside your
                organization.
              </p>
              <p>
                You can name what is actually happening. Think through the decisions that carry real weight. Say out loud the
                thing you have been carrying alone. And the person across from you responds without any of the variables that have
                shaped every other conversation you have had about this.
              </p>
              <p className="font-semibold text-stone-900">That is what the advisory is.</p>
              <p className="font-medium text-stone-900">Not a smarter advisor. A structurally different room.</p>
            </div>
          </div>
        </section>

        {/* Section 3 — What you get */}
        <section className="border-b border-stone-800/80 bg-stone-900 py-14 sm:py-20 md:py-24">
          <div className="mx-auto grid max-w-6xl gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:items-start lg:gap-16 md:px-10">
            <div>
              <h2 className="font-serif text-3xl leading-tight text-white sm:text-4xl">
                When you work with Bart, you bring more than one brain into the room.
              </h2>
              <div className="mt-8 space-y-6 text-lg leading-relaxed text-stone-300">
                <p>
                  Thirty-three years of building and leading companies across manufacturing, medical, insurance, legal, retail,
                  law enforcement, education, government, nonprofit, real estate, and more. Not as an outside observer. As the
                  person responsible for outcomes that affected real people.
                </p>
                <p>
                  The pattern recognition that comes from that experience is what makes the room work. Not frameworks. Not theory.
                  The ability to recognize what is actually happening in your organization before you finish describing it —
                  because it has a shape that only becomes visible when you have seen it enough times across enough different
                  contexts.
                </p>
                <p>
                  Along with that, advisory clients get access to ALI — the Archetype Leadership Index — a diagnostic built to
                  measure the leadership conditions your organization is actually operating inside. Not sentiment surveys. Not
                  engagement scores. A structured view of clarity, trust, communication, consistency, safety, and emotional tone
                  across your team. The kind of signal that surfaces what your internal rooms are filtering out.
                </p>
                <p className="font-medium text-stone-100">
                  Bart&apos;s thinking in the room. ALI&apos;s data behind it. That combination changes what is possible in the
                  conversation.
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-8">
              <figure className="overflow-hidden border border-white/10 bg-stone-950/80">
                <div className="relative max-h-[340px] overflow-hidden">
                  <img
                    src="/images/ali-dash-04.png"
                    alt="ALI Leadership System Map showing seven leadership conditions measured across overall, leader, and team"
                    className="w-full object-cover object-top"
                    loading="lazy"
                  />
                </div>
                <figcaption className="border-t border-white/10 px-4 py-3 text-sm text-stone-400">
                  The ALI Leadership System Map — seven leadership conditions measured across overall, leader, and team
                  perspectives.
                </figcaption>
              </figure>
              <figure className="overflow-hidden border border-white/10 bg-stone-950/80">
                <div className="relative max-h-[340px] overflow-hidden">
                  <img
                    src="/images/ali-dash-03.png"
                    alt="ALI Leadership Mirror showing perception gap between leader and team scores"
                    className="w-full object-cover object-top"
                    loading="lazy"
                  />
                </div>
                <figcaption className="border-t border-white/10 px-4 py-3 text-sm text-stone-400">
                  The Leadership Mirror reveals the gap between how a leader sees their environment and how their team experiences
                  it.
                </figcaption>
              </figure>
              <p className="text-xs text-stone-500">Dashboard shown is illustrative.</p>
            </div>
          </div>
        </section>

        {/* Section 4 — Who this is for */}
        <section className="border-b border-stone-200 bg-stone-50 py-14 sm:py-20 md:py-24">
          <div className="mx-auto grid max-w-6xl gap-12 px-4 sm:px-6 md:grid-cols-2 md:items-center md:gap-14 md:px-10">
            <div>
              <h2 className="font-serif text-3xl leading-tight text-stone-900 sm:text-4xl">This is for the leader who already knows.</h2>
              <div className="mt-8 space-y-6 text-lg leading-relaxed text-stone-700">
                <p>
                  Not the leader who is wondering whether they have a gap in their room. The leader who knows they do and has run
                  out of internal ways to address it.
                </p>
                <p>
                  You have built something real. Your team is capable. Your culture is solid by most measures. And something
                  important is still not fully reaching you. The decisions feel good in the room and cost something downstream. The
                  people closest to you are honest about everything except the things that matter most. You have tried the surveys
                  and the open doors and the deeper conversations. The gap is still there.
                </p>
                <p>
                  You are not looking for someone to fix your organization. You are looking for one room where you can think freely
                  about what is actually happening in it.
                </p>
                <p className="font-medium text-stone-900">If that is where you are, this is the right conversation.</p>
              </div>
              <div className="mt-10 border border-ao-red/25 bg-ao-cream px-6 py-5 text-stone-800">
                <p className="font-medium text-stone-900">Who specifically</p>
                <p className="mt-2 text-base leading-relaxed">
                  Leaders, executives, and founders of organizations with 5 to 250 employees who carry real responsibility for real
                  people and need one consequence-reduced space to think clearly about what they are navigating.
                </p>
              </div>
            </div>
            <div className="overflow-hidden border border-stone-200 shadow-lg">
              <img
                src="/images/Bart-44.jpg"
                alt="Bart Paden seated, present and ready to listen"
                className="aspect-[4/5] w-full object-cover object-[center_25%]"
                loading="lazy"
              />
            </div>
          </div>
        </section>

        {/* Section 5 — What it is not */}
        <section className="border-b border-stone-800 bg-stone-950 py-14 sm:py-20 md:py-24">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 md:px-10">
            <h2 className="font-serif text-3xl leading-tight text-white sm:text-4xl">A few things worth saying directly.</h2>
            <div className="mt-10 space-y-8 border-t border-white/10 pt-10">
              <p className="text-lg leading-relaxed text-stone-300">
                This is not a retained consulting engagement. Bart is not coming into your organization to diagnose it, build
                systems, or manage implementation. That is a different offer for a different situation.
              </p>
              <p className="text-lg leading-relaxed text-stone-300">
                This is not coaching with a defined curriculum. There are no modules, no homework, no progression framework. The
                conversation goes where it needs to go.
              </p>
              <p className="text-lg leading-relaxed text-stone-300">
                This is not a yes room. The entire value of a consequence-reduced space disappears if the person in it tells you
                what you want to hear. Bart will tell you what he actually thinks. That is the point.
              </p>
              <p className="text-lg leading-relaxed text-stone-300">
                This is not a large-group offering. The advisory is available to a limited number of leaders at any given time. That
                limit is intentional. The depth of the relationship requires it.
              </p>
            </div>
          </div>
        </section>

        {/* Section 6 — The book */}
        <section className="border-b border-stone-200 bg-white py-14 sm:py-20 md:py-24">
          <div className="mx-auto grid max-w-6xl gap-12 px-4 sm:px-6 md:grid-cols-2 md:items-center md:gap-16 md:px-10">
            <div>
              <h2 className="font-serif text-3xl leading-tight text-stone-900 sm:text-4xl">Not ready to commit? Read The Room first.</h2>
              <div className="mt-8 space-y-6 text-lg leading-relaxed text-stone-700">
                <p>
                  The Room is a short book that makes the full argument for why your room cannot be fully honest and what exists
                  outside of it. Seventy pages. $27. If it resonates, you will know whether the advisory is the right next step.
                </p>
                <p className="font-medium text-stone-900">Most people who read it reach out.</p>
              </div>
              <div className="mt-10 flex flex-wrap gap-4">
                <a href={SAMCART_THE_ROOM_URL} target="_blank" rel="noopener noreferrer" className={btnPrimary}>
                  Get The Room — $27
                </a>
                <button
                  type="button"
                  onClick={(e) => goToPath(e, '/the-room')}
                  className="inline-flex min-h-[44px] items-center justify-center rounded-[3px] border border-stone-300 bg-white px-6 py-3 text-base font-semibold text-stone-900 shadow-sm transition hover:bg-stone-50"
                >
                  The Room — full book page
                </button>
              </div>
            </div>
            <div className="mx-auto w-full max-w-sm">
              <div className="border border-stone-200 bg-stone-100 p-4 shadow-inner">
                <img
                  src="/images/advisory/the-room-cover.png"
                  alt="The Room by Bart Paden — book cover"
                  className="w-full object-cover shadow-md"
                  loading="lazy"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Section 7 — Bart Paden */}
        <section className="border-b border-stone-200 bg-stone-100 py-14 sm:py-20 md:py-24">
          <div className="mx-auto grid max-w-6xl gap-12 px-4 sm:px-6 md:grid-cols-[minmax(0,340px)_1fr] md:items-center md:gap-14 md:px-10">
            <div className="overflow-hidden border border-stone-200 shadow-md">
              <img
                src="/images/Bart-52.jpg"
                alt="Bart Paden, founder of Archetype Original and author of The Room"
                className="aspect-[4/5] w-full object-cover object-[center_20%]"
                loading="lazy"
              />
            </div>
            <div>
              <h2 className="font-serif text-3xl text-stone-900 sm:text-4xl">Bart Paden</h2>
              <div className="mt-8 space-y-6 text-base leading-relaxed text-stone-700">
                <p>
                  Founder of Archetype Original. Author of three books on leadership, organizational behavior, and the human cost of
                  the decisions leaders make every day.
                </p>
                <p>
                  Built a software engineering firm from a home office to more than 100 people across multiple locations before its
                  acquisition in 2022. Has spent thirty-three years inside the leadership rooms of organizations across nearly every
                  industry — not as an outside observer but as the person responsible for outcomes that affected real people.
                </p>
                <p>Has also failed. Significantly. Built through it. Lost parts of it. Rebuilt.</p>
                <p>
                  That full range of experience is what he brings into the room. Not a framework. Pattern recognition that only
                  comes from having been inside enough rooms to understand what they cannot produce on their own.
                </p>
                <p className="font-medium text-stone-900">
                  The advisory is available to a limited number of leaders at any given time.
                </p>
              </div>
              <div className="mt-10 text-sm text-stone-600">
                <a href="mailto:bart@archetypeoriginal.com" className="font-medium text-ao-red underline-offset-4 hover:underline">
                  bart@archetypeoriginal.com
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Section 8 — Footer CTA (aligned with homepage “two doors” cards) */}
        <section className="bg-stone-900 py-16 sm:py-20">
          <div className="mx-auto max-w-[880px] px-4 text-center sm:px-6 md:px-10">
            <h2 className="font-serif text-3xl text-white sm:text-4xl">The conversation starts here.</h2>
            <div className="mt-12 grid gap-5 text-left sm:grid-cols-2">
              <div className="border border-[#D8D4CE] bg-white p-8">
                <p className="mb-3 font-sans text-[10px] uppercase tracking-[0.12em] text-[#666]">Option 01 — The book</p>
                <p className="font-serif text-xl text-[#1a1a1a]">Read the book first.</p>
                <p className="mt-4 text-sm leading-relaxed text-[#555]">
                  Seventy pages. $27. The argument that changes how you see every room you will ever sit in.
                </p>
                <a
                  href={SAMCART_THE_ROOM_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-8 block rounded-[2px] bg-ao-red py-3 text-center font-sans text-[12px] font-bold tracking-[0.04em] text-white transition hover:opacity-90"
                >
                  Get The Room — $27
                </a>
              </div>
              <div className="border-2 border-[#1a1a1a] bg-white p-8">
                <p className="mb-3 font-sans text-[10px] uppercase tracking-[0.12em] text-[#666]">Option 02 — The advisory</p>
                <p className="font-serif text-xl text-[#1a1a1a]">Start the conversation directly.</p>
                <p className="mt-4 text-sm leading-relaxed text-[#555]">
                  If you already know you need this room, skip the book and reach out.
                </p>
                <button
                  type="button"
                  onClick={(e) => goToPath(e, '/engagement-inquiry')}
                  className="mt-8 w-full rounded-[2px] bg-ao-red py-3 text-center font-sans text-[12px] font-bold tracking-[0.04em] text-white transition hover:opacity-90"
                >
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
