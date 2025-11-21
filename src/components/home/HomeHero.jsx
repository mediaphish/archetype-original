/**
 * Homepage Hero Section
 * v0 Design - EXACT IMPLEMENTATION
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

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', checkMobile);
    };
  }, [isMobile]);

  return (
    <section className="py-16 sm:py-20 md:py-32 lg:py-40 bg-[#FAFAF9]">
      <div className="container mx-auto px-4 sm:px-6 md:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left Content */}
            <div>
              <h1 className="text-[36px] sm:text-[48px] md:text-[72px] lg:text-[96px] xl:text-[120px] 2xl:text-[144px] font-bold leading-tight text-[#1A1A1A] mb-6 sm:mb-8 md:mb-10 font-serif tracking-tight text-balance">
                Leadership That Actually Lasts
              </h1>
              
              <p className="text-lg md:text-xl lg:text-2xl leading-relaxed text-[#6B6B6B] mb-6 sm:mb-8 text-pretty">
                I help small and mid-sized businesses build cultures where people thrive, leaders grow, and clarity becomes normal again. After three years of rebuilding my own life and leadership, I'm building something new—servant leadership at scale, built for real people in real companies.
              </p>
              
              <p className="text-base md:text-lg lg:text-xl leading-relaxed text-[#6B6B6B] mb-8 sm:mb-10 md:mb-12 text-pretty">
                One way to learn is through <span className="text-[#C85A3C] font-medium">Archy</span>. He's an AI chatbot that has full and direct access to Bart's leadership expertise.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <button className="bg-[#1A1A1A] text-white px-8 sm:px-10 py-4 sm:py-5 font-medium text-sm sm:text-base hover:bg-[#1A1A1A]/90 transition-colors">
                  Work With Me
                </button>
                <button className="bg-transparent text-[#1A1A1A] px-8 sm:px-10 py-4 sm:py-5 font-medium text-sm sm:text-base border border-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white transition-colors">
                  Meet Archy →
                </button>
              </div>
            </div>
          
            {/* Right Image - Parallax Layers (disabled on mobile) */}
            <div className="relative w-full max-w-lg lg:max-w-xl mx-auto lg:mx-0" style={{ aspectRatio: '1/1' }}>
              {/* Layer 1: Archy - Moves UP as you scroll (desktop only) */}
              <div 
                className="absolute inset-0 z-10"
                style={{ 
                  transform: isMobile ? 'none' : `translateY(${scrollY * -0.15}px)`,
                  transition: 'transform 0.1s ease-out'
                }}
              >
                <img 
                  src="/images/hero-layer-1.png" 
                  alt="Archy" 
                  className="w-full h-full object-contain"
                />
              </div>
              
              {/* Layer 2: Speech Bubble - Moves DOWN as you scroll (desktop only) */}
              <div 
                className="absolute inset-0 z-20"
                style={{ 
                  transform: isMobile ? 'none' : `translateY(${scrollY * 0.03}px)`,
                  transition: 'transform 0.1s ease-out'
                }}
              >
                <img 
                  src="/images/hero-layer-2.png" 
                  alt="Speech bubble" 
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
