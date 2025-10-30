import React from 'react';
import SEO from '../components/SEO';

export default function Philosophy() {
  return (
    <>
      <SEO pageKey="philosophy" />
      <div className="min-h-screen bg-gray-50 py-12 pt-20">
        <div className="max-w-4xl mx-auto px-4">
          {/* Back button */}
          <div className="mb-8">
            <a 
              href="/" 
              className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Home
            </a>
          </div>

          {/* Page content */}
          <article className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-8">
              <h1 className="text-4xl font-bold text-gray-900 mb-6">Philosophy</h1>
              
              <div className="prose prose-lg max-w-none">
                <p className="text-xl text-gray-700 mb-8 font-semibold">
                  Leadership isn't about control—it's about stewardship.
                </p>
                
                <p className="text-lg text-gray-700 mb-6">
                  At Archetype Original, we believe the health of a team reflects the health of its leader. Culture is built through consistent standards, not slogans.
                </p>
                
                <p className="text-lg text-gray-700 mb-6">
                  Real leadership is relational: it protects people, clarifies direction, and creates space for others to grow.
                </p>
                
                <p className="text-lg text-gray-700 mb-6">
                  We reject quick-fix leadership trends that chase numbers over people.
                </p>
                
                <p className="text-lg text-gray-700 mb-6">
                  <a className="underline text-blue-600 hover:text-blue-800" href="https://scoreboardleadership.com">Scoreboard Leadership</a> is only one example of that mindset—leaders competing with their own teams, measuring worth in wins instead of character.
                </p>
                
                <p className="text-lg text-gray-700 mb-6">
                  The alternative is simple but difficult: serve first, communicate clearly, and take responsibility for the wake you leave behind.
                </p>
                
                <p className="text-lg text-gray-700 mb-6">
                  When leaders embrace that kind of stewardship, organizations stop surviving chaos and start producing trust, excellence, and long-term impact.
                </p>
              </div>
            </div>
          </article>
        </div>
      </div>
    </>
  );
}
