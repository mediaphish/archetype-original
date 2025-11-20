/**
 * Anti-Projects Section
 * v0 Design - EXACT IMPLEMENTATION
 */
import React from 'react';

export default function AntiProjects() {
  return (
    <section className="py-32 bg-white">
      <div className="container mx-auto px-6 md:px-12">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-[#2B2D2F] mb-4 font-serif">
            Anti-Projects
          </h2>
          <p className="text-xl text-[#6B6B6B] max-w-3xl mx-auto leading-relaxed">
            These aren't offerings. They're contrast tools—clear pictures of what leadership looks like when it breaks down.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 max-w-5xl mx-auto">
          {/* Scoreboard Leadership */}
          <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-10 hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 group">
            <div className="w-16 h-16 bg-[#C85A3C] rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            
            <h3 className="text-2xl md:text-3xl font-bold text-[#2B2D2F] mb-4">
              Scoreboard Leadership
            </h3>
            
            <p className="text-lg leading-relaxed text-[#6B6B6B] mb-6">
              When leadership becomes a numbers game, people become expendable. Scoreboard Leadership reveals the patterns of ego-driven decision-making that slowly destroy trust and culture from the inside out.
            </p>
            
            <button className="bg-[#C85A3C] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#B54A32] transition-colors duration-200">
              Explore →
            </button>
          </div>

          {/* Bad Leader Project */}
          <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-10 hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 group">
            <div className="w-16 h-16 bg-[#6B6B6B] rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            
            <h3 className="text-2xl md:text-3xl font-bold text-[#2B2D2F] mb-4">
              The Bad Leader Project
            </h3>
            
            <p className="text-lg leading-relaxed text-[#6B6B6B] mb-6">
              The heat-map of dysfunctional leadership across industries and regions. Anonymous insights, aggregated patterns, and clarity about where leadership is breaking down—so we can understand what healthy leadership really requires.
            </p>
            
            <button className="bg-[#C85A3C] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#B54A32] transition-colors duration-200">
              Explore →
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
