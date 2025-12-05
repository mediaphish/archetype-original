/**
 * What I'm Building Section
 * Editorial Minimal Design - 5 Pillars in Card Grid
 */
import React from 'react';

export default function WhatImBuilding() {
  return (
    <section id="what-im-building" className="py-16 sm:py-24 md:py-32 bg-[#FAFAF9]">
      <div className="container mx-auto px-4 sm:px-6 md:px-12">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#1A1A1A] mb-6 sm:mb-8 font-serif tracking-tight text-center">
            What I'm Building
          </h2>
          
          <p className="text-base sm:text-lg leading-relaxed text-[#6B6B6B] mb-12 sm:mb-16 text-center max-w-3xl mx-auto">
            Everything here is grounded in lived experience and refined through research. These are the tools, methods, and systems I use to help leaders create environments where people can thrive.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* PILLAR 1: Culture Science */}
            <div className="bg-white border border-[#1A1A1A]/10 rounded-lg p-8 relative">
              <span className="absolute top-4 right-4 text-xs bg-[#C85A3C]/10 text-[#C85A3C] px-3 py-1 rounded-full">
                In Development
              </span>
              <h3 className="text-lg sm:text-xl font-bold text-[#1A1A1A] mb-4 font-serif">
                Culture Science
              </h3>
              <p className="text-base sm:text-lg leading-relaxed text-[#6B6B6B] mb-4">
                A research-backed framework for understanding how culture forms, shifts, and strengthens. Culture Science examines the behaviors, communication patterns, and leadership dynamics that create the environments people experience every day.
              </p>
              <p className="text-base sm:text-lg leading-relaxed text-[#6B6B6B] mb-4">
                It's not theory. It's observable, repeatable, and grounded in decades of real-world leadership.
              </p>
              <a
                href="/culture-science"
                onClick={(e) => {
                  e.preventDefault();
                  window.history.pushState({}, '', '/culture-science');
                  window.dispatchEvent(new PopStateEvent('popstate'));
                }}
                className="text-[#C85A3C] hover:underline inline-block"
              >
                Explore Culture Science →
              </a>
            </div>

            {/* PILLAR 2: The Archetype Leadership Index (ALI) */}
            <div className="bg-white border border-[#1A1A1A]/10 rounded-lg p-8 relative">
              <span className="absolute top-4 right-4 text-xs bg-[#C85A3C]/10 text-[#C85A3C] px-3 py-1 rounded-full">
                In Development
              </span>
              <h3 className="text-lg sm:text-xl font-bold text-[#1A1A1A] mb-4 font-serif">
                The Archetype Leadership Index (ALI)
              </h3>
              <p className="text-base sm:text-lg leading-relaxed text-[#6B6B6B] mb-4">
                A leadership assessment tool designed to help leaders understand their strengths, blind spots, and the cultural impact of their behavior. ALI measures alignment, emotional intelligence, communication, and the principles of servant leadership.
              </p>
              <p className="text-base sm:text-lg leading-relaxed text-[#6B6B6B] mb-4">
                It's currently in pilot testing with leaders across industries.
              </p>
              <a
                href="/culture-science/ali"
                onClick={(e) => {
                  e.preventDefault();
                  window.history.pushState({}, '', '/culture-science/ali');
                  window.dispatchEvent(new PopStateEvent('popstate'));
                }}
                className="text-[#C85A3C] hover:underline inline-block"
              >
                Learn about ALI →
              </a>
            </div>

            {/* PILLAR 3: Mentorship */}
            <div className="bg-white border border-[#1A1A1A]/10 rounded-lg p-8">
              <h3 className="text-lg sm:text-xl font-bold text-[#1A1A1A] mb-4 font-serif">
                Mentorship
              </h3>
              <p className="text-base sm:text-lg leading-relaxed text-[#6B6B6B] mb-4">
                Long-term, relational leadership coaching for leaders navigating weight, transition, or the gap between where they are and where they want to be. Mentorship is not advice — it's clarity, accountability, and steady presence.
              </p>
              <a
                href="/methods/mentorship"
                onClick={(e) => {
                  e.preventDefault();
                  window.history.pushState({}, '', '/methods/mentorship');
                  window.dispatchEvent(new PopStateEvent('popstate'));
                }}
                className="text-[#C85A3C] hover:underline inline-block"
              >
                Explore Mentorship →
              </a>
            </div>

            {/* PILLAR 4: Consulting */}
            <div className="bg-white border border-[#1A1A1A]/10 rounded-lg p-8">
              <h3 className="text-lg sm:text-xl font-bold text-[#1A1A1A] mb-4 font-serif">
                Consulting
              </h3>
              <p className="text-base sm:text-lg leading-relaxed text-[#6B6B6B] mb-4">
                Short-term, high-clarity engagements for organizations facing cultural misalignment, leadership gaps, or strategic drift. Consulting brings diagnostic precision and actionable direction to the situations that feel stuck.
              </p>
              <a
                href="/methods/consulting"
                onClick={(e) => {
                  e.preventDefault();
                  window.history.pushState({}, '', '/methods/consulting');
                  window.dispatchEvent(new PopStateEvent('popstate'));
                }}
                className="text-[#C85A3C] hover:underline inline-block"
              >
                Explore Consulting →
              </a>
            </div>

            {/* PILLAR 5: Training & Education (Full Width) */}
            <div className="bg-white border border-[#1A1A1A]/10 rounded-lg p-8 md:col-span-2">
              <h3 className="text-lg sm:text-xl font-bold text-[#1A1A1A] mb-4 font-serif">
                Training & Education
              </h3>
              <p className="text-base sm:text-lg leading-relaxed text-[#6B6B6B] mb-4">
                Workshops, seminars, and custom training programs for leaders, teams, and students. Education here is grounded in real-world experience, behavioral clarity, and the conviction that people deserve to work in environments that build them.
              </p>
              <a
                href="/methods/training-education"
                onClick={(e) => {
                  e.preventDefault();
                  window.history.pushState({}, '', '/methods/training-education');
                  window.dispatchEvent(new PopStateEvent('popstate'));
                }}
                className="text-[#C85A3C] hover:underline inline-block"
              >
                Explore Training & Education →
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
