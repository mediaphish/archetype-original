/**
 * The Anti-Projects Section
 * Editorial Minimal Design - Research that exposes patterns
 */
import React from 'react';

export default function AntiProjects() {
  const handleLinkClick = (e, href) => {
    e.preventDefault();
    window.history.pushState({}, '', href);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  return (
    <section className="py-16 sm:py-24 md:py-32 lg:py-40 bg-[#FAFAF9]">
      <div className="container mx-auto px-4 sm:px-6 md:px-12">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <h2 className="font-serif text-4xl sm:text-5xl md:text-5xl lg:text-6xl font-bold text-[#1A1A1A] mb-6 sm:mb-8 leading-tight tracking-tight">
            The Anti-Projects
          </h2>
          
          {/* Subtitle */}
          <p className="text-lg sm:text-xl md:text-2xl leading-relaxed text-[#1A1A1A]/70 mb-12 sm:mb-16">
            Research that exposes the patterns destroying leadership and culture — so we can build something better.
          </p>
          
          {/* Two Anti-Projects (vertical layout with thick orange left borders) */}
          <div className="space-y-12 sm:space-y-16 md:space-y-20">
            {/* ANTI-PROJECT 1: Scoreboard Leadership */}
            <div className="border-l-[6px] border-[#C85A3C] pl-8 sm:pl-10 md:pl-12 py-4">
              <h3 className="font-serif text-3xl sm:text-4xl md:text-4xl lg:text-5xl font-bold text-[#1A1A1A] mb-6 sm:mb-8 leading-tight tracking-tight">
                Scoreboard Leadership
              </h3>
              <p className="text-lg sm:text-xl md:text-2xl leading-relaxed text-[#1A1A1A]/70 mb-8 sm:mb-10 max-w-3xl">
                When leadership becomes a metrics-first performance, people become expendable. Scoreboard Leadership names the patterns of ego-driven decision-making that erode trust, undermine culture, and quietly fracture teams from the inside out.
              </p>
              <a
                href="/culture-science/anti-projects"
                onClick={(e) => handleLinkClick(e, '/culture-science/anti-projects')}
                className="inline-flex items-center text-lg sm:text-xl font-medium text-[#1A1A1A] hover:text-[#C85A3C] transition-colors"
              >
                Explore Research →
              </a>
            </div>

            {/* ANTI-PROJECT 2: The Bad Leader Project */}
            <div className="border-l-[6px] border-[#C85A3C] pl-8 sm:pl-10 md:pl-12 py-4">
              <h3 className="font-serif text-3xl sm:text-4xl md:text-4xl lg:text-5xl font-bold text-[#1A1A1A] mb-6 sm:mb-8 leading-tight tracking-tight">
                The Bad Leader Project
              </h3>
              <p className="text-lg sm:text-xl md:text-2xl leading-relaxed text-[#1A1A1A]/70 mb-8 sm:mb-10 max-w-3xl">
                A heat-map of dysfunctional leadership across industries. Anonymous stories, aggregated patterns, and research that reveals where leadership is breaking down — and what it will take to repair it. Launching Q1 2026.
              </p>
              <a
                href="/culture-science/anti-projects"
                onClick={(e) => handleLinkClick(e, '/culture-science/anti-projects')}
                className="inline-flex items-center text-lg sm:text-xl font-medium text-[#1A1A1A] hover:text-[#C85A3C] transition-colors"
              >
                Explore Research →
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
