/**
 * Voice Guideline:
 * {
 *   "voice_guideline": {
 *     "default": "first-person singular",
 *     "exceptions": ["collaboration", "Archetype philosophy"],
 *     "owner": "Bart Paden"
 *   }
 * }
 */
import React from 'react';
import SEO from '../components/SEO';

export default function WhatWeDo() {
  return (
    <>
      <SEO pageKey="what-we-do" />
      <div className="min-h-screen bg-warm-offWhite py-12 pt-20">
        <div className="max-w-4xl mx-auto px-4">
          {/* Back button */}
          <div className="mb-8">
            <a 
              href="/" 
              className="inline-flex items-center text-warm-gray hover:text-amber transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-amber rounded px-2 py-1"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Home
            </a>
          </div>

          {/* Sequential Navigation */}
          <div className="mb-8 flex items-center justify-between border-b border-warm-border pb-4">
            <div></div>
            <a
              href="/philosophy"
              className="inline-flex items-center text-warm-gray hover:text-amber transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-amber rounded px-2 py-1"
              aria-label="Next page: Philosophy"
            >
              <span className="text-sm">Philosophy</span>
              <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </a>
          </div>

          {/* Page content */}
          <article className="bg-warm-offWhite rounded-lg shadow-sm border border-warm-border overflow-hidden">
            <div className="p-8">
              <h1 className="h1 mb-6">What I Do</h1>
              
              <div className="space-y-8">
                <section id="mentorship">
                  <h2 className="h2 mb-4">Mentoring & Consulting</h2>
                  <p className="p mb-4">
                    Individual and executive mentorship designed for growth, resilience, and clarity.
                  </p>
                  <p className="text-lg text-warm-gray mb-4">
                    I help leaders and teams align purpose with practice across leadership, culture, marketing strategy, startups, software development, AI, and more.
                  </p>
                  <p className="text-lg text-warm-gray">
                    Thirty-two years of lived experience mean the lessons aren't theoretical—they've been proven under real pressure.
                  </p>
                </section>

                <section id="consulting">
                  <h2 className="h2 mb-4">Consulting</h2>
                  <p className="p mb-4">
                    Practical help for culture, org design, communication rhythms, and go-to-market alignment. Strategy that people can actually live with.
                  </p>
                </section>

                <section id="speaking">
                  <h2 className="h2 mb-4">Speaking & Workshops</h2>
                  <p className="p mb-4">
                    Keynotes, classroom lectures, and team workshops that translate leadership theory into real-world systems.
                  </p>
                  <p className="p mb-4">
                    Topics include servant leadership, business culture, team building, software and app development, and marketing strategy.
                  </p>
                  <p className="p">
                    Every session is conversational, story-driven, and practical—built to shift perspective and spark progress.
                  </p>
                </section>

                <section id="fractional">
                  <h2 className="h2 mb-4">Fractional Leadership</h2>
                  <p className="p mb-4">
                    For organizations needing executive-level guidance without a full-time hire, I offer short- and long-term fractional C-suite leadership.
                  </p>
                  <p className="p">
                    From operational oversight to culture realignment, I help stabilize growth and set the stage for the next generation of leaders to rise.
                  </p>
                </section>
              </div>
            </div>
          </article>
        </div>
      </div>
    </>
  );
}
