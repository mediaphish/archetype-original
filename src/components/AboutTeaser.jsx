import React from "react";

export default function AboutTeaser() {
  return (
    <section className="section bg-warm-offWhiteAlt">
      <div className="container">
        <h2 className="h2 mb-8 md:mb-12">About Bart</h2>
        
        {/* Two-column layout: Photo left (desktop), content right */}
        <div className="flex flex-col md:flex-row gap-8 md:gap-12 items-start">
          {/* Photo Column - Left on desktop, top on mobile */}
          <div className="w-full md:w-1/3 flex-shrink-0">
            <div className="relative">
              <img
                src="/images/bart-paden.jpg"
                alt="Bart Paden - Leadership Mentor and Consultant"
                className="w-full h-auto rounded-lg border-4 border-amber shadow-lg object-cover aspect-[3/4]"
                onError={(e) => {
                  // Fallback if image doesn't exist - create placeholder
                  e.target.style.display = 'none';
                  const placeholder = e.target.nextElementSibling;
                  if (placeholder) placeholder.style.display = 'block';
                }}
              />
              <div 
                className="hidden w-full rounded-lg border-4 border-amber bg-warm-border aspect-[3/4] flex items-center justify-center"
                style={{display: 'none'}}
              >
                <span className="text-warm-gray text-sm">Photo Coming Soon</span>
              </div>
            </div>
            
            {/* Credibility Indicators */}
            <div className="mt-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-amber" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <div className="font-semibold text-warm-charcoal">32+ Years</div>
                  <div className="text-sm text-warm-gray">Of Leadership Experience</div>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-amber" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div>
                  <div className="font-semibold text-warm-charcoal">Multiple Industries</div>
                  <div className="text-sm text-warm-gray">Software, Marketing, Fitness, Leadership</div>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-amber" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                </div>
                <div>
                  <div className="font-semibold text-warm-charcoal">Proven Systems</div>
                  <div className="text-sm text-warm-gray">Servant Leadership Framework</div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Content Column - Right on desktop, below on mobile */}
          <div className="flex-1">
            {/* Opening Paragraph */}
            <p className="p mb-6" style={{ lineHeight: '1.6' }}>
              I didn't set out to be a leader—leadership found me the day my first employee walked into the office and asked me for insurance. I didn't have the revenue, so I used my own income to make it work. Simple as that. Since then I've built teams, defended people when it mattered, led through collapse and rebuilds, and learned that influence starts with responsibility.
            </p>
            
            {/* Pull Quote */}
            <blockquote className="border-l-4 border-amber pl-6 py-4 my-8 bg-warm-offWhite rounded-r-lg">
              <p className="text-xl md:text-2xl font-semibold text-amber italic mb-2" style={{ lineHeight: '1.6' }}>
                "Strength and humility can live in the same sentence—that's the kind of leader I help build."
              </p>
            </blockquote>
            
            {/* Key Achievements Section */}
            <div className="my-8">
              <h3 className="h3 mb-4">What I Bring</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-2 h-2 rounded-full bg-amber mt-2"></div>
                  <p className="p" style={{ lineHeight: '1.6' }}>
                    <strong className="text-warm-charcoal">Three decades of real-world experience</strong> across software development, marketing strategy, fitness leadership, and organizational development
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-2 h-2 rounded-full bg-amber mt-2"></div>
                  <p className="p" style={{ lineHeight: '1.6' }}>
                    <strong className="text-warm-charcoal">Led through every season:</strong> Start-ups and shutdowns, expansion and rebuilding, growth and crisis
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-2 h-2 rounded-full bg-amber mt-2"></div>
                  <p className="p" style={{ lineHeight: '1.6' }}>
                    <strong className="text-warm-charcoal">Committed to all levels:</strong> I work with executives and founders, but I'm just as dedicated to emerging leaders and students finding their voice
                  </p>
                </div>
              </div>
            </div>
            
            {/* Closing Paragraph */}
            <p className="p mb-8" style={{ lineHeight: '1.6' }}>
              Through Archetype Original, I translate hard-won lessons into frameworks leaders can actually live with—systems that protect culture, sharpen focus, and create lasting momentum. When it works, you won't need me forever. That's the point.
            </p>
            
            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 mt-8">
              <a 
                href="/about" 
                className="inline-flex items-center justify-center px-6 py-3 min-h-[44px] text-amber hover:text-amber-dark font-medium border-2 border-amber rounded-lg focus:outline-none focus:ring-2 focus:ring-amber transition-all duration-300"
                aria-label="Read Bart's full story"
              >
                Read the full story →
              </a>
              <a
                href="#contact"
                className="btn-cta text-center"
                aria-label="Start a conversation with Bart"
              >
                Start a Conversation
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

