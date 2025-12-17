import React, { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import SEO from '../components/SEO';

const sections = [
  { id: 'work-found-me', label: 'The Work Found Me' },
  { id: 'insurance-moment', label: 'The Insurance Moment' },
  { id: 'real-world', label: 'Leadership in the Real World' },
  { id: 'years-tested', label: 'The Years That Tested Everything' },
  { id: 'questions', label: 'The Questions That Followed' },
  { id: 'posture', label: 'The Posture That Shapes My Leadership' },
  { id: 'research', label: 'The Research That Made It Clear' },
  { id: 'show-up', label: 'How I Show Up Today' },
  { id: 'ready', label: 'If You\'re Ready' }
];

export default function About() {
  const [scrollY, setScrollY] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [activeSection, setActiveSection] = useState('work-found-me');
  const [showStickyNav, setShowStickyNav] = useState(false);
  const sectionRefs = useRef({});
  const clickedSectionRef = useRef(null);
  const heroRef = useRef(null);

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
      
      // Show sticky nav after scrolling past hero
      if (heroRef.current) {
        const heroBottom = heroRef.current.offsetTop + heroRef.current.offsetHeight;
        setShowStickyNav(window.scrollY > heroBottom - 100);
      }
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  // Intersection Observer for active section detection
  useEffect(() => {
    const observerOptions = {
      root: null,
      rootMargin: '-20% 0px -60% 0px',
      threshold: 0
    };

    const observerCallback = (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !clickedSectionRef.current) {
          const sectionId = entry.target.id;
          setActiveSection(sectionId);
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);

    sections.forEach((section) => {
      const element = sectionRefs.current[section.id];
      if (element) {
        observer.observe(element);
      }
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  const scrollToSection = (id, event) => {
    clickedSectionRef.current = id;
    
    const element = sectionRefs.current[id];
    if (element) {
      const offset = 100;
      const elementPosition = element.offsetTop - offset;
      window.scrollTo({
        top: elementPosition,
        behavior: 'smooth'
      });
      
      setTimeout(() => {
        clickedSectionRef.current = null;
      }, 1000);
    }
  };

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
        <section ref={heroRef} className="w-full bg-white py-24 sm:py-32 md:py-40 lg:py-48 relative overflow-hidden">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
              {/* Left Content */}
              <div>
                <h1 className="font-serif text-7xl sm:text-8xl md:text-9xl font-bold text-[#1A1A1A] mb-6 sm:mb-8 leading-[0.9] tracking-tight">
                  About Bart
                </h1>
                <h2 className="text-xl sm:text-2xl md:text-3xl font-light text-[#1A1A1A]/70 mb-6 sm:mb-8 leading-relaxed">
                  Thirty-two years building people, teams, and leaders who do work that matters.
                </h2>
              </div>
              
              {/* Right: 3-Layer Parallax */}
              {!isMobile && (
                <div className="relative w-full max-w-lg lg:max-w-xl mx-auto lg:mx-0 hidden lg:block" style={{ aspectRatio: '1/1', height: 'auto' }}>
                  {/* Layer 3 (back) - Monitor - can move vertically */}
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
                  
                  {/* Layer 2 (middle) - Archy - moves horizontally only (grounded) */}
                  <div 
                    className="absolute inset-0 z-20"
                    style={{ 
                      transform: `translateX(${scrollY * 0.08}px)`
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
                  
                  {/* Layer 1 (front) - Cartoon Bart - moves horizontally only (grounded) */}
                  <div 
                    className="absolute inset-0 z-30"
                    style={{ 
                      transform: `translateX(${scrollY * -0.12}px)`
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

        {/* Table of Contents - Initial */}
        <section className="w-full bg-[#FAFAF9] py-8 sm:py-10">
          <div className="container mx-auto px-4 sm:px-6 md:px-12 max-w-4xl">
            <nav aria-label="Table of contents">
              <div className="flex flex-wrap gap-2 sm:gap-3 justify-center">
                {sections.map((section) => (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      scrollToSection(section.id, e);
                    }}
                    className={`inline-block px-3 py-1 text-xs font-medium uppercase tracking-wider border transition-colors ${
                      activeSection === section.id
                        ? 'bg-[#1A1A1A] text-white border-[#1A1A1A]'
                        : 'bg-transparent text-[#1A1A1A] border-[#1A1A1A]/10 hover:border-[#C85A3C] hover:text-[#C85A3C]'
                    }`}
                  >
                    {section.label}
                  </a>
                ))}
              </div>
            </nav>
          </div>
        </section>

        {/* Sticky Navigation - Appears after scrolling past hero */}
        <nav 
          aria-label="Sticky table of contents"
          className={`fixed top-20 left-0 right-0 z-40 bg-white border-b border-[#1A1A1A]/10 transition-transform duration-300 ${
            showStickyNav ? 'translate-y-0' : '-translate-y-full'
          }`}
        >
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-7xl mx-auto py-3 sm:py-4">
              <div className="flex flex-wrap gap-2 sm:gap-3 justify-center items-center">
                {sections.map((section) => (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      scrollToSection(section.id, e);
                    }}
                    className={`inline-block px-3 py-1.5 text-xs font-medium uppercase tracking-wider border transition-all ${
                      activeSection === section.id
                        ? 'bg-[#1A1A1A] text-white border-[#1A1A1A]'
                        : 'bg-transparent text-[#1A1A1A] border-[#1A1A1A]/10 hover:border-[#C85A3C] hover:text-[#C85A3C]'
                    }`}
                  >
                    {section.label}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </nav>

        {/* The Work Found Me Before I Knew Its Name */}
        <section 
          id="work-found-me" 
          ref={(el) => (sectionRefs.current['work-found-me'] = el)} 
          className="w-full bg-[#FAFAF9] py-16 sm:py-24 md:py-32 scroll-mt-32"
        >
          <div className="container mx-auto px-4 sm:px-6 md:px-12 max-w-4xl">
            <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-8 lg:gap-12 items-start">
              <div className="flex justify-center lg:justify-start">
                <img
                  src="/images/bart-headshot-002.jpg"
                  alt="Bart"
                  className="w-60 h-60 object-contain rounded-sm"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              </div>
              <div className="space-y-3 sm:space-y-4">
                <div className="flex items-center mb-8 sm:mb-10">
                  <div className="w-1 h-10 sm:h-12 md:h-14 bg-[#C85A3C] mr-4 sm:mr-6"></div>
                  <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-[#1A1A1A] tracking-tight">
                    The Work Found Me Before I Knew Its Name
                  </h2>
                </div>
                <p className="text-base sm:text-lg leading-normal text-[#1A1A1A] mb-3 sm:mb-4">
                  I stepped into the web and software world in 1993 — a college kid who loved solving problems and making things work. I wasn't chasing authority. I wasn't trying to "be a leader." I was the person people trusted when something was broken, confusing, or on fire.
                </p>
                <p className="text-base sm:text-lg leading-normal text-[#1A1A1A] mb-3 sm:mb-4">
                  I didn't think of myself as a leader. I thought of myself as someone who helped. And when people consistently trust you to help them, <strong>that trust is a form of leadership</strong> long before anyone calls it that.
                </p>
                <p className="text-base sm:text-lg leading-normal text-[#1A1A1A]">
                  For years, quietly and without a title, I guided clients through uncertainty, supported teammates through complexity, and held responsibility because it was the right thing to do — not because it was written on a job description. But in 2010, everything became unmistakably clear.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* The Insurance Moment - DARK SECTION */}
        <section 
          id="insurance-moment" 
          ref={(el) => (sectionRefs.current['insurance-moment'] = el)} 
          className="w-full bg-[#1A1A1A] py-16 sm:py-24 md:py-32 scroll-mt-32"
        >
          <div className="container mx-auto px-4 sm:px-6 md:px-12 max-w-4xl">
            <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-8 sm:mb-10 tracking-tight">
              The Insurance Moment
            </h2>
            <p className="text-base sm:text-lg leading-normal text-white mb-3 sm:mb-4">
              My first full-time employee stood in my doorway and asked if I could provide insurance.
            </p>
            <p className="text-base sm:text-lg leading-normal text-white mb-3 sm:mb-4">
              He wasn't asking for a perk — he was asking for stability. And the truth was simple: I didn't own the company. I led a division inside it. I couldn't snap my fingers and create benefits. If this was going to happen, I would have to absorb the cost.
            </p>
            <p className="text-base sm:text-lg leading-normal text-white mb-3 sm:mb-4">
              So I went to the owner and negotiated to reduce my own income so his insurance could be covered. It wasn't a dramatic number, but things were tight at the time, and it mattered. It was a sacrifice — not for optics, not for strategy, but for the person who trusted me enough to ask.
            </p>
            <p className="text-base sm:text-lg leading-normal text-white mb-3 sm:mb-4">
              I didn't have the margin. I didn't have the structure. But I had a responsibility — to him.
            </p>
            <p className="text-base sm:text-lg leading-normal text-white mb-3 sm:mb-4">
              That was the moment <strong>instinct became intention</strong>. Leadership wasn't a title. <strong>It was service</strong>. It was responsibility.
            </p>
            <p className="text-base sm:text-lg leading-normal text-white">
              I had been leading long before that day. But that day made it unmistakable.
            </p>
          </div>
        </section>

        {/* Leadership in the Real World */}
        <section 
          id="real-world" 
          ref={(el) => (sectionRefs.current['real-world'] = el)} 
          className="w-full bg-white py-16 sm:py-24 md:py-32 scroll-mt-32"
        >
          <div className="container mx-auto px-4 sm:px-6 md:px-12 max-w-4xl">
            <div className="flex items-center mb-8 sm:mb-10">
              <div className="w-1 h-10 sm:h-12 md:h-14 bg-[#C85A3C] mr-4 sm:mr-6"></div>
              <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-[#1A1A1A] tracking-tight">
                Leadership in the Real World
              </h2>
            </div>
            <p className="text-base sm:text-lg leading-normal text-[#1A1A1A] mb-3 sm:mb-4">
              My leadership education didn't come from seminars or frameworks. It came from real people, real pressure, real opportunity, and real moments that changed lives.
            </p>
            <p className="text-base sm:text-lg leading-normal text-[#1A1A1A] mb-3 sm:mb-4">
              I learned leadership in rooms where tension could be felt before a word was spoken. I learned it when silence carried more weight than instruction. I learned it in moments that required courage — and in moments that required restraint. I learned it when people trusted me enough to ask for help… and when they trusted me enough to tell me truths I didn't want to hear.
            </p>
            <p className="text-base sm:text-lg leading-normal text-[#1A1A1A] mb-3 sm:mb-4">
              But I also learned it in the good moments — the ones leaders often overlook.
            </p>
            <p className="text-base sm:text-lg leading-normal text-[#1A1A1A] mb-3 sm:mb-4">
              I learned leadership in moments of unexpected success, when people realized they were capable of more than they believed. In the quiet pride of someone who completed work they once feared. In the excitement of a first home purchase, a new baby on the way, or a marriage announcement whispered with joy. In victories that didn't belong to me but were shared with me because trust was real.
            </p>
            <p className="text-base sm:text-lg leading-normal text-[#1A1A1A] mb-3 sm:mb-4">
              Leadership isn't only forged in difficulty. It's revealed just as clearly in growth, joy, breakthrough, and becoming. Pressure shapes leaders. But so does celebration. So does hope. So does watching someone rise.
            </p>
            <p className="text-base sm:text-lg leading-normal text-[#1A1A1A]">
              The real world taught me that <strong>leadership is present in every season</strong> — in the courage to face what's wrong, and in the gratitude to honor what's right. None of this was theory. It was lived.
            </p>
          </div>
        </section>

        {/* The Years That Tested Everything */}
        <section 
          id="years-tested" 
          ref={(el) => (sectionRefs.current['years-tested'] = el)} 
          className="w-full bg-[#FAFAF9] py-16 sm:py-24 md:py-32 scroll-mt-32"
        >
          <div className="container mx-auto px-4 sm:px-6 md:px-12 max-w-4xl">
            <div className="flex items-center mb-8 sm:mb-10">
              <div className="w-1 h-10 sm:h-12 md:h-14 bg-[#C85A3C] mr-4 sm:mr-6"></div>
              <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-[#1A1A1A] tracking-tight">
                The Years That Tested Everything
              </h2>
            </div>
            <p className="text-base sm:text-lg leading-normal text-[#1A1A1A] mb-3 sm:mb-4">
              From 2004 to 2010, I worked alone — wearing every hat, carrying every weight, building something piece by piece.
            </p>
            <p className="text-base sm:text-lg leading-normal text-[#1A1A1A] mb-3 sm:mb-4">
              From 2010 to 2012, the work grew, and so did the responsibility; I began hiring, shaping a team, and learning what it meant to lead people whose livelihoods touched mine.
            </p>
            <p className="text-base sm:text-lg leading-normal text-[#1A1A1A] mb-3 sm:mb-4">
              And from 2012 to 2022, I co-led a software company through seasons of extreme growth, strain, compression, expansion, and transition — years that altered me in ways I couldn't have learned anywhere else.
            </p>
            <p className="text-base sm:text-lg leading-normal text-[#1A1A1A] mb-3 sm:mb-4">
              Some days felt like momentum. Some days felt like pushing a stalled engine uphill. I watched people grow into leaders they never expected to become. And I watched how misalignment and pressure, when left unnamed, can slowly tear everything apart.
            </p>
            <p className="text-base sm:text-lg leading-normal text-[#1A1A1A] mb-3 sm:mb-4">
              Those years taught me things I couldn't have learned any other way. I saw firsthand how <a href="/journal/when-leadership-sank-kodak" className="text-[#C85A3C] hover:text-[#B54A32] underline" onClick={(e) => { e.preventDefault(); window.history.pushState({}, '', '/journal/when-leadership-sank-kodak'); window.dispatchEvent(new PopStateEvent('popstate')); window.scrollTo({ top: 0, behavior: 'instant' }); }}>leadership failures</a> can destroy even the strongest organizations:
            </p>
            <ul className="list-disc space-y-3 sm:space-y-4 mb-3 sm:mb-4 pl-6 sm:pl-8">
              <li className="text-base sm:text-lg leading-normal text-[#1A1A1A] marker:text-[#C85A3C]">
                What people consistently do matters far more than what they say.
              </li>
              <li className="text-base sm:text-lg leading-normal text-[#1A1A1A] marker:text-[#C85A3C]">
                Clarity settles a room faster than authority ever will.
              </li>
              <li className="text-base sm:text-lg leading-normal text-[#1A1A1A] marker:text-[#C85A3C]">
                Confusion spreads fast if the leader doesn't tell the truth.
              </li>
              <li className="text-base sm:text-lg leading-normal text-[#1A1A1A] marker:text-[#C85A3C]">
                Pressure exposes whether culture is solid or fragile.
              </li>
              <li className="text-base sm:text-lg leading-normal text-[#1A1A1A] marker:text-[#C85A3C]">
                And a single act of integrity can rebuild trust faster than a thousand speeches.
              </li>
            </ul>
            <p className="text-base sm:text-lg leading-normal text-[#1A1A1A] mb-3 sm:mb-4">
              Those years stripped away every illusion I had about leadership. They taught me humility. They taught me courage. They taught me restraint.
            </p>
            <p className="text-base sm:text-lg leading-normal text-[#1A1A1A]">
              And they taught me that people rarely remember what you protected for yourself— but <strong>they always remember how you protected them</strong>.
            </p>
          </div>
        </section>

        {/* The Questions That Followed */}
        <section 
          id="questions" 
          ref={(el) => (sectionRefs.current.questions = el)} 
          className="w-full bg-white py-16 sm:py-24 md:py-32 scroll-mt-32"
        >
          <div className="container mx-auto px-4 sm:px-6 md:px-12 max-w-4xl">
            <div className="flex items-center mb-8 sm:mb-10">
              <div className="w-1 h-10 sm:h-12 md:h-14 bg-[#C85A3C] mr-4 sm:mr-6"></div>
              <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-[#1A1A1A] tracking-tight">
                The Questions That Followed
              </h2>
            </div>
            <p className="text-base sm:text-lg leading-normal text-[#1A1A1A] mb-3 sm:mb-4">
              Stepping away from the company I helped build forced a reckoning. There were mornings when the silence felt heavy. Afternoons spent replaying decisions. Nights asking questions I had avoided for years:
            </p>
            <ul className="list-disc space-y-3 sm:space-y-4 mb-3 sm:mb-4 pl-6 sm:pl-8">
              <li className="text-base sm:text-lg leading-normal text-[#1A1A1A] marker:text-[#C85A3C]">
                Did my leadership matter?
              </li>
              <li className="text-base sm:text-lg leading-normal text-[#1A1A1A] marker:text-[#C85A3C]">
                Did I leave people better than I found them?
              </li>
              <li className="text-base sm:text-lg leading-normal text-[#1A1A1A] marker:text-[#C85A3C]">
                Did the sacrifices mean anything?
              </li>
              <li className="text-base sm:text-lg leading-normal text-[#1A1A1A] marker:text-[#C85A3C]">
                Was the way I led actually good?
              </li>
            </ul>
            <p className="text-base sm:text-lg leading-normal text-[#1A1A1A] mb-3 sm:mb-4">
              These weren't professional questions. They were spiritual ones.
            </p>
            <p className="text-base sm:text-lg leading-normal text-[#1A1A1A]">
              That season of reflection became the foundation of a long-form project I hope to publish in 2026: Accidental CEO. If you want more of that story, Archy carries the full manuscript in his corpus — just ask him.
            </p>
          </div>
        </section>

        {/* The Posture That Shapes My Leadership */}
        <section 
          id="posture" 
          ref={(el) => (sectionRefs.current.posture = el)} 
          className="w-full bg-[#FAFAF9] py-16 sm:py-24 md:py-32 scroll-mt-32"
        >
          <div className="container mx-auto px-4 sm:px-6 md:px-12 max-w-4xl">
            <div className="flex items-center mb-8 sm:mb-10">
              <div className="w-1 h-10 sm:h-12 md:h-14 bg-[#C85A3C] mr-4 sm:mr-6"></div>
              <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-[#1A1A1A] tracking-tight">
                The Posture That Shapes My Leadership
              </h2>
            </div>
            <p className="text-base sm:text-lg leading-normal text-[#1A1A1A] mb-3 sm:mb-4">
              Two sentences have guided my leadership for decades: <a href="/journal/golden-rule-leadership-strategy" className="text-[#C85A3C] hover:text-[#B54A32] underline" onClick={(e) => { e.preventDefault(); window.history.pushState({}, '', '/journal/golden-rule-leadership-strategy'); window.dispatchEvent(new PopStateEvent('popstate')); window.scrollTo({ top: 0, behavior: 'instant' }); }}>The Golden Rule</a> — "treat others the way you would want to be treated." And: "I am second."
            </p>
            <p className="text-base sm:text-lg leading-normal text-[#1A1A1A] mb-3 sm:mb-4">
              The Golden Rule is ancient — rooted in Scripture, echoed in philosophy, and found across cultures. It has endured because it names something universal: leadership begins with valuing the person in front of you as much as you value yourself.
            </p>
            <p className="text-base sm:text-lg leading-normal text-[#1A1A1A] mb-3 sm:mb-4">
              And <strong>"I am second"</strong> is how that belief becomes action. It isn't about diminishing myself. It's about <strong>elevating the people who trust me</strong>.
            </p>
            <p className="text-base sm:text-lg leading-normal text-[#1A1A1A] mb-3 sm:mb-4">
              It's strength under control — the posture that keeps leadership steady, agile, and deeply human. It's the opposite of scoreboard leadership, which chases wins at the expense of people. Servant leaders build people first — and because of that, their teams outperform, endure, and grow.
            </p>
            <p className="text-base sm:text-lg leading-normal text-[#1A1A1A]">
              That posture has shaped every season of my career — in design, software, ownership, culture, and leadership. It's the thread that held steady even when everything else was shifting.
            </p>
          </div>
        </section>

        {/* The Research That Made It Clear */}
        <section 
          id="research" 
          ref={(el) => (sectionRefs.current.research = el)} 
          className="w-full bg-white py-16 sm:py-24 md:py-32 scroll-mt-32"
        >
          <div className="container mx-auto px-4 sm:px-6 md:px-12 max-w-4xl">
            <div className="flex items-center mb-8 sm:mb-10">
              <div className="w-1 h-10 sm:h-12 md:h-14 bg-[#C85A3C] mr-4 sm:mr-6"></div>
              <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-[#1A1A1A] tracking-tight">
                The Research That Made It Clear
              </h2>
            </div>
            <p className="text-base sm:text-lg leading-normal text-[#1A1A1A] mb-3 sm:mb-4">
              When the company was no longer mine to build, and the people I had developed were no longer mine to develop, the questions became unavoidable. Did any of it matter? Did people grow under my care? Was the way I led actually good?
            </p>
            <p className="text-base sm:text-lg leading-normal text-[#1A1A1A] mb-3 sm:mb-4">
              Those questions sent me into years of research across psychology, communication, neuroscience, anthropology, organizational behavior, and cultural theory. What I found didn't just validate the work — it explained it. The <a href="/journal/the-case-for-servant-leadership-part-1" className="text-[#C85A3C] hover:text-[#B54A32] underline" onClick={(e) => { e.preventDefault(); window.history.pushState({}, '', '/journal/the-case-for-servant-leadership-part-1'); window.dispatchEvent(new PopStateEvent('popstate')); window.scrollTo({ top: 0, behavior: 'instant' }); }}>servant leadership research</a> confirmed what I had lived.
            </p>
            <p className="text-base sm:text-lg leading-normal text-[#1A1A1A]">
              There were names for the instincts I followed. There was data behind the decisions I made. There were patterns behind the results I saw. That research became the book. The book became Archetype Original. Archetype Original became my next act.
            </p>
          </div>
        </section>

        {/* How I Show Up Today */}
        <section 
          id="show-up" 
          ref={(el) => (sectionRefs.current['show-up'] = el)} 
          className="w-full bg-[#FAFAF9] py-16 sm:py-24 md:py-32 scroll-mt-32"
        >
          <div className="container mx-auto px-4 sm:px-6 md:px-12 max-w-4xl">
            <div className="flex items-center mb-8 sm:mb-10">
              <div className="w-1 h-10 sm:h-12 md:h-14 bg-[#C85A3C] mr-4 sm:mr-6"></div>
              <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-[#1A1A1A] tracking-tight">
                How I Show Up Today
              </h2>
            </div>
            <p className="text-base sm:text-lg leading-normal text-[#1A1A1A] mb-3 sm:mb-4">
              Today, I work with leaders, teams, and organizations who want to build something healthy — something real, sustainable, and worth belonging to.
            </p>
            <div className="space-y-4 sm:space-y-5">
              <div>
                <p className="text-base sm:text-lg leading-normal text-[#1A1A1A] mb-2">
                  <strong className="font-bold">Mentorship:</strong>
                </p>
                <p className="text-base sm:text-lg leading-normal text-[#1A1A1A] mb-2">
                  Helping leaders at every level gain clarity, courage, and direction. I don't push people forward — I <a href="/journal/clearing-the-path" className="text-[#C85A3C] hover:text-[#B54A32] underline" onClick={(e) => { e.preventDefault(); window.history.pushState({}, '', '/journal/clearing-the-path'); window.dispatchEvent(new PopStateEvent('popstate')); window.scrollTo({ top: 0, behavior: 'instant' }); }}>clear what's in their way</a>.
                </p>
              </div>
              <div>
                <p className="text-base sm:text-lg leading-normal text-[#1A1A1A] mb-2">
                  <strong className="font-bold">Consulting:</strong>
                </p>
                <p className="text-base sm:text-lg leading-normal text-[#1A1A1A] mb-2">
                  Strengthening systems, communication, alignment, and culture so leaders can build what they actually intend. I help identify and resolve <a href="/journal/leadership-bottlenecks-will-choke-the-life-out-of-a-business" className="text-[#C85A3C] hover:text-[#B54A32] underline" onClick={(e) => { e.preventDefault(); window.history.pushState({}, '', '/journal/leadership-bottlenecks-will-choke-the-life-out-of-a-business'); window.dispatchEvent(new PopStateEvent('popstate')); window.scrollTo({ top: 0, behavior: 'instant' }); }}>leadership bottlenecks</a> that stifle innovation and growth.
                </p>
              </div>
              <div>
                <p className="text-base sm:text-lg leading-normal text-[#1A1A1A] mb-2">
                  <strong className="font-bold">Fractional Leadership:</strong>
                </p>
                <p className="text-base sm:text-lg leading-normal text-[#1A1A1A] mb-2">
                  Stepping in when teams need stability, clarity, or steady leadership through seasons of pressure or transition.
                </p>
              </div>
              <div>
                <p className="text-base sm:text-lg leading-normal text-[#1A1A1A] mb-2">
                  <strong className="font-bold">Speaking & Seminars:</strong>
                </p>
                <p className="text-base sm:text-lg leading-normal text-[#1A1A1A] mb-2">
                  Bringing lived leadership, cultural insight, and research-backed understanding into rooms that need clarity and language for what they're experiencing.
                </p>
              </div>
              <div>
                <p className="text-base sm:text-lg leading-normal text-[#1A1A1A] mb-2">
                  <strong className="font-bold">Training & Education:</strong>
                </p>
                <p className="text-base sm:text-lg leading-normal text-[#1A1A1A] mb-2">
                  Developing tools, frameworks, and curriculum that help people understand leadership, culture, and human behavior in ways they can immediately apply.
                </p>
              </div>
            </div>
            <p className="text-base sm:text-lg leading-normal text-[#1A1A1A] mt-6 sm:mt-8 mb-3 sm:mb-4">
              The work isn't programmatic or pre-packaged.
            </p>
            <p className="text-base sm:text-lg leading-normal text-[#1A1A1A] mb-3 sm:mb-4">
              It adapts to the people, the season, and the reality leaders are navigating.
            </p>
            <p className="text-base sm:text-lg leading-normal text-[#1A1A1A]">
              What I bring is presence, clarity, responsibility, and decades of lived leadership shaped by real environments, real pressure, and real people.
            </p>
          </div>
        </section>

        {/* If You're Ready - CTA */}
        <section 
          id="ready" 
          ref={(el) => (sectionRefs.current.ready = el)} 
          className="w-full bg-white py-16 sm:py-24 md:py-32 scroll-mt-32"
        >
          <div className="container mx-auto px-4 sm:px-6 md:px-12 max-w-4xl">
            <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-[#1A1A1A] mb-8 sm:mb-10 tracking-tight">
              If You're Ready
            </h2>
            <p className="text-base sm:text-lg leading-normal text-[#1A1A1A] mb-3 sm:mb-4">
              If you're carrying leadership weight — or growing into it — you don't have to navigate it alone.
            </p>
            <p className="text-base sm:text-lg leading-normal text-[#1A1A1A] mb-3 sm:mb-4">
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
