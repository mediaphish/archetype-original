/**
 * Let's Build Your Leadership Legacy Section
 * Editorial Minimal Design
 */
import React from 'react';

export default function LeadershipLegacy() {
  return (
    <section className="py-16 sm:py-20 md:py-32 lg:py-40 bg-white">
      <div className="container mx-auto px-4 sm:px-6 md:px-12">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-[48px] sm:text-[64px] md:text-[72px] lg:text-[96px] font-bold text-[#1A1A1A] mb-6 sm:mb-8 md:mb-10 font-serif tracking-tight text-balance">
            Let's Build Your Leadership Legacy
          </h2>
          
          <div className="space-y-6 sm:space-y-8 mb-8 sm:mb-10 md:mb-12">
            <p className="text-base md:text-lg lg:text-xl leading-relaxed text-[#6B6B6B] text-pretty">
              When I'm with a client, I'm fully present. When I'm not, I'm writing, researching, and building this entire leadership universe so you have tools you can actually live with.
            </p>
            
            <p className="text-base md:text-lg lg:text-xl leading-relaxed text-[#6B6B6B] text-pretty">
              If you're ready to steady the ground under your feet, rebuild clarity, and lead with strength and humility—let's talk.
            </p>
          </div>
          
          <button className="min-h-[44px] inline-flex items-center justify-center bg-[#1A1A1A] text-white px-8 sm:px-10 py-4 sm:py-5 font-medium text-sm sm:text-base hover:bg-[#1A1A1A]/90 transition-colors">
            Get Started
          </button>
        </div>
      </div>
    </section>
  );
}
