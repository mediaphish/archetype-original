/**
 * Homepage Hero — Accidental CEO book promotion
 * Editorial minimal layout consistent with the rest of the public site.
 */
import React from 'react';
import { OptimizedImage } from '../OptimizedImage';

const LULU_ORDER_URL =
  'https://www.lulu.com/shop/bart-paden/accidental-ceo/paperback/product-zmzpjrv.html';

export default function HomeHero() {
  const goInternal = (e, href) => {
    e.preventDefault();
    window.history.pushState({}, '', href);
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  return (
    <section className="bg-white py-6 sm:py-10 md:py-14 lg:py-16">
      <div className="container mx-auto px-4 sm:px-6 md:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 md:gap-10 lg:gap-12 items-center">
            {/* Front + back mockup — wide art on black; first on mobile (top) */}
            <div className="flex justify-center md:justify-start w-full">
              <div className="w-full max-w-lg sm:max-w-xl md:max-w-xl lg:max-w-2xl rounded-lg overflow-hidden bg-black shadow-md">
                <OptimizedImage
                  src="/images/accidental-ceo/front-back.png"
                  alt="Accidental CEO — front and back cover"
                  className="w-full h-auto object-contain"
                  loading="eager"
                />
              </div>
            </div>

            {/* Text column — second on desktop (right); second on mobile (below image) */}
            <div>
              <div className="inline-block mb-4 sm:mb-5">
                <span className="inline-block px-3 py-1 border border-[#1A1A1A]/10 text-xs font-medium tracking-wider text-[#C85A3C] uppercase">
                  Book
                </span>
              </div>

              <h1
                className="font-serif font-bold mb-4 sm:mb-5 text-balance text-[#1A1A1A]"
                style={{
                  fontSize: 'clamp(2.5rem, 5vw + 1rem, 5rem)',
                  lineHeight: '1.1',
                  letterSpacing: '-0.02em',
                }}
              >
                Accidental CEO
              </h1>

              <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl leading-relaxed text-[#1A1A1A]/70 max-w-xl font-light mb-4 sm:mb-5">
                A leadership story about building something real, carrying more than expected, and
                choosing to lead anyway.
              </p>

              <p className="text-base sm:text-lg md:text-xl leading-relaxed text-[#1A1A1A]/65 max-w-xl mb-6 sm:mb-7">
                For founders, operators, and leaders learning that real leadership is formed under
                pressure, not just taught in theory.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-1">
                <a
                  href={LULU_ORDER_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-[#1A1A1A] text-white px-6 sm:px-8 md:px-10 py-3 sm:py-4 md:py-5 font-medium text-sm sm:text-base hover:bg-[#1A1A1A]/90 transition-colors text-center min-h-[44px] flex items-center justify-center"
                >
                  👉 Order the Book
                </a>
                <a
                  href="/accidental-ceo"
                  onClick={(e) => goInternal(e, '/accidental-ceo')}
                  className="bg-transparent text-[#1A1A1A] px-6 sm:px-8 md:px-10 py-3 sm:py-4 md:py-5 font-medium text-sm sm:text-base border border-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white transition-colors text-center min-h-[44px] flex items-center justify-center"
                >
                  👉 Learn More
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
