/**
 * Meet Archy Section
 * Editorial Minimal Design - 2-column layout with chat preview
 */
import React from 'react';

export default function MeetArchy() {
  const handleLinkClick = (e, href) => {
    e.preventDefault();
    window.history.pushState({}, '', href);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  return (
    <section id="archy" className="py-16 sm:py-24 md:py-32 lg:py-40 bg-white">
      <div className="container mx-auto px-4 sm:px-6 md:px-12">
        <div className="max-w-7xl mx-auto">
          {/* Badge */}
          <div className="inline-block mb-6 sm:mb-8">
            <span className="inline-block px-3 py-1 border border-[#1A1A1A]/10 text-xs font-medium tracking-wider text-[#C85A3C] uppercase">
              Your AI Guide
            </span>
          </div>
          
          {/* Header */}
          <h2 className="font-serif text-4xl sm:text-5xl md:text-5xl lg:text-6xl font-bold text-[#1A1A1A] mb-8 sm:mb-10 md:mb-12 leading-tight tracking-tight">
            Meet Archy
          </h2>
          
          {/* 2-column grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 sm:gap-16 md:gap-20 lg:gap-24 items-start">
            {/* Left Column: Content */}
            <div>
              <div className="space-y-6 mb-8 sm:mb-10 md:mb-12">
                <p className="text-lg sm:text-xl md:text-2xl leading-relaxed text-[#1A1A1A]/70">
                  Archy is a digital extension of how I think about people, culture, and leadership. He's grounded in lived experience, sharpened by research, and aligned with the core philosophy that shaped Archetype Original: clarity, responsibility, humility, and strength used in the right way.
                </p>
                
                <p className="text-lg sm:text-xl md:text-2xl leading-relaxed text-[#1A1A1A]/70">
                  Ask him anything — leadership tension, culture drift, team conflict, communication challenges, decision pressure. He answers with the same values I bring into the room.
                </p>
                
                <p className="text-lg sm:text-xl md:text-2xl leading-relaxed text-[#1A1A1A]/70">
                  No noise. No ego. Just real guidance when you need it.
                </p>
              </div>
              
              {/* CTA Button */}
              <a
                href="/contact"
                onClick={(e) => handleLinkClick(e, '/contact')}
                className="mt-8 sm:mt-10 md:mt-12 inline-block bg-[#1A1A1A] text-white px-8 sm:px-10 py-4 sm:py-5 font-medium text-sm sm:text-base hover:bg-[#1A1A1A]/90 transition-colors"
              >
                Start a Conversation →
              </a>
            </div>
            
            {/* Right Column: Archy Chat Preview Box */}
            <div className="border border-[#1A1A1A]/10 p-6 sm:p-8 md:p-10 lg:p-12">
              {/* Archy Message */}
              <div className="flex items-start gap-4 sm:gap-6 mb-6 sm:mb-8">
                <img 
                  src="/images/archy-avatar.png" 
                  alt="Archy" 
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex-shrink-0 object-cover"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
                <div>
                  <div className="font-semibold text-base sm:text-lg text-[#1A1A1A] mb-2">Archy</div>
                  <p className="text-[#1A1A1A]/70 leading-relaxed text-base sm:text-lg">
                    Leadership isn't about control — it's about creating the conditions where people can thrive. What's holding your team back right now?
                  </p>
                </div>
              </div>
              
              {/* Divider */}
              <div className="h-px bg-[#1A1A1A]/10 mb-6 sm:mb-8"></div>
              
              {/* Input field */}
              <input
                type="text"
                placeholder="Ask Archy anything..."
                className="w-full bg-[#FAFAF9] border border-[#1A1A1A]/10 px-4 sm:px-6 py-3 sm:py-4 text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A]/30 transition-colors text-sm sm:text-base"
                readOnly
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
