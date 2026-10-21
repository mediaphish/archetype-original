import React from 'react';

/**
 * Thin line at the top of the pages that sit under Work with Bart (Leadership
 * Advisory, Consulting, Fractional Roles and its role pages), so a visitor who
 * lands on one directly can see the other ways to work together. Bart,
 * 2026-10-20: keep the old content under Work with Bart and tie it in.
 */
export default function PartOfWorkWithBart() {
  return (
    <div className="border-b border-stone-200 bg-stone-100">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-2 gap-y-1 px-4 py-2.5 text-sm sm:px-6 md:px-10">
        <span className="text-stone-600">Part of Work with Bart</span>
        <span aria-hidden="true" className="text-stone-400">
          ·
        </span>
        <a
          href="/work-with-bart"
          onClick={(e) => {
            e.preventDefault();
            window.history.pushState({}, '', '/work-with-bart');
            window.dispatchEvent(new PopStateEvent('popstate'));
            window.scrollTo({ top: 0, behavior: 'instant' });
          }}
          className="font-semibold text-ao-red hover:underline"
        >
          See all the ways to work together →
        </a>
      </div>
    </div>
  );
}
