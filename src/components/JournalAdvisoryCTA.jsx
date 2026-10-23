import React from 'react';

/**
 * Post-footer invitation to work with Bart. Hidden for devotionals when parent
 * passes hide. Rewritten 2026-10-21 for Work with Bart: the journal is the
 * site's biggest draw (1,732 visits to entries from Sept 10 to Oct 19), and this
 * box used to send every reader to "private advisory".
 */
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
        If something here landed close to home, you do not have to work it out alone. Your first conversation with me is
        free, up to ninety minutes, on whatever you are carrying.
      </p>
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <a
          href="/work-with-bart"
          onClick={(e) => go(e, '/work-with-bart')}
          className="inline-flex min-h-[44px] items-center justify-center bg-[#DB0812] px-8 py-3 text-sm font-semibold uppercase tracking-wider text-white transition-opacity hover:opacity-90"
        >
          Ways to work together
        </a>
        <a
          href="/engagement-inquiry?option=conversation"
          onClick={(e) => go(e, '/engagement-inquiry?option=conversation')}
          className="inline-flex min-h-[44px] items-center justify-center border border-white/30 px-8 py-3 text-sm font-semibold uppercase tracking-wider text-white/80 transition-all hover:border-white/70 hover:text-white"
        >
          Book a conversation
        </a>
      </div>
    </aside>
  );
}
