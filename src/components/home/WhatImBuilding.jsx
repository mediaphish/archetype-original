/**
 * What I'm Building Section
 * Editorial Minimal Design - Numbered Vertical Stack
 */
import React from 'react';

export default function WhatImBuilding() {
  return (
    <section id="mentoring" className="py-16 sm:py-20 md:py-32 lg:py-40 bg-[#FAFAF9]">
      <div className="container mx-auto px-4 sm:px-6 md:px-12">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-[48px] sm:text-[64px] md:text-[72px] lg:text-[96px] font-bold text-[#1A1A1A] mb-6 sm:mb-8 md:mb-12 font-serif tracking-tight text-balance">
            What I'm Building
          </h2>
          
          <div className="space-y-16 sm:space-y-20 md:space-y-24">
            {/* Pillar 1: Mentoring */}
            <div className="flex flex-col md:flex-row gap-8 md:gap-12 items-start">
              <div className="flex-shrink-0">
                <span className="text-[144px] sm:text-[160px] md:text-[192px] font-bold text-[#6B6B6B]/20 leading-none font-serif tracking-tight">
                  01
                </span>
              </div>
              <div className="flex-1">
                <h3 className="text-[32px] sm:text-[42px] md:text-[48px] lg:text-[64px] font-bold text-[#1A1A1A] mb-4 sm:mb-6 font-serif tracking-tight">
                  Mentoring & Consulting
                </h3>
                <p className="text-base md:text-lg lg:text-xl leading-relaxed text-[#6B6B6B] mb-4 text-pretty">
                  1:1 mentoring, team clarity work, culture rebuilds, and practical frameworks leaders can actually live with.
                </p>
                <p className="text-base md:text-lg lg:text-xl leading-relaxed text-[#6B6B6B] text-pretty">
                  I work with executives, founders, emerging leaders, and students. We clear the fog, rebuild confidence, align teams, and make decisions cleanly. One conversation at a time.
                </p>
              </div>
            </div>

            {/* Pillar 2: Culture Science */}
            <div className="flex flex-col md:flex-row gap-8 md:gap-12 items-start">
              <div className="flex-shrink-0">
                <span className="text-[144px] sm:text-[160px] md:text-[192px] font-bold text-[#6B6B6B]/20 leading-none font-serif tracking-tight">
                  02
                </span>
              </div>
              <div className="flex-1">
                <h3 className="text-[32px] sm:text-[42px] md:text-[48px] lg:text-[64px] font-bold text-[#1A1A1A] mb-4 sm:mb-6 font-serif tracking-tight">
                  Culture Science
                </h3>
                <p className="text-base md:text-lg lg:text-xl leading-relaxed text-[#6B6B6B] mb-4 text-pretty">
                  Evidence-based culture measurement for small and mid-sized businesses.
                </p>
                <p className="text-base md:text-lg lg:text-xl leading-relaxed text-[#6B6B6B] text-pretty">
                  This is where the Archetype Leadership Index (ALI) lives—our first diagnostic for measuring how healthy leadership feels from the inside out. Culture Science will grow into research, industry comparisons, reports, and the early foundations of something bigger.
                </p>
              </div>
            </div>

            {/* Pillar 3: Leadership Education */}
            <div className="flex flex-col md:flex-row gap-8 md:gap-12 items-start">
              <div className="flex-shrink-0">
                <span className="text-[144px] sm:text-[160px] md:text-[192px] font-bold text-[#6B6B6B]/20 leading-none font-serif tracking-tight">
                  03
                </span>
              </div>
              <div className="flex-1">
                <h3 className="text-[32px] sm:text-[42px] md:text-[48px] lg:text-[64px] font-bold text-[#1A1A1A] mb-4 sm:mb-6 font-serif tracking-tight">
                  Leadership Education
                </h3>
                <p className="text-base md:text-lg lg:text-xl leading-relaxed text-[#6B6B6B] mb-4 text-pretty">
                  Journal, playbooks, and resources to help leaders grow without losing what makes them human.
                </p>
                <p className="text-base md:text-lg lg:text-xl leading-relaxed text-[#6B6B6B] text-pretty">
                  I write constantly—long-form pieces, frameworks, research-backed insights, and real stories from my own leadership journey. Everything Archy teaches begins here.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
