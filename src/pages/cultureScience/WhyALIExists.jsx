import React from "react";
import SEO from "../../components/SEO";
import ALISubNav from "../../components/ALISubNav";

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
        <section className="bg-white py-24 sm:py-32 md:py-40 lg:py-48">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-5xl mx-auto text-center space-y-8">
              <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl font-bold leading-[0.9] tracking-tight text-[#1A1A1A]">
                Why ALI Exists
              </h1>
              <p className="text-xl sm:text-2xl md:text-3xl leading-relaxed text-[#1A1A1A]/70 font-light">
                The personal motivation behind building a leadership diagnostic.
              </p>
            </div>
          </div>
        </section>

        {/* SECTION 2: WHY I'M BUILDING ALI */}
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
                    Why I'm Building ALI
                  </h2>
                </div>
              </div>

              <div className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] space-y-6">
                <p>
                  ALI is the next chapter of a career spent building companies, strengthening people, and changing cultures in ways that helped teams do their best work together.
                </p>
                <p>
                  Over decades of leadership, one pattern kept repeating:
                </p>
                <div className="pl-6 sm:pl-8 border-l-4 border-[#C85A3C] space-y-1 italic text-[#1A1A1A]/70">
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
              {/* Numbered section header */}
              <div className="relative">
                <div className="absolute -top-8 -left-4 text-8xl sm:text-9xl font-serif font-bold text-[#1A1A1A]/5 pointer-events-none">
                  02
                </div>
                <div className="relative z-10">
                  <h2 className="font-serif font-bold text-3xl sm:text-4xl md:text-5xl text-[#1A1A1A] mb-6">
                    The Problem I Kept Seeing
                  </h2>
                </div>
              </div>

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
                <ul className="list-none space-y-2 pl-6">
                  <li className="flex items-start gap-3">
                    <span className="text-[#C85A3C] mt-1 flex-shrink-0">→</span>
                    <span className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]/70">clarity softens</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-[#C85A3C] mt-1 flex-shrink-0">→</span>
                    <span className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]/70">communication compresses</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-[#C85A3C] mt-1 flex-shrink-0">→</span>
                    <span className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]/70">tone shifts under pressure</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-[#C85A3C] mt-1 flex-shrink-0">→</span>
                    <span className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]/70">consistency erodes</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-[#C85A3C] mt-1 flex-shrink-0">→</span>
                    <span className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]/70">trust thins</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-[#C85A3C] mt-1 flex-shrink-0">→</span>
                    <span className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]/70">expectations blur</span>
                  </li>
                </ul>
                <p>
                  From inside the system, this feels normal.
                </p>
                <p>
                  Teams adapt. Leaders interpret generously. Everyone keeps moving.
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
                    Why Traditional Tools Fall Short
                  </h2>
                </div>
              </div>

              <div className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] space-y-6">
                <p>
                  Most leadership tools measure sentiment, engagement, or personality.
                </p>
                <p>
                  Those tools answer questions like:
                </p>
                <div className="pl-6 sm:pl-8 border-l-4 border-[#C85A3C] space-y-1 italic text-[#1A1A1A]/70">
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
                  Sentiment fluctuates. Conditions persist.
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
              {/* Numbered section header */}
              <div className="relative">
                <div className="absolute -top-8 -left-4 text-8xl sm:text-9xl font-serif font-bold text-[#1A1A1A]/5 pointer-events-none">
                  04
                </div>
                <div className="relative z-10">
                  <h2 className="font-serif font-bold text-3xl sm:text-4xl md:text-5xl text-[#1A1A1A] mb-6">
                    Why This Had to Be Built as a System
                  </h2>
                </div>
              </div>

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

        {/* SECTION 6: WHY THIS MATTERS TO ME - DARK SECTION */}
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
                    Why This Matters to Me
                  </h2>
                </div>
              </div>

              <div className="text-base sm:text-lg leading-relaxed text-white/80 space-y-6">
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
                  Not to shame them. Not to expose them.
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
                  href="/culture-science/ali/method"
                  onClick={(e) => handleLinkClick(e, '/culture-science/ali/method')}
                  className="bg-white p-6 sm:p-8 rounded-lg border-2 border-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white transition-all duration-300 group block"
                >
                  <h3 className="text-xl sm:text-2xl font-bold mb-3 group-hover:text-white text-[#1A1A1A]">
                    The ALI Method
                  </h3>
                  <p className="text-base sm:text-lg text-[#1A1A1A]/70 group-hover:text-white/80 mb-4">
                    How leadership conditions become measurable, trackable, and directional.
                  </p>
                  <span className="inline-flex items-center gap-2 font-semibold group-hover:text-white text-[#1A1A1A]">
                    Explore →
                  </span>
                </a>

                {/* Card 2 */}
                <a
                  href="/culture-science/ali"
                  onClick={(e) => handleLinkClick(e, '/culture-science/ali')}
                  className="bg-white p-6 sm:p-8 rounded-lg border-2 border-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white transition-all duration-300 group block"
                >
                  <h3 className="text-xl sm:text-2xl font-bold mb-3 group-hover:text-white text-[#1A1A1A]">
                    ALI Overview
                  </h3>
                  <p className="text-base sm:text-lg text-[#1A1A1A]/70 group-hover:text-white/80 mb-4">
                    Return to the main ALI landing page for a complete introduction.
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
