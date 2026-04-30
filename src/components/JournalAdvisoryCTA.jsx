import React from 'react';

/** Post-footer invitation to advisory. Hidden for devotionals when parent passes hide. */
export default function JournalAdvisoryCTA({ hidden = false }) {
  if (hidden) return null;

  const go = (e, path) => {
    e.preventDefault();
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  return (
    <aside
      className="bg-[#2B2929] px-8 py-14 sm:px-12 sm:py-20 text-center"
      aria-labelledby="journal-advisory-cta-heading"
    >
      <h2
        id="journal-advisory-cta-heading"
        className="font-serif text-3xl sm:text-4xl font-normal text-white mb-4 leading-tight"
      >
        The conversation starts here.
      </h2>
      <p className="text-base sm:text-lg leading-relaxed text-white/60 max-w-xl mx-auto mb-8">
        If something in this piece landed because your own room cannot say it out loud, private advisory
        exists for exactly that gap.
      </p>
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <a
          href="/advisory"
          onClick={(e) => go(e, '/advisory')}
          className="inline-flex min-h-[44px] items-center justify-center bg-[#DB0812] px-8 py-3 text-sm font-semibold uppercase tracking-wider text-white transition-opacity hover:opacity-90"
        >
          How advisory works
        </a>
        <a
          href="/the-room"
          onClick={(e) => go(e, '/the-room')}
          className="inline-flex min-h-[44px] items-center justify-center border border-white/30 px-8 py-3 text-sm font-semibold uppercase tracking-wider text-white/80 transition-all hover:border-white/70 hover:text-white"
        >
          Read The Room first
        </a>
      </div>
    </aside>
  );
}
