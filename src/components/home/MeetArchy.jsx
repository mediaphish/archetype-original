/**
 * Meet Archy Section
 * v0 Design - EXACT IMPLEMENTATION - Matches V0 UI perfectly
 */
import React from 'react';

export default function MeetArchy() {
  return (
    <section id="archy" className="pt-16 md:pt-24 pb-8 bg-white">
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
              Archy is a digital version of how I think about people, culture, and leadership. He's built on the principles I've lived for thirty years—clarity, responsibility, humility, and strength held in the right way.
            </p>
            
            <p className="text-xl leading-relaxed text-[#6B6B6B] mb-4">
              Ask him anything: Leadership questions. Team conflict. Decision tension. Culture issues.
            </p>
            
            <p className="text-xl leading-relaxed text-[#6B6B6B] mb-8">
              He answers with the same values I teach in person. No noise. No ego. Just honest guidance when you need it.
            </p>
            
            <button className="bg-[#C85A3C] text-white px-8 py-4 rounded-full font-semibold text-lg hover:bg-[#B54A32] transform hover:scale-105 transition-all duration-200 shadow-lg">
              Start a Conversation
            </button>
          </div>
          
          {/* Right Column: Chat Preview - EXACT V0 STYLING */}
          <div>
            <div className="bg-gradient-to-br from-sand to-cream rounded-3xl p-8 shadow-xl">
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <div className="flex items-start gap-3 mb-4">
                  <img 
                    alt="Archy avatar" 
                    className="w-16 h-16 rounded-full flex-shrink-0 object-cover" 
                    src="/images/archy-avatar.png"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[#2B2D2F] mb-1">Archy</p>
                    <p className="text-[#6B6B6B] text-sm leading-relaxed">
                      "Leadership isn't about control—it's about creating space for others to grow. What's one thing holding your team back right now?"
                    </p>
                  </div>
                </div>
                <div className="border-t pt-4">
                  <input 
                    placeholder="Ask Archy anything..." 
                    className="w-full px-4 py-3 bg-[#E8D5C4]/30 rounded-xl text-sm placeholder:text-[#6B6B6B] focus:outline-none focus:ring-2 focus:ring-[#C85A3C]/20" 
                    disabled 
                    type="text"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
