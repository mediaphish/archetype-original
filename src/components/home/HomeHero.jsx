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
      setIsMobile(window.innerWidth < 1024); // lg breakpoint
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
    <section className="pt-20 pb-16 md:pb-24" style={{background: 'linear-gradient(to bottom, #FFF7ED 0%, #F5E6D3 30%, white 60%, white 100%)'}}>
      <div className="container mx-auto px-6 md:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div>
            <div className="inline-block bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-md mb-6">
              <span className="text-sm font-semibold text-[#C85A3C]">32+ Years Building Leaders</span>
            </div>
            
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-tight text-[#2B2D2F] mb-6 font-serif">
              Leadership That Actually Lasts
            </h1>
            
            <p className="text-xl md:text-2xl leading-relaxed text-[#6B6B6B] mb-8">
              I help small and mid-sized businesses build cultures where people thrive, leaders grow, and clarity becomes normal again. After three years of rebuilding my own life and leadership, I'm building something new—servant leadership at scale, built for real people in real companies.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <button className="bg-[#C85A3C] text-white px-8 py-4 rounded-full font-semibold text-lg hover:bg-[#B54A32] transform hover:scale-105 transition-all duration-200 shadow-lg">
                Work With Me
              </button>
              <button className="bg-transparent text-[#C85A3C] px-8 py-4 rounded-full font-semibold text-lg border-2 border-[#C85A3C] hover:bg-[#C85A3C] hover:text-white transition-all duration-200">
                Meet Archy →
              </button>
            </div>
          </div>
          
          {/* Right Image - Parallax Layers (disabled on mobile) */}
          <div className="relative w-full max-w-lg lg:max-w-xl mx-auto lg:mx-0" style={{ aspectRatio: '1/1' }}>
            <div className="absolute inset-0 bg-gradient-to-br from-orange-200 to-orange-100 rounded-full blur-3xl opacity-30"></div>
            
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
                className="w-full h-full object-contain drop-shadow-2xl"
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
    </section>
  );
}
