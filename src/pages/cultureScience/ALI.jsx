import React from "react";
import SEO from "../../components/SEO";
import ALISubNav from "../../components/ALISubNav";

// Simple icon components (inline SVGs to avoid lucide-react dependency)
const LightbulbIcon = () => (
  <svg className="w-8 h-8 text-[#C85A3C]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
  </svg>
);

const ShieldIcon = () => (
  <svg className="w-8 h-8 text-[#C85A3C]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

const MessageCircleIcon = () => (
  <svg className="w-8 h-8 text-[#C85A3C]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
);

const TargetIcon = () => (
  <svg className="w-8 h-8 text-[#C85A3C]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="6" />
    <circle cx="12" cy="12" r="2" />
  </svg>
);

const ShieldCheckIcon = () => (
  <svg className="w-8 h-8 text-[#C85A3C]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

const HeartIcon = () => (
  <svg className="w-8 h-8 text-[#C85A3C]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
  </svg>
);

// Orange bullet list component
const OrangeBulletList = ({ items }) => (
  <ul className="list-none space-y-2 pl-6">
    {items.map((item, idx) => (
      <li key={idx} className="flex items-start gap-3">
        <span className="text-[#C85A3C] mt-1">•</span>
        <span>{item}</span>
      </li>
    ))}
  </ul>
);

// Section header with orange left border
const SectionHeader = ({ children }) => (
  <div className="flex items-start gap-4 sm:gap-6">
    <div className="w-1 h-12 sm:h-16 bg-[#C85A3C] flex-shrink-0 mt-2"></div>
    <h2 className="font-serif font-bold text-3xl sm:text-4xl md:text-5xl text-[#1A1A1A]">
      {children}
    </h2>
  </div>
);

// Orange-bordered callout card
const CalloutCard = ({ title, description }) => (
  <div className="bg-[#FAFAF9] p-6 sm:p-8 border-l-[6px] border-[#C85A3C]">
    <h3 className="text-lg sm:text-xl font-bold text-[#1A1A1A] mb-2">{title}</h3>
    <p className="text-base sm:text-lg text-[#1A1A1A]/70">{description}</p>
  </div>
);

export default function ALI() {
  const handleLinkClick = (e, href) => {
    e.preventDefault();
    window.history.pushState({}, '', href);
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  return (
    <>
      <SEO pageKey="ali" />
      <ALISubNav />
      <main className="min-h-screen">
        
        {/* SECTION 1: HERO */}
        <section className="bg-white py-32 sm:py-40 md:py-48">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-4xl mx-auto text-center space-y-8">
              <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold leading-tight tracking-tight text-[#1A1A1A]">
                The Archetype Leadership Index (ALI)
              </h1>
              <p className="text-xl sm:text-2xl md:text-3xl leading-relaxed text-[#1A1A1A] font-semibold">
                Leadership becomes measurable, visible, and directional.
              </p>
              <div className="text-base sm:text-lg md:text-xl leading-relaxed text-[#1A1A1A]/70 max-w-3xl mx-auto space-y-4 pt-4">
                <p>
                  ALI is a leadership diagnostic built to help leaders see the conditions they are creating — long before drift becomes damage.
                </p>
                <p>
                  It does not measure how people feel.
                </p>
                <p>
                  It measures why people experience leadership the way they do, and what those conditions are forming over time.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 2: WHAT ALI IS */}
        <section className="bg-[#FAFAF9] py-16 sm:py-24 md:py-32">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-4xl mx-auto space-y-6 text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
              <p>
                The Archetype Leadership Index (ALI) is a leadership condition diagnostic designed for small and mid-sized organizations.
              </p>
              <p>
                Most leadership tools focus on personality, engagement, or sentiment. Those tools tell leaders how people feel — but feelings are unreliable indicators of leadership health.
              </p>
              <p>
                People can feel good in declining environments.
              </p>
              <p>
                People can feel frustrated in strong ones.
              </p>
              <p className="font-bold text-xl sm:text-2xl">
                ALI measures the environment leadership creates.
              </p>
              <p>
                It focuses on clarity, trust, communication, consistency, safety, and emotional tone — the conditions that shape how teams operate day to day. These conditions exist whether they are measured or not. ALI simply makes them visible.
              </p>
              <p>
                ALI is not a personality test.
              </p>
              <p>
                ALI is not an engagement survey.
              </p>
              <p>
                ALI is not a morale score.
              </p>
              <p className="font-bold text-xl sm:text-2xl">
                ALI is a mirror. It shows leaders how their leadership is being experienced — based on impact, not intent.
              </p>
              <p>
                This visibility gives leaders something rare: the ability to act early, intentionally, and with clarity.
              </p>
            </div>
          </div>
        </section>

        {/* SECTION 3: WHY I'M BUILDING ALI */}
        <section className="bg-white py-16 sm:py-24 md:py-32">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-4xl mx-auto space-y-8">
              <SectionHeader>Why I'm Building ALI</SectionHeader>
              <div className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] space-y-6">
                <p>
                  ALI is the next chapter of a career spent building companies, strengthening people, and changing cultures in ways that helped teams do their best work together.
                </p>
                <p>
                  Across decades of leadership, one truth kept repeating:
                </p>
                <div className="pl-6 space-y-1 font-semibold">
                  <p>Leadership creates conditions.</p>
                  <p>Conditions create culture.</p>
                  <p>Culture creates outcomes.</p>
                </div>
                <p>
                  Most leaders never see these conditions clearly. They feel symptoms — tension, confusion, misalignment — without understanding the structure beneath them or how early the signals appear.
                </p>
                <p className="font-bold text-xl sm:text-2xl">
                  ALI was built to solve that problem.
                </p>
                <p>
                  This work is grounded in lived experience, supported by real patterns and real data. I also come from a software background. ALI was architected, mapped, pressure-tested, and designed as a system — not an idea wrapped in technology.
                </p>
                <p className="font-semibold">
                  Everything that came before this prepared me to build ALI.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 4: WHY MEASURING FEELINGS ISN'T ENOUGH */}
        <section className="bg-[#FAFAF9] py-16 sm:py-24 md:py-32">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-4xl mx-auto space-y-8">
              <SectionHeader>Why Measuring Feelings Isn't Enough</SectionHeader>
              <div className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] space-y-6">
                <p>
                  Most leadership assessments focus on personality, sentiment, or engagement.
                </p>
                <p>
                  None of those give leaders what they actually need:
                </p>
                <p className="font-bold text-xl sm:text-2xl">
                  a reliable way to measure the leadership conditions that create culture.
                </p>
                <p>
                  The ALI Method is not a survey.
                </p>
                <p>
                  It is not a personality index.
                </p>
                <p>
                  It is not a morale tool.
                </p>
                <p>
                  It is a leadership condition diagnostic engineered specifically for small and mid-sized teams — environments where behavior, decisions, tone, and clarity move fast and affect people immediately.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 5: THE ALI METHOD (HIGH-LEVEL) */}
        <section className="bg-white py-16 sm:py-24 md:py-32">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-4xl mx-auto space-y-8">
              <SectionHeader>The ALI Method (High-Level)</SectionHeader>
              <div className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] space-y-6">
                <p className="font-semibold">
                  The ALI Method is built on three pillars:
                </p>
                <div className="space-y-6">
                  <CalloutCard 
                    title="Environmental Measurement" 
                    description="What leadership creates" 
                  />
                  <CalloutCard 
                    title="Pattern Detection" 
                    description="How those conditions behave over time" 
                  />
                  <CalloutCard 
                    title="Directional Insight" 
                    description="Where culture is actually heading" 
                  />
                </div>
                <p className="font-semibold pt-4">
                  Together, these pillars turn lived experience into actionable visibility.
                </p>
                <p className="font-bold text-xl sm:text-2xl">
                  Leadership becomes visible when conditions are measured over time, not when emotions are sampled in isolation.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 6: WHAT MAKES ALI DIFFERENT */}
        <section className="bg-[#FAFAF9] py-16 sm:py-24 md:py-32">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-4xl mx-auto space-y-8">
              <SectionHeader>What Makes ALI Different</SectionHeader>
              <div className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] space-y-6">
                <p>
                  Most leadership tools tell you how people feel.
                </p>
                <p className="font-bold text-xl sm:text-2xl">
                  ALI tells you why they feel it — and what it means for the future.
                </p>
                <p className="font-semibold">
                  This is not about feelings. Feelings are unreliable signals.
                </p>
                <p>
                  Leaders often believe things are fine when they aren't.
                </p>
                <p>
                  The opposite is true as well.
                </p>
                <p>
                  ALI makes leadership tangible by measuring the conditions that shape experience — not the emotions that react to it.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 7: WHY IT WORKS IN ANY INDUSTRY */}
        <section className="bg-white py-16 sm:py-24 md:py-32">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-4xl mx-auto space-y-8">
              <SectionHeader>Why It Works in Any Industry</SectionHeader>
              <div className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] space-y-6">
                <p>
                  The conditions ALI measures are universal.
                </p>
                
                {/* Six condition icons grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 my-8">
                  <div className="bg-[#FAFAF9] p-4 sm:p-6 text-center font-semibold border border-[#1A1A1A]/10 flex flex-col items-center gap-3">
                    <LightbulbIcon />
                    <span>Clarity is clarity.</span>
                  </div>
                  <div className="bg-[#FAFAF9] p-4 sm:p-6 text-center font-semibold border border-[#1A1A1A]/10 flex flex-col items-center gap-3">
                    <ShieldIcon />
                    <span>Trust is trust.</span>
                  </div>
                  <div className="bg-[#FAFAF9] p-4 sm:p-6 text-center font-semibold border border-[#1A1A1A]/10 flex flex-col items-center gap-3">
                    <MessageCircleIcon />
                    <span>Communication is communication.</span>
                  </div>
                  <div className="bg-[#FAFAF9] p-4 sm:p-6 text-center font-semibold border border-[#1A1A1A]/10 flex flex-col items-center gap-3">
                    <TargetIcon />
                    <span>Consistency is consistency.</span>
                  </div>
                  <div className="bg-[#FAFAF9] p-4 sm:p-6 text-center font-semibold border border-[#1A1A1A]/10 flex flex-col items-center gap-3">
                    <ShieldCheckIcon />
                    <span>Safety is safety.</span>
                  </div>
                  <div className="bg-[#FAFAF9] p-4 sm:p-6 text-center font-semibold border border-[#1A1A1A]/10 flex flex-col items-center gap-3">
                    <HeartIcon />
                    <span>Tone is tone.</span>
                  </div>
                </div>

                <p>
                  These conditions exist in every organization, regardless of industry, structure, product, or market.
                </p>
                <p>
                  They are the foundation of:
                </p>
                <OrangeBulletList items={[
                  "stability",
                  "execution",
                  "alignment",
                  "problem-solving",
                  "innovation",
                  "retention",
                  "leadership credibility"
                ]} />
                <div className="pt-4">
                  <p className="font-bold text-xl sm:text-2xl">
                    ALI doesn't adapt to your industry.
                  </p>
                  <p className="font-bold text-xl sm:text-2xl">
                    It reveals the parts of leadership that transcend industry.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 8: HOW LEADERS USE ALI */}
        <section className="bg-[#FAFAF9] py-16 sm:py-24 md:py-32">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-4xl mx-auto space-y-8">
              <SectionHeader>How Leaders Use ALI</SectionHeader>
              <div className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] space-y-6">
                <p>
                  Leaders use ALI to:
                </p>
                <OrangeBulletList items={[
                  "identify drift before it becomes conflict",
                  "stabilize communication",
                  "reinforce clarity",
                  "understand emotional tone impact",
                  "strengthen trust",
                  "maintain consistency under pressure",
                  "improve decision-making",
                  "align teams faster",
                  "avoid predictable breakdowns",
                  "lead with intention instead of reaction"
                ]} />
                <p className="font-bold text-xl sm:text-2xl pt-4">
                  They finally have a way to see leadership with accuracy and take action with confidence.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 9: THE ALI PILOT */}
        <section className="bg-white py-16 sm:py-24 md:py-32">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-4xl mx-auto space-y-8">
              <SectionHeader>The ALI Pilot</SectionHeader>
              <div className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] space-y-6">
                <p className="font-semibold">
                  ALI is currently in pilot.
                </p>
                <p>
                  Participation begins with a short, 10-question survey designed to seed the system with real data.
                </p>
                <p>
                  This early phase is about proving direction, validating signal strength, and refining interpretation.
                </p>

                {/* Pilot details callout */}
                <div className="bg-[#FAFAF9] p-8 border-l-[6px] border-[#C85A3C] my-8">
                  <p className="font-bold text-xl mb-4">Pilot details:</p>
                  <ul className="space-y-3">
                    <li><strong>$99.99 annual access</strong></li>
                    <li>No monthly option</li>
                    <li><strong>25% lifetime discount</strong> for pilot participants</li>
                    <li>First 20 primary users receive an <strong>"I Am Second."</strong> AO tee</li>
                  </ul>
                </div>

                <p>
                  The database matters.
                </p>
                <p>
                  The insight grows with every record.
                </p>
                <p>
                  This system is being built to last.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 10: FREQUENTLY ASKED QUESTIONS */}
        <section className="bg-[#FAFAF9] py-16 sm:py-24 md:py-32">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-4xl mx-auto space-y-12">
              <SectionHeader>Frequently Asked Questions</SectionHeader>

              {/* FAQ 1 */}
              <div className="space-y-4">
                <h3 className="font-bold text-xl sm:text-2xl text-[#1A1A1A]">
                  What exactly is ALI measuring?
                </h3>
                <div className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] space-y-4">
                  <p>
                    ALI measures the leadership conditions people work inside every day—Clarity, Trust, Communication, Consistency, Safety, and Emotional Tone.
                  </p>
                  <p>
                    These conditions determine:
                  </p>
                  <OrangeBulletList items={[
                    "how teams think",
                    "how they communicate",
                    "how they make decisions",
                    "how they take risks",
                    "how they handle conflict",
                    "how they align",
                    "how they execute"
                  ]} />
                  <p>
                    Most leadership tools measure emotions.
                  </p>
                  <p className="font-semibold">
                    ALI measures the environment leadership creates.
                  </p>
                </div>
              </div>

              {/* FAQ 2 */}
              <div className="space-y-4">
                <h3 className="font-bold text-xl sm:text-2xl text-[#1A1A1A]">
                  How is this different from an engagement survey?
                </h3>
                <div className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] space-y-4">
                  <p>
                    Engagement surveys measure sentiment.
                  </p>
                  <p>
                    ALI measures conditions.
                  </p>
                  <p>
                    Sentiment changes constantly.
                  </p>
                  <p>
                    Conditions form slowly and influence behavior at the foundational level.
                  </p>
                  <p className="font-semibold">
                    Engagement tells you if people are happy.
                  </p>
                  <p className="font-semibold">
                    ALI tells you if the environment is healthy.
                  </p>
                  <p>
                    Those are not the same thing.
                  </p>
                  <p>
                    People can be happy in unhealthy environments.
                  </p>
                  <p>
                    People can be frustrated in healthy ones.
                  </p>
                  <p className="font-semibold">
                    ALI looks deeper — at the structure that actually shapes culture, not the emotions that surface temporarily.
                  </p>
                </div>
              </div>

              {/* FAQ 3 */}
              <div className="space-y-4">
                <h3 className="font-bold text-xl sm:text-2xl text-[#1A1A1A]">
                  Who is ALI built for?
                </h3>
                <div className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] space-y-4">
                  <p>
                    ALI is built for leaders of small and mid-sized organizations — typically 10 to 250 people.
                  </p>
                  <p>
                    This is the environment where:
                  </p>
                  <OrangeBulletList items={[
                    "behavior spreads quickly",
                    "clarity (or the lack of it) is felt immediately",
                    "communication breakdowns affect everyone",
                    "tone is cultural currency",
                    "trust is either built or burned daily"
                  ]} />
                  <p>
                    These organizations are too small to hide leadership problems behind systems — and too large for leaders to see everything clearly from inside the operation.
                  </p>
                  <p className="font-semibold">
                    That's exactly where ALI matters most.
                  </p>
                </div>
              </div>

              {/* FAQ 4 */}
              <div className="space-y-4">
                <h3 className="font-bold text-xl sm:text-2xl text-[#1A1A1A]">
                  How does ALI work with Archy?
                </h3>
                <div className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] space-y-4">
                  <p>
                    ALI provides the data.
                  </p>
                  <p>
                    Archy provides the interpretation.
                  </p>
                  <p>
                    ALI measures the conditions your team is experiencing.
                  </p>
                  <p>
                    Archy translates what those conditions mean — why they matter, how they're forming, where they're heading, and what leaders might consider next.
                  </p>
                  <p>
                    This integration makes ALI actionable.
                  </p>
                  <p className="font-semibold">
                    Data alone doesn't change behavior.
                  </p>
                  <p className="font-semibold">
                    Data + context does.
                  </p>
                </div>
              </div>

              {/* FAQ 5 */}
              <div className="space-y-4">
                <h3 className="font-bold text-xl sm:text-2xl text-[#1A1A1A]">
                  What happens after I complete the pilot survey?
                </h3>
                <div className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] space-y-4">
                  <p>
                    You'll receive a follow-up message within 48 hours with next steps.
                  </p>
                  <p>
                    That includes:
                  </p>
                  <OrangeBulletList items={[
                    "confirmation of your participation",
                    "access details",
                    "timeline for future ALI data collection",
                    "how Archy integration works",
                    "where to ask questions"
                  ]} />
                  <p className="font-semibold">
                    The pilot phase is designed to be collaborative.
                  </p>
                  <p className="font-semibold">
                    You're not just testing a tool — you're helping build it.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 11: CTA / EXPLORE MORE */}
        <section className="bg-white py-16 sm:py-24 md:py-32">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-3xl mx-auto text-center space-y-8">
              <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-[#1A1A1A] leading-tight">
                Explore the Rest of ALI
              </h2>
              <p className="text-lg sm:text-xl leading-relaxed text-[#1A1A1A]/70">
                Use the navigation above to explore the full ALI Method, Early Warning Indicators, the Dashboard, the Six Leadership Conditions, and Archy Integration.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                <a
                  href="/culture-science/ali/method"
                  onClick={(e) => handleLinkClick(e, '/culture-science/ali/method')}
                  className="px-8 sm:px-10 py-4 sm:py-5 bg-[#1A1A1A] text-white font-medium text-sm sm:text-base hover:bg-[#1A1A1A]/90 transition-colors text-center"
                >
                  The ALI Method
                </a>
                <a
                  href="/contact"
                  onClick={(e) => handleLinkClick(e, '/contact')}
                  className="px-8 sm:px-10 py-4 sm:py-5 bg-transparent text-[#1A1A1A] font-medium text-sm sm:text-base border border-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white transition-colors text-center"
                >
                  Start a Conversation
                </a>
              </div>
            </div>
          </div>
        </section>

      </main>
    </>
  );
}
