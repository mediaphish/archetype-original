/**
 * What I'm Building Section
 * Editorial Minimal Design - 5 Pillars in Vertical Layout with Orange Borders
 */
import React from 'react';

export default function WhatImBuilding() {
  const handleLinkClick = (e, href) => {
    e.preventDefault();
    window.history.pushState({}, '', href);
    window.dispatchEvent(new PopStateEvent('popstate'));
    // Scroll to top when navigating to a new page
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  return (
    <section id="what-im-building" className="py-12 sm:py-16 md:py-20 lg:py-20 bg-white">
      <div className="container mx-auto px-4 sm:px-6 md:px-12">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <h2 className="font-serif text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-[#1A1A1A] mb-6 sm:mb-8 leading-[0.9]">
            What I'm Building
          </h2>
          
          {/* Intro paragraph */}
          <p className="text-lg sm:text-xl md:text-2xl leading-relaxed text-[#1A1A1A]/70 mb-12 sm:mb-16 text-center max-w-4xl mx-auto">
            Five interconnected disciplines designed to help leaders lead with clarity, steward culture with intention, and build organizations people trust enough to belong to.
          </p>
          
          {/* Five Pillars (vertical layout with orange left borders) */}
          <div className="max-w-7xl mx-auto space-y-16 sm:space-y-20 md:space-y-24">
            {/* PILLAR 01: Culture Science */}
            <div className="border-l-4 border-[#C85A3C] pl-4 sm:pl-6 md:pl-8 lg:pl-12">
              <div className="relative mb-6 sm:mb-8">
                <div className="absolute -top-6 -left-2 sm:-top-8 sm:-left-4 text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-serif font-bold text-[#1A1A1A]/5 pointer-events-none">
                  01
                </div>
                <div className="relative z-10">
                  <h3 className="font-serif text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-[#1A1A1A] leading-tight break-words">
                    Culture Science
                  </h3>
                </div>
              </div>
              <p className="text-base sm:text-lg md:text-xl lg:text-2xl leading-relaxed text-[#1A1A1A]/70 mb-6 sm:mb-8 md:mb-10 max-w-3xl break-words">
                The research engine behind Archetype Original. Culture Science brings together psychology, behavior, communication, trust physiology, organizational clarity, and environmental patterns into a usable discipline. This is where the Archetype Leadership Index (ALI), Scoreboard Leadership, and The Bad Leader Project live.
              </p>
              <a
                href="/culture-science"
                onClick={(e) => handleLinkClick(e, '/culture-science')}
                className="inline-flex items-center text-base sm:text-lg md:text-xl font-medium text-[#1A1A1A] hover:text-[#C85A3C] transition-colors break-words"
              >
                Explore Culture Science →
              </a>
            </div>

            {/* PILLAR 02: Mentorship */}
            <div className="border-l-4 border-[#C85A3C] pl-4 sm:pl-6 md:pl-8 lg:pl-12">
              <div className="relative mb-6 sm:mb-8">
                <div className="absolute -top-6 -left-2 sm:-top-8 sm:-left-4 text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-serif font-bold text-[#1A1A1A]/5 pointer-events-none">
                  02
                </div>
                <div className="relative z-10">
                  <h3 className="font-serif text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-[#1A1A1A] leading-tight break-words">
                    Mentorship
                  </h3>
                </div>
              </div>
              <p className="text-base sm:text-lg md:text-xl lg:text-2xl leading-relaxed text-[#1A1A1A]/70 mb-6 sm:mb-8 md:mb-10 max-w-3xl break-words">
                Clarity, courage, responsibility, and adaptive support for leaders at every stage — from rising leaders to seasoned executives. This is real-time leadership development grounded in lived experience, not programs or scripts.
              </p>
              <a
                href="/methods/mentorship"
                onClick={(e) => handleLinkClick(e, '/methods/mentorship')}
                className="inline-flex items-center text-base sm:text-lg md:text-xl font-medium text-[#1A1A1A] hover:text-[#C85A3C] transition-colors break-words"
              >
                Explore Mentorship →
              </a>
            </div>

            {/* PILLAR 03: Consulting */}
            <div className="border-l-4 border-[#C85A3C] pl-4 sm:pl-6 md:pl-8 lg:pl-12">
              <div className="relative mb-6 sm:mb-8">
                <div className="absolute -top-6 -left-2 sm:-top-8 sm:-left-4 text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-serif font-bold text-[#1A1A1A]/5 pointer-events-none">
                  03
                </div>
                <div className="relative z-10">
                  <h3 className="font-serif text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-[#1A1A1A] leading-tight break-words">
                    Consulting
                  </h3>
                </div>
              </div>
              <p className="text-base sm:text-lg md:text-xl lg:text-2xl leading-relaxed text-[#1A1A1A]/70 mb-6 sm:mb-8 md:mb-10 max-w-3xl break-words">
                Clarity for teams. Alignment for organizations. Cultural repair, operational steadiness, communication systems, and leadership behavior calibrated to support real growth. When clarity is missing, consulting brings it back.
              </p>
              <a
                href="/methods/consulting"
                onClick={(e) => handleLinkClick(e, '/methods/consulting')}
                className="inline-flex items-center text-base sm:text-lg md:text-xl font-medium text-[#1A1A1A] hover:text-[#C85A3C] transition-colors break-words"
              >
                Explore Consulting →
              </a>
            </div>

            {/* PILLAR 04: Training & Education */}
            <div className="border-l-4 border-[#C85A3C] pl-4 sm:pl-6 md:pl-8 lg:pl-12">
              <div className="relative mb-6 sm:mb-8">
                <div className="absolute -top-6 -left-2 sm:-top-8 sm:-left-4 text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-serif font-bold text-[#1A1A1A]/5 pointer-events-none">
                  04
                </div>
                <div className="relative z-10">
                  <h3 className="font-serif text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-[#1A1A1A] leading-tight break-words">
                    Training & Education
                  </h3>
                </div>
              </div>
              <p className="text-base sm:text-lg md:text-xl lg:text-2xl leading-relaxed text-[#1A1A1A]/70 mb-6 sm:mb-8 md:mb-10 max-w-3xl break-words">
                Workshops, playbooks, and leadership curriculum rooted in experience and backed by research. For leaders, teams, and emerging talent who need clarity they can actually apply the next day.
              </p>
              <a
                href="/methods/training-education"
                onClick={(e) => handleLinkClick(e, '/methods/training-education')}
                className="inline-flex items-center text-base sm:text-lg md:text-xl font-medium text-[#1A1A1A] hover:text-[#C85A3C] transition-colors break-words"
              >
                Explore Training & Education →
              </a>
            </div>

            {/* PILLAR 05: Speaking & Seminars */}
            <div className="border-l-4 border-[#C85A3C] pl-4 sm:pl-6 md:pl-8 lg:pl-12">
              <div className="relative mb-6 sm:mb-8">
                <div className="absolute -top-6 -left-2 sm:-top-8 sm:-left-4 text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-serif font-bold text-[#1A1A1A]/5 pointer-events-none">
                  05
                </div>
                <div className="relative z-10">
                  <h3 className="font-serif text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-[#1A1A1A] leading-tight break-words">
                    Speaking & Seminars
                  </h3>
                </div>
              </div>
              <p className="text-base sm:text-lg md:text-xl lg:text-2xl leading-relaxed text-[#1A1A1A]/70 mb-6 sm:mb-8 md:mb-10 max-w-3xl break-words">
                Leadership in the room — not a performance on a stage. Talks, seminars, workshops, and intensives built around clarity, steadiness, and lived truth instead of hype or theatrics.
              </p>
              <a
                href="/methods/speaking-seminars"
                onClick={(e) => handleLinkClick(e, '/methods/speaking-seminars')}
                className="inline-flex items-center text-base sm:text-lg md:text-xl font-medium text-[#1A1A1A] hover:text-[#C85A3C] transition-colors break-words"
              >
                Explore Speaking & Seminars →
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
