/**
 * Anti-Projects Section
 * Editorial Minimal Design - Bold Typography with Orange Borders
 */
import React from 'react';

export default function AntiProjects() {
  return (
    <section className="py-16 sm:py-24 md:py-32 lg:py-40 bg-white">
      <div className="container mx-auto px-4 sm:px-6 md:px-12">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#1A1A1A] mb-4 sm:mb-6 font-serif tracking-tight text-balance mb-12 sm:mb-16 md:mb-20">
            The Anti-Projects
          </h2>
          
          <p className="text-base sm:text-lg leading-relaxed text-[#6B6B6B] mb-12 sm:mb-16 md:mb-20 text-pretty">
            Research and frameworks that expose the patterns destroying leadership and culture—so we can build something better.
          </p>
          
          <div className="space-y-16 sm:space-y-20 md:space-y-24">
            {/* Scoreboard Leadership */}
            <article className="pl-0 sm:pl-6 md:pl-8 border-l-[6px] border-[#C85A3C]">
              <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-start mb-4">
                <span className="text-[144px] sm:text-[160px] md:text-[192px] font-bold text-[#C85A3C] leading-none font-serif tracking-tight">
                  01
                </span>
                <div className="flex-1">
                  <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#1A1A1A] mb-6 sm:mb-8 font-serif tracking-tight text-balance">
                    Scoreboard Leadership
                  </h3>
                </div>
              </div>
              <div className="pl-0 md:pl-8">
                <p className="text-base sm:text-lg leading-relaxed text-[#6B6B6B] mb-4 sm:mb-6 text-pretty">
                  When leadership becomes a numbers game, people become expendable. Scoreboard Leadership reveals the patterns of ego-driven decision-making that slowly destroy trust and culture from the inside out.
                </p>
                <a 
                  href="/culture-science/anti-projects/scoreboard-leadership"
                  onClick={(e) => {
                    e.preventDefault();
                    window.history.pushState({}, '', '/culture-science/anti-projects/scoreboard-leadership');
                    window.dispatchEvent(new PopStateEvent('popstate'));
                  }}
                  className="text-[#1A1A1A] font-medium text-base sm:text-lg hover:underline"
                >
                  Explore Research →
                </a>
              </div>
            </article>

            {/* Bad Leader Project */}
            <article className="pl-0 sm:pl-6 md:pl-8 border-l-[6px] border-[#C85A3C]">
              <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-start mb-4">
                <span className="text-[144px] sm:text-[160px] md:text-[192px] font-bold text-[#C85A3C] leading-none font-serif tracking-tight">
                  02
                </span>
                <div className="flex-1">
                  <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#1A1A1A] mb-6 sm:mb-8 font-serif tracking-tight text-balance">
                    The Bad Leader Project
                  </h3>
                </div>
              </div>
              <div className="pl-0 md:pl-8">
                <p className="text-base sm:text-lg leading-relaxed text-[#6B6B6B] mb-4 sm:mb-6 text-pretty">
                  The heat-map of dysfunctional leadership across industries and regions. Anonymous insights, aggregated patterns, and clarity about where leadership is breaking down.
                </p>
                <a 
                  href="/culture-science/anti-projects/bad-leader-project"
                  onClick={(e) => {
                    e.preventDefault();
                    window.history.pushState({}, '', '/culture-science/anti-projects/bad-leader-project');
                    window.dispatchEvent(new PopStateEvent('popstate'));
                  }}
                  className="text-[#1A1A1A] font-medium text-base sm:text-lg hover:underline"
                >
                  Explore Research →
                </a>
              </div>
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}
