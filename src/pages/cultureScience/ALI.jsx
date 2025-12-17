import React from "react";
import SEO from "../../components/SEO";
import ALISubNav from "../../components/ALISubNav";
import FeaturedFAQs from "../../components/FeaturedFAQs";

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
        <section className="bg-white py-16 sm:py-20 md:py-24 lg:py-20">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-5xl mx-auto text-center space-y-8">
              <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl font-bold leading-[0.9] tracking-tight text-[#1A1A1A]">
                The Archetype Leadership Index
              </h1>
              <p className="text-xl sm:text-2xl md:text-3xl leading-relaxed text-[#1A1A1A]/70 font-light">
                Leadership becomes measurable, visible, and directional.
              </p>
              <div className="text-base sm:text-lg md:text-xl leading-relaxed text-[#1A1A1A]/70 max-w-3xl mx-auto space-y-4 pt-4">
                <p>
                  ALI is a leadership diagnostic built to help leaders see the conditions they are creating — long before drift becomes damage.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 2: WHAT ALI IS */}
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
                    What ALI Is
                  </h2>
                </div>
              </div>

              <div className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] space-y-6">
                <p>
                  The Archetype Leadership Index (ALI) is a leadership condition diagnostic designed for small and mid-sized organizations.
                </p>
                <p>
                  Most leadership tools focus on personality, engagement, or sentiment. Those tools tell leaders how people feel — but feelings are unreliable indicators of leadership health.
                </p>
                <p>
                  People can feel good in declining environments. People can feel frustrated in strong ones.
                </p>
                
                {/* Pull quote */}
                <div className="pl-6 sm:pl-8 border-l-4 border-[#C85A3C] my-8">
                  <p className="text-xl sm:text-2xl font-semibold italic text-[#1A1A1A] leading-relaxed">
                    ALI measures the environment leadership creates.
                  </p>
                </div>

                <p>
                  It focuses on clarity, trust, communication, consistency, safety, and emotional tone — the conditions that shape how teams operate day to day. These conditions exist whether they are measured or not. ALI simply makes them visible.
                </p>
                <p>
                  ALI is not a personality test. ALI is not an engagement survey. ALI is not a morale score.
                </p>
                <p className="font-semibold">
                  ALI is a mirror. It shows leaders how their leadership is being experienced — based on impact, not intent.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 3: THE SIX CONDITIONS */}
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

              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] max-w-3xl">
                These conditions are universal. They exist in every organization, regardless of industry, structure, product, or market.
              </p>

              {/* Six condition cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6">
                <div className="bg-white p-6 sm:p-8 border border-[#1A1A1A]/20 shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col items-center gap-4 text-center">
                  <LightbulbIcon />
                  <span className="font-bold text-lg">Clarity</span>
                </div>
                <div className="bg-white p-6 sm:p-8 border border-[#1A1A1A]/20 shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col items-center gap-4 text-center">
                  <ShieldIcon />
                  <span className="font-bold text-lg">Trust</span>
                </div>
                <div className="bg-white p-6 sm:p-8 border border-[#1A1A1A]/20 shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col items-center gap-4 text-center">
                  <MessageCircleIcon />
                  <span className="font-bold text-lg">Communication</span>
                </div>
                <div className="bg-white p-6 sm:p-8 border border-[#1A1A1A]/20 shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col items-center gap-4 text-center">
                  <TargetIcon />
                  <span className="font-bold text-lg">Consistency</span>
                </div>
                <div className="bg-white p-6 sm:p-8 border border-[#1A1A1A]/20 shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col items-center gap-4 text-center">
                  <ShieldCheckIcon />
                  <span className="font-bold text-lg">Safety</span>
                </div>
                <div className="bg-white p-6 sm:p-8 border border-[#1A1A1A]/20 shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col items-center gap-4 text-center">
                  <HeartIcon />
                  <span className="font-bold text-lg">Emotional Tone</span>
                </div>
              </div>

              <div className="max-w-3xl">
                <a
                  href="/culture-science/ali/six-leadership-conditions"
                  onClick={(e) => handleLinkClick(e, '/culture-science/ali/six-leadership-conditions')}
                  className="inline-flex items-center gap-2 font-semibold text-[#1A1A1A] hover:text-[#C85A3C] transition-colors"
                >
                  Explore each condition in detail →
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 4: WHY MEASURING FEELINGS ISN'T ENOUGH */}
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
                    Why Measuring Feelings Isn't Enough
                  </h2>
                </div>
              </div>

              <div className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] space-y-6">
                <p>
                  Most leadership assessments focus on personality, sentiment, or engagement.
                </p>
                <p>
                  None of those give leaders what they actually need:
                </p>
                
                {/* Pull quote */}
                <div className="pl-6 sm:pl-8 border-l-4 border-[#C85A3C] my-8">
                  <p className="text-xl sm:text-2xl font-semibold italic text-[#1A1A1A] leading-relaxed">
                    A reliable way to measure the leadership conditions that create culture.
                  </p>
                </div>

                <p>
                  The ALI Method is not a survey. It is not a personality index. It is not a morale tool.
                </p>
                <p>
                  It is a leadership condition diagnostic engineered specifically for small and mid-sized teams — environments where behavior, decisions, tone, and clarity move fast and affect people immediately.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 5: HOW LEADERS USE ALI */}
        <section className="bg-white py-16 sm:py-24 md:py-32">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-3xl mx-auto space-y-8">
              {/* Numbered section header */}
              <div className="relative">
                <div className="absolute -top-8 -left-4 text-8xl sm:text-9xl font-serif font-bold text-[#1A1A1A]/5 pointer-events-none">
                  04
                </div>
                <div className="relative z-10">
                  <h2 className="font-serif font-bold text-3xl sm:text-4xl md:text-5xl text-[#1A1A1A] mb-6">
                    How Leaders Use ALI
                  </h2>
                </div>
              </div>

              <div className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] space-y-6">
                <p>
                  Leaders use ALI to:
                </p>
                <ul className="list-none space-y-2 pl-6">
                  <li className="flex items-start gap-3">
                    <span className="text-[#C85A3C] mt-1 flex-shrink-0">→</span>
                    <span className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]/70">identify drift before it becomes conflict</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-[#C85A3C] mt-1 flex-shrink-0">→</span>
                    <span className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]/70">stabilize communication</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-[#C85A3C] mt-1 flex-shrink-0">→</span>
                    <span className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]/70">reinforce clarity</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-[#C85A3C] mt-1 flex-shrink-0">→</span>
                    <span className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]/70">understand emotional tone impact</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-[#C85A3C] mt-1 flex-shrink-0">→</span>
                    <span className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]/70">strengthen trust</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-[#C85A3C] mt-1 flex-shrink-0">→</span>
                    <span className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]/70">maintain consistency under pressure</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-[#C85A3C] mt-1 flex-shrink-0">→</span>
                    <span className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]/70">lead with intention instead of reaction</span>
                  </li>
                </ul>
                <p className="font-semibold pt-4">
                  They finally have a way to see leadership with accuracy and take action with confidence.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 6: THE ALI PILOT - DARK SECTION */}
        <section className="bg-[#1A1A1A] py-16 sm:py-24 md:py-32">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-3xl mx-auto space-y-8">
              {/* Numbered section header */}
              <div className="relative">
                <div className="absolute -top-8 -left-4 text-8xl sm:text-9xl font-serif font-bold text-white/5 pointer-events-none">
                  05
                </div>
                <div className="relative z-10">
                  <h2 className="font-serif font-bold text-3xl sm:text-4xl md:text-5xl text-white mb-6">
                    The ALI Pilot
                  </h2>
                </div>
              </div>

              <div className="text-base sm:text-lg leading-relaxed text-white/80 space-y-6">
                <p className="font-semibold text-white">
                  ALI is currently in pilot.
                </p>
                <p>
                  Participation begins with a short, 10-question survey designed to seed the system with real data.
                </p>
                <p>
                  This early phase is about proving direction, validating signal strength, and refining interpretation.
                </p>

                {/* Pilot details card */}
                <div className="bg-white/10 p-6 sm:p-8 border-l-4 border-[#C85A3C] my-8">
                  <p className="font-bold text-xl text-white mb-4">Pilot details:</p>
                  <ul className="space-y-3 text-white/80">
                    <li><strong className="text-white">$99.99 annual access</strong></li>
                    <li>No monthly option</li>
                    <li><strong className="text-white">25% lifetime discount</strong> for pilot participants</li>
                    <li>First 20 primary users receive an <strong className="text-white">"I Am Second."</strong> AO tee</li>
                  </ul>
                </div>

                <p>
                  The database matters. The insight grows with every record. This system is being built to last.
                </p>

                <div className="pt-4">
                  <a
                    href="/culture-science/ali/apply"
                    onClick={(e) => handleLinkClick(e, '/culture-science/ali/apply')}
                    className="inline-block px-8 sm:px-10 py-4 sm:py-5 bg-white text-[#1A1A1A] font-medium text-sm sm:text-base hover:bg-[#C85A3C] hover:text-white transition-colors"
                  >
                    Apply for the Pilot
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 7: CTA - EXPLORE ALI */}
        <section className="bg-white py-16 sm:py-24 md:py-32">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-4xl mx-auto space-y-12">
              <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-[#1A1A1A] text-center mb-12">
                Explore ALI
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Card 1 */}
                <a
                  href="/culture-science/ali/why-ali-exists"
                  onClick={(e) => handleLinkClick(e, '/culture-science/ali/why-ali-exists')}
                  className="bg-white p-6 rounded-lg border-2 border-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white transition-all duration-300 group block"
                >
                  <h3 className="text-lg font-bold mb-2 group-hover:text-white text-[#1A1A1A]">
                    Why ALI Exists
                  </h3>
                  <p className="text-sm text-[#1A1A1A]/70 group-hover:text-white/80 mb-3">
                    The personal motivation behind building ALI.
                  </p>
                  <span className="inline-flex items-center gap-2 font-semibold text-sm group-hover:text-white text-[#1A1A1A]">
                    Explore →
                  </span>
                </a>

                {/* Card 2 */}
                <a
                  href="/culture-science/ali/method"
                  onClick={(e) => handleLinkClick(e, '/culture-science/ali/method')}
                  className="bg-white p-6 rounded-lg border-2 border-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white transition-all duration-300 group block"
                >
                  <h3 className="text-lg font-bold mb-2 group-hover:text-white text-[#1A1A1A]">
                    The Method
                  </h3>
                  <p className="text-sm text-[#1A1A1A]/70 group-hover:text-white/80 mb-3">
                    How leadership conditions become measurable.
                  </p>
                  <span className="inline-flex items-center gap-2 font-semibold text-sm group-hover:text-white text-[#1A1A1A]">
                    Explore →
                  </span>
                </a>

                {/* Card 3 */}
                <a
                  href="/culture-science/ali/dashboard"
                  onClick={(e) => handleLinkClick(e, '/culture-science/ali/dashboard')}
                  className="bg-white p-6 rounded-lg border-2 border-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white transition-all duration-300 group block"
                >
                  <h3 className="text-lg font-bold mb-2 group-hover:text-white text-[#1A1A1A]">
                    The Dashboard
                  </h3>
                  <p className="text-sm text-[#1A1A1A]/70 group-hover:text-white/80 mb-3">
                    Your leadership navigation instrument.
                  </p>
                  <span className="inline-flex items-center gap-2 font-semibold text-sm group-hover:text-white text-[#1A1A1A]">
                    Explore →
                  </span>
                </a>

                {/* Card 4 */}
                <a
                  href="/culture-science/ali/early-warning"
                  onClick={(e) => handleLinkClick(e, '/culture-science/ali/early-warning')}
                  className="bg-white p-6 rounded-lg border-2 border-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white transition-all duration-300 group block"
                >
                  <h3 className="text-lg font-bold mb-2 group-hover:text-white text-[#1A1A1A]">
                    Early Warning
                  </h3>
                  <p className="text-sm text-[#1A1A1A]/70 group-hover:text-white/80 mb-3">
                    How ALI detects drift before damage.
                  </p>
                  <span className="inline-flex items-center gap-2 font-semibold text-sm group-hover:text-white text-[#1A1A1A]">
                    Explore →
                  </span>
                </a>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
                <a
                  href="/culture-science/ali/apply"
                  onClick={(e) => handleLinkClick(e, '/culture-science/ali/apply')}
                  className="px-8 sm:px-10 py-4 sm:py-5 bg-[#1A1A1A] text-white font-medium text-sm sm:text-base hover:bg-[#1A1A1A]/90 transition-colors text-center"
                >
                  Apply for the Pilot
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

        {/* Featured FAQs Section */}
        <FeaturedFAQs pageKey="ali" limit={5} showViewAll={true} />

      </main>
    </>
  );
}
