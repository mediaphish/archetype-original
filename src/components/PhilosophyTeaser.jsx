import React from "react";

export default function PhilosophyTeaser() {
  return (
    <section className="section bg-gray-50">
      <div className="container">
        <h2 className="h2 mb-6">Philosophy</h2>
        <div className="max-w-3xl">
          <p className="p text-lg leading-relaxed">
            Leadership is stewardship. Strategy has to meet character, and culture has to be built with the same intentionality as profit. I help leaders translate values into visible behaviors: clarity over chaos, trust over fear, standards over slogans.
          </p>
          <div className="mt-6">
            <a 
              href="/philosophy" 
              className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
            >
              Explore the philosophy →
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

