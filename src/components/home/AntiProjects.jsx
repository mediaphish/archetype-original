/**
 * Anti-Projects Section
 * Editorial Minimal Design - Bold Typography with Orange Borders
 */
import React from 'react';

export default function AntiProjects() {
  return (
    <section className="py-16 sm:py-20 md:py-32 lg:py-40 bg-white">
      <div className="container mx-auto px-4 sm:px-6 md:px-12">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-[48px] sm:text-[64px] md:text-[72px] lg:text-[96px] font-bold text-[#1A1A1A] mb-6 sm:mb-8 md:mb-12 font-serif tracking-tight text-balance mb-16 sm:mb-20 md:mb-24">
            The Anti-Projects
          </h2>
          
          <div className="space-y-20 sm:space-y-24 md:space-y-32">
            {/* Scoreboard Leadership */}
            <article className="pl-0 sm:pl-6 md:pl-8 border-l-[6px] border-[#C85A3C]">
              <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-start mb-4">
                <span className="text-[144px] sm:text-[160px] md:text-[192px] font-bold text-[#6B6B6B]/20 leading-none font-serif tracking-tight">
                  01
                </span>
                <div className="flex-1">
                  <h3 className="text-[40px] sm:text-[48px] md:text-[56px] lg:text-[64px] xl:text-[72px] font-bold text-[#1A1A1A] mb-6 sm:mb-8 font-serif tracking-tight text-balance">
                    Scoreboard Leadership
                  </h3>
                </div>
              </div>
              <div className="pl-0 md:pl-8">
                <p className="text-lg md:text-xl lg:text-2xl leading-relaxed text-[#6B6B6B] text-pretty">
                  When leadership becomes a numbers game, people become expendable. Scoreboard Leadership reveals the patterns of ego-driven decision-making that slowly destroy trust and culture from the inside out.
                </p>
              </div>
            </article>

            {/* Bad Leader Project */}
            <article className="pl-0 sm:pl-6 md:pl-8 border-l-[6px] border-[#C85A3C]">
              <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-start mb-4">
                <span className="text-[144px] sm:text-[160px] md:text-[192px] font-bold text-[#6B6B6B]/20 leading-none font-serif tracking-tight">
                  02
                </span>
                <div className="flex-1">
                  <h3 className="text-[40px] sm:text-[48px] md:text-[56px] lg:text-[64px] xl:text-[72px] font-bold text-[#1A1A1A] mb-6 sm:mb-8 font-serif tracking-tight text-balance">
                    The Bad Leader Project
                  </h3>
                </div>
              </div>
              <div className="pl-0 md:pl-8">
                <p className="text-lg md:text-xl lg:text-2xl leading-relaxed text-[#6B6B6B] text-pretty">
                  The heat-map of dysfunctional leadership across industries and regions. Anonymous insights, aggregated patterns, and clarity about where leadership is breaking down—so we can understand what healthy leadership really requires.
                </p>
              </div>
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}
