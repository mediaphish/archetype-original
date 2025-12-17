import React from 'react';
import ALISubNav from '../../components/ALISubNav';

const ALIDashboard = () => {
  const conditions = [
    { number: 1, title: "Clarity", description: "How clearly expectations, priorities, and direction are communicated and understood." },
    { number: 2, title: "Trust", description: "The perceived reliability, consistency, and integrity of leadership behavior over time." },
    { number: 3, title: "Communication", description: "How information flows — accessibility, transparency, frequency, and quality of exchange." },
    { number: 4, title: "Consistency", description: "The predictability and reliability of leadership decisions, follow-through, and standards." },
    { number: 5, title: "Safety", description: "Whether people feel secure enough to speak honestly, take risks, and surface problems." },
    { number: 6, title: "Emotional Tone", description: "The underlying emotional climate leadership creates — supportive, tense, neutral, or guarded." }
  ];

  return (
    <>
      <ALISubNav />
      <main className="min-h-screen">
        {/* SECTION 1: HERO */}
        <section className="bg-white py-24 sm:py-32 md:py-40 lg:py-48">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-5xl mx-auto text-center space-y-8">
              <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl font-bold leading-[0.9] tracking-tight text-[#1A1A1A]">
                The Dashboard
              </h1>
              <p className="text-xl sm:text-2xl md:text-3xl leading-relaxed text-[#1A1A1A]/70 font-light">
                Your leadership navigation instrument.
              </p>
            </div>
          </div>
        </section>

        {/* SECTION 2: WHAT YOU SEE ON THE DASHBOARD */}
        <section className="bg-gradient-to-b from-white via-[#FFF8F0] to-white py-16 sm:py-24 md:py-32">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-3xl mx-auto space-y-8">
              {/* Numbered section header */}
              <div className="relative">
                <div className="absolute -top-8 -left-4 text-8xl sm:text-9xl font-serif font-bold text-[#1A1A1A]/5 pointer-events-none">
                  01
                </div>
                <div className="relative z-10">
                  <h2 className="font-serif font-bold text-3xl sm:text-4xl md:text-5xl text-[#1A1A1A] mb-6">
                    What You See on the Dashboard
                  </h2>
                </div>
              </div>

              <div className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] space-y-6">
                <p>The ALI Dashboard is not a survey report.</p>
                <p>It is a navigation instrument.</p>
                <p>
                  It shows leaders where their leadership conditions currently sit, which direction they are moving, how quickly they are changing, and what underlying signals are forming beneath the surface.
                </p>
                <p>
                  Every quarter, your team completes a 10-question pulse. The data flows into ALI, which translates those responses into condition-level insight across six dimensions.
                </p>
                <p>The dashboard displays:</p>

                <ul className="list-none space-y-2 pl-6">
                  <li className="flex items-start gap-3">
                    <span className="text-[#C85A3C] mt-1 flex-shrink-0">→</span>
                    <span className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]/70">
                      Current condition strength for all six leadership conditions
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-[#C85A3C] mt-1 flex-shrink-0">→</span>
                    <span className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]/70">
                      Directional movement (strengthening, stable, weakening)
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-[#C85A3C] mt-1 flex-shrink-0">→</span>
                    <span className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]/70">
                      Rate of change over time
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-[#C85A3C] mt-1 flex-shrink-0">→</span>
                    <span className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]/70">
                      Early warning indicators surfacing beneath the data
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-[#C85A3C] mt-1 flex-shrink-0">→</span>
                    <span className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]/70">
                      Pattern relationships between conditions
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-[#C85A3C] mt-1 flex-shrink-0">→</span>
                    <span className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]/70">
                      Environmental interpretation explaining what the data means
                    </span>
                  </li>
                </ul>

                <p>This is not about scoring leaders.</p>
                <p>
                  It is about giving leaders visibility into the wake they are creating — so they can lead with intention instead of assumption.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 3: THE SIX LEADERSHIP CONDITIONS */}
        <section className="bg-white py-16 sm:py-24 md:py-32">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-6xl mx-auto space-y-12">
              {/* Numbered section header */}
              <div className="relative max-w-3xl">
                <div className="absolute -top-8 -left-4 text-8xl sm:text-9xl font-serif font-bold text-[#1A1A1A]/5 pointer-events-none">
                  02
                </div>
                <div className="relative z-10">
                  <h2 className="font-serif font-bold text-3xl sm:text-4xl md:text-5xl text-[#1A1A1A] mb-6">
                    The Six Leadership Conditions
                  </h2>
                </div>
              </div>

              <div className="max-w-3xl">
                <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                  ALI measures six core leadership conditions. These are not personality traits. They are environmental conditions that leadership creates, maintains, or allows to drift.
                </p>
              </div>

              {/* Six elevated cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 mt-12">
                {conditions.map((condition) => (
                  <div
                    key={condition.number}
                    className="bg-white p-6 sm:p-8 rounded-lg border border-[#1A1A1A]/20 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 relative overflow-hidden"
                  >
                    {/* Large decorative number in background */}
                    <div className="absolute top-4 right-4 text-7xl font-serif font-bold text-[#1A1A1A]/5">
                      {condition.number}
                    </div>

                    {/* Small numbered badge */}
                    <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#C85A3C] text-white text-sm font-bold mb-4">
                      {condition.number}
                    </div>

                    <h3 className="text-xl sm:text-2xl font-bold text-[#1A1A1A] mb-3 relative z-10">
                      {condition.title}
                    </h3>

                    <p className="text-base sm:text-lg text-[#1A1A1A]/70 leading-relaxed relative z-10">
                      {condition.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 4: PULL QUOTE */}
        <section className="bg-white py-8 sm:py-12">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-3xl mx-auto my-16 sm:my-20">
              <div className="pl-6 sm:pl-8 border-l-4 border-[#C85A3C]">
                <p className="text-xl sm:text-2xl font-semibold italic text-[#1A1A1A] leading-relaxed">
                  "These conditions exist whether they are measured or not. ALI simply makes them visible."
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 5: WHAT QUARTERLY DATA REVEALS */}
        <section className="bg-[#FFF8F0] py-16 sm:py-24 md:py-32">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-3xl mx-auto space-y-8">
              {/* Numbered section header */}
              <div className="relative">
                <div className="absolute -top-8 -left-4 text-8xl sm:text-9xl font-serif font-bold text-[#1A1A1A]/5 pointer-events-none">
                  03
                </div>
                <div className="relative z-10">
                  <h2 className="font-serif font-bold text-3xl sm:text-4xl md:text-5xl text-[#1A1A1A] mb-6">
                    What Quarterly Data Reveals
                  </h2>
                </div>
              </div>

              <div className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] space-y-6">
                <p>One data point tells you how things feel in a single moment.</p>
                <p>Quarterly data over time tells you how things are actually changing.</p>
                <p>By the third quarter, patterns begin to emerge:</p>

                <ul className="list-none space-y-2 pl-6">
                  <li className="flex items-start gap-3">
                    <span className="text-[#C85A3C] mt-1 flex-shrink-0">→</span>
                    <span className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]/70">
                      Is clarity strengthening or softening?
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-[#C85A3C] mt-1 flex-shrink-0">→</span>
                    <span className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]/70">
                      Is trust stable or beginning to thin?
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-[#C85A3C] mt-1 flex-shrink-0">→</span>
                    <span className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]/70">
                      Is communication improving or compressing under pressure?
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-[#C85A3C] mt-1 flex-shrink-0">→</span>
                    <span className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]/70">
                      Is consistency holding or starting to erode?
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-[#C85A3C] mt-1 flex-shrink-0">→</span>
                    <span className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]/70">
                      Is safety expanding or contracting?
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-[#C85A3C] mt-1 flex-shrink-0">→</span>
                    <span className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]/70">
                      Is emotional tone stabilizing or shifting?
                    </span>
                  </li>
                </ul>

                <p>This is not about perfection.</p>
                <p>It is about direction.</p>
                <p>Leaders finally see where they are heading — not where they hope they are.</p>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 6: HOW LEADERS USE THE DASHBOARD */}
        <section className="bg-[#1A1A1A] py-16 sm:py-24 md:py-32">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-3xl mx-auto space-y-8">
              <h2 className="font-serif font-bold text-3xl sm:text-4xl md:text-5xl text-white">
                How Leaders Use The Dashboard
              </h2>

              <div className="text-base sm:text-lg leading-relaxed text-white/80 space-y-6">
                <p>Leaders do not use the dashboard to judge themselves.</p>
                <p>They use it to see reality clearly — so they can lead intentionally.</p>
                <p>The dashboard shows:</p>

                <ul className="list-none space-y-3 pl-6">
                  <li className="flex items-start gap-3">
                    <span className="text-[#C85A3C] mt-1 flex-shrink-0">→</span>
                    <span className="text-base sm:text-lg leading-relaxed text-white/80">
                      where to pay attention
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-[#C85A3C] mt-1 flex-shrink-0">→</span>
                    <span className="text-base sm:text-lg leading-relaxed text-white/80">
                      what is strengthening
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-[#C85A3C] mt-1 flex-shrink-0">→</span>
                    <span className="text-base sm:text-lg leading-relaxed text-white/80">
                      what is weakening
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-[#C85A3C] mt-1 flex-shrink-0">→</span>
                    <span className="text-base sm:text-lg leading-relaxed text-white/80">
                      which early warning indicators are surfacing
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-[#C85A3C] mt-1 flex-shrink-0">→</span>
                    <span className="text-base sm:text-lg leading-relaxed text-white/80">
                      where drift is forming
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-[#C85A3C] mt-1 flex-shrink-0">→</span>
                    <span className="text-base sm:text-lg leading-relaxed text-white/80">
                      what patterns are emerging across conditions
                    </span>
                  </li>
                </ul>

                <p>This visibility changes how leaders think about their role.</p>
                <p>They stop reacting to symptoms and start managing conditions.</p>
                <p>They stop guessing and start knowing.</p>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 7: CTA - GO DEEPER */}
        <section className="bg-white py-16 sm:py-24 md:py-32">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-4xl mx-auto space-y-12">
              <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-[#1A1A1A] text-center mb-12">
                Go Deeper
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
                {/* Card 1 */}
                <a
                  href="/culture-science/ali/six-leadership-conditions"
                  onClick={(e) => { e.preventDefault(); window.history.pushState({}, '', '/culture-science/ali/six-leadership-conditions'); window.dispatchEvent(new PopStateEvent('popstate')); window.scrollTo({ top: 0, behavior: 'instant' }); }}
                  className="bg-white p-6 sm:p-8 rounded-lg border-2 border-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white transition-all duration-300 group block"
                >
                  <h3 className="text-xl sm:text-2xl font-bold mb-3 group-hover:text-white text-[#1A1A1A]">
                    The Six Leadership Conditions
                  </h3>
                  <p className="text-base sm:text-lg text-[#1A1A1A]/70 group-hover:text-white/80 mb-4">
                    Explore each condition in detail and understand what they reveal about leadership impact.
                  </p>
                  <span className="inline-flex items-center gap-2 font-semibold group-hover:text-white text-[#1A1A1A]">
                    Explore →
                  </span>
                </a>

                {/* Card 2 */}
                <a
                  href="/culture-science/ali/early-warning"
                  onClick={(e) => { e.preventDefault(); window.history.pushState({}, '', '/culture-science/ali/early-warning'); window.dispatchEvent(new PopStateEvent('popstate')); window.scrollTo({ top: 0, behavior: 'instant' }); }}
                  className="bg-white p-6 sm:p-8 rounded-lg border-2 border-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white transition-all duration-300 group block"
                >
                  <h3 className="text-xl sm:text-2xl font-bold mb-3 group-hover:text-white text-[#1A1A1A]">
                    Early Warning Indicators
                  </h3>
                  <p className="text-base sm:text-lg text-[#1A1A1A]/70 group-hover:text-white/80 mb-4">
                    Learn how ALI detects drift before it becomes damage.
                  </p>
                  <span className="inline-flex items-center gap-2 font-semibold group-hover:text-white text-[#1A1A1A]">
                    Explore →
                  </span>
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
};

export default ALIDashboard;

