/**
 * Homepage closing — Two ways to start (Prompt 1).
 */
import React from 'react';

export default function FinalCTA() {
  const handleLinkClick = (e, href) => {
    e.preventDefault();
    window.history.pushState({}, '', href);
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  return (
    <section className="border-t border-[#1A1A1A]/10 bg-[#FAFAF9] py-12 sm:py-14 md:py-16 lg:py-20">
      <div className="container mx-auto px-4 sm:px-6 md:px-12">
        <div className="mx-auto max-w-5xl text-center">
          <p className="mb-3 inline-block border border-[#1A1A1A]/10 px-3 py-1 text-xs font-medium uppercase tracking-wider text-[#DB0812]">
            Two ways to start
          </p>
          <h2 className="font-serif text-4xl font-bold leading-[0.95] text-[#1A1A1A] sm:text-5xl md:text-6xl">
            Advisory or the book
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-[#1A1A1A]/70 sm:text-xl">
            Most leaders begin with the relationship conversation. Others want to read the argument first — then decide if outside-the-room counsel fits.
          </p>

          <div className="mt-10 grid gap-6 text-left sm:grid-cols-2 sm:gap-8">
            <div className="flex flex-col border border-[#1A1A1A]/10 bg-white p-8 sm:p-10">
              <h3 className="font-serif text-2xl font-bold text-[#1A1A1A]">Leadership advisory</h3>
              <p className="mt-3 flex-1 text-base leading-relaxed text-[#6B6B6B]">
                One room. Outside your system. For when the honest conversation cannot happen inside the building.
              </p>
              <div className="mt-8 flex flex-col gap-3">
                <a
                  href="/advisory"
                  onClick={(e) => handleLinkClick(e, '/advisory')}
                  className="inline-flex min-h-[44px] items-center justify-center bg-[#1A1A1A] px-6 py-4 text-center text-sm font-medium text-white transition-colors hover:bg-[#1A1A1A]/90"
                >
                  How advisory works
                </a>
                <a
                  href="/engagement-inquiry"
                  onClick={(e) => handleLinkClick(e, '/engagement-inquiry')}
                  className="inline-flex min-h-[44px] items-center justify-center border border-[#1A1A1A] px-6 py-4 text-center text-sm font-medium text-[#1A1A1A] transition-colors hover:bg-[#1A1A1A] hover:text-white"
                >
                  Work together
                </a>
              </div>
            </div>

            <div className="flex flex-col border border-[#1A1A1A]/10 bg-white p-8 sm:p-10">
              <h3 className="font-serif text-2xl font-bold text-[#1A1A1A]">The Room</h3>
              <p className="mt-3 flex-1 text-base leading-relaxed text-[#6B6B6B]">
                A seventy-page book on structural honesty, authority, and why feedback collapses under pressure — before you commit to anything else.
              </p>
              <div className="mt-8 flex flex-col gap-3">
                <a
                  href="/the-room"
                  onClick={(e) => handleLinkClick(e, '/the-room')}
                  className="inline-flex min-h-[44px] items-center justify-center bg-[#1A1A1A] px-6 py-4 text-center text-sm font-medium text-white transition-colors hover:bg-[#1A1A1A]/90"
                >
                  Book landing &amp; order
                </a>
                <a
                  href="/books"
                  onClick={(e) => handleLinkClick(e, '/books')}
                  className="inline-flex min-h-[44px] items-center justify-center border border-[#1A1A1A] px-6 py-4 text-center text-sm font-medium text-[#1A1A1A] transition-colors hover:bg-[#1A1A1A] hover:text-white"
                >
                  All books
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
