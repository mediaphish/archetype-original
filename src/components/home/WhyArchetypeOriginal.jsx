/**
 * Why Archetype Original Section
 * Editorial Minimal Design - Name meaning and philosophy
 */
import React from 'react';

export default function WhyArchetypeOriginal() {
  const handleLinkClick = (e, href) => {
    e.preventDefault();
    window.history.pushState({}, '', href);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  return (
    <section className="py-16 sm:py-24 md:py-32 lg:py-40 bg-white">
      <div className="container mx-auto px-4 sm:px-6 md:px-12">
        <div className="max-w-4xl mx-auto">
          {/* Badge */}
          <div className="inline-block mb-6 sm:mb-8">
            <span className="inline-block px-3 py-1 border border-[#1A1A1A]/10 text-xs font-medium tracking-wider text-[#C85A3C] uppercase">
              The Name Matters
            </span>
          </div>
          
          {/* Header */}
          <h2 className="font-serif text-[48px] sm:text-[64px] md:text-[72px] font-bold text-[#1A1A1A] mb-8 sm:mb-10 leading-[0.9]">
            Why Archetype Original?
          </h2>
          
          {/* Body paragraphs */}
          <div className="space-y-6 mb-10 sm:mb-12">
            <p className="text-lg sm:text-xl md:text-2xl leading-relaxed text-[#1A1A1A]/70">
              Archetype means first pattern — the model everything else imitates. Original means from the source — unfiltered, unmanufactured, true to its purpose.
            </p>
            
            <p className="text-lg sm:text-xl md:text-2xl leading-relaxed text-[#1A1A1A]/70">
              Together they define the heartbeat of this work:
            </p>
          </div>
          
          {/* Blockquote */}
          <blockquote className="my-10 sm:my-12 pl-6 sm:pl-8 border-l-4 border-[#C85A3C]">
            <p className="text-xl sm:text-2xl md:text-3xl italic font-serif text-[#1A1A1A] leading-tight">
              Be the kind of leader others want to follow. Lead in a way that becomes the pattern for something healthier, stronger, and more human.
            </p>
          </blockquote>
          
          {/* CTA Button */}
          <a
            href="/philosophy"
            onClick={(e) => handleLinkClick(e, '/philosophy')}
            className="inline-block bg-[#1A1A1A] text-white px-8 sm:px-10 py-4 sm:py-5 font-medium text-sm sm:text-base hover:bg-[#1A1A1A]/90 transition-colors"
          >
            Explore the Philosophy →
          </a>
        </div>
      </div>
    </section>
  );
}
