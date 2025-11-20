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
          Whether you're leading a small team or rebuilding an entire organization, I'm here to help. Let's talk about where you are, where you want to go, and how we get there—together.
        </p>
        
        <button className="bg-[#C85A3C] text-white px-8 py-4 rounded-full font-semibold text-lg hover:bg-[#B54A32] transform hover:scale-105 transition-all duration-200 shadow-lg">
          Work With Me
        </button>
      </div>
    </section>
  );
}

