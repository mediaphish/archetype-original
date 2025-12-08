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

  const handleLinkClick = (e, href) => {
    e.preventDefault();
    if (href.startsWith('#')) {
      // Anchor link - scroll to section
      const element = document.getElementById(href.substring(1));
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      window.history.pushState({}, '', href);
      window.dispatchEvent(new PopStateEvent('popstate'));
      // Scroll to top when navigating to a new page
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  };

  return (
    <section className="min-h-screen bg-[#FAFAF9] pt-24 sm:pt-28 md:pt-32 pb-12 sm:pb-20 md:pb-32 lg:pb-40">
      <div className="container mx-auto px-4 sm:px-6 md:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-12 md:gap-16 lg:gap-24 items-center">
            {/* Left Column: Hero Content */}
            <div className="order-2 md:order-1">
              {/* Badge */}
              <div className="inline-block mb-6 sm:mb-8">
                <span className="inline-block px-3 py-1 border border-[#1A1A1A]/10 text-xs font-medium tracking-wider text-[#C85A3C] uppercase">
                  32+ Years Building Leaders
                </span>
              </div>
              
              {/* Title */}
              <h1 className="font-serif text-4xl sm:text-5xl md:text-5xl lg:text-6xl font-bold leading-tight text-[#1A1A1A] tracking-tight mb-6 sm:mb-8">
                Leadership That Actually Lasts
              </h1>
              
              {/* Body paragraphs */}
              <div className="space-y-6 mb-8 sm:mb-10">
                <p className="text-base sm:text-lg md:text-xl leading-relaxed text-[#1A1A1A]/70 max-w-xl">
                  Clarity, culture, responsibility, and leadership that strengthens people and transforms environments.
                </p>
                
                <p className="text-base sm:text-lg md:text-xl leading-relaxed text-[#1A1A1A]/70 max-w-xl">
                  I'm Bart — I've spent more than three decades building leaders, teams, companies, and cultures that can hold real weight. Archy is my AI persona, built on the same lived experience, the same philosophy, and the research behind Culture Science.
                </p>
                
                <p className="text-base sm:text-lg md:text-xl leading-relaxed text-[#1A1A1A]/70 max-w-xl">
                  Together, we help leaders lead with clarity — and help teams become places people actually want to belong.
                </p>
              </div>
              
              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <a
                  href="/contact"
                  onClick={(e) => handleLinkClick(e, '/contact')}
                  className="bg-[#1A1A1A] text-white px-8 sm:px-10 py-4 sm:py-5 font-medium text-sm sm:text-base hover:bg-[#1A1A1A]/90 transition-colors text-center"
                >
                  Work With Me
                </a>
                <a
                  href="#archy"
                  onClick={(e) => handleLinkClick(e, '#archy')}
                  className="bg-transparent text-[#1A1A1A] px-8 sm:px-10 py-4 sm:py-5 font-medium text-sm sm:text-base border border-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white transition-colors text-center"
                >
                  Meet Archy →
                </a>
              </div>
            </div>
          
            {/* Right Column: 4-Layer Parallax */}
            <div className="relative h-[300px] sm:h-[400px] md:h-[500px] lg:h-[600px] order-first md:order-last mt-[-40px] sm:mt-0">
              {/* Layer 4 (Back - Archy's speech bubble): Moves up at different pace than Bart's bubble */}
              <div 
                className="absolute inset-0 z-10 flex items-center justify-center"
                style={{ 
                  transform: isMobile ? 'translate(0, 0)' : `translate(0, ${scrollY * -0.03}px)`,
                  transition: 'transform 0.1s ease-out'
                }}
              >
                <img 
                  src="/images/home-layer-4.png" 
                  alt="Archy's speech bubble" 
                  className="w-full h-auto max-w-[280px] sm:max-w-[360px] md:max-w-[480px] lg:max-w-full object-contain"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              </div>
              
              {/* Layer 3 (Second middle - Bart's speech bubble): Moves up and right slowly */}
              <div 
                className="absolute inset-0 z-20 flex items-center justify-center"
                style={{ 
                  transform: isMobile ? 'translate(0, 0)' : `translate(${scrollY * 0.02}px, ${scrollY * -0.04}px)`,
                  transition: 'transform 0.1s ease-out'
                }}
              >
                <img 
                  src="/images/home-layer-3.png" 
                  alt="Hi, I'm Bart! speech bubble" 
                  className="w-full h-auto max-w-[280px] sm:max-w-[360px] md:max-w-[480px] lg:max-w-full object-contain"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              </div>
              
              {/* Layer 2 (First middle - Archy character): Moves left, slower and less distance */}
              <div 
                className="absolute inset-0 z-30 flex items-center justify-center"
                style={{ 
                  transform: isMobile ? 'translateX(0)' : `translateX(${scrollY * -0.06}px)`,
                  transition: 'transform 0.1s ease-out'
                }}
              >
                <img 
                  src="/images/home-layer-2.png" 
                  alt="Archy, the wise leadership guide" 
                  className="w-full h-auto max-w-[280px] sm:max-w-[360px] md:max-w-[480px] lg:max-w-full object-contain"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              </div>
              
              {/* Layer 1 (Front - Bart character): Moves right, slower and less distance */}
              <div 
                className="absolute inset-0 z-40 flex items-center justify-center"
                style={{ 
                  transform: isMobile ? 'translateX(0)' : `translateX(${scrollY * 0.03}px)`,
                  transition: 'transform 0.1s ease-out'
                }}
              >
                <img 
                  src="/images/home-layer-1.png" 
                  alt="And, I'm Archy! speech bubble" 
                  className="w-full h-auto max-w-[280px] sm:max-w-[360px] md:max-w-[480px] lg:max-w-full object-contain"
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
