/**
 * What I'm Building Section
 * Editorial Minimal Design - 5 Pillars in Card Grid
 */
import React from 'react';

export default function WhatImBuilding() {
  const handleLinkClick = (e, href) => {
    e.preventDefault();
    window.history.pushState({}, '', href);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  return (
    <section id="what-im-building" className="py-16 sm:py-24 md:py-32 bg-[#FAFAF9]">
      <div className="container mx-auto px-4 sm:px-6 md:px-12">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#1A1A1A] mb-6 sm:mb-8 font-serif tracking-tight text-center">
            What I'm Building
          </h2>
          
          {/* Intro paragraph */}
          <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] mb-12 sm:mb-16 text-center max-w-3xl mx-auto">
            Everything here is grounded in lived experience and refined through research. These are the tools, methods, and systems I use to help leaders create environments where people can thrive.
          </p>
          
          {/* Five pillars grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* PILLAR 1: Culture Science */}
            <div className="bg-white border border-[#1A1A1A]/10 rounded-lg p-8 relative">
              {/* Badge */}
              <div className="absolute top-8 right-8">
                <span className="text-xs bg-[#C85A3C]/10 text-[#C85A3C] px-3 py-1 rounded-full">
                  In Development
                </span>
              </div>
              
              <h3 className="font-serif font-bold text-xl text-[#1A1A1A] mb-4">
                Culture Science
              </h3>
              
              <div className="space-y-4 mb-6">
                <p className="text-base sm:text-lg leading-relaxed text-[#6B6B6B]">
                  A research-backed framework for understanding how culture forms, shifts, and strengthens. Culture Science examines the behaviors, communication patterns, and leadership dynamics that create the environments people experience every day.
                </p>
                <p className="text-base sm:text-lg leading-relaxed text-[#6B6B6B]">
                  It's not theory. It's observable, repeatable, and grounded in decades of real-world leadership.
                </p>
              </div>
              
              <a
                href="/culture-science"
                onClick={(e) => handleLinkClick(e, '/culture-science')}
                className="text-[#C85A3C] hover:underline inline-block"
              >
                Explore Culture Science →
              </a>
            </div>

            {/* PILLAR 2: Mentorship */}
            <div className="bg-white border border-[#1A1A1A]/10 rounded-lg p-8">
              <h3 className="font-serif font-bold text-xl text-[#1A1A1A] mb-4">
                Mentorship
              </h3>
              
              <p className="text-base sm:text-lg leading-relaxed text-[#6B6B6B] mb-6">
                Long-term, relational leadership coaching for leaders navigating weight, transition, or the gap between where they are and where they want to be. Mentorship is not advice — it's clarity, accountability, and steady presence.
              </p>
              
              <a
                href="/methods/mentorship"
                onClick={(e) => handleLinkClick(e, '/methods/mentorship')}
                className="text-[#C85A3C] hover:underline inline-block"
              >
                Explore Mentorship →
              </a>
            </div>

            {/* PILLAR 3: Consulting */}
            <div className="bg-white border border-[#1A1A1A]/10 rounded-lg p-8">
              <h3 className="font-serif font-bold text-xl text-[#1A1A1A] mb-4">
                Consulting
              </h3>
              
              <p className="text-base sm:text-lg leading-relaxed text-[#6B6B6B] mb-6">
                Short-term, high-clarity engagements for organizations facing cultural misalignment, leadership gaps, or strategic drift. Consulting brings diagnostic precision and actionable direction to the situations that feel stuck.
              </p>
              
              <a
                href="/methods/consulting"
                onClick={(e) => handleLinkClick(e, '/methods/consulting')}
                className="text-[#C85A3C] hover:underline inline-block"
              >
                Explore Consulting →
              </a>
            </div>

            {/* PILLAR 4: Training & Education */}
            <div className="bg-white border border-[#1A1A1A]/10 rounded-lg p-8">
              <h3 className="font-serif font-bold text-xl text-[#1A1A1A] mb-4">
                Training & Education
              </h3>
              
              <p className="text-base sm:text-lg leading-relaxed text-[#6B6B6B] mb-6">
                Workshops, seminars, and custom training programs for leaders, teams, and students. Education here is grounded in real-world experience, behavioral clarity, and the conviction that people deserve to work in environments that build them.
              </p>
              
              <a
                href="/methods/training-education"
                onClick={(e) => handleLinkClick(e, '/methods/training-education')}
                className="text-[#C85A3C] hover:underline inline-block"
              >
                Explore Training & Education →
              </a>
            </div>

            {/* PILLAR 5: Speaking & Seminars */}
            <div className="bg-white border border-[#1A1A1A]/10 rounded-lg p-8">
              <h3 className="font-serif font-bold text-xl text-[#1A1A1A] mb-4">
                Speaking & Seminars
              </h3>
              
              <p className="text-base sm:text-lg leading-relaxed text-[#6B6B6B] mb-6">
                Keynotes, workshops, and educational sessions that strengthen understanding rather than hype people up temporarily. Speaking engagements focus on servant leadership, culture science, and the behaviors that build trust and lasting change.
              </p>
              
              <a
                href="/methods/speaking-seminars"
                onClick={(e) => handleLinkClick(e, '/methods/speaking-seminars')}
                className="text-[#C85A3C] hover:underline inline-block"
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
