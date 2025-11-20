/**
 * The Psychology Behind Clarity, Care, and Leadership Section
 */
import React from 'react';

export default function PsychologyBehind() {
  return (
    <section className="py-16 md:py-24 lg:py-32 bg-[#F5F5F5]">
      <div className="container mx-auto px-6 md:px-12">
        <div className="text-center mb-16">
          <div className="inline-block bg-[#F5E6D3] px-4 py-2 rounded-full mb-6">
            <span className="text-sm font-semibold text-[#C85A3C] uppercase tracking-wide">Research Meets Reality</span>
          </div>
          
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#2B2D2F] mb-4 font-serif">
            The Psychology Behind Clarity, Care, and Leadership
          </h2>
          <p className="text-base md:text-lg lg:text-xl text-[#6B6B6B] max-w-3xl mx-auto leading-relaxed mb-8">
            Modern research has validated something I've seen for decades: people perform best in environments built on trust, empathy, and clarity.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 max-w-6xl mx-auto mb-12">
          {/* Card 1 - Psychological Safety */}
          <div className="bg-white rounded-2xl shadow-lg p-8 md:p-10 hover:shadow-xl hover:scale-[1.02] transition-all duration-300">
            <h3 className="text-2xl md:text-3xl font-bold text-[#2B2D2F] mb-4">
              Psychological Safety — Amy Edmondson
            </h3>
            <p className="text-lg leading-relaxed text-[#6B6B6B]">
              Teams that feel safe to speak up learn faster and adapt better.
            </p>
          </div>

          {/* Card 2 - Empathic Listening */}
          <div className="bg-white rounded-2xl shadow-lg p-8 md:p-10 hover:shadow-xl hover:scale-[1.02] transition-all duration-300">
            <h3 className="text-2xl md:text-3xl font-bold text-[#2B2D2F] mb-4">
              Empathic Listening — Carl Rogers
            </h3>
            <p className="text-lg leading-relaxed text-[#6B6B6B]">
              Listening to understand reduces reactivity and unlocks reasoning.
            </p>
          </div>

          {/* Card 3 - Neuroscience of Trust */}
          <div className="bg-white rounded-2xl shadow-lg p-8 md:p-10 hover:shadow-xl hover:scale-[1.02] transition-all duration-300">
            <h3 className="text-2xl md:text-3xl font-bold text-[#2B2D2F] mb-4">
              Neuroscience of Trust — Paul Zak
            </h3>
            <p className="text-lg leading-relaxed text-[#6B6B6B]">
              Trust changes brain chemistry—lower cortisol, higher performance.
            </p>
          </div>

          {/* Card 4 - Executive Isolation */}
          <div className="bg-white rounded-2xl shadow-lg p-8 md:p-10 hover:shadow-xl hover:scale-[1.02] transition-all duration-300">
            <h3 className="text-2xl md:text-3xl font-bold text-[#2B2D2F] mb-4">
              Executive Isolation — Gallup
            </h3>
            <p className="text-lg leading-relaxed text-[#6B6B6B]">
              Leaders without a safe place to process make poorer decisions.
            </p>
          </div>
        </div>
        
        <div className="text-center max-w-3xl mx-auto">
          <p className="text-base md:text-lg lg:text-xl leading-relaxed text-[#6B6B6B]">
            Truth: Empathy restores access to reason. Trust unlocks performance. Clarity removes friction. When leaders get this right—teams stop surviving and start creating.
          </p>
        </div>
      </div>
    </section>
  );
}
