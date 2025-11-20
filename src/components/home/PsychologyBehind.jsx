/**
 * The Psychology Behind Servant Leadership Section
 */
import React from 'react';

export default function PsychologyBehind() {
  return (
    <section className="py-32 bg-[#F5F5F5]">
      <div className="container mx-auto px-6 md:px-12">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-[#2B2D2F] mb-4 font-serif">
            The Psychology Behind Servant Leadership
          </h2>
          <p className="text-xl text-[#6B6B6B] max-w-3xl mx-auto leading-relaxed">
            This isn't soft leadership. It's grounded in research, decades of practice, and real human psychology.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 max-w-6xl mx-auto">
          {/* Card 1 - Self-Determination Theory */}
          <div className="bg-white rounded-2xl shadow-lg p-8 md:p-10 hover:shadow-xl hover:scale-[1.02] transition-all duration-300">
            <h3 className="text-2xl md:text-3xl font-bold text-[#2B2D2F] mb-4">
              Self-Determination Theory
            </h3>
            <p className="text-lg leading-relaxed text-[#6B6B6B]">
              People are motivated by autonomy, competence, and connection. Servant leadership creates the conditions for all three—without gimmicks or manipulation.
            </p>
          </div>

          {/* Card 2 - Psychological Safety */}
          <div className="bg-white rounded-2xl shadow-lg p-8 md:p-10 hover:shadow-xl hover:scale-[1.02] transition-all duration-300">
            <h3 className="text-2xl md:text-3xl font-bold text-[#2B2D2F] mb-4">
              Psychological Safety
            </h3>
            <p className="text-lg leading-relaxed text-[#6B6B6B]">
              When people feel safe to speak up, take risks, and fail forward, teams thrive. Servant leadership builds that safety through humility, listening, and trust.
            </p>
          </div>

          {/* Card 3 - Growth Mindset */}
          <div className="bg-white rounded-2xl shadow-lg p-8 md:p-10 hover:shadow-xl hover:scale-[1.02] transition-all duration-300">
            <h3 className="text-2xl md:text-3xl font-bold text-[#2B2D2F] mb-4">
              Growth Mindset
            </h3>
            <p className="text-lg leading-relaxed text-[#6B6B6B]">
              Fixed mindset leaders see talent as static. Growth mindset leaders see potential everywhere—and create cultures where people actually develop.
            </p>
          </div>

          {/* Card 4 - Relational Leadership */}
          <div className="bg-white rounded-2xl shadow-lg p-8 md:p-10 hover:shadow-xl hover:scale-[1.02] transition-all duration-300">
            <h3 className="text-2xl md:text-3xl font-bold text-[#2B2D2F] mb-4">
              Relational Leadership
            </h3>
            <p className="text-lg leading-relaxed text-[#6B6B6B]">
              Leadership isn't transactional. It's relational. The best leaders don't just manage tasks—they invest in people, build trust, and create belonging.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

