/**
 * Anti-Projects Section
 * Editorial Minimal Design - What This Is Not
 */
import React from 'react';

export default function AntiProjects() {
  return (
    <section className="py-16 sm:py-24 md:py-32 bg-white">
      <div className="container mx-auto px-4 sm:px-6 md:px-12">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#1A1A1A] mb-6 sm:mb-8 font-serif tracking-tight text-center">
            What This Is Not
          </h2>
          
          <p className="text-base sm:text-lg leading-relaxed text-[#6B6B6B] mb-12 sm:mb-16 text-center max-w-3xl mx-auto">
            I don't chase attention, trends, or scale for its own sake. I work with people who want clarity, not performance. Here's what Archetype Original will never become:
          </p>
          
          <div className="space-y-8 max-w-4xl mx-auto">
            {/* 1. Corporate culture consulting */}
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-[#1A1A1A] mb-3 sm:mb-4 font-serif">
                1. Corporate culture consulting that waters down truth for comfort
              </h3>
              <p className="text-base sm:text-lg leading-relaxed text-[#6B6B6B]">
                I won't repackage leadership principles into corporate-friendly language that removes accountability or pretends dysfunction is "just a communication issue." If culture is broken, I'll name it. If leadership behavior is the problem, we'll address it directly.
              </p>
            </div>

            {/* 2. DEI training */}
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-[#1A1A1A] mb-3 sm:mb-4 font-serif">
                2. DEI training that prioritizes identity over character
              </h3>
              <p className="text-base sm:text-lg leading-relaxed text-[#6B6B6B]">
                Diversity and inclusion matter — but not when they're built on identity categories instead of the behaviors and principles that actually build trust. I teach servant leadership, character, communication, and the dynamics that create healthy environments. That work serves everyone.
              </p>
            </div>

            {/* 3. Performance coaching */}
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-[#1A1A1A] mb-3 sm:mb-4 font-serif">
                3. Performance coaching that ignores the human cost of leadership
              </h3>
              <p className="text-base sm:text-lg leading-relaxed text-[#6B6B6B]">
                Leadership success that costs your soul, your family, or your team's trust isn't success. I won't help leaders optimize productivity at the expense of people. If the goal is extraction, this isn't the place.
              </p>
            </div>

            {/* 4. Motivational speaking */}
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-[#1A1A1A] mb-3 sm:mb-4 font-serif">
                4. Motivational speaking designed to hype people up temporarily
              </h3>
              <p className="text-base sm:text-lg leading-relaxed text-[#6B6B6B]">
                I don't do keynote theatrics that get applause and disappear by Monday. If I speak, it's to strengthen understanding, not to entertain. Education and clarity outlast inspiration every time.
              </p>
            </div>

            {/* 5. Scaling into content machine */}
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-[#1A1A1A] mb-3 sm:mb-4 font-serif">
                5. Scaling Archetype Original into a content machine or influencer brand
              </h3>
              <p className="text-base sm:text-lg leading-relaxed text-[#6B6B6B]">
                This work is relational, not transactional. I'm not building a media empire, launching a course funnel, or hiring ghostwriters to scale my voice. Archetype Original grows through depth, not reach.
              </p>
            </div>
          </div>
          
          <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] font-semibold text-center max-w-3xl mx-auto mt-12 sm:mt-16">
            This is steady work for people who want real leadership — not trends, not performance, not shortcuts.
          </p>
        </div>
      </div>
    </section>
  );
}
