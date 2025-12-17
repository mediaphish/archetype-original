/**
 * Voice Guideline:
 * {
 *   "voice_guideline": {
 *     "default": "first-person singular",
 *     "exceptions": ["collaboration", "Archetype philosophy"],
 *     "owner": "Bart Paden"
 *   }
 * }
 */
import React, { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import SEO from '../components/SEO';

const sections = [
  { id: 'intro', label: 'Intro' },
  { id: 'foundation', label: 'The Foundation' },
  { id: 'golden-rule', label: 'The Human Lens' },
  { id: 'business-lens', label: 'Beyond Leadership' },
  { id: 'clarity-over-chaos', label: 'Clarity Over Chaos' },
  { id: 'trust-is-currency', label: 'Trust Is the Currency' },
  { id: 'accountability', label: 'Accountability Without Ego' },
  { id: 'simplicity', label: 'Simplicity Wins' },
  { id: 'leadership-is-personal', label: 'Leadership Is Personal' },
  { id: 'research', label: 'Why It Works' },
  { id: 'standard', label: 'The Standard' },
  { id: 'closing', label: 'Closing' }
];

// Helper to render pull quotes (paragraphs starting with >)
const renderParagraph = (text, key) => {
  if (text.trim().startsWith('>')) {
    const quoteText = text.trim().substring(1).trim();
    return (
      <blockquote key={key} className="border-l-4 border-[#C85A3C] pl-8 sm:pl-10 my-12 sm:my-16">
        <p className="text-2xl sm:text-3xl md:text-4xl italic font-serif text-[#1A1A1A] leading-relaxed">
          "{quoteText}"
        </p>
      </blockquote>
    );
  }
  return (
    <p key={key} className="text-base sm:text-lg leading-normal text-[#1A1A1A] mb-3 sm:mb-4">
      {text}
    </p>
  );
};

export default function Philosophy() {
  const [activeSection, setActiveSection] = useState('intro');
  const [scrollY, setScrollY] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [showStickyNav, setShowStickyNav] = useState(false);
  const sectionRefs = useRef({});
  const clickedSectionRef = useRef(null);
  const heroRef = useRef(null);

  // Mobile detection and scroll tracking for parallax
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024); // lg breakpoint - disable parallax on mobile
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    const handleScroll = () => {
      // Check mobile directly in handler to avoid stale closure
      if (window.innerWidth >= 1024) {
        setScrollY(window.scrollY);
      }
      
      // Show sticky nav after scrolling past hero
      if (heroRef.current) {
        const heroBottom = heroRef.current.offsetTop + heroRef.current.offsetHeight;
        setShowStickyNav(window.scrollY > heroBottom - 100);
      }
    };

    // Initial scroll position
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
    "@type": "CreativeWork",
    "name": "Philosophy",
    "author": {
      "@type": "Person",
      "name": "Bart Paden"
    },
    "about": ["Leadership", "Servant Leadership", "Business Culture"]
  };

  return (
    <>
      <SEO pageKey="philosophy" />
      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify(jsonLd)}
        </script>
      </Helmet>
      
      <div className="min-h-screen bg-[#FAFAF9]">
        {/* Hero Section with 3-Layer Parallax */}
        <section ref={heroRef} className="w-full bg-white py-24 sm:py-32 md:py-40 lg:py-48 relative overflow-hidden">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
              {/* Left Content */}
              <div>
                <h1 className="font-serif text-7xl sm:text-8xl md:text-9xl font-bold text-[#1A1A1A] mb-6 sm:mb-8 leading-[0.9] tracking-tight">
                  Philosophy
                </h1>
                <p className="text-xl sm:text-2xl md:text-3xl font-light leading-relaxed text-[#1A1A1A]/70">
                  Leadership is stewardship.
                </p>
              </div>
              
              {/* Right: 3-Layer Parallax (Desktop Only) */}
              <div className="relative h-[500px] hidden lg:block">
                {/* Layer 3: Background - Moves VERTICALLY (slowest) */}
                <div 
                  className="absolute inset-0 z-10"
                  style={{ 
                    transform: `translateY(${scrollY * 0.05}px)`,
                    transition: 'transform 0.1s ease-out'
                  }}
                >
                  <img 
                    src="/images/philosophy-layer-3.png" 
                    alt="Philosophy Background" 
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                </div>
                
                {/* Layer 2: Middle - Moves HORIZONTALLY ONLY (grounded) */}
                <div 
                  className="absolute inset-0 z-20"
                  style={{ 
                    transform: `translateX(${scrollY * 0.08}px)`,
                    transition: 'transform 0.1s ease-out'
                  }}
                >
                  <img 
                    src="/images/philosophy-layer-2.png" 
                    alt="Philosophy Middle Layer" 
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                </div>
                
                {/* Layer 1: Archy - Moves HORIZONTALLY ONLY (no vertical) */}
                <div 
                  className="absolute inset-0 z-30"
                  style={{ 
                    transform: `translateX(${scrollY * -0.15}px)`,
                    transition: 'transform 0.1s ease-out'
                  }}
                >
                  <img 
                    src="/images/philosophy-layer-1.png" 
                    alt="Archy" 
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                </div>
              </div>
              
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

        {/* Leadership is Stewardship Intro */}
        <section 
          id="intro" 
          ref={(el) => (sectionRefs.current.intro = el)} 
          className="w-full bg-[#FAFAF9] py-16 sm:py-20 md:py-24 scroll-mt-32"
        >
          <div className="container mx-auto px-4 sm:px-6 md:px-12 max-w-4xl">
            <div className="space-y-4 sm:space-y-5">
              <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#1A1A1A] font-serif leading-tight">
                Leadership is stewardship.
              </p>
              <p className="text-base sm:text-lg leading-normal text-[#1A1A1A] mb-3 sm:mb-4">
                It's not about holding power—it's about holding responsibility.
              </p>
              <p className="text-base sm:text-lg leading-normal text-[#1A1A1A] mb-3 sm:mb-4">
                I've spent over three decades watching companies rise and fall, teams thrive and fracture, and leaders find or lose their way. What separates the healthy from the broken isn't intelligence, charisma, or vision—it's alignment. When what you believe, say, and do line up, trust takes root. When they don't, people start protecting themselves instead of the mission.
              </p>
              <p className="text-base sm:text-lg leading-normal text-[#1A1A1A] mb-3 sm:mb-4">
                Archetype Original exists to help leaders rebuild that alignment—to make clarity, character, and culture tangible again.
              </p>
            </div>
          </div>
        </section>

        {/* Section 2: The Foundation — Servant Leadership */}
        <section 
          id="foundation" 
          ref={(el) => (sectionRefs.current.foundation = el)} 
          className="w-full bg-[#FAFAF9] py-16 sm:py-24 md:py-32 scroll-mt-32"
        >
          <div className="container mx-auto px-4 sm:px-6 md:px-12 max-w-4xl">
            <div className="space-y-6">
              <div className="flex items-center mb-8 sm:mb-10">
                <div className="w-1 h-10 sm:h-12 md:h-14 bg-[#C85A3C] mr-4 sm:mr-6"></div>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#1A1A1A] font-serif tracking-tight leading-tight">
                  The Foundation — Servant Leadership
                </h2>
              </div>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                <a href="/journal/the-case-for-servant-leadership-part-1" className="text-[#C85A3C] hover:text-[#B54A32] underline" onClick={(e) => { e.preventDefault(); window.history.pushState({}, '', '/journal/the-case-for-servant-leadership-part-1'); window.dispatchEvent(new PopStateEvent('popstate')); window.scrollTo({ top: 0, behavior: 'instant' }); }}>Servant leadership</a> has been mischaracterized for years. It isn't weakness, softness, or endless sacrifice. It is strength under control — strength for the good of others, not at the expense of them.
              </p>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                At its core, servant leadership is stewardship of people and purpose.
              </p>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                The leader's role is to ensure the people in their care can thrive in theirs.
              </p>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                Practically, this means accountability, clarity, empathy, and example. It means recognizing the wake you leave behind and taking responsibility for it. When leaders lead like this, organizations stabilize, trust rebounds, and culture becomes a place people can grow inside of instead of survive.
              </p>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                Servant leadership is the spine of everything I teach — but it is not the whole skeleton. It is the foundation that the rest of the Archetype philosophy is built on.
              </p>
            </div>
          </div>
        </section>

        {/* Section 3: The Human Lens */}
        <section 
          id="golden-rule" 
          ref={(el) => (sectionRefs.current['golden-rule'] = el)} 
          className="w-full bg-white py-16 sm:py-24 md:py-32 scroll-mt-32"
        >
          <div className="container mx-auto px-4 sm:px-6 md:px-12 max-w-4xl">
            <div className="space-y-6">
              <div className="flex items-center mb-8 sm:mb-10">
                <div className="w-1 h-10 sm:h-12 md:h-14 bg-[#C85A3C] mr-4 sm:mr-6"></div>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#1A1A1A] font-serif tracking-tight leading-tight">
                  The Human Lens
                </h2>
              </div>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                Faith quietly shapes everything I do. <a href="/journal/golden-rule-leadership-strategy" className="text-[#C85A3C] hover:text-[#B54A32] underline" onClick={(e) => { e.preventDefault(); window.history.pushState({}, '', '/journal/golden-rule-leadership-strategy'); window.dispatchEvent(new PopStateEvent('popstate')); window.scrollTo({ top: 0, behavior: 'instant' }); }}>The Golden Rule</a> — treat people the way you want to be treated — isn't just morality; it's mechanism. It is one of the most reliable drivers of trust and performance I've seen in 32 years.
              </p>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                Alongside that sits a second principle that has shaped every season of my leadership:
              </p>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                I am second. Not smaller. Not weaker. Simply committed to serving the people I lead before serving my own comfort.
              </p>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                It's a posture of strength under control — power used to protect, not to dominate. A leader who puts themselves first creates fear. A leader who puts others first creates trust, safety, and the conditions for people to rise.
              </p>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                When you treat people with dignity, you create the conditions for trust. When you create trust, people contribute with energy, confidence, and ownership.
              </p>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                Simple. Timeless. Proven.
              </p>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                This principle scales. It works with executives, managers, teams, and students. It works in moments of conflict and moments of growth. Empathy and respect don't become obsolete when the stakes rise — they become essential.
              </p>
            </div>
          </div>
        </section>

        {/* Section 4: Beyond Leadership — The Business Lens */}
        <section 
          id="business-lens" 
          ref={(el) => (sectionRefs.current['business-lens'] = el)} 
          className="w-full bg-[#FAFAF9] py-16 sm:py-24 md:py-32 scroll-mt-32"
        >
          <div className="container mx-auto px-4 sm:px-6 md:px-12 max-w-4xl">
            <div className="space-y-6">
              <div className="flex items-center mb-8 sm:mb-10">
                <div className="w-1 h-10 sm:h-12 md:h-14 bg-[#C85A3C] mr-4 sm:mr-6"></div>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#1A1A1A] font-serif tracking-tight leading-tight">
                  Beyond Leadership — The Business Lens
                </h2>
              </div>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                Leadership alone isn't enough. Culture and clarity mean little without functional systems that support them.
              </p>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                Every organization has non-negotiables: cash flow, delivery, roles, accountability, sustainability. Servant leadership doesn't ignore those realities — it humanizes them.
              </p>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                Leadership and business meet in a single question:
              </p>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                How do we build systems that serve both people and performance?
              </p>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                That's where most of my work happens — turning beliefs into operational design.
              </p>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                A healthy company:
              </p>
              <ul className="list-disc space-y-3 pl-6 sm:pl-8">
                <li className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] marker:text-[#C85A3C]">
                  Aligns purpose with structure.
                </li>
                <li className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] marker:text-[#C85A3C]">
                  Measures success with both numbers and morale.
                </li>
                <li className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] marker:text-[#C85A3C]">
                  Protects culture as deliberately as it protects profit.
                </li>
              </ul>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                My role is to help leaders close the gap between what they say they value and what their systems actually produce.
              </p>
            </div>
          </div>
        </section>

        {/* Section 5: Clarity Over Chaos */}
        <section 
          id="clarity-over-chaos" 
          ref={(el) => (sectionRefs.current['clarity-over-chaos'] = el)} 
          className="w-full bg-white py-16 sm:py-24 md:py-32 scroll-mt-32"
        >
          <div className="container mx-auto px-4 sm:px-6 md:px-12 max-w-4xl">
            <div className="space-y-6">
              <div className="flex items-center mb-8 sm:mb-10">
                <div className="w-1 h-10 sm:h-12 md:h-14 bg-[#C85A3C] mr-4 sm:mr-6"></div>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#1A1A1A] font-serif tracking-tight leading-tight">
                  Clarity Over Chaos
                </h2>
              </div>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                Chaos rarely arrives loudly. It creeps in through vague communication, inconsistent standards, unclear authority, and emotional noise. Leaders often mistake charisma or momentum for clarity. But energy without direction leads nowhere.
              </p>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                Clarity is an act of service — it removes friction and frees people to move.
              </p>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                When I work with teams, we start by naming where chaos is hiding:
              </p>
              <ul className="list-disc space-y-3 pl-6 sm:pl-8">
                <li className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] marker:text-[#C85A3C]">
                  Conflicting messages
                </li>
                <li className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] marker:text-[#C85A3C]">
                  Undefined authority
                </li>
                <li className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] marker:text-[#C85A3C]">
                  Overlapping roles
                </li>
                <li className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] marker:text-[#C85A3C]">
                  Emotional noise
                </li>
              </ul>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                Once you name chaos, you can dismantle it. Teams that see clearly, move clearly.
              </p>
            </div>
          </div>
        </section>

        {/* Section 6: Trust Is the Currency */}
        <section 
          id="trust-is-currency" 
          ref={(el) => (sectionRefs.current['trust-is-currency'] = el)} 
          className="w-full bg-[#FAFAF9] py-16 sm:py-24 md:py-32 scroll-mt-32"
        >
          <div className="container mx-auto px-4 sm:px-6 md:px-12 max-w-4xl">
            <div className="space-y-6">
              <div className="flex items-center mb-8 sm:mb-10">
                <div className="w-1 h-10 sm:h-12 md:h-14 bg-[#C85A3C] mr-4 sm:mr-6"></div>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#1A1A1A] font-serif tracking-tight leading-tight">
                  Trust Is the Currency
                </h2>
              </div>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                You can have vision, strategy, and ambition, but without trust, none of it sticks. Trust is earned through small, consistent proof — behaviors people can count on.
              </p>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                It's built through honesty, reliability, and follow-through. It's broken by secrecy, ego, and spin.
              </p>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                High-trust environments reduce stress, increase collaboration, and free people to think instead of defend. But long before science named it, lived experience proved it.
              </p>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                When leaders are transparent and consistent, people breathe again. When they're not, everyone holds their breath and waits for the next impact.
              </p>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                Trust is the multiplier behind performance.
              </p>
            </div>
          </div>
        </section>

        {/* Section 7: Accountability Without Ego */}
        <section 
          id="accountability" 
          ref={(el) => (sectionRefs.current.accountability = el)} 
          className="w-full bg-white py-16 sm:py-24 md:py-32 scroll-mt-32"
        >
          <div className="container mx-auto px-4 sm:px-6 md:px-12 max-w-4xl">
            <div className="space-y-6">
              <div className="flex items-center mb-8 sm:mb-10">
                <div className="w-1 h-10 sm:h-12 md:h-14 bg-[#C85A3C] mr-4 sm:mr-6"></div>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#1A1A1A] font-serif tracking-tight leading-tight">
                  Accountability Without Ego
                </h2>
              </div>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                Accountability is not control. It is care. It communicates, "I believe in you enough to expect more."
              </p>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                Good leaders don't hide behind authority or policy. They make expectations clear, own their mistakes, and set standards without humiliating the people they lead.
              </p>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                Ego destroys accountability. When leadership becomes about protecting pride instead of protecting culture, progress stops.
              </p>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                I've learned this the hard way — and I practice it daily. Accountability is a mirror you hold up to yourself before you hold it up to anyone else.
              </p>
            </div>
          </div>
        </section>

        {/* Section 8: Simplicity Wins */}
        <section 
          id="simplicity" 
          ref={(el) => (sectionRefs.current.simplicity = el)} 
          className="w-full bg-[#FAFAF9] py-16 sm:py-24 md:py-32 scroll-mt-32"
        >
          <div className="container mx-auto px-4 sm:px-6 md:px-12 max-w-4xl">
            <div className="space-y-6">
              <div className="flex items-center mb-8 sm:mb-10">
                <div className="w-1 h-10 sm:h-12 md:h-14 bg-[#C85A3C] mr-4 sm:mr-6"></div>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#1A1A1A] font-serif tracking-tight leading-tight">
                  Simplicity Wins
                </h2>
              </div>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                Complexity looks impressive. Simplicity creates traction.
              </p>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                Very few things in leadership fail because they weren't complex enough. Most failures come from systems, expectations, or communication that people can't understand or follow.
              </p>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                If something can't be explained clearly, it can't be executed consistently.
              </p>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                Every engagement I lead focuses on distillation. We remove noise until what remains is useful, repeatable, and teachable.
              </p>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                A healthy organization is one people can explain without you in the room.
              </p>
            </div>
          </div>
        </section>

        {/* Section 9: Leadership Is Personal */}
        <section 
          id="leadership-is-personal" 
          ref={(el) => (sectionRefs.current['leadership-is-personal'] = el)} 
          className="w-full bg-white py-16 sm:py-24 md:py-32 scroll-mt-32"
        >
          <div className="container mx-auto px-4 sm:px-6 md:px-12 max-w-4xl">
            <div className="space-y-6">
              <div className="flex items-center mb-8 sm:mb-10">
                <div className="w-1 h-10 sm:h-12 md:h-14 bg-[#C85A3C] mr-4 sm:mr-6"></div>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#1A1A1A] font-serif tracking-tight leading-tight">
                  Leadership Is Personal
                </h2>
              </div>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                The best systems in the world can't fix a leader who has lost themselves.
              </p>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                That's why philosophy always returns to the person leading the humans. Health, self-awareness, emotional discipline, and integrity are not soft skills — they are prerequisites for sustainable leadership.
              </p>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                When the leader grows, the culture grows. When the leader fractures, the culture fractures.
              </p>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                Your business can't be healthier than you are.
              </p>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                Leadership is personal long before it becomes public.
              </p>
            </div>
          </div>
        </section>

        {/* Section 10: Why It Works */}
        <section 
          id="research" 
          ref={(el) => (sectionRefs.current.research = el)} 
          className="w-full bg-[#FAFAF9] py-16 sm:py-24 md:py-32 scroll-mt-32"
        >
          <div className="container mx-auto px-4 sm:px-6 md:px-12 max-w-4xl">
            <div className="space-y-6">
              <div className="flex items-center mb-8 sm:mb-10">
                <div className="w-1 h-10 sm:h-12 md:h-14 bg-[#C85A3C] mr-4 sm:mr-6"></div>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#1A1A1A] font-serif tracking-tight leading-tight">
                  Why It Works
                </h2>
              </div>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                Modern research across psychology, neuroscience, communication, behavioral economics, anthropology, and organizational behavior keeps confirming what decades of lived leadership have already shown: Leaders who create clarity, trust, and consistency unlock the best in their teams. The <a href="/journal/psychology-of-servant-leadership-part-1-servant-mindset" className="text-[#C85A3C] hover:text-[#B54A32] underline" onClick={(e) => { e.preventDefault(); window.history.pushState({}, '', '/journal/psychology-of-servant-leadership-part-1-servant-mindset'); window.dispatchEvent(new PopStateEvent('popstate')); window.scrollTo({ top: 0, behavior: 'instant' }); }}>psychology of servant leadership</a> explains why this approach works.
              </p>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                Healthy cultures aren't an accident. They are the predictable result of:
              </p>
              <ul className="list-disc space-y-3 pl-6 sm:pl-8">
                <li className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] marker:text-[#C85A3C]">
                  psychological safety
                </li>
                <li className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] marker:text-[#C85A3C]">
                  clear expectations
                </li>
                <li className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] marker:text-[#C85A3C]">
                  stable leadership behavior
                </li>
                <li className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] marker:text-[#C85A3C]">
                  aligned systems
                </li>
                <li className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] marker:text-[#C85A3C]">
                  shared accountability
                </li>
                <li className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] marker:text-[#C85A3C]">
                  human-centered communication
                </li>
                <li className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] marker:text-[#C85A3C]">
                  emotional regulation
                </li>
                <li className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] marker:text-[#C85A3C]">
                  meaningful work
                </li>
              </ul>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                Across thousands of studies, one pattern repeats: people think more clearly, decide more effectively, and perform with greater energy when they feel safe, supported, and aligned.
              </p>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                That research is what informs Culture Science — the discipline inside AO that synthesizes: human behavior, cultural dynamics, trust physiology, communication patterns, environmental psychology, leadership influence, team mechanics, and organizational clarity.
              </p>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                Culture Science doesn't chase single theories. It synthesizes the evidence into something leaders can actually use.
              </p>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                The truth is simple: People don't perform at their best for pressure or fear — they perform at their best for trust, clarity, and consistent leadership.
              </p>
            </div>
          </div>
        </section>

        {/* Section 11: The Standard */}
        <section 
          id="standard" 
          ref={(el) => (sectionRefs.current.standard = el)} 
          className="w-full bg-white py-16 sm:py-24 md:py-32 scroll-mt-32"
        >
          <div className="container mx-auto px-4 sm:px-6 md:px-12 max-w-4xl">
            <div className="space-y-6">
              <div className="flex items-center mb-8 sm:mb-10">
                <div className="w-1 h-10 sm:h-12 md:h-14 bg-[#C85A3C] mr-4 sm:mr-6"></div>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#1A1A1A] font-serif tracking-tight leading-tight">
                  The Standard
                </h2>
              </div>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                Every leader leaves a wake — good or bad, intentional or accidental. The goal isn't perfection; it's awareness.
              </p>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                When I recognize the impact of my decisions, my words, my systems, and my silence, I can steer differently. I can lead differently. I can create the conditions where others can thrive.
              </p>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                Leadership isn't about being in charge. It's about being responsible for what your influence creates.
              </p>
            </div>
          </div>
        </section>

        {/* Section 12: Closing */}
        <section 
          id="closing" 
          ref={(el) => (sectionRefs.current.closing = el)} 
          className="w-full bg-[#FAFAF9] py-16 sm:py-24 md:py-32 scroll-mt-32"
        >
          <div className="container mx-auto px-4 sm:px-6 md:px-12 max-w-4xl">
            <div className="space-y-6">
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                Servant leadership isn't a model; it's a mindset. It's what happens when responsibility meets compassion and clarity meets courage.
              </p>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                If that's the kind of leader you want to become — or rebuild yourself to be — let's start the conversation.
              </p>
            </div>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mt-12">
              <a
                href="/contact"
                className="px-10 py-5 bg-[#1A1A1A] text-white font-medium text-base hover:bg-[#1A1A1A]/90 transition-colors rounded-sm text-center"
              >
                Start a Conversation
              </a>
              <a
                href={process.env.NEXT_PUBLIC_CALENDLY_SCHEDULING_URL || import.meta.env.VITE_CALENDLY_SCHEDULING_URL || 'https://calendly.com/bartpaden/1-on-1-mentorships'}
                className="px-10 py-5 bg-transparent text-[#1A1A1A] font-medium text-base border-2 border-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white transition-colors rounded-sm text-center"
              >
                Explore Methods
              </a>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
