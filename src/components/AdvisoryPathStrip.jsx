/**
 * Shared “advisory path” strip for Methods hub + method subpages (Prompt 4 §4).
 */
import React from 'react';

export default function AdvisoryPathStrip({ className = '' }) {
  const go = (e, path) => {
    e.preventDefault();
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  return (
    <aside
      className={`border-y border-ao-red/35 bg-ao-cream ${className}`}
      aria-labelledby="advisory-path-strip-heading"
    >
      <div className="container mx-auto max-w-4xl px-4 py-10 sm:px-6 md:px-12 md:py-12">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ao-red">Advisory path</p>
        <h2
          id="advisory-path-strip-heading"
          className="mt-2 font-serif text-2xl font-bold text-[#1A1A1A] sm:text-3xl"
        >
          When methods are not the missing piece
        </h2>
        <p className="mt-3 text-base leading-relaxed text-[#6B6B6B] sm:text-lg">
          Consulting and speaking address what happens <em>inside</em> the system. Advisory is for the conversation that cannot happen there — outside your hierarchy, without consequence to your political reality.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <a
            href="/advisory"
            onClick={(e) => go(e, '/advisory')}
            className="inline-flex min-h-[44px] items-center justify-center rounded-[3px] bg-ao-red px-6 py-3 text-sm font-bold text-white transition-colors hover:opacity-90"
          >
            How advisory works
          </a>
          <a
            href="/engagement-inquiry"
            onClick={(e) => go(e, '/engagement-inquiry')}
            className="inline-flex min-h-[44px] items-center justify-center border border-[#1A1A1A] px-6 py-3 text-sm font-medium text-[#1A1A1A] transition-colors hover:bg-[#1A1A1A] hover:text-white"
          >
            Explore working together
          </a>
        </div>
      </div>
    </aside>
  );
}
