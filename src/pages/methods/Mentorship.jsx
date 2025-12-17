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
import SEO from '../../components/SEO';

const sections = [
  { id: 'opening', label: 'Opening' },
  { id: 'what-is', label: 'What Mentorship Really Is' },
  { id: 'who-for', label: 'Who Mentorship Is For' },
  { id: 'how-works', label: 'How Mentorship Works' },
  { id: 'culture-science', label: 'Culture Science & ALI' },
  { id: 'why-matters', label: 'Why Mentorship Matters' },
  { id: 'closing', label: 'Closing' }
];

export default function Mentorship() {
  const [scrollY, setScrollY] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [activeSection, setActiveSection] = useState('opening');
  const [showStickyNav, setShowStickyNav] = useState(false);
  const sectionRefs = useRef({});
  const clickedSectionRef = useRef(null);
  const heroRef = useRef(null);

  // Mobile detection and scroll tracking for parallax
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024); // lg breakpoint
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    const handleScroll = () => {
      if (window.innerWidth >= 1024) {
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
    "@type": "Service",
    "name": "Mentorship",
    "description": "Leadership mentorship for clarity, understanding, and direction"
  };

  return (
    <>
      <SEO pageKey="mentorship" />
      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify(jsonLd)}
        </script>
      </Helmet>
      
      <div className="min-h-screen bg-[#FAFAF9]">
        {/* Hero Section with Parallax */}
        <section ref={heroRef} className="w-full bg-white py-24 sm:py-32 md:py-40 lg:py-48">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
              {/* Left Column */}
              <div>
                <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl font-bold text-[#1A1A1A] mb-6 sm:mb-8 leading-[0.9] tracking-tight">
                  Mentorship
                </h1>
                <p className="text-xl sm:text-2xl md:text-3xl font-light leading-relaxed text-[#1A1A1A]/70">
                  Clarity is the first act of leadership — and the anchor leaders return to, whether they are rising, steady, or carrying more weight than anyone sees.
                </p>
              </div>
              
              {/* Right Column - Parallax (Desktop Only) */}
              <div className="relative h-[500px] hidden lg:block">
                {/* Layer 3: Back (slowest, vertical only) */}
                <div 
                  className="absolute inset-0 z-10"
                  style={{ 
                    transform: `translateY(${scrollY * 0.05}px)`,
                    transition: 'transform 0.1s ease-out'
                  }}
                >
                  <img 
                    src="/images/mentor-layer-3.png" 
                    alt="Mentorship Background" 
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
                    src="/images/mentor-layer-2.png" 
                    alt="Mentorship Middle Layer" 
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                </div>
                
                {/* Layer 1: Archy (horizontal only, no vertical) */}
                <div 
                  className="absolute inset-0 z-30"
                  style={{ 
                    transform: `translateX(${scrollY * -0.15}px)`,
                    transition: 'transform 0.1s ease-out'
                  }}
                >
                  <img 
                    src="/images/mentor-layer-1.png" 
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

        {/* Section 1: Opening Narrative */}
        <section className="w-full bg-white py-16 sm:py-24 md:py-32">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-4xl mx-auto space-y-6">
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                Leadership grows from the inside out. It shows up in the moments that shape people, steady teams, resolve tension, or move a vision forward. Some moments stretch a leader, some strengthen them, and some require more courage than expected. All of them demand clarity.
              </p>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                Mentorship exists to support leaders through the full spectrum of that experience — the growth, the pressure, the ambition, the uncertainty, the responsibility, and the desire to lead well before the weight arrives.
              </p>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                It's not coaching.
              </p>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                It's not performance management.
              </p>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                It's a grounded, honest place for leaders to think clearly again — to understand themselves, to understand their impact, and to build the internal steadiness required for healthy leadership that lasts.
              </p>
              <p className="text-lg sm:text-xl leading-relaxed text-[#1A1A1A] italic font-serif">
                Mentorship is where clarity becomes personal — and where leaders grow with intention, not just reaction.
              </p>
            </div>
          </div>
        </section>

        {/* Section 2: What Mentorship Really Is */}
        <section 
          id="what-is" 
          ref={(el) => (sectionRefs.current['what-is'] = el)} 
          className="w-full bg-[#FAFAF9] py-16 sm:py-24 md:py-32 scroll-mt-32"
        >
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="flex items-center mb-8 sm:mb-10">
                <div className="w-1 h-10 sm:h-12 md:h-14 bg-[#C85A3C] mr-4 sm:mr-6"></div>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#1A1A1A] font-serif tracking-tight leading-tight">
                  What Mentorship Really Is
                </h2>
              </div>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                Mentorship creates a space leaders rarely get: a space without expectation, without posturing, without the pressure to perform. I don't push people forward — I <a href="/journal/clearing-the-path" className="text-[#C85A3C] hover:text-[#B54A32] underline" onClick={(e) => { e.preventDefault(); window.history.pushState({}, '', '/journal/clearing-the-path'); window.dispatchEvent(new PopStateEvent('popstate')); window.scrollTo({ top: 0, behavior: 'instant' }); }}>clear what's in their way</a>.
              </p>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                It slows the pace long enough for truth to surface.
              </p>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                It allows leaders to speak plainly.
              </p>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                It reveals the deeper patterns shaping their decisions, their teams, and their culture.
              </p>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                The work centers on three anchors:
              </p>
              <div className="space-y-4">
                <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                  <strong className="text-[#1A1A1A]">Clarity</strong> — seeing reality without distortion
                </p>
                <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                  <strong className="text-[#1A1A1A]">Understanding</strong> — recognizing how behavior shapes culture
                </p>
                <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                  <strong className="text-[#1A1A1A]">Direction</strong> — identifying what needs to strengthen, shift, or settle
                </p>
              </div>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                Mentorship is a living conversation — reflective, honest, and grounded in real leadership lived over three decades. It's where instinct becomes insight, and insight becomes action.
              </p>
            </div>
          </div>
        </section>

        {/* Section 3: Who Mentorship Is For */}
        <section 
          id="who-for" 
          ref={(el) => (sectionRefs.current['who-for'] = el)} 
          className="w-full bg-white py-16 sm:py-24 md:py-32 scroll-mt-32"
        >
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="flex items-center mb-8 sm:mb-10">
                <div className="w-1 h-10 sm:h-12 md:h-14 bg-[#C85A3C] mr-4 sm:mr-6"></div>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#1A1A1A] font-serif tracking-tight leading-tight">
                  Who Mentorship Is For
                </h2>
              </div>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                Mentorship serves leaders across the full spectrum of leadership — those growing, those rising, those steady, and those carrying weight they didn't expect. Some come to strengthen what's already working. Some come to prepare for what's next. Some come because the pressure is real. Others come because they want to lead with intention.
              </p>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                Mentorship supports:
              </p>
              <ul className="list-disc space-y-3 pl-6 sm:pl-8">
                <li className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] marker:text-[#C85A3C]">
                  Leaders stepping into new roles or larger responsibility
                </li>
                <li className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] marker:text-[#C85A3C]">
                  Founders and executives seeking clarity, steadiness, or objective perspective
                </li>
                <li className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] marker:text-[#C85A3C]">
                  Students and emerging leaders building character before influence grows
                </li>
                <li className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] marker:text-[#C85A3C]">
                  High-potential individuals who want to grow with intention
                </li>
                <li className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] marker:text-[#C85A3C]">
                  Leaders navigating relational tension, cultural friction, or difficult decisions
                </li>
                <li className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] marker:text-[#C85A3C]">
                  Leaders experiencing momentum who want to maintain alignment and health
                </li>
                <li className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] marker:text-[#C85A3C]">
                  Healthy leaders who want refinement, reflection, and long-term sustainability
                </li>
                <li className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] marker:text-[#C85A3C]">
                  Anyone committed to becoming a more grounded, capable, and healthy leader
                </li>
              </ul>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                Mentorship strengthens potential, steadies pressure, and expands capacity — whether the leader is growing, recalibrating, or carrying more than anyone realizes.
              </p>
              <p className="text-lg sm:text-xl leading-relaxed text-[#1A1A1A] italic font-serif">
                The work is formational, developmental, stabilizing, and restorative — depending on what the leader needs most.
              </p>
            </div>
          </div>
        </section>

        {/* Section 4: How Mentorship Works */}
        <section 
          id="how-works" 
          ref={(el) => (sectionRefs.current['how-works'] = el)} 
          className="w-full bg-[#FAFAF9] py-16 sm:py-24 md:py-32 scroll-mt-32"
        >
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="flex items-center mb-8 sm:mb-10">
                <div className="w-1 h-10 sm:h-12 md:h-14 bg-[#C85A3C] mr-4 sm:mr-6"></div>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#1A1A1A] font-serif tracking-tight leading-tight">
                  How Mentorship Works
                </h2>
              </div>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                There is no curriculum, no formula, and no performative structure. Mentorship adapts to the real conditions in front of the leader:
              </p>
              <ul className="list-disc space-y-3 pl-6 sm:pl-8">
                <li className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] marker:text-[#C85A3C]">
                  the weight they're carrying
                </li>
                <li className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] marker:text-[#C85A3C]">
                  the relationships they're navigating
                </li>
                <li className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] marker:text-[#C85A3C]">
                  the decisions requiring clarity
                </li>
                <li className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] marker:text-[#C85A3C]">
                  the culture they're shaping
                </li>
                <li className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] marker:text-[#C85A3C]">
                  the behaviors influencing their people
                </li>
                <li className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] marker:text-[#C85A3C]">
                  the momentum or friction inside their environment
                </li>
              </ul>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                Sessions move between internal reflection, cultural insight, pattern recognition, strategic alignment, and practical leadership clarity. Every conversation returns to the same foundation: clarity, responsibility, steadiness, and sustainable leadership.
              </p>
              <p className="text-lg sm:text-xl leading-relaxed text-[#1A1A1A] italic font-serif">
                Leaders leave with more than perspective. They leave with alignment — the kind that changes how they show up tomorrow.
              </p>
            </div>
          </div>
        </section>

        {/* Section 5: How Culture Science & ALI Support the Work */}
        <section 
          id="culture-science" 
          ref={(el) => (sectionRefs.current['culture-science'] = el)} 
          className="w-full bg-white py-16 sm:py-24 md:py-32 scroll-mt-32"
        >
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="flex items-center mb-8 sm:mb-10">
                <div className="w-1 h-10 sm:h-12 md:h-14 bg-[#C85A3C] mr-4 sm:mr-6"></div>
                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#1A1A1A] font-serif tracking-tight leading-tight">
                  How Culture Science & ALI Support the Work
                </h2>
              </div>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                While still in development, Culture Science and the Archetype Leadership Index (ALI) quietly inform parts of this work. They help reveal patterns leaders often sense but rarely have language for — alignment drift, communication tension, cultural friction, or internal pressure. This work is grounded in <a href="/journal/the-case-for-servant-leadership-part-1" className="text-[#C85A3C] hover:text-[#B54A32] underline" onClick={(e) => { e.preventDefault(); window.history.pushState({}, '', '/journal/the-case-for-servant-leadership-part-1'); window.dispatchEvent(new PopStateEvent('popstate')); window.scrollTo({ top: 0, behavior: 'instant' }); }}>servant leadership research</a> and the <a href="/journal/psychology-of-servant-leadership-part-1-servant-mindset" className="text-[#C85A3C] hover:text-[#B54A32] underline" onClick={(e) => { e.preventDefault(); window.history.pushState({}, '', '/journal/psychology-of-servant-leadership-part-1-servant-mindset'); window.dispatchEvent(new PopStateEvent('popstate')); window.scrollTo({ top: 0, behavior: 'instant' }); }}>psychology of servant leadership</a>.
              </p>
              <p className="text-lg sm:text-xl leading-relaxed text-[#1A1A1A] italic font-serif">
                They don't define mentorship. They sharpen it when needed.
              </p>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                The core remains human: clarity, responsibility, presence, and honest leadership.
              </p>
            </div>
          </div>
        </section>

        {/* Section 6: Why Mentorship Matters */}
        <section 
          id="why-matters" 
          ref={(el) => (sectionRefs.current['why-matters'] = el)} 
          className="w-full bg-[#FAFAF9] py-16 sm:py-24 md:py-32 scroll-mt-32"
        >
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="flex items-center mb-8 sm:mb-10">
                <div className="w-1 h-10 sm:h-12 md:h-14 bg-[#C85A3C] mr-4 sm:mr-6"></div>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#1A1A1A] font-serif tracking-tight leading-tight">
                  Why Mentorship Matters
                </h2>
              </div>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                Leadership becomes stronger when leaders stay connected to clarity.
              </p>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                Some come to regain it.
              </p>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                Some come to protect it.
              </p>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                Some come to deepen it as their influence grows.
              </p>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                Mentorship offers leaders something rare: a steady place to breathe, to think, to tell the truth, to refine judgment, and to grow with intention rather than reaction.
              </p>
              <p className="text-lg sm:text-xl leading-relaxed text-[#1A1A1A] italic font-serif">
                Strong leaders aren't formed by accident. They are formed through reflection, responsibility, and honest work — in good seasons and hard ones.
              </p>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                Mentorship creates the space for that growth and protects leaders as they move through it.
              </p>
            </div>
          </div>
        </section>

        {/* Section 7: Closing CTA */}
        <section 
          id="closing" 
          ref={(el) => (sectionRefs.current.closing = el)} 
          className="w-full bg-white py-16 sm:py-24 md:py-32 scroll-mt-32"
        >
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-3xl mx-auto text-center space-y-6">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#1A1A1A] font-serif tracking-tight">
                If You're Ready to Lead With Clarity
              </h2>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                Whether leadership feels heavy or you simply want to grow with intentionality, mentorship offers a steady place to think, reset, and move forward with strength.
              </p>
              <div className="mt-12">
                <a
                  href="/contact"
                  className="inline-block px-10 py-5 bg-[#1A1A1A] text-white font-medium text-base hover:bg-[#1A1A1A]/90 transition-colors rounded-sm"
                >
                  Let's Talk
                </a>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

