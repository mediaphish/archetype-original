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

export default function WhyALIExists() {
  const handleLinkClick = (e, href) => {
    e.preventDefault();
    window.history.pushState({}, '', href);
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  return (
    <>
      <SEO pageKey="why-ali-exists" />
      <ALISubNav />
      <main className="min-h-screen">
        
        {/* SECTION 1: HERO */}
        <section className="bg-white py-20 sm:py-28 md:py-32">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-3xl mx-auto text-center space-y-6">
              <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-bold leading-tight tracking-tight text-[#1A1A1A]">
                Why the Archetype Leadership Index Exists
              </h1>
            </div>
          </div>
        </section>

        {/* SECTION 2: WHY I'M BUILDING ALI */}
        <section className="bg-[#FAFAF9] py-16 sm:py-24 md:py-32">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-3xl mx-auto space-y-8">
              <SectionHeader>Why I'm Building ALI</SectionHeader>
              <div className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] space-y-6">
                <p>
                  ALI is the next chapter of a career spent building companies, strengthening people, and changing cultures in ways that helped teams do their best work together.
                </p>
                <p>
                  Over decades of leadership, one pattern kept repeating:
                </p>
                <div className="pl-6 space-y-1 italic text-[#1A1A1A]/70">
                  <p>Leadership creates conditions.</p>
                  <p>Conditions shape culture.</p>
                  <p>Culture determines outcomes.</p>
                </div>
                <p>
                  Most leaders never see these conditions clearly.
                </p>
                <p>
                  They feel symptoms — tension, disengagement, misalignment — without understanding the structure beneath them or how early those signals appear.
                </p>
                <p>
                  ALI was built to make those conditions visible.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 3: THE PROBLEM I KEPT SEEING */}
        <section className="bg-white py-16 sm:py-24 md:py-32">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-3xl mx-auto space-y-8">
              <SectionHeader>The Problem I Kept Seeing</SectionHeader>
              <div className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] space-y-6">
                <p>
                  In every organization I've led or worked alongside, the same problem surfaced in different forms.
                </p>
                <p>
                  Leadership drift rarely announces itself.
                </p>
                <p>
                  It doesn't show up as immediate conflict or obvious failure.
                </p>
                <p>
                  It begins quietly:
                </p>
                <div className="pl-6 space-y-1 italic text-[#1A1A1A]/70">
                  <p>clarity softens</p>
                  <p>communication compresses</p>
                  <p>tone shifts under pressure</p>
                  <p>consistency erodes</p>
                  <p>trust thins</p>
                  <p>expectations blur</p>
                </div>
                <p>
                  From inside the system, this feels normal.
                </p>
                <p>
                  Teams adapt.
                </p>
                <p>
                  Leaders interpret generously.
                </p>
                <p>
                  Everyone keeps moving.
                </p>
                <p>
                  By the time symptoms become obvious, damage has already occurred.
                </p>
                <p>
                  ALI exists to surface these patterns early — when leaders can still act without causing harm.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 4: WHY TRADITIONAL TOOLS FALL SHORT */}
        <section className="bg-[#FAFAF9] py-16 sm:py-24 md:py-32">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-3xl mx-auto space-y-8">
              <SectionHeader>Why Traditional Tools Fall Short</SectionHeader>
              <div className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] space-y-6">
                <p>
                  Most leadership tools measure sentiment, engagement, or personality.
                </p>
                <p>
                  Those tools answer questions like:
                </p>
                <div className="pl-6 space-y-1 italic text-[#1A1A1A]/70">
                  <p>Are people happy?</p>
                  <p>Are they motivated?</p>
                  <p>Do they feel engaged?</p>
                </div>
                <p>
                  Those questions matter — but they are downstream.
                </p>
                <p>
                  They do not tell leaders what kind of environment they are creating, or where that environment is heading.
                </p>
                <p>
                  People can feel good inside declining environments.
                </p>
                <p>
                  People can feel frustrated inside strong ones.
                </p>
                <p>
                  Sentiment fluctuates.
                </p>
                <p>
                  Conditions persist.
                </p>
                <p>
                  ALI measures conditions because conditions are what leadership actually controls.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 5: WHY THIS HAD TO BE BUILT AS A SYSTEM */}
        <section className="bg-white py-16 sm:py-24 md:py-32">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-3xl mx-auto space-y-8">
              <SectionHeader>Why This Had to Be Built as a System</SectionHeader>
              <div className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] space-y-6">
                <p>
                  ALI was not conceived as a survey.
                </p>
                <p>
                  It was designed as a system.
                </p>
                <p>
                  I come from a software background. I've built systems where structure matters, where signal matters, and where small design decisions compound over time.
                </p>
                <p>
                  ALI was architected the same way.
                </p>
                <p>
                  Every question, indicator, and interpretation layer exists for a reason.
                </p>
                <p>
                  The goal was never to score leaders.
                </p>
                <p>
                  The goal was to give leaders visibility into the wake they are creating — so they can lead with intention instead of assumption.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 6: WHY THIS MATTERS TO ME */}
        <section className="bg-[#FAFAF9] py-16 sm:py-24 md:py-32">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-3xl mx-auto space-y-8">
              <SectionHeader>Why This Matters to Me</SectionHeader>
              <div className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] space-y-6">
                <p>
                  Leadership has real consequences.
                </p>
                <p>
                  It shapes people's confidence, health, families, and futures.
                </p>
                <p>
                  It shapes whether work environments strengthen people or slowly diminish them.
                </p>
                <p>
                  I've seen what happens when leadership drift goes unnoticed — and when leaders finally see reality clearly.
                </p>
                <p>
                  ALI exists to give leaders that clarity earlier.
                </p>
                <p>
                  Not to shame them.
                </p>
                <p>
                  Not to expose them.
                </p>
                <p>
                  But to help them lead well.
                </p>
                <p>
                  This work represents the accumulation of everything I've learned about leadership, systems, culture, and responsibility.
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
                Continue to{' '}
                <a 
                  href="/culture-science/ali/what-is-ali" 
                  onClick={(e) => handleLinkClick(e, '/culture-science/ali/what-is-ali')}
                  className="text-[#1A1A1A] underline hover:text-[#C85A3C] transition-colors"
                >
                  What Is ALI
                </a>
                {' '}or explore{' '}
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

