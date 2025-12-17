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
import SEO from '../../../components/SEO';

export default function CCO() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    "name": "Fractional Chief Culture Officer",
    "description": "A Fractional Chief Culture Officer steps into an organization at the moments when culture, leadership, and direction need clarity."
  };

  return (
    <>
      <SEO pageKey="fractional-cco" />
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
                Fractional Chief Culture Officer
              </h1>
              <p className="text-xl sm:text-2xl md:text-3xl font-light leading-relaxed text-[#1A1A1A]/70 max-w-4xl mx-auto">
                A Fractional Chief Culture Officer steps into an organization at the moments when culture, leadership, and direction need clarity.
              </p>
            </div>
          </div>
        </section>

        {/* Section 1: Culture and Leadership Connection */}
        <section className="w-full bg-white py-16 sm:py-24 md:py-32">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-4xl mx-auto space-y-6">
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                Every organization carries its own mixture of history, expectations, communication patterns, trust levels, personalities, and pressure. Culture is the sum of those things—what people experience, what they interpret, and how they respond. Leadership is the force that shapes that experience. When either one shifts, the other moves with it. That's why culture work can't be separated from leadership work.
              </p>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                In a Fractional Chief Culture Officer role, I step in as a temporary senior leader to help organizations navigate the culture and leadership dynamics shaping their environment. I listen, observe, ask questions, and identify the patterns influencing how people function. Sometimes those patterns reveal drift or misalignment. Sometimes they reveal strength and opportunity. Most of the time, they reveal both.
              </p>
            </div>
          </div>
        </section>

        {/* Section 2: The Three Seasons */}
        <section className="w-full bg-[#FAFAF9] py-16 sm:py-24 md:py-32">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-4xl mx-auto space-y-6">
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                Some seasons call for <span className="font-semibold">stabilization</span>: resetting expectations, rebuilding trust, strengthening communication, helping leadership regain steadiness, or guiding a team through transition.
              </p>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                Other seasons call for <span className="font-semibold">development</span>: clarifying cultural standards, strengthening leadership behavior, improving communication flow, or creating alignment as the organization grows.
              </p>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                And some seasons require <span className="font-semibold">building</span>: establishing cultural foundations, defining leadership expectations, shaping communication systems, or guiding structural maturity before problems take root.
              </p>
              <p className="text-xl sm:text-2xl leading-relaxed text-[#1A1A1A] italic font-serif">
                The role adapts to the season because culture adapts to the season.
              </p>
            </div>
          </div>
        </section>

        {/* Section 3: Foundation and Tools */}
        <section className="w-full bg-white py-16 sm:py-24 md:py-32">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-4xl mx-auto space-y-6">
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                The foundation of this work is lived experience—decades of leading teams, building companies, navigating culture collapse and repair, working across industries, and watching how real people respond to leadership under pressure. It's supported by ongoing research across leadership, psychology, communication, organizational behavior, and the broader landscape of how people work together. Culture Science and the Archetype Leadership Index (ALI) are being developed out of this body of work. They are tools I use—along with my team as AO grows—to assess leadership health, interpret cultural behavior, and help leaders understand how their decisions and communication are shaping the environment around them. As these tools mature, they will expand the clarity and precision I bring into this role.
              </p>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                But the role itself is hands-on. It's leadership involvement, not advisory distance. It's presence, not theory. It's clarity, alignment, and steadiness in the moments when people need it the most.
              </p>
            </div>
          </div>
        </section>

        {/* Section 4: The Outcome */}
        <section className="w-full bg-[#FAFAF9] py-16 sm:py-24 md:py-32">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-4xl mx-auto space-y-6">
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                The outcome of a Fractional Chief Culture Officer isn't a set of culture statements or a binder of values. It's an environment where people understand what's expected, how to communicate, how to function together, and how to move forward confidently. It's leadership that knows how to shape culture, not react to it. And it's a team that feels supported, aligned, and steady enough to do meaningful work.
              </p>
              <p className="text-xl sm:text-2xl leading-relaxed text-[#1A1A1A] italic font-serif">
                Whether your organization is stabilizing, strengthening, or building what comes next, this role helps you lead culture on purpose—not by accident.
              </p>
            </div>
          </div>
        </section>

        {/* Section 5: CTA */}
        <section className="w-full bg-white py-16 sm:py-24 md:py-32">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-3xl mx-auto text-center">
              <div className="mt-12">
                <a
                  href="/contact"
                  className="inline-block px-10 py-5 bg-[#1A1A1A] text-white font-medium text-base hover:bg-[#1A1A1A]/90 transition-colors rounded-sm"
                >
                  Start a Conversation
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Section 6: Related Links Navigation */}
        <section className="w-full bg-[#FAFAF9] py-16 sm:py-24 md:py-32 border-t border-[#1A1A1A]/10">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-4xl mx-auto">
              <p className="text-sm text-[#6B6B6B] mb-4">
                Explore other offerings:
              </p>
              <div className="flex flex-wrap gap-4 sm:gap-6">
                <a 
                  href="/methods/mentorship" 
                  className="text-sm text-[#1A1A1A] hover:text-[#C85A3C] transition-colors"
                  onClick={(e) => {
                    e.preventDefault();
                    window.history.pushState({}, '', '/methods/mentorship');
                    window.dispatchEvent(new PopStateEvent('popstate'));
                  }}
                >
                  Mentorship
                </a>
                <span className="text-sm text-[#6B6B6B]">→</span>
                <a 
                  href="/methods/consulting" 
                  className="text-sm text-[#1A1A1A] hover:text-[#C85A3C] transition-colors"
                  onClick={(e) => {
                    e.preventDefault();
                    window.history.pushState({}, '', '/methods/consulting');
                    window.dispatchEvent(new PopStateEvent('popstate'));
                  }}
                >
                  Consulting
                </a>
                <span className="text-sm text-[#6B6B6B]">→</span>
                <a 
                  href="/methods/training-education" 
                  className="text-sm text-[#1A1A1A] hover:text-[#C85A3C] transition-colors"
                  onClick={(e) => {
                    e.preventDefault();
                    window.history.pushState({}, '', '/methods/training-education');
                    window.dispatchEvent(new PopStateEvent('popstate'));
                  }}
                >
                  Training & Education
                </a>
                <span className="text-sm text-[#6B6B6B]">→</span>
                <a 
                  href="/methods/fractional-roles" 
                  className="text-sm text-[#1A1A1A] hover:text-[#C85A3C] transition-colors"
                  onClick={(e) => {
                    e.preventDefault();
                    window.history.pushState({}, '', '/methods/fractional-roles');
                    window.dispatchEvent(new PopStateEvent('popstate'));
                  }}
                >
                  ← Back to Fractional Roles
                </a>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

