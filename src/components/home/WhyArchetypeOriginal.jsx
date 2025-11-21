/**
 * Why Archetype Original Section
 * Editorial Minimal Design - Two Column with Photo Placeholder
 */
import React from 'react';

export default function WhyArchetypeOriginal() {
  return (
    <section className="py-16 sm:py-20 md:py-32 lg:py-40 bg-[#FAFAF9]">
      <div className="container mx-auto px-4 sm:px-6 md:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left: Photo Placeholder */}
            <div className="order-2 md:order-1">
              <div className="w-full aspect-square bg-[#6B6B6B]/10 flex items-center justify-center">
                <span className="text-[#6B6B6B] text-sm">Photo Placeholder<br />500x500px<br />Natural casual portrait, direct eye contact, simple background</span>
              </div>
            </div>
            
            {/* Right: Content */}
            <div className="order-1 md:order-2">
              <h2 className="text-[48px] sm:text-[64px] md:text-[72px] lg:text-[96px] font-bold text-[#1A1A1A] mb-6 sm:mb-8 md:mb-10 font-serif tracking-tight text-balance">
                Why Archetype Original?
              </h2>
              
              <div className="space-y-6 sm:space-y-8">
                <p className="text-base md:text-lg lg:text-xl leading-relaxed text-[#6B6B6B] text-pretty">
                  Archetype means first pattern—the foundational model everything else imitates. Original means from the source—unfiltered, unmanufactured, and true to its purpose.
                </p>
                
                <p className="text-base md:text-lg lg:text-xl leading-relaxed text-[#6B6B6B] text-pretty">
                  Together they communicate the heartbeat of this work:
                </p>
                
                <blockquote className="pl-6 sm:pl-8 border-l-4 border-[#C85A3C] my-10 sm:my-12">
                  <p className="text-xl sm:text-2xl md:text-3xl italic text-[#1A1A1A] leading-tight font-serif">
                    Be the kind of leader that becomes the model for others. Lead in a way that is rooted, steady, and grounded in something real—human before corporate.
                  </p>
                </blockquote>
                
                <p className="text-base md:text-lg lg:text-xl leading-relaxed text-[#6B6B6B] text-pretty">
                  Archetype Original isn't branding. It's identity. It's the standard I hold myself to—and the standard I help leaders build for their teams.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
