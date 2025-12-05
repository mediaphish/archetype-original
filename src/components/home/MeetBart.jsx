/**
 * Meet Bart Section
 * Editorial Minimal Design - 30/70 Split Layout
 */
import React from 'react';

export default function MeetBart() {
  return (
    <section className="py-16 sm:py-24 md:py-32 bg-white">
      <div className="container mx-auto px-4 sm:px-6 md:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-[30%_70%] gap-8 lg:gap-12 items-start">
            {/* Left Column: Headshot Image */}
            <div className="order-2 lg:order-1">
              <img
                src="/images/bart-headshot-003.jpg"
                alt="Bart Stewart, founder of Archetype Original"
                className="w-full max-w-[280px] rounded-lg aspect-[3/4] object-cover mx-auto lg:mx-0"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            </div>
            
            {/* Right Column: Content */}
            <div className="order-1 lg:order-2">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#1A1A1A] mb-6 sm:mb-8 font-serif tracking-tight">
                Meet Bart
              </h2>
              
              <div className="space-y-6">
                <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                  I've spent more than 30 years leading people — in software, creative, operations, and organizational development. I've held roles from VP to CEO, built companies, rebuilt culture after collapse, coached executives, trained teams, and guided organizations through seasons of chaos, growth, and transition.
                </p>
                
                <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                  I started as a servant leader before I knew what to call it. Years later, I began formalizing the research, building assessment tools, and creating frameworks to help other leaders do the same. That work became Culture Science and the Archetype Leadership Index (ALI).
                </p>
                
                <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                  Today, I mentor leaders, consult with organizations navigating cultural pressure, train teams on leadership that strengthens people, and occasionally step into fractional roles when a company needs steady leadership during transition or growth.
                </p>
                
                <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                  I also built Archy — the AI assistant who helps people explore leadership and culture without waiting for a meeting. He's trained on decades of my work, research, and real-world experience.
                </p>
                
                <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] font-semibold">
                  If you're carrying weight that feels invisible, or leading people through something hard, I understand. Let's talk.
                </p>
                
                <a
                  href="/about"
                  onClick={(e) => {
                    e.preventDefault();
                    window.history.pushState({}, '', '/about');
                    window.dispatchEvent(new PopStateEvent('popstate'));
                  }}
                  className="text-[#C85A3C] hover:underline inline-block"
                >
                  Read my full story →
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

