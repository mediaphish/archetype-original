/**
 * Let's Build Your Leadership Legacy Section
 */
import React from 'react';

export default function LeadershipLegacy() {
  return (
    <section className="py-32 bg-gradient-to-br from-[#F5E6D3] to-white">
      <div className="container mx-auto px-6 md:px-12 max-w-4xl text-center">
        <h2 className="text-4xl md:text-5xl font-bold text-[#2B2D2F] mb-8 font-serif">
          Let's Build Your Leadership Legacy
        </h2>
        
        <p className="text-xl leading-relaxed text-[#6B6B6B] mb-8 max-w-3xl mx-auto">
          When I'm with a client, I'm fully present. When I'm not, I'm writing, researching, and building this entire leadership universe so you have tools you can actually live with.
        </p>
        
        <p className="text-xl leading-relaxed text-[#6B6B6B] mb-8 max-w-3xl mx-auto">
          If you're ready to steady the ground under your feet, rebuild clarity, and lead with strength and humility—let's talk.
        </p>
        
        <button className="bg-[#C85A3C] text-white px-8 py-4 rounded-full font-semibold text-lg hover:bg-[#B54A32] transform hover:scale-105 transition-all duration-200 shadow-lg">
          Get Started
        </button>
      </div>
    </section>
  );
}

