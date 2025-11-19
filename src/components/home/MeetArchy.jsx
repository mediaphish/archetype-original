/**
 * Meet Archy Section
 * v0 Design - EXACT IMPLEMENTATION - 2 COLUMN LAYOUT
 */
import React from 'react';

export default function MeetArchy() {
  return (
    <section className="py-32 bg-white">
      <div className="container mx-auto px-6 md:px-12 max-w-6xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          {/* Left Column: Text Content */}
          <div>
            <div className="inline-block bg-[#F5E6D3] px-4 py-2 rounded-full mb-6">
              <span className="text-sm font-semibold text-[#C85A3C] uppercase tracking-wide">Your AI Guide</span>
            </div>
            
            <h2 className="text-4xl md:text-5xl font-bold text-[#2B2D2F] mb-6 font-serif">
              Meet Archy
            </h2>
            
            <p className="text-xl leading-relaxed text-[#6B6B6B] mb-4">
              Archy is your personal guide to servant leadership. Ask questions, explore frameworks, and get practical advice grounded in 32+ years of real-world experience.
            </p>
            
            <p className="text-xl leading-relaxed text-[#6B6B6B] mb-8">
              Think of Archy as your wise mentor who's always available—no scheduling, no small talk, just honest guidance when you need it.
            </p>
            
            <button className="bg-[#C85A3C] text-white px-8 py-4 rounded-full font-semibold text-lg hover:bg-[#B54A32] transform hover:scale-105 transition-all duration-200 shadow-lg">
              Start a Conversation
            </button>
          </div>
          
          {/* Right Column: Chat Preview */}
          <div>
            <div className="bg-white rounded-2xl shadow-xl p-8 md:p-10 border-l-4 border-[#C85A3C]">
              <div className="flex items-start gap-4 mb-6">
                <img 
                  src="/images/archy-avatar.png" 
                  alt="Archy" 
                  className="w-16 h-16 rounded-full flex-shrink-0"
                />
                <div>
                  <h4 className="font-bold text-lg text-[#2B2D2F] mb-2">Archy</h4>
                  <p className="text-[#6B6B6B] leading-relaxed">
                    "Leadership isn't about control—it's about creating space for others to grow. What's one thing holding your team back right now?"
                  </p>
                </div>
              </div>
              <input 
                type="text" 
                placeholder="Ask Archy anything..." 
                className="w-full bg-[#F5F5F5] rounded-lg px-4 py-3 text-[#6B6B6B] focus:outline-none focus:ring-2 focus:ring-[#C85A3C] transition-all duration-200"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
