import React from 'react';
import SEO from '../components/SEO';

export default function Methods() {
  return (
    <>
      <SEO pageKey="methods" />
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
              <h1 className="text-4xl font-bold text-gray-900 mb-6">Methods</h1>
              
              <div className="prose prose-lg max-w-none">
                <p className="text-xl text-gray-700 mb-8">
                  Every system we teach is built on servant leadership—practical, measurable, and lived.
                </p>
                
                <p className="text-lg text-gray-700 mb-6">
                  We work through a framework refined from real-world experience: the Ten Fundamentals of Servant Leadership—principles such as Protect the Culture, Clarity Beats Chaos, Empowerment Over Control, and Trust Is the Currency.
                </p>
                
                <p className="text-lg text-gray-700 mb-6">
                  Our process starts with listening. We uncover what's working, what's fractured, and what needs clarity. From there we build systems leaders can sustain: communication rhythms, cultural standards, and structures that keep growth from consuming the people inside it.
                </p>
                
                <p className="text-lg text-gray-700 mb-6">
                  We don't sell motivation; we build foundations.
                </p>
                
                <p className="text-lg text-gray-700 mb-6">
                  Every engagement—mentorship, consulting, or fractional leadership—ends with the same goal: leaders who can replicate health long after we're gone.
                </p>
              </div>
            </div>
          </article>
        </div>
      </div>
    </>
  );
}
