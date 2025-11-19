/**
 * Homepage Hero Section
 * v0 Design - EXACT IMPLEMENTATION
 */
import React from 'react';

export default function HomeHero() {
  return (
    <section className="min-h-screen bg-gradient-to-br from-orange-50 via-orange-50/30 via-[#F5E6D3]/80 to-white pt-20 pb-32 border-b border-white/50">
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
              Human-first servant leadership for small and mid-sized businesses. Real culture change, not corporate theater.
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
          
          {/* Right Image */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-200 to-orange-100 rounded-full blur-3xl opacity-30"></div>
            <img 
              src="/images/archy-hero.png" 
              alt="Archy" 
              className="relative z-10 drop-shadow-2xl w-full max-w-[500px] h-auto"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
