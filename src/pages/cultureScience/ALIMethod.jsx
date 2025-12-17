import React from "react";
import SEO from "../../components/SEO";
import ALISubNav from "../../components/ALISubNav";

// Section header with orange left border
const SectionHeader = ({ children }) => (
  <div className="flex items-start gap-4 sm:gap-6">
    <div className="w-1 h-12 sm:h-16 bg-[#C85A3C] flex-shrink-0 mt-2"></div>
    <h2 className="font-serif font-bold text-2xl sm:text-3xl md:text-4xl text-[#1A1A1A]">
      {children}
    </h2>
  </div>
);

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
        <section className="bg-white py-20 sm:py-28 md:py-32">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-3xl mx-auto text-center space-y-6">
              <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-bold leading-tight tracking-tight text-[#1A1A1A]">
                The ALI Method
              </h1>
              <p className="text-lg sm:text-xl leading-relaxed text-[#1A1A1A]/70">
                How leadership conditions become measurable, trackable, and directional.
              </p>
            </div>
          </div>
        </section>

        {/* SECTION 2: INTRODUCTION */}
        <section className="bg-[#FAFAF9] py-16 sm:py-24 md:py-32">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-3xl mx-auto space-y-6 text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
              <p>
                The ALI Method is built on three pillars:
              </p>
              <div className="pl-6 space-y-1 font-semibold">
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
              <SectionHeader>1. Environmental Measurement</SectionHeader>
              <div className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] space-y-6">
                <p>
                  A quarterly pulse that measures conditions, not emotions.
                </p>
                <p>
                  The ALI diagnostic consists of 10 precise questions designed to reveal the state of six leadership conditions:
                </p>
                <div className="pl-6 space-y-1 italic text-[#1A1A1A]/70">
                  <p>Clarity</p>
                  <p>Trust</p>
                  <p>Communication</p>
                  <p>Consistency</p>
                  <p>Safety</p>
                  <p>Emotional Tone</p>
                </div>
                <p>
                  Each question has been refined to expose behavioral reality, not preference or sentiment.
                </p>
                <p>
                  This matters because:
                </p>
                <div className="pl-6 space-y-2 text-[#1A1A1A]/70">
                  <p>People can be frustrated yet still operating in a strong environment.</p>
                  <p>People can feel "good" while important conditions are declining.</p>
                  <p>Leaders cannot rely on emotional feedback to diagnose environmental truth.</p>
                </div>
                <p>
                  The ALI Method focuses on observable environmental signals, not individual feelings.
                </p>
                <p>
                  Every question is engineered to cut through perception and reveal:
                </p>
                <div className="pl-6 space-y-1 italic text-[#1A1A1A]/70">
                  <p>how people are experiencing leadership behavior</p>
                  <p>whether conditions are strengthening or weakening</p>
                  <p>where friction is emerging</p>
                  <p>what signals are forming under the surface</p>
                </div>
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
        <section className="bg-[#FAFAF9] py-16 sm:py-24 md:py-32">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-3xl mx-auto space-y-8">
              <SectionHeader>2. Pattern Detection</SectionHeader>
              <div className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] space-y-6">
                <p>
                  Isolated data points don't mean anything. Patterns do.
                </p>
                <p>
                  Leadership conditions don't change all at once.
                </p>
                <p>
                  They drift.
                </p>
                <p>
                  Drift appears as:
                </p>
                <div className="pl-6 space-y-1 italic text-[#1A1A1A]/70">
                  <p>small inconsistencies in how leaders communicate</p>
                  <p>subtle changes in clarity</p>
                  <p>slight shifts in emotional tone</p>
                  <p>early signs of avoidance</p>
                  <p>mild softening of standards</p>
                  <p>tiny distortions in information flow</p>
                </div>
                <p>
                  Individually, none of these seem alarming.
                </p>
                <p>
                  But together, they signal a directional movement.
                </p>
                <p>
                  The ALI Method is built to detect this movement through:
                </p>
                <div className="pl-6 space-y-1 italic text-[#1A1A1A]/70">
                  <p>quarterly comparison</p>
                  <p>pattern mapping</p>
                  <p>drift thresholds</p>
                  <p>condition-to-condition relationships</p>
                  <p>underlying signal correlation</p>
                  <p>historical trend data</p>
                </div>
                <p>
                  ALI doesn't treat a measurement as "good" or "bad."
                </p>
                <p>
                  It treats it as directional:
                </p>
                <div className="pl-6 space-y-1 italic text-[#1A1A1A]/70">
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
              <SectionHeader>3. Directional Insight</SectionHeader>
              <div className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] space-y-6">
                <p>
                  Where culture is actually going — not where it feels like it is today.
                </p>
                <p>
                  The ALI Method combines environmental measurement and pattern detection to produce insight leaders rarely get:
                </p>
                <p>
                  visibility into where the culture is heading if nothing changes.
                </p>
                <p>
                  This includes:
                </p>

                {/* Subsections */}
                <div className="space-y-4">
                  <p><strong>Strengthening Conditions</strong></p>
                  <p>Where leadership behavior is stabilizing the environment.</p>
                </div>

                <div className="space-y-4">
                  <p><strong>Weakening Conditions</strong></p>
                  <p>Where drift is forming and why.</p>
                </div>

                <div className="space-y-4">
                  <p><strong>Emerging Signals</strong></p>
                  <p>Which early warning indicators are beginning to surface.</p>
                </div>

                <div className="space-y-4">
                  <p><strong>Stability vs. Volatility</strong></p>
                  <p>Which areas remain reliable and which fluctuate under pressure.</p>
                </div>

                <div className="space-y-4">
                  <p><strong>Environmental Direction</strong></p>
                  <p>The forward trajectory of leadership influence.</p>
                </div>

                <p>
                  The ALI Method shifts leaders from:
                </p>
                <div className="pl-6 italic text-[#1A1A1A]/70">
                  <p>"Do people feel good right now?"</p>
                </div>
                <p>
                  To:
                </p>
                <div className="pl-6 space-y-1 italic text-[#1A1A1A]/70">
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

        {/* SECTION 6: HOW THE QUARTERLY CYCLE WORKS */}
        <section className="bg-[#FAFAF9] py-16 sm:py-24 md:py-32">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-3xl mx-auto space-y-8">
              <SectionHeader>How the ALI Quarterly Cycle Works</SectionHeader>
              <div className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] space-y-6">
                <p>
                  Every quarter, your team receives a 10-question pulse. It takes 10 minutes. The questions don't ask how people feel—they ask what people are experiencing. The data flows in clean, consistent, and anonymous.
                </p>
                <p>
                  ALI then translates that data into condition strength across all six leadership conditions: Clarity, Accountability, Safety, Consistency, Recognition, and Direction. It calculates not just where each condition sits right now, but which direction it's moving and how quickly.
                </p>
                <p>
                  By the end of the third quarter, ALI has enough data to reveal patterns over time. That's when you stop seeing snapshots and start seeing trajectory: Is this condition stable? Drifting? Correcting? Continuing to strengthen?
                </p>
                <p>
                  Leaders review their dashboard—not a survey report, but a navigation instrument. You see current condition levels, direction of change, underlying early warning indicators, and environmental interpretation that explains what the data actually means.
                </p>
                <p>
                  Archy steps in here as your interpretive engine. He breaks the dashboard down into plain language: what it means, why it matters, what it suggests, how it connects to specific leadership behaviors, and what you might consider next. This isn't automation—it's intelligence applied to your context.
                </p>
                <p>
                  Then you choose. ALI doesn't prescribe programs or force you down predetermined paths. It reveals truth so you can make intentional, aligned decisions about where to focus next. You act. The next quarter begins. The cycle repeats.
                </p>
                <p>
                  Over time, you're not just measuring culture—you're steering it. Quarter by quarter, adjustment by adjustment, you build the leadership environment your team deserves.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 7: NAVIGATION LINKS */}
        <section className="bg-white py-16 sm:py-24">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-3xl mx-auto">
              <p className="text-base sm:text-lg text-[#1A1A1A]/70">
                Explore{' '}
                <a 
                  href="/culture-science/ali/dashboard" 
                  onClick={(e) => handleLinkClick(e, '/culture-science/ali/dashboard')}
                  className="text-[#1A1A1A] underline hover:text-[#C85A3C] transition-colors"
                >
                  The Dashboard
                </a>,{' '}
                <a 
                  href="/culture-science/ali/six-leadership-conditions" 
                  onClick={(e) => handleLinkClick(e, '/culture-science/ali/six-leadership-conditions')}
                  className="text-[#1A1A1A] underline hover:text-[#C85A3C] transition-colors"
                >
                  The Six Leadership Conditions
                </a>, or{' '}
                <a 
                  href="/culture-science/ali/early-warning-indicators" 
                  onClick={(e) => handleLinkClick(e, '/culture-science/ali/early-warning-indicators')}
                  className="text-[#1A1A1A] underline hover:text-[#C85A3C] transition-colors"
                >
                  Early Warning Indicators
                </a>.
              </p>
              <p className="text-base sm:text-lg text-[#1A1A1A]/70 mt-4">
                Or return to the{' '}
                <a 
                  href="/culture-science/ali" 
                  onClick={(e) => handleLinkClick(e, '/culture-science/ali')}
                  className="text-[#1A1A1A] underline hover:text-[#C85A3C] transition-colors"
                >
                  ALI overview
                </a>.
              </p>
            </div>
          </div>
        </section>

      </main>
    </>
  );
}

