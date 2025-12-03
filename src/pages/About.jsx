import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import SEO from '../components/SEO';

export default function About() {
  const [scrollY, setScrollY] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  // Mobile detection and scroll tracking for parallax
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    const handleScroll = () => {
      if (window.innerWidth >= 768) {
        setScrollY(window.scrollY);
      }
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    "name": "Bart Paden",
    "url": "https://www.archetypeoriginal.com",
    "jobTitle": "Mentor & Consultant",
    "sameAs": []
  };

  return (
    <>
      <SEO pageKey="about" />
      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify(jsonLd)}
        </script>
      </Helmet>
      
      <div className="min-h-screen bg-white">
        {/* Hero Section with 3-Layer Parallax */}
        <section className="w-full bg-white py-20 sm:py-24 md:py-28 relative overflow-hidden">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center max-w-4xl mx-auto">
              {/* Left Content */}
              <div>
                <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-[#1A1A1A] mb-6 sm:mb-8 tracking-tight">
                  About Bart
                </h1>
                <h2 className="!font-sans text-2xl sm:text-3xl md:text-4xl font-light text-[#1A1A1A] mb-6 sm:mb-8 leading-snug">
                  Thirty-two years building people, teams, and leaders who do work that matters.
                </h2>
              </div>
              
              {/* Right: 3-Layer Parallax */}
              {!isMobile && (
                <div className="relative w-full max-w-lg lg:max-w-xl mx-auto lg:mx-0 hidden lg:block" style={{ aspectRatio: '1/1', height: 'auto' }}>
                  {/* Layer 3 (back) - Monitor - slowest movement */}
                  <div 
                    className="absolute inset-0 z-10"
                    style={{ 
                      transform: `translateY(${scrollY * 0.05}px)`
                    }}
                  >
                    <img 
                      src="/images/about-layer-3.png" 
                      alt="Monitor with presentation" 
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  </div>
                  
                  {/* Layer 2 (middle) - Archy - moderate movement */}
                  <div 
                    className="absolute inset-0 z-20"
                    style={{ 
                      transform: `translateY(${scrollY * 0.08}px)`
                    }}
                  >
                    <img 
                      src="/images/about-layer-2.png" 
                      alt="Archy" 
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  </div>
                  
                  {/* Layer 1 (front) - Cartoon Bart - fastest movement (moves UP) */}
                  <div 
                    className="absolute inset-0 z-30"
                    style={{ 
                      transform: `translateY(${scrollY * -0.12}px)`
                    }}
                  >
                    <img 
                      src="/images/about-layer-1.png" 
                      alt="Bart" 
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  </div>
                </div>
              )}
              
              {/* Mobile: Static image */}
              {isMobile && (
                <div className="relative w-full max-w-lg mx-auto lg:hidden" style={{ aspectRatio: '1/1' }}>
                  <img 
                    src="/images/about-layer-1.png" 
                    alt="Bart" 
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </section>

        {/* The Work Found Me Before I Knew Its Name */}
        <section className="w-full bg-[#FAFAF9] py-16 sm:py-24 md:py-32">
          <div className="container mx-auto px-4 sm:px-6 md:px-12 max-w-4xl">
            <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-8 lg:gap-12 items-start">
              <div className="flex justify-center lg:justify-start">
                <img
                  src="/images/bart-headshot-002.jpg"
                  alt="Bart"
                  className="w-60 h-60 object-cover rounded-sm"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              </div>
              <div className="space-y-4 sm:space-y-6">
                <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-[#1A1A1A] tracking-tight">
                  The Work Found Me Before I Knew Its Name
                </h2>
                <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                  I stepped into the web and software world in 1993 — a college kid who loved solving problems and making things work. I wasn't chasing authority. I wasn't trying to "be a leader." I was the person people trusted when something was broken, confusing, or on fire.
                </p>
                <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                  I didn't think of myself as a leader.
                </p>
                <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                  I thought of myself as someone who helped.
                </p>
                <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                  And when people consistently trust you to help them, that trust is a form of leadership long before anyone calls it that.
                </p>
                <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                  For years, quietly and without a title, I guided clients through uncertainty, supported teammates through complexity, and held responsibility because it was the right thing to do — not because it was written on a job description.
                </p>
                <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                  But in 2010, everything became unmistakably clear.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* The Insurance Moment - DARK SECTION */}
        <section className="w-full bg-[#1A1A1A] py-16 sm:py-24 md:py-32">
          <div className="container mx-auto px-4 sm:px-6 md:px-12 max-w-4xl">
            <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-8 sm:mb-10 tracking-tight">
              The Insurance Moment
            </h2>
            <p className="text-base sm:text-lg leading-relaxed text-white mb-6 sm:mb-8">
              My first full-time employee stood in my doorway and asked if I could provide insurance.
            </p>
            <p className="text-base sm:text-lg leading-relaxed text-white mb-6 sm:mb-8">
              He wasn't asking for a perk — he was asking for stability. And the truth was simple:
            </p>
            <p className="text-base sm:text-lg leading-relaxed text-white mb-6 sm:mb-8">
              I didn't own the company.
            </p>
            <p className="text-base sm:text-lg leading-relaxed text-white mb-6 sm:mb-8">
              I led a division inside it. I couldn't snap my fingers and create benefits. If this was going to happen, I would have to absorb the cost.
            </p>
            <p className="text-base sm:text-lg leading-relaxed text-white mb-6 sm:mb-8">
              So I went to the owner and negotiated to reduce my own income so his insurance could be covered.
            </p>
            <p className="text-base sm:text-lg leading-relaxed text-white mb-6 sm:mb-8">
              It wasn't a dramatic number, but things were tight at the time, and it mattered.
            </p>
            <p className="text-base sm:text-lg leading-relaxed text-white mb-6 sm:mb-8">
              It was a sacrifice — not for optics, not for strategy, but for the person who trusted me enough to ask.
            </p>
            <p className="text-base sm:text-lg leading-relaxed text-white mb-6 sm:mb-8">
              I didn't have the margin.
            </p>
            <p className="text-base sm:text-lg leading-relaxed text-white mb-6 sm:mb-8">
              I didn't have the structure.
            </p>
            <p className="text-base sm:text-lg leading-relaxed text-white mb-6 sm:mb-8">
              But I had a responsibility — to him.
            </p>
            <div className="border-l-4 border-[#C85A3C] pl-8 sm:pl-10 my-12 sm:my-16">
              <p className="text-2xl sm:text-3xl md:text-4xl italic font-serif text-white leading-relaxed">
                That was the moment instinct became intention.
              </p>
              <p className="text-2xl sm:text-3xl md:text-4xl italic font-serif text-white leading-relaxed mt-4">
                Leadership wasn't a title.
              </p>
              <p className="text-2xl sm:text-3xl md:text-4xl italic font-serif text-white leading-relaxed mt-4">
                It was service.
              </p>
              <p className="text-2xl sm:text-3xl md:text-4xl italic font-serif text-white leading-relaxed mt-4">
                It was responsibility.
              </p>
            </div>
            <p className="text-base sm:text-lg leading-relaxed text-white mb-6 sm:mb-8">
              I had been leading long before that day.
            </p>
            <p className="text-base sm:text-lg leading-relaxed text-white">
              But that day made it unmistakable.
            </p>
          </div>
        </section>

        {/* Leadership in the Real World */}
        <section className="w-full bg-white py-16 sm:py-24 md:py-32">
          <div className="container mx-auto px-4 sm:px-6 md:px-12 max-w-4xl">
            <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-[#1A1A1A] mb-8 sm:mb-10 tracking-tight">
              Leadership in the Real World
            </h2>
            <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] mb-6 sm:mb-8">
              My leadership education didn't come from seminars or frameworks. It came from real people, real pressure, real opportunity, and real moments that changed lives.
            </p>
            <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] mb-6 sm:mb-8">
              I learned leadership in rooms where tension could be felt before a word was spoken.
            </p>
            <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] mb-6 sm:mb-8">
              I learned it when silence carried more weight than instruction.
            </p>
            <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] mb-6 sm:mb-8">
              I learned it in moments that required courage — and in moments that required restraint.
            </p>
            <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] mb-6 sm:mb-8">
              I learned it when people trusted me enough to ask for help… and when they trusted me enough to tell me truths I didn't want to hear.
            </p>
            <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] mb-6 sm:mb-8">
              But I also learned it in the good moments — the ones leaders often overlook.
            </p>
            <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] mb-6 sm:mb-8">
              I learned leadership in moments of unexpected success, when people realized they were capable of more than they believed.
            </p>
            <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] mb-6 sm:mb-8">
              In the quiet pride of someone who completed work they once feared.
            </p>
            <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] mb-6 sm:mb-8">
              In the excitement of a first home purchase, a new baby on the way, or a marriage announcement whispered with joy.
            </p>
            <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] mb-6 sm:mb-8">
              In victories that didn't belong to me but were shared with me because trust was real.
            </p>
            <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] mb-6 sm:mb-8">
              Leadership isn't only forged in difficulty.
            </p>
            <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] mb-6 sm:mb-8">
              It's revealed just as clearly in growth, joy, breakthrough, and becoming.
            </p>
            <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] mb-6 sm:mb-8">
              Pressure shapes leaders.
            </p>
            <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] mb-6 sm:mb-8">
              But so does celebration.
            </p>
            <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] mb-6 sm:mb-8">
              So does hope.
            </p>
            <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] mb-6 sm:mb-8">
              So does watching someone rise.
            </p>
            <div className="border-l-4 border-[#C85A3C] pl-8 sm:pl-10 my-12 sm:my-16">
              <p className="text-2xl sm:text-3xl md:text-4xl italic font-serif text-[#1A1A1A] leading-relaxed">
                The real world taught me that leadership is present in every season — in the courage to face what's wrong, and in the gratitude to honor what's right.
              </p>
            </div>
            <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] mb-6 sm:mb-8">
              None of this was theory.
            </p>
            <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
              It was lived.
            </p>
          </div>
        </section>

        {/* The Years That Tested Everything */}
        <section className="w-full bg-[#FAFAF9] py-16 sm:py-24 md:py-32">
          <div className="container mx-auto px-4 sm:px-6 md:px-12 max-w-4xl">
            <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-[#1A1A1A] mb-8 sm:mb-10 tracking-tight">
              The Years That Tested Everything
            </h2>
            <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] mb-6 sm:mb-8">
              From 2004 to 2010, I worked alone — wearing every hat, carrying every weight, building something piece by piece.
            </p>
            <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] mb-6 sm:mb-8">
              From 2010 to 2012, the work grew, and so did the responsibility; I began hiring, shaping a team, and learning what it meant to lead people whose livelihoods touched mine.
            </p>
            <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] mb-6 sm:mb-8">
              And from 2012 to 2022, I co-led a software company through seasons of extreme growth, strain, compression, expansion, and transition — years that altered me in ways I couldn't have learned anywhere else.
            </p>
            <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] mb-6 sm:mb-8">
              Some days felt like momentum.
            </p>
            <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] mb-6 sm:mb-8">
              Some days felt like pushing a stalled engine uphill.
            </p>
            <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] mb-6 sm:mb-8">
              I watched people grow into leaders they never expected to become.
            </p>
            <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] mb-6 sm:mb-8">
              And I watched how misalignment and pressure, when left unnamed, can slowly tear everything apart.
            </p>
            <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] mb-6 sm:mb-8">
              Those years taught me things I couldn't have learned any other way:
            </p>
            <ul className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
              <li className="flex items-start text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                <span className="text-[#C85A3C] mr-3 mt-1">•</span>
                <span>What people consistently do matters far more than what they say.</span>
              </li>
              <li className="flex items-start text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                <span className="text-[#C85A3C] mr-3 mt-1">•</span>
                <span>Clarity settles a room faster than authority ever will.</span>
              </li>
              <li className="flex items-start text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                <span className="text-[#C85A3C] mr-3 mt-1">•</span>
                <span>Confusion spreads fast if the leader doesn't tell the truth.</span>
              </li>
              <li className="flex items-start text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                <span className="text-[#C85A3C] mr-3 mt-1">•</span>
                <span>Pressure exposes whether culture is solid or fragile.</span>
              </li>
              <li className="flex items-start text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                <span className="text-[#C85A3C] mr-3 mt-1">•</span>
                <span>And a single act of integrity can rebuild trust faster than a thousand speeches.</span>
              </li>
            </ul>
            <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] mb-6 sm:mb-8">
              Those years stripped away every illusion I had about leadership.
            </p>
            <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] mb-6 sm:mb-8">
              They taught me humility.
            </p>
            <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] mb-6 sm:mb-8">
              They taught me courage.
            </p>
            <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] mb-6 sm:mb-8">
              They taught me restraint.
            </p>
            <div className="border-l-4 border-[#C85A3C] pl-8 sm:pl-10 my-12 sm:my-16">
              <p className="text-2xl sm:text-3xl md:text-4xl italic font-serif text-[#1A1A1A] leading-relaxed">
                And they taught me that people rarely remember what you protected for yourself—
              </p>
              <p className="text-2xl sm:text-3xl md:text-4xl italic font-serif text-[#1A1A1A] leading-relaxed mt-4">
                but they always remember how you protected them.
              </p>
            </div>
          </div>
        </section>

        {/* The Questions That Followed */}
        <section className="w-full bg-white py-16 sm:py-24 md:py-32">
          <div className="container mx-auto px-4 sm:px-6 md:px-12 max-w-4xl">
            <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-[#1A1A1A] mb-8 sm:mb-10 tracking-tight">
              The Questions That Followed
            </h2>
            <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] mb-6 sm:mb-8">
              Stepping away from the company I helped build forced a reckoning.
            </p>
            <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] mb-6 sm:mb-8">
              There were mornings when the silence felt heavy.
            </p>
            <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] mb-6 sm:mb-8">
              Afternoons spent replaying decisions.
            </p>
            <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] mb-6 sm:mb-8">
              Nights asking questions I had avoided for years:
            </p>
            <ul className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
              <li className="flex items-start text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                <span className="text-[#C85A3C] mr-3 mt-1">•</span>
                <span>Did my leadership matter?</span>
              </li>
              <li className="flex items-start text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                <span className="text-[#C85A3C] mr-3 mt-1">•</span>
                <span>Did I leave people better than I found them?</span>
              </li>
              <li className="flex items-start text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                <span className="text-[#C85A3C] mr-3 mt-1">•</span>
                <span>Did the sacrifices mean anything?</span>
              </li>
              <li className="flex items-start text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                <span className="text-[#C85A3C] mr-3 mt-1">•</span>
                <span>Was the way I led actually good?</span>
              </li>
            </ul>
            <div className="border-l-4 border-[#C85A3C] pl-8 sm:pl-10 my-12 sm:my-16">
              <p className="text-2xl sm:text-3xl md:text-4xl italic font-serif text-[#1A1A1A] leading-relaxed">
                These weren't professional questions.
              </p>
              <p className="text-2xl sm:text-3xl md:text-4xl italic font-serif text-[#1A1A1A] leading-relaxed mt-4">
                They were spiritual ones.
              </p>
            </div>
            <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] mb-6 sm:mb-8">
              That season of reflection became the foundation of a long-form project I hope to publish in 2026: Accidental CEO.
            </p>
            <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
              If you want more of that story, Archy carries the full manuscript in his corpus — just ask him.
            </p>
          </div>
        </section>

        {/* The Posture That Shapes My Leadership */}
        <section className="w-full bg-[#FAFAF9] py-16 sm:py-24 md:py-32">
          <div className="container mx-auto px-4 sm:px-6 md:px-12 max-w-4xl">
            <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-[#1A1A1A] mb-8 sm:mb-10 tracking-tight">
              The Posture That Shapes My Leadership
            </h2>
            <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] mb-6 sm:mb-8">
              Two sentences have guided my leadership for decades:
            </p>
            <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] mb-6 sm:mb-8">
              The Golden Rule — "treat others the way you would want to be treated."
            </p>
            <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] mb-6 sm:mb-8">
              And: "I am second."
            </p>
            <div className="border-l-4 border-[#C85A3C] pl-8 sm:pl-10 my-12 sm:my-16">
              <p className="text-2xl sm:text-3xl md:text-4xl italic font-serif text-[#1A1A1A] leading-relaxed">
                The Golden Rule is ancient — rooted in Scripture, echoed in philosophy, and found across cultures. It has endured because it names something universal: leadership begins with valuing the person in front of you as much as you value yourself.
              </p>
            </div>
            <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] mb-6 sm:mb-8">
              And I am second is how that belief becomes action.
            </p>
            <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] mb-6 sm:mb-8">
              It isn't about diminishing myself.
            </p>
            <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] mb-6 sm:mb-8">
              It's about elevating the people who trust me.
            </p>
            <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] mb-6 sm:mb-8">
              It's strength under control — the posture that keeps leadership steady, agile, and deeply human.
            </p>
            <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] mb-6 sm:mb-8">
              It's the opposite of scoreboard leadership, which chases wins at the expense of people.
            </p>
            <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] mb-6 sm:mb-8">
              Servant leaders build people first — and because of that, their teams outperform, endure, and grow.
            </p>
            <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] mb-6 sm:mb-8">
              That posture has shaped every season of my career — in design, software, ownership, culture, and leadership.
            </p>
            <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
              It's the thread that held steady even when everything else was shifting.
            </p>
          </div>
        </section>

        {/* The Research That Made It Clear */}
        <section className="w-full bg-white py-16 sm:py-24 md:py-32">
          <div className="container mx-auto px-4 sm:px-6 md:px-12 max-w-4xl">
            <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-[#1A1A1A] mb-8 sm:mb-10 tracking-tight">
              The Research That Made It Clear
            </h2>
            <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] mb-6 sm:mb-8">
              When the company was no longer mine to build, and the people I had developed were no longer mine to develop, the questions became unavoidable.
            </p>
            <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] mb-6 sm:mb-8">
              Did any of it matter?
            </p>
            <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] mb-6 sm:mb-8">
              Did people grow under my care?
            </p>
            <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] mb-6 sm:mb-8">
              Was the way I led actually good?
            </p>
            <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] mb-6 sm:mb-8">
              Those questions sent me into years of research across psychology, communication, neuroscience, anthropology, organizational behavior, and cultural theory.
            </p>
            <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] mb-6 sm:mb-8">
              What I found didn't just validate the work — it explained it.
            </p>
            <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] mb-6 sm:mb-8">
              There were names for the instincts I followed.
            </p>
            <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] mb-6 sm:mb-8">
              There was data behind the decisions I made.
            </p>
            <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] mb-6 sm:mb-8">
              There were patterns behind the results I saw.
            </p>
            <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] mb-6 sm:mb-8">
              That research became the book.
            </p>
            <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] mb-6 sm:mb-8">
              The book became Archetype Original.
            </p>
            <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
              Archetype Original became my next act.
            </p>
          </div>
        </section>

        {/* How I Show Up Today */}
        <section className="w-full bg-[#FAFAF9] py-16 sm:py-24 md:py-32">
          <div className="container mx-auto px-4 sm:px-6 md:px-12 max-w-4xl">
            <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-[#1A1A1A] mb-8 sm:mb-10 tracking-tight">
              How I Show Up Today
            </h2>
            <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] mb-8 sm:mb-10">
              Today, I work with leaders, teams, and organizations who want to build something healthy — something real, something sustainable, something worth belonging to.
            </p>
            <div className="space-y-8 sm:space-y-10">
              <div className="border-l-4 border-[#C85A3C] pl-6 sm:pl-8 space-y-3 sm:space-y-4">
                <h3 className="text-xl sm:text-2xl font-bold text-[#1A1A1A]">Mentorship</h3>
                <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                  helping leaders at every level find clarity, courage, and confidence
                </p>
              </div>
              <div className="border-l-4 border-[#C85A3C] pl-6 sm:pl-8 space-y-3 sm:space-y-4">
                <h3 className="text-xl sm:text-2xl font-bold text-[#1A1A1A]">Consulting</h3>
                <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                  strengthening systems, communication, alignment, and culture
                </p>
              </div>
              <div className="border-l-4 border-[#C85A3C] pl-6 sm:pl-8 space-y-3 sm:space-y-4">
                <h3 className="text-xl sm:text-2xl font-bold text-[#1A1A1A]">Speaking & Workshops</h3>
                <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                  sharing lived leadership and research-backed insight
                </p>
              </div>
              <div className="border-l-4 border-[#C85A3C] pl-6 sm:pl-8 space-y-3 sm:space-y-4">
                <h3 className="text-xl sm:text-2xl font-bold text-[#1A1A1A]">Fractional Leadership</h3>
                <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                  stepping in when teams need stability and direction during transitional seasons
                </p>
              </div>
            </div>
            <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] mt-8 sm:mt-10 mb-6 sm:mb-8">
              I don't bring programs.
            </p>
            <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] mb-6 sm:mb-8">
              I don't bring scripts.
            </p>
            <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] mb-6 sm:mb-8">
              I don't bring quick fixes.
            </p>
            <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
              I bring presence, clarity, responsibility, and decades of real leadership lived with real people in real environments.
            </p>
          </div>
        </section>

        {/* If You're Ready - CTA */}
        <section className="w-full bg-white py-16 sm:py-24 md:py-32">
          <div className="container mx-auto px-4 sm:px-6 md:px-12 max-w-4xl">
            <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-[#1A1A1A] mb-8 sm:mb-10 tracking-tight">
              If You're Ready
            </h2>
            <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] mb-8 sm:mb-10">
              If you're carrying leadership weight — or growing into it — you don't have to navigate it alone.
            </p>
            <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] mb-8 sm:mb-10">
              Let's talk.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <a 
                href="/contact" 
                className="px-8 sm:px-10 py-4 sm:py-5 bg-[#1A1A1A] text-white font-medium text-sm sm:text-base hover:bg-[#1A1A1A]/90 transition-colors"
              >
                Start a Conversation
              </a>
              <a 
                href={process.env.NEXT_PUBLIC_CALENDLY_SCHEDULING_URL || import.meta.env.VITE_CALENDLY_SCHEDULING_URL || 'https://calendly.com/bartpaden/1-on-1-mentorships'} 
                target="_blank"
                rel="noopener noreferrer"
                className="px-8 sm:px-10 py-4 sm:py-5 bg-transparent text-[#1A1A1A] font-medium text-sm sm:text-base border border-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white transition-colors"
              >
                Book Time
              </a>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
