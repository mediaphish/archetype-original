/**
 * Homepage hero — advisory-first + The Room (Prompt 1).
 */
import React from 'react';
import { OptimizedImage } from '../OptimizedImage';

export default function HomeHero() {
  const goInternal = (e, href) => {
    e.preventDefault();
    window.history.pushState({}, '', href);
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  return (
    <section className="relative min-h-[min(92vh,920px)] flex items-end overflow-hidden bg-[#1A1A1A]">
      <div className="absolute inset-0">
        <OptimizedImage
          src="/images/Bart-8.jpg"
          alt=""
          aria-hidden="true"
          className="h-full w-full object-cover object-[center_22%] opacity-95"
          loading="eager"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/75 to-[#0a0a0a]/35" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a]/88 via-transparent to-transparent" />
      </div>

      <div className="relative z-10 w-full">
        <div className="container mx-auto px-4 sm:px-6 md:px-12 pb-12 sm:pb-16 md:pb-20 pt-28 sm:pt-32">
          <div className="max-w-3xl">
            <p className="mb-3 sm:mb-4 text-xs font-medium uppercase tracking-[0.2em] text-white/80">
              Leadership advisory · The Room
            </p>
            <h1
              className="font-serif font-bold text-balance text-white mb-4 sm:mb-6"
              style={{
                fontSize: 'clamp(2.25rem, 4vw + 1rem, 4rem)',
                lineHeight: '1.08',
                letterSpacing: '-0.02em',
              }}
            >
              The room you think you have is not the room that is actually operating around you.
            </h1>
            <p className="text-lg sm:text-xl md:text-2xl leading-relaxed text-white/85 font-light mb-8 sm:mb-10 max-w-2xl">
              Private advisory for leaders who already sense the gap — plus a short book that names why honest feedback rarely survives authority.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 flex-wrap">
              <a
                href="/advisory"
                onClick={(e) => goInternal(e, '/advisory')}
                className="inline-flex min-h-[48px] items-center justify-center bg-[#DB0812] px-8 py-4 text-base font-medium text-white transition-colors hover:bg-[#b30610]"
              >
                Explore leadership advisory
              </a>
              <a
                href="/the-room"
                onClick={(e) => goInternal(e, '/the-room')}
                className="inline-flex min-h-[48px] items-center justify-center border border-white/85 bg-transparent px-8 py-4 text-base font-medium text-white transition-colors hover:bg-white hover:text-[#1A1A1A]"
              >
                Read The Room ($27)
              </a>
              <a
                href="/engagement-inquiry"
                onClick={(e) => goInternal(e, '/engagement-inquiry')}
                className="inline-flex min-h-[48px] items-center justify-center border border-white/35 bg-white/10 px-8 py-4 text-base font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/20"
              >
                Start a conversation
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
