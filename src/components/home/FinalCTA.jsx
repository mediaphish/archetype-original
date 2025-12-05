/**
 * Final CTA Section
 * Editorial Minimal Design
 */
import React from 'react';

export default function FinalCTA() {
  const handleLinkClick = (e, href) => {
    e.preventDefault();
    window.history.pushState({}, '', href);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  return (
    <section className="py-16 sm:py-24 md:py-32 lg:py-40 bg-[#FAFAF9]">
      <div className="container mx-auto px-4 sm:px-6 md:px-12">
        <div className="max-w-3xl mx-auto text-center">
          {/* Badge */}
          <div className="mb-6">
            <span className="inline-block px-3 py-1 border border-[#1A1A1A]/10 text-xs font-medium tracking-wider text-[#C85A3C] uppercase">
              Limited Spots Available
            </span>
          </div>
          
          {/* Header */}
          <h2 className="text-[48px] sm:text-[64px] md:text-[72px] font-bold text-[#1A1A1A] mb-8 sm:mb-10 leading-[0.9]">
            Ready to Build Something Real?
          </h2>
          
          {/* Body paragraph */}
          <p className="text-lg sm:text-xl md:text-2xl leading-relaxed text-[#1A1A1A]/70 mb-10 sm:mb-12">
            Leadership that lasts starts with a conversation. I work with a limited number of leaders and organizations each year — let's talk about what you're building, what you're facing, and what you want to create.
          </p>
          
          {/* Two CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <a
              href="/contact"
              onClick={(e) => handleLinkClick(e, '/contact')}
              className="px-8 sm:px-10 py-4 sm:py-5 bg-[#1A1A1A] text-white font-medium text-sm sm:text-base hover:bg-[#1A1A1A]/90 transition-colors text-center"
            >
              Start a Conversation
            </a>
            <a
              href="/journal"
              onClick={(e) => handleLinkClick(e, '/journal')}
              className="px-8 sm:px-10 py-4 sm:py-5 bg-transparent text-[#1A1A1A] font-medium text-sm sm:text-base border border-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white transition-colors text-center"
            >
              Explore the Journal
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
