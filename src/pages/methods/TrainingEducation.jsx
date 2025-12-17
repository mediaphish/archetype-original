/**
 * Voice Guideline:
 * {
 *   "voice_guideline": {
 *     "default": "first-person singular",
 *     "exceptions": ["collaboration", "Archetype philosophy"],
 *     "owner": "Bart Paden"
 *   }
 * }
 */
import React from 'react';
import { Helmet } from 'react-helmet-async';
import SEO from '../../components/SEO';

export default function TrainingEducation() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    "name": "Training & Education",
    "description": "Clarity strengthens people. Strengthened people transform organizations. Leadership shapes both."
  };

  return (
    <>
      <SEO pageKey="training-education" />
      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify(jsonLd)}
        </script>
      </Helmet>
      
      <div className="min-h-screen bg-[#FAFAF9]">
        {/* Hero Section */}
        <section className="w-full bg-white py-24 sm:py-32 md:py-40 lg:py-48">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-5xl mx-auto text-center space-y-8">
              <h1 className="font-serif text-7xl sm:text-8xl md:text-9xl font-bold text-[#1A1A1A] leading-[0.9] tracking-tight">
                Training & Education
              </h1>
              <p className="text-xl sm:text-2xl md:text-3xl font-light leading-relaxed text-[#1A1A1A]/70">
                Clarity strengthens people. Strengthened people transform organizations. Leadership shapes both.
              </p>
            </div>
          </div>
        </section>

        {/* Section 1: Opening Narrative */}
        <section className="w-full bg-white py-16 sm:py-24 md:py-32">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-4xl mx-auto space-y-6">
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                Healthy leadership and strong culture are not accidents.
              </p>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                They're learned. Practiced. Tested. Reinforced.
              </p>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                They rise when people understand themselves, each other, and the responsibility they carry.
              </p>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                Training & Education at Archetype Original is built on that belief —<br />
                growth becomes possible when clarity becomes tangible.
              </p>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                For more than three decades, the same pattern proved itself repeatedly:<br />
                people thrive when they understand the impact of their actions, the weight of their influence, and the culture their behavior creates.
              </p>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                This isn't curriculum.
              </p>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                This isn't a pre-built program.
              </p>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                It is lived leadership translated into understanding that people can feel and immediately apply.
              </p>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                Sessions are shaped by experience, refined through research, and grounded in the conviction that people deserve to work inside environments that build them, not drain them.
              </p>
            </div>
          </div>
        </section>

        {/* Section 2: For Leaders */}
        <section className="w-full bg-[#FAFAF9] py-16 sm:py-24 md:py-32">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="flex items-center mb-8 sm:mb-10">
                <div className="w-1 h-10 sm:h-12 md:h-14 bg-[#C85A3C] mr-4 sm:mr-6"></div>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#1A1A1A] font-serif tracking-tight leading-tight">
                  For Leaders
                </h2>
              </div>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                Leaders rarely suffer from a lack of information.
              </p>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                What they lack is clarity — about themselves, their influence, and the unseen dynamics shaping their teams.
              </p>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                Leadership training here focuses on:
              </p>
              <ul className="list-disc space-y-3 pl-6 sm:pl-8">
                <li className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] marker:text-[#C85A3C]">
                  naming the pressures leaders carry
                </li>
                <li className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] marker:text-[#C85A3C]">
                  translating instinct into understanding
                </li>
                <li className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] marker:text-[#C85A3C]">
                  connecting behavior to culture
                </li>
                <li className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] marker:text-[#C85A3C]">
                  refining personal responsibility
                </li>
                <li className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] marker:text-[#C85A3C]">
                  building confidence without ego
                </li>
                <li className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] marker:text-[#C85A3C]">
                  strengthening presence under pressure
                </li>
              </ul>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                It's leadership taught without theatrics, jargon, or pretense.
              </p>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                Leaders leave with a steadier internal compass and a clearer grasp of the culture they're shaping every day.
              </p>
            </div>
          </div>
        </section>

        {/* Section 3: For Teams & Organizations */}
        <section className="w-full bg-white py-16 sm:py-24 md:py-32">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="flex items-center mb-8 sm:mb-10">
                <div className="w-1 h-10 sm:h-12 md:h-14 bg-[#C85A3C] mr-4 sm:mr-6"></div>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#1A1A1A] font-serif tracking-tight leading-tight">
                  For Teams & Organizations
                </h2>
              </div>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                Teams function best when there is shared understanding.
              </p>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                When people see how their behavior affects others.
              </p>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                When communication feels honest.
              </p>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                When expectations are visible instead of assumed.
              </p>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                When clarity removes the friction that confusion creates.
              </p>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                Training at the organizational level helps teams:
              </p>
              <ul className="list-disc space-y-3 pl-6 sm:pl-8">
                <li className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] marker:text-[#C85A3C]">
                  understand the behaviors that build trust
                </li>
                <li className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] marker:text-[#C85A3C]">
                  recognize patterns that quietly undermine it
                </li>
                <li className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] marker:text-[#C85A3C]">
                  communicate with precision instead of guesswork
                </li>
                <li className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] marker:text-[#C85A3C]">
                  re-align around purpose, principles, and people
                </li>
              </ul>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                A team that understands itself becomes a team capable of momentum.
              </p>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                A culture that understands itself becomes a culture capable of growth.
              </p>
            </div>
          </div>
        </section>

        {/* Section 4: For Students & Emerging Leaders */}
        <section className="w-full bg-[#FAFAF9] py-16 sm:py-24 md:py-32">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="flex items-center mb-8 sm:mb-10">
                <div className="w-1 h-10 sm:h-12 md:h-14 bg-[#C85A3C] mr-4 sm:mr-6"></div>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#1A1A1A] font-serif tracking-tight leading-tight">
                  For Students & Emerging Leaders
                </h2>
              </div>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                The next generation deserves more than motivational hype or leadership clichés. They need an honest picture of what leadership actually costs — and what it can become when carried with strength, empathy, and responsibility.
              </p>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                Education for students and early-career adults focuses on:
              </p>
              <ul className="list-disc space-y-3 pl-6 sm:pl-8">
                <li className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] marker:text-[#C85A3C]">
                  character
                </li>
                <li className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] marker:text-[#C85A3C]">
                  clarity
                </li>
                <li className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] marker:text-[#C85A3C]">
                  responsibility
                </li>
                <li className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] marker:text-[#C85A3C]">
                  influence
                </li>
                <li className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] marker:text-[#C85A3C]">
                  empathy
                </li>
                <li className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] marker:text-[#C85A3C]">
                  resilience
                </li>
              </ul>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                It equips young leaders with the understanding that leadership is not about attention — it's about stewardship. Seeds planted here often grow into character that lasts decades.
              </p>
            </div>
          </div>
        </section>

        {/* Section 5: How Training Happens */}
        <section className="w-full bg-white py-16 sm:py-24 md:py-32">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="flex items-center mb-8 sm:mb-10">
                <div className="w-1 h-10 sm:h-12 md:h-14 bg-[#C85A3C] mr-4 sm:mr-6"></div>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#1A1A1A] font-serif tracking-tight leading-tight">
                  How Training Happens
                </h2>
              </div>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                Training & Education at Archetype Original is grounded in four pillars:
              </p>
              <div className="space-y-4 pl-4 border-l-2 border-[#C85A3C]">
                <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                  <strong className="text-[#1A1A1A]">1. Lived experience</strong> — real leadership in real environments, not theory.
                </p>
                <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                  <strong className="text-[#1A1A1A]">2. Narrative understanding</strong> — lessons carried through story, not slides.
                </p>
                <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                  <strong className="text-[#1A1A1A]">3. Behavioral clarity</strong> — patterns made visible and practical.
                </p>
                <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                  <strong className="text-[#1A1A1A]">4. Evidence awareness</strong> — research informing what people feel intuitively.
                </p>
              </div>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                Each session begins with the people in the room — their reality, their pressure, their questions, their work. From there, education becomes a conversation shaped by honesty, insight, and the kind of practical clarity that changes how people show up the very next day.
              </p>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                Participants leave with more than concepts.
              </p>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                They leave with understanding.
              </p>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                Teams leave with connection.
              </p>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                Leaders leave with direction.
              </p>
              <p className="text-xl sm:text-2xl leading-relaxed text-[#1A1A1A] italic font-serif">
                At the center is a simple truth: people rise when leadership gives them something solid to stand on.
              </p>
            </div>
          </div>
        </section>

        {/* Section 6: Closing CTA */}
        <section className="w-full bg-[#FAFAF9] py-16 sm:py-24 md:py-32">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-3xl mx-auto text-center space-y-6">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#1A1A1A] font-serif tracking-tight">
                If Your People Need Clarity
              </h2>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                Whether the goal is strengthening leaders, unifying teams, or shaping the next generation, Archetype Original can build an experience that matches the environment, the people, and the moment.
              </p>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                Let's talk about what your people need.
              </p>
              <div className="mt-12">
                <a
                  href="/contact"
                  className="inline-block px-10 py-5 bg-[#1A1A1A] text-white font-medium text-base hover:bg-[#1A1A1A]/90 transition-colors rounded-sm"
                >
                  Let's Talk
                </a>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

