/**
 * Meet Archy Page
 * 
 * Clean, purposeful design that lets content speak for itself.
 * Restrained design without theatrics - content-first approach.
 */
import React, { useState, useEffect, useRef } from 'react';
import SEO from '../../components/SEO';

const sections = [
  { id: 'what-archy-does', label: 'What Archy Does' },
  { id: 'how-archy-works', label: 'How Archy Works' },
  { id: 'what-archy-doesnt-do', label: "What Archy Doesn't Do" },
  { id: 'when-archy-hands-off', label: 'When Archy Hands Off' },
  { id: 'why-archy-exists', label: 'Why Archy Exists' }
];

export default function Archy() {
  const [activeSection, setActiveSection] = useState('what-archy-does');
  const [showStickyNav, setShowStickyNav] = useState(false);
  const [stickyNavVisible, setStickyNavVisible] = useState(true);
  const sectionRefs = useRef({});
  const clickedSectionRef = useRef(null);
  const heroRef = useRef(null);
  const lastScrollY = useRef(0);

  // Scroll tracking for sticky nav
  useEffect(() => {
    const handleScroll = () => {
      // Show sticky nav after scrolling past hero
      if (heroRef.current) {
        const heroBottom = heroRef.current.offsetTop + heroRef.current.offsetHeight;
        const shouldShow = window.scrollY > heroBottom - 100;
        setShowStickyNav(shouldShow);
        
        // On mobile, hide sticky nav when scrolling down, show when scrolling up
        if (window.innerWidth < 768 && shouldShow) {
          const currentScrollY = window.scrollY;
          // Only hide if scrolling down significantly (more than 10px) to avoid jitter
          if (currentScrollY > lastScrollY.current + 10 && currentScrollY > heroBottom) {
            setStickyNavVisible(false);
          } else if (currentScrollY < lastScrollY.current - 10) {
            setStickyNavVisible(true);
          }
          lastScrollY.current = currentScrollY;
        } else {
          setStickyNavVisible(true);
        }
      }
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
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

  const handleLinkClick = (e, href) => {
    e.preventDefault();
    if (href.startsWith('#')) {
      // Anchor link - scroll to section
      const element = document.getElementById(href.substring(1));
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      window.history.pushState({}, '', href);
      window.dispatchEvent(new PopStateEvent('popstate'));
      // Scroll to top when navigating to a new page
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  };

  return (
    <>
      <SEO pageKey="archy" />
      <div className="min-h-screen bg-white">
        
        {/* SECTION 1: HERO WITH ARCHY CHARACTER */}
        <section ref={heroRef} className="bg-gradient-to-b from-[#FFF8F0] via-white to-white py-8 sm:py-12 md:py-16 lg:py-12">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 lg:gap-16 items-center">
              
              {/* Left: Text Content */}
              <div className="space-y-4 sm:space-y-6 md:space-y-8 order-2 lg:order-1">
                <p className="text-sm sm:text-base uppercase tracking-wider font-semibold text-[#C85A3C]">
                  MEET ARCHY
                </p>
                
                <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl font-bold leading-[0.9] tracking-tight text-[#1A1A1A] break-words">
                  Your AI Leadership Coach
                </h1>
                
                <p className="text-lg sm:text-xl md:text-2xl leading-relaxed text-[#1A1A1A]/70 break-words">
                  Archy is the digital extension of how I think about leadership. He's trained on my experience, my frameworks, and the patterns that actually work with real teams.
                </p>
              </div>
              
              {/* Right: Archy Character Image - 30% smaller desktop, 50% smaller mobile */}
              <div className="flex justify-center lg:justify-end order-1 lg:order-2">
                <img
                  src="/images/archy-character-008.png"
                  alt="Archy - AI Leadership Coach"
                  className="w-full max-w-[14rem] sm:max-w-[16rem] lg:max-w-[22rem] h-auto object-contain"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
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
                    className={`inline-block px-3 py-2 text-xs font-medium uppercase tracking-wider border transition-colors min-h-[44px] flex items-center justify-center ${
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
            showStickyNav && stickyNavVisible ? 'translate-y-0' : '-translate-y-full'
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
                    className={`inline-block px-3 py-2 text-xs font-medium uppercase tracking-wider border transition-all min-h-[44px] flex items-center justify-center ${
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

        {/* SECTION 2: WHAT ARCHY DOES */}
        <section 
          id="what-archy-does" 
          ref={(el) => (sectionRefs.current['what-archy-does'] = el)} 
          className="bg-white py-12 sm:py-16 md:py-20 lg:py-24 scroll-mt-32"
        >
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-4xl mx-auto space-y-8 sm:space-y-12 md:space-y-16">
              
              {/* Section Header with Left Bar */}
              <div className="border-l-4 border-[#C85A3C] pl-4 sm:pl-6 md:pl-8">
                <h2 className="font-serif text-4xl sm:text-5xl md:text-6xl font-bold text-[#1A1A1A] break-words">
                  What Archy Does
                </h2>
              </div>
              
              {/* Content */}
              <div className="space-y-4 sm:space-y-6 md:space-y-8 text-base sm:text-lg md:text-xl leading-relaxed text-[#1A1A1A]/80 break-words">
                <p>
                  Archy interprets your ALI data. He reads the patterns, connects the dots between conditions, and explains what's happening in your leadership environment in plain language.
                </p>
                
                <p>
                  He doesn't replace you. He doesn't make decisions for you. He helps you see what the data is telling you — and gives you context for what to do next.
                </p>
                
                {/* Simple bullet list - NO BOXES */}
                <div className="space-y-3 sm:space-y-4 pl-4 sm:pl-6">
                  <div className="flex gap-3 sm:gap-4">
                    <span className="text-[#C85A3C] font-bold flex-shrink-0">•</span>
                    <p><strong>Interprets ALI results</strong> — Explains what your condition scores mean</p>
                  </div>
                  <div className="flex gap-3 sm:gap-4">
                    <span className="text-[#C85A3C] font-bold flex-shrink-0">•</span>
                    <p><strong>Spots patterns</strong> — Identifies connections between conditions</p>
                  </div>
                  <div className="flex gap-3 sm:gap-4">
                    <span className="text-[#C85A3C] font-bold flex-shrink-0">•</span>
                    <p><strong>Suggests next steps</strong> — Offers practical guidance based on your data</p>
                  </div>
                  <div className="flex gap-3 sm:gap-4">
                    <span className="text-[#C85A3C] font-bold flex-shrink-0">•</span>
                    <p><strong>Answers questions</strong> — Available 24/7 for leadership guidance</p>
                  </div>
                </div>
              </div>
              
            </div>
          </div>
        </section>

        {/* SECTION 3: HOW ARCHY WORKS */}
        <section 
          id="how-archy-works" 
          ref={(el) => (sectionRefs.current['how-archy-works'] = el)} 
          className="bg-[#FFF8F0] py-12 sm:py-16 md:py-20 lg:py-24 scroll-mt-32"
        >
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-4xl mx-auto space-y-8 sm:space-y-12 md:space-y-16">
              
              {/* Section Header */}
              <div className="border-l-4 border-[#C85A3C] pl-4 sm:pl-6 md:pl-8">
                <h2 className="font-serif text-4xl sm:text-5xl md:text-6xl font-bold text-[#1A1A1A] break-words">
                  How Archy Works
                </h2>
              </div>
              
              {/* Content */}
              <div className="space-y-4 sm:space-y-6 md:space-y-8 text-base sm:text-lg md:text-xl leading-relaxed text-[#1A1A1A]/80 break-words">
                <p>
                  Archy is trained on leadership frameworks, ALI methodology, and real-world patterns from working with teams across industries. He's not a generic chatbot — he's purpose-built to help leaders interpret environmental data.
                </p>
                
                <p>
                  When you ask Archy a question, he:
                </p>
                
                {/* Simple numbered list - NO BOXES */}
                <div className="space-y-3 sm:space-y-4 pl-4 sm:pl-6">
                  <div className="flex gap-3 sm:gap-4">
                    <span className="text-[#C85A3C] font-bold flex-shrink-0">1.</span>
                    <p>Pulls relevant context from your ALI results</p>
                  </div>
                  <div className="flex gap-3 sm:gap-4">
                    <span className="text-[#C85A3C] font-bold flex-shrink-0">2.</span>
                    <p>Compares patterns to leadership frameworks</p>
                  </div>
                  <div className="flex gap-3 sm:gap-4">
                    <span className="text-[#C85A3C] font-bold flex-shrink-0">3.</span>
                    <p>Offers guidance grounded in your actual data</p>
                  </div>
                </div>
                
                <p>
                  He's fast, available 24/7, and gets smarter as he learns from more interactions.
                </p>
              </div>
              
            </div>
          </div>
        </section>

        {/* SECTION 4: WHAT ARCHY DOESN'T DO */}
        <section 
          id="what-archy-doesnt-do" 
          ref={(el) => (sectionRefs.current['what-archy-doesnt-do'] = el)} 
          className="bg-white py-12 sm:py-16 md:py-20 lg:py-24 scroll-mt-32"
        >
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-4xl mx-auto space-y-8 sm:space-y-12 md:space-y-16">
              
              {/* Section Header */}
              <div className="border-l-4 border-[#C85A3C] pl-4 sm:pl-6 md:pl-8">
                <h2 className="font-serif text-4xl sm:text-5xl md:text-6xl font-bold text-[#1A1A1A] break-words">
                  What Archy Doesn't Do
                </h2>
              </div>
              
              {/* Content */}
              <div className="space-y-4 sm:space-y-6 md:space-y-8 text-base sm:text-lg md:text-xl leading-relaxed text-[#1A1A1A]/80 break-words">
                <p>
                  Archy isn't trying to replace human coaching. He's a tool — a very smart, very capable tool — but he's not a substitute for the nuance and relationship that comes with real human guidance.
                </p>
                
                {/* Simple bullet list */}
                <div className="space-y-3 sm:space-y-4 pl-4 sm:pl-6">
                  <div className="flex gap-3 sm:gap-4">
                    <span className="text-[#C85A3C] font-bold flex-shrink-0">•</span>
                    <p>He doesn't make decisions for you</p>
                  </div>
                  <div className="flex gap-3 sm:gap-4">
                    <span className="text-[#C85A3C] font-bold flex-shrink-0">•</span>
                    <p>He doesn't know your team personally</p>
                  </div>
                  <div className="flex gap-3 sm:gap-4">
                    <span className="text-[#C85A3C] font-bold flex-shrink-0">•</span>
                    <p>He doesn't replace human coaching or mentorship</p>
                  </div>
                  <div className="flex gap-3 sm:gap-4">
                    <span className="text-[#C85A3C] font-bold flex-shrink-0">•</span>
                    <p>He doesn't understand context outside of what you tell him</p>
                  </div>
                </div>
                
                <p>
                  What he does do is give you clarity, speed, and access to guidance when you need it — without waiting for a scheduled call or digging through documentation.
                </p>
              </div>
              
            </div>
          </div>
        </section>

        {/* SECTION 5: WHEN ARCHY HANDS OFF */}
        <section 
          id="when-archy-hands-off" 
          ref={(el) => (sectionRefs.current['when-archy-hands-off'] = el)} 
          className="bg-[#FFF8F0] py-12 sm:py-16 md:py-20 lg:py-24 scroll-mt-32"
        >
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-4xl mx-auto space-y-8 sm:space-y-12 md:space-y-16">
              
              {/* Section Header */}
              <div className="border-l-4 border-[#C85A3C] pl-4 sm:pl-6 md:pl-8">
                <h2 className="font-serif text-4xl sm:text-5xl md:text-6xl font-bold text-[#1A1A1A] break-words">
                  When Archy Hands Off
                </h2>
              </div>
              
              {/* Content */}
              <div className="space-y-4 sm:space-y-6 md:space-y-8 text-base sm:text-lg md:text-xl leading-relaxed text-[#1A1A1A]/80 break-words">
                <p>
                  Sometimes, you ask a question that needs more than pattern recognition. It needs lived experience, nuance, or a conversation that goes beyond data interpretation.
                </p>
                
                <p>
                  When that happens, Archy knows his limits.
                </p>
                
                {/* Simple inline italic - NO GIANT QUOTE BOX */}
                <p className="italic border-l-2 border-[#C85A3C] pl-4 sm:pl-6 text-[#1A1A1A]">
                  "That's a great question, but I'm having trouble answering it. Would you like me to send this to Bart?"
                </p>
                
                <p>
                  If you say yes, he gathers your name and email, and the question comes straight to me. If you say no, he respects it — and the conversation continues.
                </p>
                
                <p>
                  This keeps the experience human. It protects the integrity of the guidance. And it ensures you're not left alone with a question that actually needs a real leader behind it.
                </p>
              </div>
              
            </div>
          </div>
        </section>

        {/* SECTION 6: WHY ARCHY EXISTS */}
        <section 
          id="why-archy-exists" 
          ref={(el) => (sectionRefs.current['why-archy-exists'] = el)} 
          className="bg-white py-12 sm:py-16 md:py-20 lg:py-24 scroll-mt-32"
        >
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-4xl mx-auto space-y-8 sm:space-y-12 md:space-y-16">
              
              {/* Section Header */}
              <div className="border-l-4 border-[#C85A3C] pl-4 sm:pl-6 md:pl-8">
                <h2 className="font-serif text-4xl sm:text-5xl md:text-6xl font-bold text-[#1A1A1A] break-words">
                  Why Archy Exists
                </h2>
              </div>
              
              {/* Content */}
              <div className="space-y-4 sm:space-y-6 md:space-y-8 text-base sm:text-lg md:text-xl leading-relaxed text-[#1A1A1A]/80 break-words">
                <p>
                  ALI gives you data. Archy gives you understanding.
                </p>
                
                <p>
                  Most leadership tools stop at the numbers. They show you a dashboard, maybe some charts, and then leave you to figure out what it all means. That's where most leaders get stuck — not because they can't read the data, but because they don't know what to do with it.
                </p>
                
                <p>
                  Archy bridges that gap. He takes the environmental conditions you've measured and translates them into actionable insight. He helps you see patterns you might have missed. And he offers guidance that's specific to your situation — not generic advice pulled from a library of templates.
                </p>
                
                <p>
                  He exists because leadership shouldn't require you to be a data scientist. It should give you clarity, speed, and confidence in your next move.
                </p>
              </div>
              
            </div>
          </div>
        </section>

        {/* SECTION 7: CTA — READY TO MEET ARCHY? */}
        <section className="bg-gradient-to-b from-white to-[#FFF8F0] py-12 sm:py-16 md:py-20 lg:py-24">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-4xl mx-auto space-y-8 sm:space-y-12">
              
              {/* Centered Header */}
              <div className="text-center space-y-4">
                <h2 className="font-serif text-4xl sm:text-5xl md:text-6xl font-bold text-[#1A1A1A] break-words">
                  Ready to Meet Archy?
                </h2>
                <p className="text-base sm:text-lg md:text-xl text-[#1A1A1A]/70 break-words">
                  Get started with ALI and access Archy's guidance.
                </p>
              </div>
              
              {/* Two CTA Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
                
                {/* Card 1: Get Started with ALI */}
                <a 
                  href="/culture-science/ali" 
                  onClick={(e) => handleLinkClick(e, '/culture-science/ali')}
                  className="group block"
                >
                  <div className="bg-white p-6 sm:p-8 rounded-lg border-2 border-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white transition-all duration-300 h-full">
                    <h3 className="text-xl sm:text-2xl font-bold mb-3 group-hover:text-white break-words">
                      Get Started with ALI
                    </h3>
                    <p className="text-base sm:text-lg text-[#1A1A1A]/70 group-hover:text-white/80 mb-4 break-words">
                      Learn about the Archetype Leadership Index and how it measures your leadership environment.
                    </p>
                    <span className="inline-flex items-center gap-2 font-semibold group-hover:text-white">
                      Explore ALI →
                    </span>
                  </div>
                </a>
                
                {/* Card 2: Talk to Me Directly */}
                <a 
                  href="/contact" 
                  onClick={(e) => handleLinkClick(e, '/contact')}
                  className="group block"
                >
                  <div className="bg-white p-6 sm:p-8 rounded-lg border-2 border-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white transition-all duration-300 h-full">
                    <h3 className="text-xl sm:text-2xl font-bold mb-3 group-hover:text-white break-words">
                      Talk to Me Directly
                    </h3>
                    <p className="text-base sm:text-lg text-[#1A1A1A]/70 group-hover:text-white/80 mb-4 break-words">
                      Have questions about Archy or want to discuss your leadership challenges?
                    </p>
                    <span className="inline-flex items-center gap-2 font-semibold group-hover:text-white">
                      Contact Bart →
                    </span>
                  </div>
                </a>
                
              </div>
              
            </div>
          </div>
        </section>

      </div>
    </>
  );
}
