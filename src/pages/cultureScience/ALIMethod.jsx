import React from "react";
import SEO from "../../components/SEO";
import ALISubNav from "../../components/ALISubNav";

export default function ALIMethod() {
  const handleLinkClick = (e, href) => {
    e.preventDefault();
    window.history.pushState({}, '', href);
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  return (
    <>
      <SEO pageKey="ali-method" />
      <ALISubNav />
      <main className="min-h-screen">
        
        {/* SECTION 1: HERO */}
        <section className="bg-white py-24 sm:py-32 md:py-40 lg:py-48">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-5xl mx-auto text-center space-y-8">
              <h1 className="font-serif text-7xl sm:text-8xl md:text-9xl font-bold leading-[0.9] tracking-tight text-[#1A1A1A]">
                The ALI Method
              </h1>
              <p className="text-xl sm:text-2xl md:text-3xl leading-relaxed text-[#1A1A1A]/70 font-light">
                How leadership conditions become measurable, trackable, and directional.
              </p>
            </div>
          </div>
        </section>

        {/* SECTION 2: INTRODUCTION */}
        <section className="bg-gradient-to-b from-white via-[#FFF8F0] to-white py-16 sm:py-24 md:py-32">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-3xl mx-auto space-y-6 text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
              <p>
                The ALI Method is built on three pillars:
              </p>
              <div className="pl-6 sm:pl-8 border-l-4 border-[#C85A3C] space-y-1 font-semibold text-[#1A1A1A]">
                <p>Environmental Measurement</p>
                <p>Pattern Detection</p>
                <p>Directional Insight</p>
              </div>
              <p>
                Together, these pillars turn lived experience into actionable visibility.
              </p>
              <p>
                Leadership becomes visible when conditions are measured over time, not when emotions are sampled in isolation.
              </p>
            </div>
          </div>
        </section>

        {/* SECTION 3: 1. ENVIRONMENTAL MEASUREMENT */}
        <section className="bg-white py-16 sm:py-24 md:py-32">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-3xl mx-auto space-y-8">
              {/* Numbered section header */}
              <div className="relative">
                <div className="absolute -top-8 -left-4 text-8xl sm:text-9xl font-serif font-bold text-[#1A1A1A]/5 pointer-events-none">
                  01
                </div>
                <div className="relative z-10">
                  <h2 className="font-serif font-bold text-3xl sm:text-4xl md:text-5xl text-[#1A1A1A] mb-6">
                    Environmental Measurement
                  </h2>
                </div>
              </div>

              <div className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] space-y-6">
                <p>
                  A quarterly pulse that measures conditions, not emotions.
                </p>
                <p>
                  The ALI diagnostic consists of 10 precise questions designed to reveal the state of six leadership conditions:
                </p>
                <ul className="list-none space-y-2 pl-6">
                  <li className="flex items-start gap-3">
                    <span className="text-[#C85A3C] mt-1 flex-shrink-0">→</span>
                    <span className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]/70">Clarity</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-[#C85A3C] mt-1 flex-shrink-0">→</span>
                    <span className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]/70">Trust</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-[#C85A3C] mt-1 flex-shrink-0">→</span>
                    <span className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]/70">Communication</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-[#C85A3C] mt-1 flex-shrink-0">→</span>
                    <span className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]/70">Consistency</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-[#C85A3C] mt-1 flex-shrink-0">→</span>
                    <span className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]/70">Safety</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-[#C85A3C] mt-1 flex-shrink-0">→</span>
                    <span className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]/70">Emotional Tone</span>
                  </li>
                </ul>
                <p>
                  Each question has been refined to expose behavioral reality, not preference or sentiment.
                </p>
                <p>
                  This matters because:
                </p>
                <ul className="list-none space-y-2 pl-6">
                  <li className="flex items-start gap-3">
                    <span className="text-[#C85A3C] mt-1 flex-shrink-0">→</span>
                    <span className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]/70">People can be frustrated yet still operating in a strong environment.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-[#C85A3C] mt-1 flex-shrink-0">→</span>
                    <span className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]/70">People can feel "good" while important conditions are declining.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-[#C85A3C] mt-1 flex-shrink-0">→</span>
                    <span className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]/70">Leaders cannot rely on emotional feedback to diagnose environmental truth.</span>
                  </li>
                </ul>
                <p>
                  The ALI Method focuses on observable environmental signals, not individual feelings.
                </p>
                <p>
                  Every question is engineered to cut through perception and reveal:
                </p>
                <ul className="list-none space-y-2 pl-6">
                  <li className="flex items-start gap-3">
                    <span className="text-[#C85A3C] mt-1 flex-shrink-0">→</span>
                    <span className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]/70">how people are experiencing leadership behavior</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-[#C85A3C] mt-1 flex-shrink-0">→</span>
                    <span className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]/70">whether conditions are strengthening or weakening</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-[#C85A3C] mt-1 flex-shrink-0">→</span>
                    <span className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]/70">where friction is emerging</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-[#C85A3C] mt-1 flex-shrink-0">→</span>
                    <span className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]/70">what signals are forming under the surface</span>
                  </li>
                </ul>
                <p>
                  This is the opposite of a traditional survey.
                </p>
                <p>
                  This is measurement with intent.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 4: 2. PATTERN DETECTION */}
        <section className="bg-[#FFF8F0] py-16 sm:py-24 md:py-32">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-3xl mx-auto space-y-8">
              {/* Numbered section header */}
              <div className="relative">
                <div className="absolute -top-8 -left-4 text-8xl sm:text-9xl font-serif font-bold text-[#1A1A1A]/5 pointer-events-none">
                  02
                </div>
                <div className="relative z-10">
                  <h2 className="font-serif font-bold text-3xl sm:text-4xl md:text-5xl text-[#1A1A1A] mb-6">
                    Pattern Detection
                  </h2>
                </div>
              </div>

              <div className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] space-y-6">
                <p>
                  Isolated data points don't mean anything. Patterns do.
                </p>
                <p>
                  Leadership conditions don't change all at once. They drift.
                </p>
                <p>
                  Drift appears as:
                </p>
                <ul className="list-none space-y-2 pl-6">
                  <li className="flex items-start gap-3">
                    <span className="text-[#C85A3C] mt-1 flex-shrink-0">→</span>
                    <span className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]/70">small inconsistencies in how leaders communicate</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-[#C85A3C] mt-1 flex-shrink-0">→</span>
                    <span className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]/70">subtle changes in clarity</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-[#C85A3C] mt-1 flex-shrink-0">→</span>
                    <span className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]/70">slight shifts in emotional tone</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-[#C85A3C] mt-1 flex-shrink-0">→</span>
                    <span className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]/70">early signs of avoidance</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-[#C85A3C] mt-1 flex-shrink-0">→</span>
                    <span className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]/70">mild softening of standards</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-[#C85A3C] mt-1 flex-shrink-0">→</span>
                    <span className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]/70">tiny distortions in information flow</span>
                  </li>
                </ul>
                <p>
                  Individually, none of these seem alarming.
                </p>
                <p>
                  But together, they signal a directional movement.
                </p>
                <p>
                  The ALI Method is built to detect this movement through:
                </p>
                <ul className="list-none space-y-2 pl-6">
                  <li className="flex items-start gap-3">
                    <span className="text-[#C85A3C] mt-1 flex-shrink-0">→</span>
                    <span className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]/70">quarterly comparison</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-[#C85A3C] mt-1 flex-shrink-0">→</span>
                    <span className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]/70">pattern mapping</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-[#C85A3C] mt-1 flex-shrink-0">→</span>
                    <span className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]/70">drift thresholds</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-[#C85A3C] mt-1 flex-shrink-0">→</span>
                    <span className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]/70">condition-to-condition relationships</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-[#C85A3C] mt-1 flex-shrink-0">→</span>
                    <span className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]/70">underlying signal correlation</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-[#C85A3C] mt-1 flex-shrink-0">→</span>
                    <span className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]/70">historical trend data</span>
                  </li>
                </ul>
                <p>
                  ALI doesn't treat a measurement as "good" or "bad."
                </p>
                <p>
                  It treats it as directional:
                </p>
                <div className="pl-6 sm:pl-8 border-l-4 border-[#C85A3C] space-y-1 italic text-[#1A1A1A]/70">
                  <p>Are conditions strengthening?</p>
                  <p>Are they weakening?</p>
                  <p>How quickly?</p>
                  <p>How consistently?</p>
                  <p>In which areas?</p>
                  <p>With what underlying signals?</p>
                  <p>Under which leadership behaviors?</p>
                </div>
                <p>
                  Leaders finally see movement, not static results.
                </p>
                <p>
                  That movement tells the story long before symptoms appear.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 5: 3. DIRECTIONAL INSIGHT */}
        <section className="bg-white py-16 sm:py-24 md:py-32">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-3xl mx-auto space-y-8">
              {/* Numbered section header */}
              <div className="relative">
                <div className="absolute -top-8 -left-4 text-8xl sm:text-9xl font-serif font-bold text-[#1A1A1A]/5 pointer-events-none">
                  03
                </div>
                <div className="relative z-10">
                  <h2 className="font-serif font-bold text-3xl sm:text-4xl md:text-5xl text-[#1A1A1A] mb-6">
                    Directional Insight
                  </h2>
                </div>
              </div>

              <div className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] space-y-6">
                <p>
                  Where culture is actually going — not where it feels like it is today.
                </p>
                <p>
                  The ALI Method combines environmental measurement and pattern detection to produce insight leaders rarely get:
                </p>
                <p className="font-semibold">
                  visibility into where the culture is heading if nothing changes.
                </p>
                <p>
                  This includes:
                </p>

                {/* Insight cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-8">
                  <div className="bg-[#FAFAF9] p-6 border-l-4 border-[#C85A3C]">
                    <p className="font-bold text-[#1A1A1A] mb-2">Strengthening Conditions</p>
                    <p className="text-[#1A1A1A]/70">Where leadership behavior is stabilizing the environment.</p>
                  </div>
                  <div className="bg-[#FAFAF9] p-6 border-l-4 border-[#C85A3C]">
                    <p className="font-bold text-[#1A1A1A] mb-2">Weakening Conditions</p>
                    <p className="text-[#1A1A1A]/70">Where drift is forming and why.</p>
                  </div>
                  <div className="bg-[#FAFAF9] p-6 border-l-4 border-[#C85A3C]">
                    <p className="font-bold text-[#1A1A1A] mb-2">Emerging Signals</p>
                    <p className="text-[#1A1A1A]/70">Which early warning indicators are beginning to surface.</p>
                  </div>
                  <div className="bg-[#FAFAF9] p-6 border-l-4 border-[#C85A3C]">
                    <p className="font-bold text-[#1A1A1A] mb-2">Stability vs. Volatility</p>
                    <p className="text-[#1A1A1A]/70">Which areas remain reliable and which fluctuate under pressure.</p>
                  </div>
                  <div className="bg-[#FAFAF9] p-6 border-l-4 border-[#C85A3C] sm:col-span-2">
                    <p className="font-bold text-[#1A1A1A] mb-2">Environmental Direction</p>
                    <p className="text-[#1A1A1A]/70">The forward trajectory of leadership influence.</p>
                  </div>
                </div>

                <p>
                  The ALI Method shifts leaders from:
                </p>
                <div className="pl-6 sm:pl-8 border-l-4 border-[#1A1A1A]/20 italic text-[#1A1A1A]/70">
                  <p>"Do people feel good right now?"</p>
                </div>
                <p>
                  To:
                </p>
                <div className="pl-6 sm:pl-8 border-l-4 border-[#C85A3C] space-y-1 italic text-[#1A1A1A]/70">
                  <p>"What conditions are forming?"</p>
                  <p>"What will this become?"</p>
                  <p>"Where do we need to pay attention?"</p>
                </div>
                <p>
                  This is leadership foresight — the ability to act early, not react late.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 6: HOW THE QUARTERLY CYCLE WORKS - DARK SECTION */}
        <section className="bg-[#1A1A1A] py-16 sm:py-24 md:py-32">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-3xl mx-auto space-y-8">
              {/* Numbered section header */}
              <div className="relative">
                <div className="absolute -top-8 -left-4 text-8xl sm:text-9xl font-serif font-bold text-white/5 pointer-events-none">
                  04
                </div>
                <div className="relative z-10">
                  <h2 className="font-serif font-bold text-3xl sm:text-4xl md:text-5xl text-white mb-6">
                    How the Quarterly Cycle Works
                  </h2>
                </div>
              </div>

              <div className="text-base sm:text-lg leading-relaxed text-white/80 space-y-6">
                <p>
                  Every quarter, your team receives a 10-question pulse. It takes 10 minutes. The questions don't ask how people feel—they ask what people are experiencing. The data flows in clean, consistent, and anonymous.
                </p>
                <p>
                  ALI then translates that data into condition strength across all six leadership conditions. It calculates not just where each condition sits right now, but which direction it's moving and how quickly.
                </p>
                <p>
                  By the end of the third quarter, ALI has enough data to reveal patterns over time. That's when you stop seeing snapshots and start seeing trajectory: Is this condition stable? Drifting? Correcting? Continuing to strengthen?
                </p>
                <p>
                  Leaders review their dashboard—not a survey report, but a navigation instrument. You see current condition levels, direction of change, underlying early warning indicators, and environmental interpretation that explains what the data actually means.
                </p>
                <p>
                  Archy steps in here as your interpretive engine. He breaks the dashboard down into plain language: what it means, why it matters, what it suggests, how it connects to specific leadership behaviors, and what you might consider next.
                </p>
                <p>
                  Then you choose. ALI doesn't prescribe programs or force you down predetermined paths. It reveals truth so you can make intentional, aligned decisions about where to focus next.
                </p>
                <p>
                  You act. The next quarter begins. The cycle repeats.
                </p>
                <p>
                  Over time, you're not just measuring culture—you're steering it.
                </p>
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

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
                {/* Card 1 */}
                <a
                  href="/culture-science/ali/dashboard"
                  onClick={(e) => handleLinkClick(e, '/culture-science/ali/dashboard')}
                  className="bg-white p-6 sm:p-8 rounded-lg border-2 border-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white transition-all duration-300 group block"
                >
                  <h3 className="text-xl sm:text-2xl font-bold mb-3 group-hover:text-white text-[#1A1A1A]">
                    The Dashboard
                  </h3>
                  <p className="text-base text-[#1A1A1A]/70 group-hover:text-white/80 mb-4">
                    Your leadership navigation instrument.
                  </p>
                  <span className="inline-flex items-center gap-2 font-semibold group-hover:text-white text-[#1A1A1A]">
                    Explore →
                  </span>
                </a>

                {/* Card 2 */}
                <a
                  href="/culture-science/ali/six-leadership-conditions"
                  onClick={(e) => handleLinkClick(e, '/culture-science/ali/six-leadership-conditions')}
                  className="bg-white p-6 sm:p-8 rounded-lg border-2 border-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white transition-all duration-300 group block"
                >
                  <h3 className="text-xl sm:text-2xl font-bold mb-3 group-hover:text-white text-[#1A1A1A]">
                    Six Conditions
                  </h3>
                  <p className="text-base text-[#1A1A1A]/70 group-hover:text-white/80 mb-4">
                    The environmental conditions ALI measures.
                  </p>
                  <span className="inline-flex items-center gap-2 font-semibold group-hover:text-white text-[#1A1A1A]">
                    Explore →
                  </span>
                </a>

                {/* Card 3 */}
                <a
                  href="/culture-science/ali/early-warning"
                  onClick={(e) => handleLinkClick(e, '/culture-science/ali/early-warning')}
                  className="bg-white p-6 sm:p-8 rounded-lg border-2 border-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white transition-all duration-300 group block"
                >
                  <h3 className="text-xl sm:text-2xl font-bold mb-3 group-hover:text-white text-[#1A1A1A]">
                    Early Warning
                  </h3>
                  <p className="text-base text-[#1A1A1A]/70 group-hover:text-white/80 mb-4">
                    How ALI detects drift before damage.
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
}
