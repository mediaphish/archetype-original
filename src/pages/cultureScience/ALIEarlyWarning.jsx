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

// Orange bullet list component
const OrangeBulletList = ({ items }) => (
  <ul className="list-none space-y-2 pl-6">
    {items.map((item, idx) => (
      <li key={idx} className="flex items-start gap-3">
        <span className="text-[#C85A3C] mt-1 flex-shrink-0">•</span>
        <span className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]/70 italic">
          {item}
        </span>
      </li>
    ))}
  </ul>
);

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
        <section className="bg-white py-20 sm:py-28 md:py-32">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-3xl mx-auto text-center space-y-6">
              <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-bold leading-tight tracking-tight text-[#1A1A1A]">
                Early Warning Indicators
              </h1>
              <p className="text-lg sm:text-xl leading-relaxed text-[#1A1A1A]/70">
                Seeing drift before it becomes damage.
              </p>
            </div>
          </div>
        </section>

        {/* SECTION 2: WHAT ARE EARLY WARNING INDICATORS */}
        <section className="bg-[#FAFAF9] py-16 sm:py-24 md:py-32">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-3xl mx-auto space-y-8">
              <SectionHeader>What Are Early Warning Indicators?</SectionHeader>
              <div className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] space-y-6">
                <p>
                  Early warning indicators are small, subtle behavioral shifts that signal larger structural problems forming beneath the surface.
                </p>
                <p>
                  They are not crises.
                </p>
                <p>
                  They are not failures.
                </p>
                <p>
                  They are the earliest detectable signs that leadership conditions are beginning to drift.
                </p>
                <p>
                  They show up as:
                </p>
                <OrangeBulletList items={[
                  "rising silence where clarity once existed",
                  "small but repeated communication breakdowns",
                  "increasing hesitation around decisions",
                  "emotional compression or guardedness",
                  "inconsistency in expectations or follow-through",
                  "subtle avoidance of tension or accountability",
                  "distortion in how information moves through the team"
                ]} />
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
              <SectionHeader>Why Leaders Miss Them</SectionHeader>
              <div className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] space-y-6">
                <p>
                  Leaders miss early warning indicators because they are operating inside the system they are trying to see.
                </p>
                <p>
                  From inside the environment:
                </p>
                {/* NO BULLETS - poetic/philosophical content */}
                <div className="pl-6 space-y-2 text-base sm:text-lg leading-relaxed text-[#1A1A1A]/70 italic">
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
        <section className="bg-[#FAFAF9] py-16 sm:py-24 md:py-32">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-3xl mx-auto space-y-8">
              <SectionHeader>How ALI Detects Them</SectionHeader>
              <div className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] space-y-6">
                <p>
                  ALI was designed specifically to surface early warning indicators before they compound into visible problems.
                </p>
                <p>
                  It does this through:
                </p>
                <OrangeBulletList items={[
                  "questions engineered to expose behavioral reality, not preference",
                  "quarterly measurement that reveals directional movement over time",
                  "pattern detection across multiple leadership conditions simultaneously",
                  "drift thresholds that identify when small changes are forming into larger trends",
                  "condition-to-condition relationship mapping that shows how one area affects another",
                  "underlying signal correlation that connects surface behaviors to structural causes"
                ]} />
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
              <SectionHeader>Early Intervention vs. Late Correction</SectionHeader>
              <div className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] space-y-6">
                <p>
                  There is a fundamental difference between intervening early and correcting late.
                </p>
                <p>
                  Early intervention means:
                </p>
                <OrangeBulletList items={[
                  "adjusting behavior before trust is damaged",
                  "clarifying expectations before confusion becomes conflict",
                  "stabilizing communication before silence becomes permanent",
                  "reinforcing consistency before standards erode",
                  "addressing emotional tone before guardedness becomes culture"
                ]} />
                <p>
                  Late correction means:
                </p>
                <OrangeBulletList items={[
                  "rebuilding trust after it's been broken",
                  "repairing relationships after damage has occurred",
                  "restoring clarity after confusion has compounded",
                  "re-establishing standards after they've collapsed",
                  "recovering credibility after leadership has been questioned"
                ]} />
                <p>
                  One requires small adjustments.
                </p>
                <p>
                  The other requires repair.
                </p>
                <p>
                  ALI gives leaders the ability to act early.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 6: WHY THIS MATTERS */}
        <section className="bg-[#FAFAF9] py-16 sm:py-24 md:py-32">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-3xl mx-auto space-y-8">
              <SectionHeader>Why This Matters</SectionHeader>
              <div className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] space-y-6">
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
                  href="/culture-science/ali/method" 
                  onClick={(e) => handleLinkClick(e, '/culture-science/ali/method')}
                  className="text-[#1A1A1A] underline hover:text-[#C85A3C] transition-colors"
                >
                  The ALI Method
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

