import React from 'react';
import ALISubNav from '../../components/ALISubNav';

const ALISixConditions = () => {
  const conditions = [
    {
      number: 1,
      title: "Clarity",
      definition: "How clearly expectations, priorities, and direction are communicated and understood.",
      strong: [
        "People know what is expected of them",
        "Priorities are clear and consistent",
        "Direction feels stable and understood",
        "Decisions make sense in context",
        "Teams operate with alignment"
      ],
      weak: [
        "Expectations feel vague or shifting",
        "Priorities seem unclear or contradictory",
        "Direction changes without explanation",
        "Decisions feel arbitrary or confusing",
        "Teams operate with uncertainty"
      ],
      whyItMatters: "Clarity is the foundation of functional work. When it weakens, everything downstream compounds — confusion, misalignment, frustration, and wasted effort all multiply. Restoring clarity requires intentional communication and consistent follow-through."
    },
    {
      number: 2,
      title: "Trust",
      definition: "The perceived reliability, consistency, and integrity of leadership behavior over time.",
      strong: [
        "Leaders follow through on commitments",
        "Decisions feel fair and consistent",
        "Information is shared openly",
        "People believe leadership has their back",
        "Trust allows for honest feedback"
      ],
      weak: [
        "Commitments feel unreliable",
        "Decisions feel inconsistent or political",
        "Information feels withheld or filtered",
        "People question leadership intentions",
        "Feedback becomes guarded or strategic"
      ],
      whyItMatters: "Trust is slow to build and fast to lose. When it erodes, teams become cautious, political, and self-protective. Rebuilding trust requires sustained consistency, transparency, and reliability — not declarations or apologies."
    },
    {
      number: 3,
      title: "Communication",
      definition: "How information flows — accessibility, transparency, frequency, and quality of exchange.",
      strong: [
        "Information flows freely and transparently",
        "Leaders are accessible and responsive",
        "Updates are frequent and consistent",
        "Communication feels honest and direct",
        "People feel informed and included"
      ],
      weak: [
        "Information feels controlled or filtered",
        "Leaders feel distant or unavailable",
        "Updates are sporadic or vague",
        "Communication feels guarded or political",
        "People feel out of the loop"
      ],
      whyItMatters: "Communication determines how aligned teams can be. When communication compresses, misalignment grows, rumors fill gaps, and trust thins. Strengthening communication requires intentional frequency, accessibility, and transparency."
    },
    {
      number: 4,
      title: "Consistency",
      definition: "The predictability and reliability of leadership decisions, follow-through, and standards.",
      strong: [
        "Standards are clear and reliably enforced",
        "Follow-through is consistent",
        "Decisions feel predictable and fair",
        "Expectations remain stable",
        "Leadership behavior is reliable"
      ],
      weak: [
        "Standards shift without explanation",
        "Follow-through is inconsistent",
        "Decisions feel unpredictable or reactive",
        "Expectations change frequently",
        "Leadership behavior feels erratic"
      ],
      whyItMatters: "Consistency creates psychological safety. When leadership becomes inconsistent, teams lose confidence, second-guess decisions, and stop trusting what they are told. Restoring consistency requires sustained reliability, not just short-term correction."
    },
    {
      number: 5,
      title: "Safety",
      definition: "Whether people feel secure enough to speak honestly, take risks, and surface problems.",
      strong: [
        "People speak honestly without fear",
        "Problems are surfaced early",
        "Feedback flows freely",
        "Risk-taking is encouraged",
        "Mistakes are treated as learning"
      ],
      weak: [
        "People withhold concerns",
        "Problems are hidden until critical",
        "Feedback becomes guarded",
        "Risk-taking is avoided",
        "Mistakes are punished or feared"
      ],
      whyItMatters: "Safety determines whether teams can function adaptively. Without it, problems go underground, innovation stops, and dysfunction compounds quietly. Building safety requires leaders to reward honesty, handle feedback well, and respond to mistakes with curiosity instead of punishment."
    },
    {
      number: 6,
      title: "Emotional Tone",
      definition: "The underlying emotional climate leadership creates — supportive, tense, neutral, or guarded.",
      strong: [
        "The environment feels supportive",
        "Pressure is managed constructively",
        "Stress is acknowledged and addressed",
        "Tone remains stable under challenge",
        "People feel energized, not drained"
      ],
      weak: [
        "The environment feels tense or cold",
        "Pressure creates compression or anxiety",
        "Stress is ignored or dismissed",
        "Tone shifts unpredictably under pressure",
        "People feel exhausted or guarded"
      ],
      whyItMatters: "Emotional tone shapes how sustainable work is. When tone becomes tense or unstable, people disengage, burn out, or leave. Leaders often underestimate how much their emotional presence affects the environment. Strengthening tone requires awareness, regulation, and consistency."
    }
  ];

  const conditionInteractions = [
    "When clarity weakens, trust begins to thin",
    "When communication compresses, safety contracts",
    "When consistency erodes, emotional tone destabilizes",
    "When trust is damaged, communication becomes guarded",
    "When safety disappears, problems go underground",
    "When emotional tone shifts, all other conditions feel the strain"
  ];

  return (
    <>
      <ALISubNav />
      <main className="min-h-screen">
        {/* SECTION 1: HERO */}
        <section className="bg-white py-16 sm:py-20 md:py-24 lg:py-20">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-5xl mx-auto text-center space-y-8">
              <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl font-bold leading-[0.9] tracking-tight text-[#1A1A1A]">
                The Six Leadership Conditions
              </h1>
              <p className="text-xl sm:text-2xl md:text-3xl leading-relaxed text-[#1A1A1A]/70 font-light">
                The environmental conditions that leadership creates, maintains, or allows to drift.
              </p>
            </div>
          </div>
        </section>

        {/* SECTION 2: INTRODUCTION */}
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
                    What Leadership Conditions Are
                  </h2>
                </div>
              </div>

              <div className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] space-y-6">
                <p>Leadership conditions are not personality traits.</p>
                <p>
                  They are environmental realities — the conditions that leadership creates through behavior, communication, decision-making, and presence.
                </p>
                <p>These conditions exist whether they are measured or not.</p>
                <p>
                  They shape how people experience work, how teams function under pressure, how trust forms or erodes, and how culture either strengthens or drifts over time.
                </p>
                <p>
                  ALI measures six core leadership conditions because these six dimensions capture the environmental foundation that everything else rests on.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 3: THE SIX CONDITIONS */}
        <section className="bg-white py-16 sm:py-24 md:py-32">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-6xl mx-auto space-y-16">
              {/* Numbered section header */}
              <div className="relative max-w-3xl">
                <div className="absolute -top-8 -left-4 text-8xl sm:text-9xl font-serif font-bold text-[#1A1A1A]/5 pointer-events-none">
                  02
                </div>
                <div className="relative z-10">
                  <h2 className="font-serif font-bold text-3xl sm:text-4xl md:text-5xl text-[#1A1A1A] mb-6">
                    The Six Conditions
                  </h2>
                </div>
              </div>

              {/* Six condition cards */}
              <div className="space-y-16">
                {conditions.map((condition) => (
                  <div
                    key={condition.number}
                    className="bg-white rounded-lg border border-[#1A1A1A]/20 shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300"
                  >
                    {/* Gradient header with large number */}
                    <div className="bg-gradient-to-br from-[#FFF8F0] to-white p-6 sm:p-8 relative">
                      <div className="absolute top-4 right-4 text-7xl sm:text-8xl font-serif font-bold text-[#1A1A1A]/5">
                        {condition.number}
                      </div>

                      <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-[#C85A3C] text-white text-lg font-bold mb-4">
                        {condition.number}
                      </div>

                      <h3 className="text-2xl sm:text-3xl font-bold text-[#1A1A1A] relative z-10">
                        {condition.title}
                      </h3>
                    </div>

                    {/* Four orange stripe borders */}
                    <div className="flex gap-1 px-6">
                      <div className="h-1 flex-1 bg-[#C85A3C]"></div>
                      <div className="h-1 flex-1 bg-[#C85A3C]"></div>
                      <div className="h-1 flex-1 bg-[#C85A3C]"></div>
                      <div className="h-1 flex-1 bg-[#C85A3C]"></div>
                    </div>

                    {/* Content area */}
                    <div className="p-6 sm:p-8 space-y-6">
                      {/* Definition */}
                      <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                        {condition.definition}
                      </p>

                      {/* Two-column comparison grid */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
                        {/* Strong column */}
                        <div className="space-y-3">
                          <h4 className="font-bold text-lg text-[#1A1A1A] mb-4">When Strong:</h4>
                          <ul className="list-none space-y-2">
                            {condition.strong.map((item, idx) => (
                              <li key={idx} className="flex items-start gap-3">
                                <span className="text-[#C85A3C] mt-1 flex-shrink-0">✓</span>
                                <span className="text-base leading-relaxed text-[#1A1A1A]/70">{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Weak column */}
                        <div className="space-y-3">
                          <h4 className="font-bold text-lg text-[#1A1A1A] mb-4">When Weak:</h4>
                          <ul className="list-none space-y-2">
                            {condition.weak.map((item, idx) => (
                              <li key={idx} className="flex items-start gap-3">
                                <span className="text-[#1A1A1A]/30 mt-1 flex-shrink-0">×</span>
                                <span className="text-base leading-relaxed text-[#1A1A1A]/70">{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {/* Why It Matters */}
                      <div className="pt-4 border-t border-[#1A1A1A]/10">
                        <h4 className="font-bold text-lg text-[#1A1A1A] mb-3">Why It Matters:</h4>
                        <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]/70">
                          {condition.whyItMatters}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 4: HOW CONDITIONS WORK TOGETHER */}
        <section className="bg-[#1A1A1A] py-16 sm:py-24 md:py-32">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-3xl mx-auto space-y-8">
              {/* Numbered section header */}
              <div className="relative">
                <div className="absolute -top-8 -left-4 text-8xl sm:text-9xl font-serif font-bold text-white/5 pointer-events-none">
                  03
                </div>
                <div className="relative z-10">
                  <h2 className="font-serif font-bold text-3xl sm:text-4xl md:text-5xl text-white mb-6">
                    How Conditions Work Together
                  </h2>
                </div>
              </div>

              <div className="text-base sm:text-lg leading-relaxed text-white/80 space-y-6">
                <p>These six conditions do not operate independently.</p>
                <p>They interact, reinforce, and influence each other in continuous feedback loops.</p>

                <ul className="list-none space-y-3 pl-6">
                  {conditionInteractions.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <span className="text-[#C85A3C] mt-1 flex-shrink-0">→</span>
                      <span className="text-base sm:text-lg leading-relaxed text-white/80">{item}</span>
                    </li>
                  ))}
                </ul>

                <p>Leaders rarely see these connections in real time.</p>
                <p>
                  They experience the symptoms — tension, disengagement, confusion — without understanding the structural relationships beneath them.
                </p>
                <p>
                  ALI reveals these connections by measuring all six conditions simultaneously and showing how they move together over time.
                </p>
                <p>This is why isolated fixes rarely work.</p>
                <p>
                  Strengthening one condition while ignoring the others just redistributes the dysfunction.
                </p>
                <p>Real improvement requires seeing the system — and leading systemically.</p>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 5: CTA - GO DEEPER */}
        <section className="bg-white py-16 sm:py-24 md:py-32">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-4xl mx-auto space-y-12">
              <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-[#1A1A1A] text-center mb-12">
                Go Deeper
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
                {/* Card 1 */}
                <a
                  href="/culture-science/ali/dashboard"
                  onClick={(e) => { e.preventDefault(); window.history.pushState({}, '', '/culture-science/ali/dashboard'); window.dispatchEvent(new PopStateEvent('popstate')); window.scrollTo({ top: 0, behavior: 'instant' }); }}
                  className="bg-white p-6 sm:p-8 rounded-lg border-2 border-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white transition-all duration-300 group block"
                >
                  <h3 className="text-xl sm:text-2xl font-bold mb-3 group-hover:text-white text-[#1A1A1A]">
                    The Dashboard
                  </h3>
                  <p className="text-base sm:text-lg text-[#1A1A1A]/70 group-hover:text-white/80 mb-4">
                    See how these six conditions are displayed and tracked quarterly in the ALI Dashboard.
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
                    Learn how ALI detects small shifts in these conditions before they become visible problems.
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

export default ALISixConditions;

