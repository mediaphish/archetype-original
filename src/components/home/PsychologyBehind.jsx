/**
 * The Psychology Behind Clarity, Care, and Leadership Section
 * Editorial Minimal Design
 */
import React from 'react';

export default function PsychologyBehind() {
  return (
    <section className="py-16 sm:py-20 md:py-32 lg:py-40 bg-[#FAFAF9]">
      <div className="container mx-auto px-4 sm:px-6 md:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 sm:mb-20 md:mb-24">
            <h2 className="text-[48px] sm:text-[64px] md:text-[72px] lg:text-[96px] font-bold text-[#1A1A1A] mb-6 sm:mb-8 font-serif tracking-tight text-balance">
              The Psychology Behind Clarity, Care, and Leadership
            </h2>
            <p className="text-base md:text-lg lg:text-xl text-[#6B6B6B] max-w-3xl mx-auto leading-relaxed text-pretty">
              Modern research has validated something I've seen for decades: people perform best in environments built on trust, empathy, and clarity.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 max-w-6xl mx-auto mb-12 sm:mb-16 md:mb-20">
            {/* Card 1 - Psychological Safety */}
            <div className="bg-white border border-[#1A1A1A]/10 p-8 sm:p-10 md:p-12">
              <h3 className="text-[24px] sm:text-[32px] md:text-[40px] font-bold text-[#1A1A1A] mb-4 font-serif tracking-tight">
                Psychological Safety — Amy Edmondson
              </h3>
              <p className="text-base md:text-lg leading-relaxed text-[#6B6B6B] text-pretty">
                Teams that feel safe to speak up learn faster and adapt better.
              </p>
            </div>

            {/* Card 2 - Empathic Listening */}
            <div className="bg-white border border-[#1A1A1A]/10 p-8 sm:p-10 md:p-12">
              <h3 className="text-[24px] sm:text-[32px] md:text-[40px] font-bold text-[#1A1A1A] mb-4 font-serif tracking-tight">
                Empathic Listening — Carl Rogers
              </h3>
              <p className="text-base md:text-lg leading-relaxed text-[#6B6B6B] text-pretty">
                Listening to understand reduces reactivity and unlocks reasoning.
              </p>
            </div>

            {/* Card 3 - Neuroscience of Trust */}
            <div className="bg-white border border-[#1A1A1A]/10 p-8 sm:p-10 md:p-12">
              <h3 className="text-[24px] sm:text-[32px] md:text-[40px] font-bold text-[#1A1A1A] mb-4 font-serif tracking-tight">
                Neuroscience of Trust — Paul Zak
              </h3>
              <p className="text-base md:text-lg leading-relaxed text-[#6B6B6B] text-pretty">
                Trust changes brain chemistry—lower cortisol, higher performance.
              </p>
            </div>

            {/* Card 4 - Executive Isolation */}
            <div className="bg-white border border-[#1A1A1A]/10 p-8 sm:p-10 md:p-12">
              <h3 className="text-[24px] sm:text-[32px] md:text-[40px] font-bold text-[#1A1A1A] mb-4 font-serif tracking-tight">
                Executive Isolation — Gallup
              </h3>
              <p className="text-base md:text-lg leading-relaxed text-[#6B6B6B] text-pretty">
                Leaders without a safe place to process make poorer decisions.
              </p>
            </div>
          </div>
          
          <div className="text-center max-w-3xl mx-auto">
            <p className="text-base md:text-lg lg:text-xl leading-relaxed text-[#6B6B6B] text-pretty">
              Truth: Empathy restores access to reason. Trust unlocks performance. Clarity removes friction. When leaders get this right—teams stop surviving and start creating.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
