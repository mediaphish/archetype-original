import React from "react";
import SEO from "../../components/SEO";
import ALISubNav from "../../components/ALISubNav";

export default function ALIEarlyWarning() {
  const handleLinkClick = (e, href) => {
    e.preventDefault();
    window.history.pushState({}, '', href);
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  return (
    <>
      <SEO pageKey="ali-early-warning" />
      <ALISubNav />
      <main className="min-h-screen">
        
        {/* SECTION 1: HERO */}
        <section className="bg-white py-24 sm:py-32 md:py-40 lg:py-48">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-5xl mx-auto text-center space-y-8">
              <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl font-bold leading-[0.9] tracking-tight text-[#1A1A1A]">
                Early Warning Indicators
              </h1>
              <p className="text-xl sm:text-2xl md:text-3xl leading-relaxed text-[#1A1A1A]/70 font-light">
                Seeing drift before it becomes damage.
              </p>
            </div>
          </div>
        </section>

        {/* SECTION 2: WHAT ARE EARLY WARNING INDICATORS */}
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
                    What Are Early Warning Indicators?
                  </h2>
                </div>
              </div>

              <div className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] space-y-6">
                <p>
                  Early warning indicators are small, subtle behavioral shifts that signal larger structural problems forming beneath the surface.
                </p>
                <p>
                  They are not crises. They are not failures.
                </p>
                <p>
                  They are the earliest detectable signs that leadership conditions are beginning to drift.
                </p>
                <p>
                  They show up as:
                </p>
                <ul className="list-none space-y-2 pl-6">
                  <li className="flex items-start gap-3">
                    <span className="text-[#C85A3C] mt-1 flex-shrink-0">→</span>
                    <span className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]/70">rising silence where clarity once existed</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-[#C85A3C] mt-1 flex-shrink-0">→</span>
                    <span className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]/70">small but repeated communication breakdowns</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-[#C85A3C] mt-1 flex-shrink-0">→</span>
                    <span className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]/70">increasing hesitation around decisions</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-[#C85A3C] mt-1 flex-shrink-0">→</span>
                    <span className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]/70">emotional compression or guardedness</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-[#C85A3C] mt-1 flex-shrink-0">→</span>
                    <span className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]/70">inconsistency in expectations or follow-through</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-[#C85A3C] mt-1 flex-shrink-0">→</span>
                    <span className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]/70">subtle avoidance of tension or accountability</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-[#C85A3C] mt-1 flex-shrink-0">→</span>
                    <span className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]/70">distortion in how information moves through the team</span>
                  </li>
                </ul>
                <p>
                  Individually, none of these feel urgent.
                </p>
                <p>
                  Collectively, they tell a clear story.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 3: WHY LEADERS MISS THEM */}
        <section className="bg-white py-16 sm:py-24 md:py-32">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-3xl mx-auto space-y-8">
              {/* Numbered section header */}
              <div className="relative">
                <div className="absolute -top-8 -left-4 text-8xl sm:text-9xl font-serif font-bold text-[#1A1A1A]/5 pointer-events-none">
                  02
                </div>
                <div className="relative z-10">
                  <h2 className="font-serif font-bold text-3xl sm:text-4xl md:text-5xl text-[#1A1A1A] mb-6">
                    Why Leaders Miss Them
                  </h2>
                </div>
              </div>

              <div className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] space-y-6">
                <p>
                  Leaders miss early warning indicators because they are operating inside the system they are trying to see.
                </p>
                <p>
                  From inside the environment:
                </p>
                {/* Poetic/philosophical content - border-left quote style */}
                <div className="pl-6 sm:pl-8 border-l-4 border-[#C85A3C] space-y-2 text-base sm:text-lg leading-relaxed text-[#1A1A1A]/70 italic">
                  <p>Everything feels normal.</p>
                  <p>Teams keep functioning.</p>
                  <p>People adapt.</p>
                  <p>Leaders interpret generously.</p>
                  <p>Momentum continues.</p>
                </div>
                <p>
                  The signals are there — but they don't register as urgent.
                </p>
                <p>
                  By the time they become visible as problems, the damage has already occurred.
                </p>
                <p>
                  Most leadership tools don't measure these indicators at all.
                </p>
                <p>
                  They measure sentiment, engagement, or personality — none of which reveal environmental drift until it's too late.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 4: HOW ALI DETECTS THEM */}
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
                    How ALI Detects Them
                  </h2>
                </div>
              </div>

              <div className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] space-y-6">
                <p>
                  ALI was designed specifically to surface early warning indicators before they compound into visible problems.
                </p>
                <p>
                  It does this through:
                </p>
                <ul className="list-none space-y-2 pl-6">
                  <li className="flex items-start gap-3">
                    <span className="text-[#C85A3C] mt-1 flex-shrink-0">→</span>
                    <span className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]/70">questions engineered to expose behavioral reality, not preference</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-[#C85A3C] mt-1 flex-shrink-0">→</span>
                    <span className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]/70">quarterly measurement that reveals directional movement over time</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-[#C85A3C] mt-1 flex-shrink-0">→</span>
                    <span className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]/70">pattern detection across multiple leadership conditions simultaneously</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-[#C85A3C] mt-1 flex-shrink-0">→</span>
                    <span className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]/70">drift thresholds that identify when small changes are forming into larger trends</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-[#C85A3C] mt-1 flex-shrink-0">→</span>
                    <span className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]/70">condition-to-condition relationship mapping that shows how one area affects another</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-[#C85A3C] mt-1 flex-shrink-0">→</span>
                    <span className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]/70">underlying signal correlation that connects surface behaviors to structural causes</span>
                  </li>
                </ul>
                <p>
                  ALI doesn't wait for people to report problems.
                </p>
                <p>
                  It measures the conditions that create problems — and it does so early enough that leaders can respond before harm occurs.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 5: EARLY INTERVENTION VS. LATE CORRECTION */}
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
                    Early Intervention vs. Late Correction
                  </h2>
                </div>
              </div>

              <div className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] space-y-6">
                <p>
                  There is a fundamental difference between intervening early and correcting late.
                </p>

                {/* Two column comparison */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 my-8">
                  {/* Early intervention */}
                  <div className="bg-[#FAFAF9] p-6 sm:p-8 border-l-4 border-[#C85A3C]">
                    <h3 className="font-bold text-lg text-[#1A1A1A] mb-4">Early Intervention Means:</h3>
                    <ul className="list-none space-y-2">
                      <li className="flex items-start gap-3">
                        <span className="text-[#C85A3C] mt-1 flex-shrink-0">✓</span>
                        <span className="text-base leading-relaxed text-[#1A1A1A]/70">adjusting behavior before trust is damaged</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="text-[#C85A3C] mt-1 flex-shrink-0">✓</span>
                        <span className="text-base leading-relaxed text-[#1A1A1A]/70">clarifying expectations before confusion becomes conflict</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="text-[#C85A3C] mt-1 flex-shrink-0">✓</span>
                        <span className="text-base leading-relaxed text-[#1A1A1A]/70">stabilizing communication before silence becomes permanent</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="text-[#C85A3C] mt-1 flex-shrink-0">✓</span>
                        <span className="text-base leading-relaxed text-[#1A1A1A]/70">reinforcing consistency before standards erode</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="text-[#C85A3C] mt-1 flex-shrink-0">✓</span>
                        <span className="text-base leading-relaxed text-[#1A1A1A]/70">addressing emotional tone before guardedness becomes culture</span>
                      </li>
                    </ul>
                  </div>

                  {/* Late correction */}
                  <div className="bg-[#FAFAF9] p-6 sm:p-8 border-l-4 border-[#1A1A1A]/20">
                    <h3 className="font-bold text-lg text-[#1A1A1A] mb-4">Late Correction Means:</h3>
                    <ul className="list-none space-y-2">
                      <li className="flex items-start gap-3">
                        <span className="text-[#1A1A1A]/30 mt-1 flex-shrink-0">×</span>
                        <span className="text-base leading-relaxed text-[#1A1A1A]/70">rebuilding trust after it's been broken</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="text-[#1A1A1A]/30 mt-1 flex-shrink-0">×</span>
                        <span className="text-base leading-relaxed text-[#1A1A1A]/70">repairing relationships after damage has occurred</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="text-[#1A1A1A]/30 mt-1 flex-shrink-0">×</span>
                        <span className="text-base leading-relaxed text-[#1A1A1A]/70">restoring clarity after confusion has compounded</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="text-[#1A1A1A]/30 mt-1 flex-shrink-0">×</span>
                        <span className="text-base leading-relaxed text-[#1A1A1A]/70">re-establishing standards after they've collapsed</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="text-[#1A1A1A]/30 mt-1 flex-shrink-0">×</span>
                        <span className="text-base leading-relaxed text-[#1A1A1A]/70">recovering credibility after leadership has been questioned</span>
                      </li>
                    </ul>
                  </div>
                </div>

                <p>
                  One requires small adjustments. The other requires repair.
                </p>
                <p>
                  ALI gives leaders the ability to act early.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 6: WHY THIS MATTERS - DARK SECTION */}
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
                    Why This Matters
                  </h2>
                </div>
              </div>

              <div className="text-base sm:text-lg leading-relaxed text-white/80 space-y-6">
                <p>
                  Most leadership damage is preventable.
                </p>
                <p>
                  It doesn't happen because leaders intend harm.
                </p>
                <p>
                  It happens because they don't see the signals early enough to respond.
                </p>
                <p>
                  Early warning indicators give leaders that visibility.
                </p>
                <p>
                  They turn leadership from reactive crisis management into intentional environmental stewardship.
                </p>
                <p>
                  That's the difference between hoping culture stays strong and knowing when it needs attention.
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
                  href="/culture-science/ali/method"
                  onClick={(e) => handleLinkClick(e, '/culture-science/ali/method')}
                  className="bg-white p-6 sm:p-8 rounded-lg border-2 border-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white transition-all duration-300 group block"
                >
                  <h3 className="text-xl sm:text-2xl font-bold mb-3 group-hover:text-white text-[#1A1A1A]">
                    The Method
                  </h3>
                  <p className="text-base text-[#1A1A1A]/70 group-hover:text-white/80 mb-4">
                    How ALI measures leadership conditions.
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
