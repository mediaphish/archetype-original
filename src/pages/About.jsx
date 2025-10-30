import React from 'react';
import SEO from '../components/SEO';

export default function About() {
  return (
    <>
      <SEO pageKey="about" />
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
              <h1 className="text-4xl font-bold text-gray-900 mb-6">About Bart</h1>
              
              <div className="prose prose-lg max-w-none">
                <p className="text-xl text-gray-700 mb-8 font-semibold">
                  I build leaders worth following.
                </p>
                
                <p className="text-lg text-gray-700 mb-6">
                  For more than three decades, I've led teams through growth, collapse, and full-scale rebuilds across software, marketing, fitness, and leadership development. My career began in design and technology, evolved into executive leadership, and ultimately centered on one question—what kind of leader actually makes people better?
                </p>
                
                <p className="text-lg text-gray-700 mb-6">
                  That question led me through founding and scaling companies, guiding teams through crisis, and rebuilding culture from the ground up. Over time I distilled what truly works into systems any organization can live with: servant-led standards, consistent clarity, and leadership that protects people while still producing results.
                </p>
                
                <p className="text-lg text-gray-700 mb-6">
                  Today, through Archetype Original, I mentor founders, executives, and teams who want to grow without losing their soul.
                </p>
                
                <p className="text-lg text-gray-700 mb-6">
                  I also created <a className="underline text-blue-600 hover:text-blue-800" href="https://scoreboardleadership.com">Scoreboard Leadership</a> as one of several diagnostic contrasts—a reminder of what happens when leadership becomes a game to win instead of a trust to steward.
                </p>
                
                <p className="text-lg text-gray-700 mb-6">
                  I live in the Midwest with my wife and family, still building, still leading, and still believing that the right kind of leader can change everything.
                </p>
              </div>
            </div>
          </article>
        </div>
      </div>
    </>
  );
}
