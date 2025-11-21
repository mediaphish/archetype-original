/**
 * What I'm Building Section
 * Editorial Minimal Design - Numbered Vertical Stack
 */
import React from 'react';

export default function WhatImBuilding() {
  return (
    <section id="mentoring" className="py-16 sm:py-24 md:py-32 lg:py-40 bg-[#FAFAF9]">
      <div className="container mx-auto px-4 sm:px-6 md:px-12">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#1A1A1A] mb-4 sm:mb-6 font-serif tracking-tight text-balance">
            What I'm Building
          </h2>
          
          <p className="text-base sm:text-lg leading-relaxed text-[#6B6B6B] mb-12 sm:mb-16 md:mb-20 text-pretty">
            Three interconnected pillars designed to help leaders lead with strength and humility—and build cultures people actually want to be part of.
          </p>
          
          <div className="space-y-16 sm:space-y-20 md:space-y-24">
            {/* Pillar 1: Mentoring */}
            <div className="flex flex-col md:flex-row gap-8 md:gap-12 items-start">
              <div className="flex-shrink-0">
                <span className="text-[144px] sm:text-[160px] md:text-[192px] font-bold text-[#6B6B6B]/20 leading-none font-serif tracking-tight">
                  01
                </span>
              </div>
              <div className="flex-1">
                <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#1A1A1A] mb-4 sm:mb-6 font-serif tracking-tight">
                  Mentoring & Consulting
                </h3>
                <p className="text-base sm:text-lg leading-relaxed text-[#6B6B6B] mb-6 sm:mb-8 text-pretty">
                  1:1 mentoring, team clarity work, culture rebuilds, and practical frameworks leaders can actually live with.
                </p>
                <button className="bg-[#1A1A1A] text-white px-8 sm:px-10 py-4 sm:py-5 font-medium text-sm sm:text-base hover:bg-[#1A1A1A]/90 transition-colors">
                  Work With Me
                </button>
              </div>
            </div>

            {/* Pillar 2: Culture Science */}
            <div className="flex flex-col md:flex-row gap-8 md:gap-12 items-start">
              <div className="flex-shrink-0">
                <span className="text-[144px] sm:text-[160px] md:text-[192px] font-bold text-[#C85A3C]/10 leading-none font-serif tracking-tight">
                  02
                </span>
              </div>
              <div className="flex-1">
                <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#1A1A1A] mb-4 sm:mb-6 font-serif tracking-tight">
                  Culture Science
                </h3>
                <p className="text-base sm:text-lg leading-relaxed text-[#6B6B6B] mb-6 sm:mb-8 text-pretty">
                  Evidence-based culture measurement for small and mid-sized businesses. This is where the Archetype Leadership Index (ALI) lives.
                </p>
                <button className="bg-[#1A1A1A] text-white px-8 sm:px-10 py-4 sm:py-5 font-medium text-sm sm:text-base hover:bg-[#1A1A1A]/90 transition-colors">
                  Explore Culture Science
                </button>
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
                <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#1A1A1A] mb-4 sm:mb-6 font-serif tracking-tight">
                  Leadership Education
                </h3>
                <p className="text-base sm:text-lg leading-relaxed text-[#6B6B6B] mb-6 sm:mb-8 text-pretty">
                  Journal, playbooks, and resources to help leaders grow without losing what makes them human.
                </p>
                <button className="bg-[#1A1A1A] text-white px-8 sm:px-10 py-4 sm:py-5 font-medium text-sm sm:text-base hover:bg-[#1A1A1A]/90 transition-colors">
                  Read the Journal
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
