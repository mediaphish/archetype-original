/**
 * Homepage Hero Section
 * Editorial Minimal Design - Parallax Hero with Archy
 */
import React, { useState, useEffect } from 'react';

export default function HomeHero() {
  const [scrollY, setScrollY] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // md breakpoint - disable parallax on mobile
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    const handleScroll = () => {
      if (!isMobile) {
        setScrollY(window.scrollY);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', checkMobile);
    };
  }, [isMobile]);

  const scrollToWhatImBuilding = (e) => {
    e.preventDefault();
    const element = document.getElementById('what-im-building');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="py-24 sm:py-32 md:py-40 bg-[#FAFAF9]">
      <div className="container mx-auto px-4 sm:px-6 md:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-12 md:gap-16 lg:gap-24 items-center">
            {/* Left Column: Hero Content */}
            <div className="order-2 md:order-1">
              {/* Badge */}
              <div className="inline-block mb-6 sm:mb-8">
                <span className="text-xs font-medium tracking-wider text-[#C85A3C] uppercase px-3 py-1 border border-[#1A1A1A]/10">
                  32+ Years Building Leaders
                </span>
              </div>
              
              {/* Title */}
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-[#1A1A1A] mb-6 sm:mb-8 font-serif tracking-tight leading-tight">
                Leadership That Builds People, Not Just Organizations
              </h1>
              
              {/* Body paragraphs */}
              <div className="space-y-6 mb-8 sm:mb-10">
                <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                  Hi. I'm Bart Stewart — servant leader, former CEO, coach, and someone who spent three decades leading people through environments that mattered. I work with leaders who want to build cultures that strengthen people instead of draining them.
                </p>
                
                <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                  This site houses the work I'm building: Culture Science, the Archetype Leadership Index (ALI), servant leadership education, and the tools that help leaders move from instinct to clarity.
                </p>
                
                <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                  You can also meet Archy — the AI assistant I've trained to help you explore leadership, culture, and the questions that matter most. Ask him anything. He's loaded with everything I've learned, researched, and tested over 30+ years.
                </p>
              </div>
              
              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                <a
                  href="/contact"
                  onClick={(e) => {
                    e.preventDefault();
                    window.history.pushState({}, '', '/contact');
                    window.dispatchEvent(new PopStateEvent('popstate'));
                  }}
                  className="bg-[#1A1A1A] text-white px-8 sm:px-10 py-4 sm:py-5 font-medium text-sm sm:text-base hover:bg-[#1A1A1A]/90 transition-colors text-center"
                >
                  Start a Conversation
                </a>
                <button
                  onClick={scrollToWhatImBuilding}
                  className="bg-transparent text-[#1A1A1A] px-8 sm:px-10 py-4 sm:py-5 font-medium text-sm sm:text-base border border-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white transition-colors"
                >
                  Learn About the Work
                </button>
              </div>
            </div>
          
            {/* Right Column: Parallax Archy Images */}
            <div className="relative h-[300px] sm:h-[400px] md:h-[500px] lg:h-[600px] order-first md:order-last">
              {/* Layer 2 (Back layer - speech bubble): Moves DOWN on scroll */}
              <div 
                className="absolute inset-0 z-10 flex items-center justify-center"
                style={{ 
                  transform: isMobile ? 'translateY(0)' : `translateY(${scrollY * 0.03}px)`,
                  transition: 'transform 0.1s ease-out'
                }}
              >
                <img 
                  src="/images/hero-layer-2.png" 
                  alt="Hi, I'm Archy speech bubble" 
                  className="max-w-[280px] sm:max-w-[360px] md:max-w-[480px] lg:max-w-full h-auto object-contain"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              </div>
              
              {/* Layer 1 (Front layer - Archy character): Moves UP on scroll */}
              <div 
                className="absolute inset-0 z-20 flex items-center justify-center"
                style={{ 
                  transform: isMobile ? 'translateY(0)' : `translateY(${scrollY * -0.15}px)`,
                  transition: 'transform 0.1s ease-out'
                }}
              >
                <img 
                  src="/images/hero-layer-1.png" 
                  alt="Archy, the wise leadership guide" 
                  className="max-w-[280px] sm:max-w-[360px] md:max-w-[480px] lg:max-w-full h-auto object-contain"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
