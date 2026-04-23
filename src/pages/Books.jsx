/**
 * Books hub — The Room, Accidental CEO, Remaining Human (Prompt 4 §1).
 */
import React from 'react';
import SEO from '../components/SEO';
import { OptimizedImage } from '../components/OptimizedImage';

function goToPath(event, path) {
  event.preventDefault();
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
  window.scrollTo({ top: 0, behavior: 'instant' });
}

export default function Books() {
  return (
    <>
      <SEO pageKey="books" />
      <div className="min-h-screen bg-[#FAFAF9]">
        <section className="border-b border-[#1A1A1A]/10 bg-white py-14 sm:py-18 md:py-22">
          <div className="container mx-auto max-w-4xl px-4 text-center sm:px-6 md:px-12">
            <h1 className="font-serif text-5xl font-bold tracking-tight text-[#1A1A1A] sm:text-6xl md:text-7xl">
              Books
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-[#6B6B6B] sm:text-xl">
              Three books on leadership pressure, organizational honesty, and staying human while the world accelerates.
            </p>
          </div>
        </section>

        <section className="py-14 sm:py-18 md:py-24">
          <div className="container mx-auto max-w-6xl px-4 sm:px-6 md:px-12">
            <div className="grid gap-12 lg:gap-16">
              {/* Featured — The Room */}
              <article className="grid gap-10 border border-[#1A1A1A]/10 bg-white p-8 md:grid-cols-[minmax(0,280px)_1fr] md:gap-12 md:p-12 lg:gap-16">
                <div className="flex justify-center md:justify-start">
                  <div className="max-w-[260px] overflow-hidden rounded-sm shadow-sm">
                    <OptimizedImage
                      src="/images/advisory/the-room-cover.png"
                      alt="The Room book cover"
                      className="h-auto w-full object-contain"
                      loading="eager"
                    />
                  </div>
                </div>
                <div className="flex flex-col justify-center">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#DB0812]">Featured</p>
                  <h2 className="mt-2 font-serif text-3xl font-bold text-[#1A1A1A] sm:text-4xl md:text-5xl">
                    The Room
                  </h2>
                  <p className="mt-4 text-lg leading-relaxed text-[#6B6B6B]">
                    The structural limits of honest feedback inside authority — and why the conversation you need often cannot happen inside your own room.
                  </p>
                  <div className="mt-8 flex flex-wrap gap-3">
                    <a
                      href="/the-room"
                      onClick={(e) => goToPath(e, '/the-room')}
                      className="inline-flex min-h-[44px] items-center justify-center bg-[#1A1A1A] px-8 py-4 text-sm font-medium text-white transition-colors hover:bg-[#1A1A1A]/90"
                    >
                      Book landing
                    </a>
                    <a
                      href="/advisory"
                      onClick={(e) => goToPath(e, '/advisory')}
                      className="inline-flex min-h-[44px] items-center justify-center border border-[#1A1A1A] px-8 py-4 text-sm font-medium text-[#1A1A1A] transition-colors hover:bg-[#1A1A1A] hover:text-white"
                    >
                      Leadership advisory
                    </a>
                  </div>
                </div>
              </article>

              <div className="grid gap-12 md:grid-cols-2 md:gap-10">
                <article className="flex flex-col border border-[#1A1A1A]/10 bg-white p-8 md:p-10">
                  <div className="mb-6 overflow-hidden rounded-sm">
                    <OptimizedImage
                      src="/images/accidental-ceo/accidental-ceo-front-back-01.png"
                      alt="Accidental CEO covers"
                      className="h-auto w-full object-contain object-top"
                      loading="lazy"
                    />
                  </div>
                  <h2 className="font-serif text-2xl font-bold text-[#1A1A1A] sm:text-3xl">Accidental CEO</h2>
                  <p className="mt-3 flex-1 text-base leading-relaxed text-[#6B6B6B]">
                    A leadership story about building something real, carrying more than expected, and choosing to lead when the weight shows up before the clarity does.
                  </p>
                  <a
                    href="/accidental-ceo"
                    onClick={(e) => goToPath(e, '/accidental-ceo')}
                    className="mt-8 inline-flex min-h-[44px] items-center justify-center border border-[#1A1A1A] px-6 py-3 text-sm font-medium text-[#1A1A1A] transition-colors hover:bg-[#1A1A1A] hover:text-white"
                  >
                    Learn more &amp; order
                  </a>
                </article>

                <article className="flex flex-col border border-[#1A1A1A]/10 bg-white p-8 md:p-10">
                  <div className="relative mb-6 aspect-[16/10] overflow-hidden rounded-sm bg-[#061312]">
                    <OptimizedImage
                      src="/images/remaining-human/hero-echo.png"
                      alt=""
                      aria-hidden="true"
                      className="h-full w-full object-cover opacity-90"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#061312] via-transparent to-transparent" />
                  </div>
                  <h2 className="font-serif text-2xl font-bold text-[#1A1A1A] sm:text-3xl">Remaining Human</h2>
                  <p className="mt-3 flex-1 text-base leading-relaxed text-[#6B6B6B]">
                    Servant leadership, clarity, and staying human while intelligent systems reshape how decisions are made.
                  </p>
                  <a
                    href="/remaining-human"
                    onClick={(e) => goToPath(e, '/remaining-human')}
                    className="mt-8 inline-flex min-h-[44px] items-center justify-center border border-[#1A1A1A] px-6 py-3 text-sm font-medium text-[#1A1A1A] transition-colors hover:bg-[#1A1A1A] hover:text-white"
                  >
                    Read more &amp; buy
                  </a>
                </article>
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-[#1A1A1A]/10 bg-[#FAFAF9] py-14 sm:py-18">
          <div className="container mx-auto max-w-3xl px-4 text-center sm:px-6 md:px-12">
            <h2 className="font-serif text-3xl font-bold text-[#1A1A1A] sm:text-4xl">Not sure where to start?</h2>
            <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed text-[#6B6B6B]">
              Read <em>The Room</em> first if you want the argument in seventy pages — or begin with advisory if you already know you need an outside-the-building conversation.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <a
                href="/the-room"
                onClick={(e) => goToPath(e, '/the-room')}
                className="inline-flex min-h-[44px] w-full max-w-xs items-center justify-center bg-[#1A1A1A] px-8 py-4 text-sm font-medium text-white transition-colors hover:bg-[#1A1A1A]/90 sm:w-auto"
              >
                The Room — overview
              </a>
              <a
                href="/engagement-inquiry"
                onClick={(e) => goToPath(e, '/engagement-inquiry')}
                className="inline-flex min-h-[44px] w-full max-w-xs items-center justify-center border border-[#1A1A1A] px-8 py-4 text-sm font-medium text-[#1A1A1A] transition-colors hover:bg-[#1A1A1A] hover:text-white sm:w-auto"
              >
                Start a conversation
              </a>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
