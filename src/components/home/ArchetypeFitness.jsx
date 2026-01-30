/**
 * Archetype Fitness Section
 * v0 Design - EXACT IMPLEMENTATION
 */
import React from 'react';

export default function ArchetypeFitness() {
  return (
    <section className="py-16 md:py-24 lg:py-32 bg-gradient-to-br from-[#F5E6D3] to-white">
      <div className="container mx-auto px-6 md:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div>
            <div className="inline-block bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-md mb-6">
              <span className="text-sm font-semibold text-[#C85A3C] uppercase tracking-wide">Physical Culture</span>
            </div>
            
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#2B2D2F] mb-6 font-serif">
              Archetype Fitness
            </h2>
            
            <p className="text-base md:text-lg lg:text-xl leading-relaxed text-[#6B6B6B] mb-8">
              The gym story that changed everything. How physical culture and leadership culture are built the same way—one intentional choice at a time.
            </p>
            
            <button className="min-h-[44px] inline-flex items-center justify-center bg-[#C85A3C] text-white px-8 py-4 rounded-full font-semibold text-lg hover:bg-[#B54A32] transform hover:scale-105 transition-all duration-200 shadow-lg">
              Read the Story
            </button>
          </div>
          
          {/* Right Image Placeholder */}
          <div className="bg-[#6B6B6B]/10 rounded-2xl shadow-lg aspect-square flex items-center justify-center">
            <span className="text-[#6B6B6B] text-lg">Gym/Culture Image Placeholder</span>
          </div>
        </div>
      </div>
    </section>
  );
}
