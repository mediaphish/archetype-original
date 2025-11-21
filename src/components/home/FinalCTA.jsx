/**
 * Final CTA Section
 * Editorial Minimal Design
 */
import React from 'react';

export default function FinalCTA() {
  return (
    <section className="py-16 sm:py-24 md:py-32 lg:py-40 bg-[#FAFAF9]">
      <div className="container mx-auto px-4 sm:px-6 md:px-12">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-[#1A1A1A] mb-6 sm:mb-8 md:mb-10 font-serif tracking-tight text-balance">
            Ready to Build Something Real?
          </h2>
          
          <p className="text-base sm:text-lg leading-relaxed text-[#6B6B6B] mb-6 sm:mb-8 text-pretty">
            Leadership that lasts starts with a conversation. I work with a limited number of leaders and organizations at a time—let's talk about what you're building.
          </p>
          
          <div className="inline-block mb-8 sm:mb-10 md:mb-12">
            <span className="text-sm font-medium text-[#1A1A1A]">Limited spots available</span>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-[#1A1A1A] text-white px-8 sm:px-10 py-4 sm:py-5 font-medium text-sm sm:text-base hover:bg-[#1A1A1A]/90 transition-colors">
              Start a Conversation
            </button>
            <button 
              onClick={() => {
                window.history.pushState({}, '', '/journal');
                window.dispatchEvent(new PopStateEvent('popstate'));
              }}
              className="bg-transparent text-[#1A1A1A] px-8 sm:px-10 py-4 sm:py-5 font-medium text-sm sm:text-base border border-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white transition-colors"
            >
              Explore the Journal
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

