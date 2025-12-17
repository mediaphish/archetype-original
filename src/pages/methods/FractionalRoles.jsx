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

export default function FractionalRoles() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    "name": "Fractional Roles",
    "description": "Leadership presence for the seasons that require more than guidance."
  };

  return (
    <>
      <SEO pageKey="fractional-roles" />
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
                Fractional Roles
              </h1>
              <p className="text-xl sm:text-2xl md:text-3xl font-light leading-relaxed text-[#1A1A1A]/70">
                Leadership presence for the seasons that require more than guidance.
              </p>
            </div>
          </div>
        </section>

        {/* Section 1: Opening */}
        <section className="w-full bg-white py-16 sm:py-24 md:py-32">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-4xl mx-auto space-y-6">
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                Sometimes an organization needs a steady hand for a moment. Sometimes it needs clarity during transition. Sometimes it needs someone who can step into the work—not just advise on it.
              </p>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                Fractional roles exist to meet those seasons with real leadership presence. Not theory. Not oversight from a distance. Actual involvement, clarity, and steadiness inside the environment.
              </p>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                Fractional work adapts to what is needed: culture, communication, operations, project direction, creative leadership, or helping a team move through transition without losing momentum or trust.
              </p>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] font-semibold">
                This isn't "interim management." This is experienced leadership brought in for a defined season with a clear purpose.
              </p>
            </div>
          </div>
        </section>

        {/* Section 2: Where Fractional Leadership Fits */}
        <section className="w-full bg-[#FAFAF9] py-16 sm:py-24 md:py-32">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="flex items-center mb-8 sm:mb-10">
                <div className="w-1 h-10 sm:h-12 md:h-14 bg-[#C85A3C] mr-4 sm:mr-6"></div>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#1A1A1A] font-serif tracking-tight leading-tight">
                  Where Fractional Leadership Fits
                </h2>
              </div>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                Organizations bring in fractional support for different reasons:
              </p>
              <ul className="list-disc space-y-3 pl-6 sm:pl-8">
                <li className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] marker:text-[#C85A3C]">
                  When culture feels unsteady and a team needs someone to restore alignment
                </li>
                <li className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] marker:text-[#C85A3C]">
                  When a growing company needs leadership clarity before adding full-time roles
                </li>
                <li className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] marker:text-[#C85A3C]">
                  When a department is stretched and needs temporary executive-level support
                </li>
                <li className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] marker:text-[#C85A3C]">
                  When a founder or executive is overloaded and needs a trusted partner in the work
                </li>
                <li className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] marker:text-[#C85A3C]">
                  When a team is healthy but preparing for a new season and needs help building toward it
                </li>
                <li className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] marker:text-[#C85A3C]">
                  When a company wants to strengthen what's already good without disrupting momentum
                </li>
              </ul>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] font-semibold">
                Fractional roles meet the moment. They add capacity, clarity, and leadership to whatever season you are in.
              </p>
            </div>
          </div>
        </section>

        {/* Section 3: The Roles I Step Into */}
        <section className="w-full bg-white py-16 sm:py-24 md:py-32">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="flex items-center mb-8 sm:mb-10">
                <div className="w-1 h-10 sm:h-12 md:h-14 bg-[#C85A3C] mr-4 sm:mr-6"></div>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#1A1A1A] font-serif tracking-tight leading-tight">
                  The Roles I Step Into
                </h2>
              </div>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                My background spans decades of leadership across multiple domains—software, creative, operations, client service, culture, communication, and organizational development. Because of that experience, fractional roles are flexible and shaped by what the organization actually needs.
              </p>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                Roles I can step into include:
              </p>

              {/* FLAGSHIP ROLE - CCO */}
              <div className="pl-4 border-l-4 border-[#C85A3C] space-y-3">
                <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-[#1A1A1A] font-serif">
                  Fractional Chief Culture Officer (CCO) — flagship role
                </h3>
                <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                  Culture, communication, leadership behavior, and the environment people experience every day.
                </p>
                <p className="text-base sm:text-lg leading-relaxed">
                  <a 
                    href="/methods/fractional-roles/cco" 
                    className="text-[#C85A3C] hover:text-[#C85A3C]/80 hover:underline transition-colors font-medium"
                    onClick={(e) => {
                      e.preventDefault();
                      window.history.pushState({}, '', '/methods/fractional-roles/cco');
                      window.dispatchEvent(new PopStateEvent('popstate'));
                    }}
                  >
                    Learn more about the CCO role →
                  </a>
                </p>
              </div>

              {/* OTHER ROLES */}
              <div className="space-y-6 mt-8">
                <div className="pl-4 border-l-2 border-[#1A1A1A]/10 space-y-2">
                  <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-[#1A1A1A] font-serif">
                    Fractional Operations Leader
                  </h3>
                  <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                    Clarity, structure, workflow, expectations, accountability, alignment.
                  </p>
                </div>

                <div className="pl-4 border-l-2 border-[#1A1A1A]/10 space-y-2">
                  <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-[#1A1A1A] font-serif">
                    Fractional Strategy / Directional Support
                  </h3>
                  <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                    Helping founders, executives, and teams navigate transition or growth with steadiness.
                  </p>
                </div>

                <div className="pl-4 border-l-2 border-[#1A1A1A]/10 space-y-2">
                  <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-[#1A1A1A] font-serif">
                    Fractional Creative or Marketing Leadership
                  </h3>
                  <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                    Useful during rebrands, communication shifts, or rebuilding identity and alignment.
                  </p>
                </div>

                <div className="pl-4 border-l-2 border-[#1A1A1A]/10 space-y-2">
                  <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-[#1A1A1A] font-serif">
                    Fractional Project or Delivery Leadership
                  </h3>
                  <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                    Bringing order, communication, and clarity into complex or high-pressure work.
                  </p>
                </div>
              </div>

              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] mt-8">
                Not every organization needs the same kind of leadership. Fractional roles allow me to bring the right kind of leadership to the right moment.
              </p>
            </div>
          </div>
        </section>

        {/* Section 4: Why This Works */}
        <section className="w-full bg-[#FAFAF9] py-16 sm:py-24 md:py-32">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="flex items-center mb-8 sm:mb-10">
                <div className="w-1 h-10 sm:h-12 md:h-14 bg-[#C85A3C] mr-4 sm:mr-6"></div>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#1A1A1A] font-serif tracking-tight leading-tight">
                  Why This Works
                </h2>
              </div>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                Fractional leadership works when it's built on lived experience, not frameworks. Over three decades, I've built companies, led teams, rebuilt culture, and served clients across industries. I know how people respond under pressure, how trust moves inside an organization, and what it takes to steady a team when the situation is chaotic or unclear.
              </p>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                Companies don't need a temporary title holder. They need clarity, presence, and leadership they can depend on.
              </p>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] font-semibold">
                Fractional roles give them that without the weight of a permanent executive hire.
              </p>
            </div>
          </div>
        </section>

        {/* Section 5: How We Begin */}
        <section className="w-full bg-white py-16 sm:py-24 md:py-32">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="flex items-center mb-8 sm:mb-10">
                <div className="w-1 h-10 sm:h-12 md:h-14 bg-[#C85A3C] mr-4 sm:mr-6"></div>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#1A1A1A] font-serif tracking-tight leading-tight">
                  How We Begin
                </h2>
              </div>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                Every fractional engagement starts with a conversation. We name the season you're in, the weight you're carrying, and the clarity your team needs.
              </p>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                Then we determine whether the right level of involvement is:
              </p>
              <ul className="list-disc space-y-3 pl-6 sm:pl-8">
                <li className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] marker:text-[#C85A3C]">
                  Hourly or short-term
                </li>
                <li className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] marker:text-[#C85A3C]">
                  Day or weekly involvement
                </li>
                <li className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] marker:text-[#C85A3C]">
                  A defined fractional role up to 40 hours/month
                </li>
                <li className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] marker:text-[#C85A3C]">
                  Or a deeper engagement when alignment, goals, and investment are right
                </li>
              </ul>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] font-semibold">
                The structure adapts to the need—never the other way around.
              </p>
            </div>
          </div>
        </section>

        {/* Section 6: Closing CTA */}
        <section className="w-full bg-[#FAFAF9] py-16 sm:py-24 md:py-32">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-3xl mx-auto text-center space-y-6">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#1A1A1A] font-serif tracking-tight">
                If This Is the Moment You Need Leadership, Not Advice
              </h2>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                Let's talk through what your team or organization is facing and decide together whether a fractional role is the right fit.
              </p>
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
      </div>
    </>
  );
}

