/**
 * Meet Bart Section
 * Editorial Minimal Design - 30/70 Split Layout
 */
import React from 'react';

export default function MeetBart() {
  const handleLinkClick = (e, href) => {
    e.preventDefault();
    window.history.pushState({}, '', href);
    window.dispatchEvent(new PopStateEvent('popstate'));
    // Scroll to top when navigating to a new page
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  return (
    <section className="py-16 sm:py-24 md:py-32 lg:py-40 bg-[#FAFAF9]">
      <div className="container mx-auto px-4 sm:px-6 md:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-[30%_70%] gap-12 lg:gap-16 items-center">
            {/* Left Column: Headshot (order-2 lg:order-1) */}
            <div className="order-2 lg:order-1">
              <div className="relative aspect-[3/4] w-full max-w-[240px] sm:max-w-[280px] mx-auto lg:mx-0">
                <img
                  src="/images/bart-headshot-003.jpg"
                  alt="Bart - Founder of Archetype Original"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              </div>
            </div>
            
            {/* Right Column: Content (order-1 lg:order-2) */}
            <div className="order-1 lg:order-2">
              {/* Badge */}
              <div className="inline-block mb-6 sm:mb-8">
                <span className="inline-block px-3 py-1 border border-[#1A1A1A]/10 text-xs font-medium tracking-wider text-[#C85A3C] uppercase">
                  Meet the Founder
                </span>
              </div>
              
              {/* Header */}
              <h2 className="font-serif text-4xl sm:text-5xl md:text-5xl lg:text-6xl font-bold text-[#1A1A1A] mb-8 sm:mb-10 leading-tight tracking-tight">
                Meet Bart
              </h2>
              
              {/* Body paragraphs */}
              <div className="space-y-6 mb-8 sm:mb-10">
                <p className="text-lg sm:text-xl md:text-2xl leading-relaxed text-[#1A1A1A]/70">
                  For more than 32 years I've worked inside the realities of leadership — building teams, leading companies, repairing culture, and studying why people follow some leaders and flee from others. Archetype Original is the work that grew out of those decades: lived leadership, practical clarity, and research that explains what people feel every day inside organizations.
                </p>
                
                <p className="text-lg sm:text-xl md:text-2xl leading-relaxed text-[#1A1A1A]/70">
                  If you want to understand the story behind this work — how it formed, what shaped it, and why it matters — you can read it here.
                </p>
              </div>
              
              {/* CTA Button */}
              <a
                href="/about"
                onClick={(e) => handleLinkClick(e, '/about')}
                className="inline-block bg-[#1A1A1A] text-white px-8 sm:px-10 py-4 sm:py-5 font-medium text-sm sm:text-base hover:bg-[#1A1A1A]/90 transition-colors"
              >
                Read My Story →
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
