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
  };

  return (
    <section id="what-im-building" className="py-16 sm:py-24 md:py-32 lg:py-40 bg-white">
      <div className="container mx-auto px-4 sm:px-6 md:px-12">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <h2 className="font-serif text-[48px] sm:text-[64px] md:text-[80px] lg:text-[96px] font-bold text-[#1A1A1A] mb-6 sm:mb-8 leading-[0.9]">
            What I'm Building
          </h2>
          
          {/* Intro paragraph */}
          <p className="text-lg sm:text-xl md:text-2xl leading-relaxed text-[#1A1A1A]/70 mb-12 sm:mb-16 text-center max-w-4xl mx-auto">
            Five interconnected disciplines designed to help leaders lead with clarity, steward culture with intention, and build organizations people trust enough to belong to.
          </p>
          
          {/* Five Pillars (vertical layout with orange left borders) */}
          <div className="max-w-7xl mx-auto space-y-16 sm:space-y-20 md:space-y-24">
            {/* PILLAR 01: Culture Science */}
            <div className="border-l-4 border-[#C85A3C] pl-8 sm:pl-10 md:pl-12">
              <div className="text-[#C85A3C] font-bold text-xl sm:text-2xl mb-4">01</div>
              <h3 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-[#1A1A1A] mb-6 sm:mb-8 leading-tight">
                Culture Science
              </h3>
              <p className="text-lg sm:text-xl md:text-2xl leading-relaxed text-[#1A1A1A]/70 mb-8 sm:mb-10 max-w-3xl">
                The research engine behind Archetype Original. Culture Science brings together psychology, behavior, communication, trust physiology, organizational clarity, and environmental patterns into a usable discipline. This is where the Archetype Leadership Index (ALI), Scoreboard Leadership, and The Bad Leader Project live.
              </p>
              <a
                href="/culture-science"
                onClick={(e) => handleLinkClick(e, '/culture-science')}
                className="inline-flex items-center text-lg sm:text-xl font-medium text-[#1A1A1A] hover:text-[#C85A3C] transition-colors"
              >
                Explore Culture Science →
              </a>
            </div>

            {/* PILLAR 02: Mentorship */}
            <div className="border-l-4 border-[#C85A3C] pl-8 sm:pl-10 md:pl-12">
              <div className="text-[#C85A3C] font-bold text-xl sm:text-2xl mb-4">02</div>
              <h3 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#1A1A1A] mb-6 sm:mb-8 leading-tight">
                Mentorship
              </h3>
              <p className="text-lg sm:text-xl md:text-2xl leading-relaxed text-[#1A1A1A]/70 mb-8 sm:mb-10 max-w-3xl">
                Clarity, courage, responsibility, and adaptive support for leaders at every stage — from rising leaders to seasoned executives. This is real-time leadership development grounded in lived experience, not programs or scripts.
              </p>
              <a
                href="/methods/mentorship"
                onClick={(e) => handleLinkClick(e, '/methods/mentorship')}
                className="inline-flex items-center text-lg sm:text-xl font-medium text-[#1A1A1A] hover:text-[#C85A3C] transition-colors"
              >
                Explore Mentorship →
              </a>
            </div>

            {/* PILLAR 03: Consulting */}
            <div className="border-l-4 border-[#C85A3C] pl-8 sm:pl-10 md:pl-12">
              <div className="text-[#C85A3C] font-bold text-xl sm:text-2xl mb-4">03</div>
              <h3 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#1A1A1A] mb-6 sm:mb-8 leading-tight">
                Consulting
              </h3>
              <p className="text-lg sm:text-xl md:text-2xl leading-relaxed text-[#1A1A1A]/70 mb-8 sm:mb-10 max-w-3xl">
                Clarity for teams. Alignment for organizations. Cultural repair, operational steadiness, communication systems, and leadership behavior calibrated to support real growth. When clarity is missing, consulting brings it back.
              </p>
              <a
                href="/methods/consulting"
                onClick={(e) => handleLinkClick(e, '/methods/consulting')}
                className="inline-flex items-center text-lg sm:text-xl font-medium text-[#1A1A1A] hover:text-[#C85A3C] transition-colors"
              >
                Explore Consulting →
              </a>
            </div>

            {/* PILLAR 04: Training & Education */}
            <div className="border-l-4 border-[#C85A3C] pl-8 sm:pl-10 md:pl-12">
              <div className="text-[#C85A3C] font-bold text-xl sm:text-2xl mb-4">04</div>
              <h3 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#1A1A1A] mb-6 sm:mb-8 leading-tight">
                Training & Education
              </h3>
              <p className="text-lg sm:text-xl md:text-2xl leading-relaxed text-[#1A1A1A]/70 mb-8 sm:mb-10 max-w-3xl">
                Workshops, playbooks, and leadership curriculum rooted in experience and backed by research. For leaders, teams, and emerging talent who need clarity they can actually apply the next day.
              </p>
              <a
                href="/methods/training-education"
                onClick={(e) => handleLinkClick(e, '/methods/training-education')}
                className="inline-flex items-center text-lg sm:text-xl font-medium text-[#1A1A1A] hover:text-[#C85A3C] transition-colors"
              >
                Explore Training & Education →
              </a>
            </div>

            {/* PILLAR 05: Speaking & Seminars */}
            <div className="border-l-4 border-[#C85A3C] pl-8 sm:pl-10 md:pl-12">
              <div className="text-[#C85A3C] font-bold text-xl sm:text-2xl mb-4">05</div>
              <h3 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#1A1A1A] mb-6 sm:mb-8 leading-tight">
                Speaking & Seminars
              </h3>
              <p className="text-lg sm:text-xl md:text-2xl leading-relaxed text-[#1A1A1A]/70 mb-8 sm:mb-10 max-w-3xl">
                Leadership in the room — not a performance on a stage. Talks, seminars, workshops, and intensives built around clarity, steadiness, and lived truth instead of hype or theatrics.
              </p>
              <a
                href="/methods/speaking-seminars"
                onClick={(e) => handleLinkClick(e, '/methods/speaking-seminars')}
                className="inline-flex items-center text-lg sm:text-xl font-medium text-[#1A1A1A] hover:text-[#C85A3C] transition-colors"
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
