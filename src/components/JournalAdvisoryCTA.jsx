import React from 'react';

/** Post-footer invitation to advisory (Prompt 4 §5). Hidden for devotionals when parent passes hide. */
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
      className="rounded-sm border border-[#1A1A1A]/10 bg-[#FFF8F3] p-8 sm:p-10"
      aria-labelledby="journal-advisory-cta-heading"
    >
      <h2 id="journal-advisory-cta-heading" className="font-serif text-2xl font-bold text-[#1A1A1A] sm:text-3xl">
        Outside-the-room clarity
      </h2>
      <p className="mt-3 max-w-2xl text-base leading-relaxed text-[#6B6B6B] sm:text-lg">
        If something in this piece landed because your own room cannot say it out loud — private advisory exists for exactly that gap.
      </p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <a
          href="/advisory"
          onClick={(e) => go(e, '/advisory')}
          className="inline-flex min-h-[44px] items-center justify-center bg-[#1A1A1A] px-6 py-3 text-center text-sm font-medium text-white transition-colors hover:bg-[#1A1A1A]/90"
        >
          How advisory works
        </a>
        <a
          href="/the-room"
          onClick={(e) => go(e, '/the-room')}
          className="inline-flex min-h-[44px] items-center justify-center border border-[#1A1A1A] px-6 py-3 text-center text-sm font-medium text-[#1A1A1A] transition-colors hover:bg-[#1A1A1A] hover:text-white"
        >
          Read <em>The Room</em> first
        </a>
      </div>
    </aside>
  );
}
