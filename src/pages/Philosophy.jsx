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
      <blockquote key={key} className="border-l-4 border-[#C85A3C] pl-6 sm:pl-8 py-4 my-6 sm:my-8">
        <p className="text-xl sm:text-2xl md:text-3xl italic font-serif text-[#1A1A1A] leading-relaxed">
          "{quoteText}"
        </p>
      </blockquote>
    );
  }
  return (
    <p key={key} className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] mb-6">
      {text}
    </p>
  );
};

export default function Philosophy() {
  const [activeSection, setActiveSection] = useState('intro');
  const [scrollY, setScrollY] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const sectionRefs = useRef({});
  const clickedSectionRef = useRef(null);

  // Mobile detection and scroll tracking for parallax
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // md breakpoint - disable parallax on mobile
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    const handleScroll = () => {
      // Check mobile directly in handler to avoid stale closure
      if (window.innerWidth >= 768) {
        setScrollY(window.scrollY);
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
        <section className="py-16 sm:py-24 md:py-32 lg:py-40 bg-white relative overflow-hidden">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-7xl mx-auto">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
                {/* Left Content */}
                <div>
                  <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#1A1A1A] mb-6 sm:mb-8 font-serif tracking-tight text-balance">
                    Philosophy
                  </h1>
                  
                  <div className="space-y-6 sm:space-y-8 text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                    <p className="text-pretty font-semibold text-xl sm:text-2xl">
                      Leadership is stewardship.
                    </p>
                    <p className="text-pretty">
                      It's not about holding power—it's about holding responsibility.
                    </p>
                    <p className="text-pretty">
                      I've spent over three decades watching companies rise and fall, teams thrive and fracture, and leaders find or lose their way. What separates the healthy from the broken isn't intelligence, charisma, or vision—it's alignment. When what you believe, say, and do line up, trust takes root. When they don't, people start protecting themselves instead of the mission.
                    </p>
                    <p className="text-pretty">
                      Archetype Original exists to help leaders rebuild that alignment—to make clarity, character, and culture tangible again.
                    </p>
                  </div>
                </div>
                
                {/* Right: 3-Layer Parallax Archy Scholar */}
                {!isMobile && (
                  <div className="relative w-full max-w-lg lg:max-w-xl mx-auto lg:mx-0" style={{ aspectRatio: '1/1', height: 'auto' }}>
                    {/* Layer 3: Background - Moves down slowly (furthest back) */}
                    <div 
                      className="absolute inset-0 z-0"
                      style={{ 
                        transform: `translateY(${scrollY * 0.05}px)`
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
                    
                    {/* Layer 2: Middle layer - Moves horizontally slowly */}
                    <div 
                      className="absolute inset-0 z-10"
                      style={{ 
                        transform: `translateX(${scrollY * 0.02}px)`
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
                    
                    {/* Layer 1: Archy - Foreground, moves horizontally only (no vertical movement) */}
                    <div 
                      className="absolute inset-0 z-20"
                      style={{ 
                        transform: `translateX(${scrollY * 0.03}px)`
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
                )}
                
                {/* Mobile: Static image */}
                {isMobile && (
                  <div className="relative w-full max-w-lg mx-auto" style={{ aspectRatio: '1/1' }}>
                    {/* Stack all layers for mobile (no parallax) */}
                    <div className="relative w-full h-full">
                      <img 
                        src="/images/philosophy-layer-3.png" 
                        alt="Philosophy Background" 
                        className="absolute inset-0 w-full h-full object-contain"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                      <img 
                        src="/images/philosophy-layer-2.png" 
                        alt="Philosophy Middle Layer" 
                        className="absolute inset-0 w-full h-full object-contain"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                      <img 
                        src="/images/philosophy-layer-1.png" 
                        alt="Archy" 
                        className="absolute inset-0 w-full h-full object-contain"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Table of Contents - At the top after hero */}
        <div className="bg-[#FAFAF9] py-8 sm:py-12">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-4xl mx-auto">
              <nav className="mb-8 sm:mb-12" aria-label="Table of contents">
                <div className="flex flex-wrap gap-2 sm:gap-3">
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
          </div>
        </div>

        {/* Main Content */}
        <div className="container mx-auto px-4 sm:px-6 md:px-12">
          <div className="max-w-4xl mx-auto">
            <article>
              {/* Intro */}
              <section 
                id="intro" 
                ref={(el) => (sectionRefs.current.intro = el)} 
                className="py-16 sm:py-24 md:py-32 lg:py-40 bg-white scroll-mt-24"
              >
                <div className="space-y-6 sm:space-y-8">
                  <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] font-semibold text-xl sm:text-2xl">
                    Leadership is stewardship.
                  </p>
                  <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                    It's not about holding power—it's about holding responsibility.
                  </p>
                  <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                    I've spent over three decades watching companies rise and fall, teams thrive and fracture, and leaders find or lose their way. What separates the healthy from the broken isn't intelligence, charisma, or vision—it's alignment. When what you believe, say, and do line up, trust takes root. When they don't, people start protecting themselves instead of the mission.
                  </p>
                  <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                    Archetype Original exists to help leaders rebuild that alignment—to make clarity, character, and culture tangible again.
                  </p>
                </div>
              </section>

              {/* The Foundation */}
              <section 
                id="foundation" 
                ref={(el) => (sectionRefs.current.foundation = el)} 
                className="py-16 sm:py-24 md:py-32 lg:py-40 bg-[#FAFAF9] scroll-mt-24"
              >
                <div className="space-y-6 sm:space-y-8">
                  <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#1A1A1A] mb-8 sm:mb-10 md:mb-12 font-serif tracking-tight leading-tight">
                    The Foundation — Servant Leadership
                  </h2>
                  <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                    Servant leadership has been misunderstood for decades. It isn't weakness or endless sacrifice. It's strength under control. It's stewardship of people and purpose.
                  </p>
                  <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                    At its core, servant leadership means this:
                  </p>
                  {renderParagraph("> The leader's role is to ensure the people in their care can thrive in theirs.", 'foundation-core')}
                  <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                    It's practical: accountability, clarity, empathy, and example. When leaders take responsibility for the wake they leave behind, organizations stabilize and teams begin to trust again. Servant leadership is the spine of everything I teach—but it's not the only vertebra.
                  </p>
                </div>
              </section>

              {/* The Golden Rule */}
              <section 
                id="golden-rule" 
                ref={(el) => (sectionRefs.current['golden-rule'] = el)} 
                className="py-16 sm:py-24 md:py-32 lg:py-40 bg-white scroll-mt-24"
              >
                <div className="space-y-6 sm:space-y-8">
                  <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#1A1A1A] mb-8 sm:mb-10 md:mb-12 font-serif tracking-tight leading-tight">
                    The Human Lens
                  </h2>
                  <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                    Faith quietly shapes everything I do. The Golden Rule—treat people the way you want to be treated—has guided every decision I've made as a mentor, leader, and business owner. It's not just morality; it's mechanism.
                  </p>
                  <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                    When you treat people with dignity, they respond with trust. When you build trust, they respond with effort.
                  </p>
                  {renderParagraph("> Simple. Timeless. Proven.", 'golden-rule-simple')}
                  <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                    It's also scalable. You can apply it to a boardroom, a start-up, or a student. Respect and empathy never expire.
                  </p>
                </div>
              </section>

              {/* Business Lens */}
              <section 
                id="business-lens" 
                ref={(el) => (sectionRefs.current['business-lens'] = el)} 
                className="py-16 sm:py-24 md:py-32 lg:py-40 bg-[#FAFAF9] scroll-mt-24"
              >
                <div className="space-y-6 sm:space-y-8">
                  <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#1A1A1A] mb-8 sm:mb-10 md:mb-12 font-serif tracking-tight leading-tight">
                    Beyond Leadership — The Business Lens
                  </h2>
                  <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                    Culture and clarity mean little without functional systems. Business has rules—cash flow, delivery, margins, accountability—and servant leadership doesn't ignore them. It humanizes them.
                  </p>
                  <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                    Leadership and business intersect in a single question:
                  </p>
                  {renderParagraph("> How do we build systems that serve both people and performance?", 'business-question')}
                  <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                    That's where I spend most of my time with clients—translating values into operational design. The goal isn't to make a company soft; it's to make it sustainable.
                  </p>
                  <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                    A healthy company:
                  </p>
                  <ul className="space-y-3 mb-6">
                    <li className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] flex items-start">
                      <span className="text-[#C85A3C] mr-3 mt-1">•</span>
                      <span>Aligns purpose with structure.</span>
                    </li>
                    <li className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] flex items-start">
                      <span className="text-[#C85A3C] mr-3 mt-1">•</span>
                      <span>Measures success with both numbers and morale.</span>
                    </li>
                    <li className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] flex items-start">
                      <span className="text-[#C85A3C] mr-3 mt-1">•</span>
                      <span>Protects culture as deliberately as it protects profit.</span>
                    </li>
                  </ul>
                  <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                    I help leaders close the gap between what they say they value and what their systems reward.
                  </p>
                  <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                    <a href="/methods" className="text-[#C85A3C] hover:text-[#B54A32] transition-colors underline">Learn more about my methods →</a>
                  </p>
                </div>
              </section>

              {/* Clarity Over Chaos */}
              <section 
                id="clarity-over-chaos" 
                ref={(el) => (sectionRefs.current['clarity-over-chaos'] = el)} 
                className="py-16 sm:py-24 md:py-32 lg:py-40 bg-white scroll-mt-24"
              >
                <div className="space-y-6 sm:space-y-8">
                  <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#1A1A1A] mb-8 sm:mb-10 md:mb-12 font-serif tracking-tight leading-tight">
                    Clarity Over Chaos
                  </h2>
                  <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                    Chaos creeps in when communication and direction get tangled.
                  </p>
                  <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                    Leaders often mistake energy for clarity. They fill the air with excitement, but no one leaves the room knowing what to do next.
                  </p>
                  {renderParagraph("> Clarity is an act of service—it removes friction and frees people to move.", 'clarity-service')}
                  <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                    When I work with teams, we start by identifying where chaos hides:
                  </p>
                  <ul className="space-y-3 mb-6">
                    <li className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] flex items-start">
                      <span className="text-[#C85A3C] mr-3 mt-1">•</span>
                      <span>Conflicting messages</span>
                    </li>
                    <li className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] flex items-start">
                      <span className="text-[#C85A3C] mr-3 mt-1">•</span>
                      <span>Undefined authority</span>
                    </li>
                    <li className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] flex items-start">
                      <span className="text-[#C85A3C] mr-3 mt-1">•</span>
                      <span>Overlapping roles</span>
                    </li>
                    <li className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] flex items-start">
                      <span className="text-[#C85A3C] mr-3 mt-1">•</span>
                      <span>Emotional noise</span>
                    </li>
                  </ul>
                  <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                    Once you can name chaos, you can dismantle it. Teams that see clearly, move clearly.
                  </p>
                </div>
              </section>

              {/* Trust Is the Currency */}
              <section 
                id="trust-is-currency" 
                ref={(el) => (sectionRefs.current['trust-is-currency'] = el)} 
                className="py-16 sm:py-24 md:py-32 lg:py-40 bg-[#FAFAF9] scroll-mt-24"
              >
                <div className="space-y-6 sm:space-y-8">
                  <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#1A1A1A] mb-8 sm:mb-10 md:mb-12 font-serif tracking-tight leading-tight">
                    Trust Is the Currency
                  </h2>
                  <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                    You can have vision, but if your people don't trust you, everything else is noise.
                  </p>
                  <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                    Trust is built through small, repeated proof—consistency, follow-through, honesty when it costs you.
                  </p>
                  <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                    It's broken by secrecy, ego, and spin.
                  </p>
                  <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                    The neuroscience is undeniable: high-trust environments lower cortisol, boost oxytocin, and literally rewire the brain toward cooperation. But long before the data, experience proved it.
                  </p>
                  <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                    When leaders are transparent and reliable, people breathe again. When they aren't, everyone starts holding their breath.
                  </p>
                </div>
              </section>

              {/* Accountability */}
              <section 
                id="accountability" 
                ref={(el) => (sectionRefs.current.accountability = el)} 
                className="py-16 sm:py-24 md:py-32 lg:py-40 bg-white scroll-mt-24"
              >
                <div className="space-y-6 sm:space-y-8">
                  <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#1A1A1A] mb-8 sm:mb-10 md:mb-12 font-serif tracking-tight leading-tight">
                    Accountability Without Ego
                  </h2>
                  <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                    Accountability isn't control—it's care. It says, "I believe in you enough to expect more."
                  </p>
                  <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                    Good leaders don't hide behind authority or policy. They make expectations clear, own their own mistakes, and give people space to rise.
                  </p>
                  <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                    Ego kills accountability. The moment leadership becomes about defending pride instead of protecting culture, progress stops.
                  </p>
                  <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                    I've learned this the hard way—and I still practice it daily. Accountability is a mirror you hold up for yourself before anyone else.
                  </p>
                </div>
              </section>

              {/* Simplicity */}
              <section 
                id="simplicity" 
                ref={(el) => (sectionRefs.current.simplicity = el)} 
                className="py-16 sm:py-24 md:py-32 lg:py-40 bg-[#FAFAF9] scroll-mt-24"
              >
                <div className="space-y-6 sm:space-y-8">
                  <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#1A1A1A] mb-8 sm:mb-10 md:mb-12 font-serif tracking-tight leading-tight">
                    Simplicity Wins
                  </h2>
                  <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                    Complexity feels impressive. Simplicity creates traction.
                  </p>
                  <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                    Whether it's communication, structure, or vision, I've learned to prune relentlessly.
                  </p>
                  {renderParagraph("> If something can't be explained clearly, it can't be executed consistently.", 'simplicity-clear')}
                  <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                    Every engagement I lead focuses on distillation. We strip away noise until what's left is useful, repeatable, and teachable. That's the mark of a healthy organization: people can explain it without you in the room.
                  </p>
                </div>
              </section>

              {/* Leadership Is Personal */}
              <section 
                id="leadership-is-personal" 
                ref={(el) => (sectionRefs.current['leadership-is-personal'] = el)} 
                className="py-16 sm:py-24 md:py-32 lg:py-40 bg-white scroll-mt-24"
              >
                <div className="space-y-6 sm:space-y-8">
                  <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#1A1A1A] mb-8 sm:mb-10 md:mb-12 font-serif tracking-tight leading-tight">
                    Leadership Is Personal
                  </h2>
                  <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                    The best systems in the world can't fix a leader who's lost themselves.
                  </p>
                  <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                    That's why my philosophy always returns to the human being leading the humans.
                  </p>
                  <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                    Health, self-awareness, and honesty aren't luxuries—they're prerequisites.
                  </p>
                  <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                    When the person at the top grows, everyone under them breathes easier.
                  </p>
                  {renderParagraph("> \"Your business can't be healthier than you are.\"", 'health-quote')}
                </div>
              </section>

              {/* Why It Works */}
              <section 
                id="research" 
                ref={(el) => (sectionRefs.current.research = el)} 
                className="py-16 sm:py-24 md:py-32 lg:py-40 bg-[#FAFAF9] scroll-mt-24"
              >
                <div className="space-y-6 sm:space-y-8">
                  <div className="border-2 border-[#C85A3C] p-8 sm:p-10 md:p-12 bg-white">
                    <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#1A1A1A] mb-8 sm:mb-10 md:mb-12 font-serif tracking-tight leading-tight">
                      Why It Works (research summary)
                    </h2>
                    <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] mb-6">
                      Modern research confirms what three decades of practice have made obvious: leaders who create safety, clarity, and consistency unlock their team's highest performance.
                    </p>
                    <div className="space-y-4 mb-6">
                      <div>
                        <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#1A1A1A] mb-2 font-serif tracking-tight leading-tight">
                          Psychological Safety (Edmondson)
                        </h3>
                        <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                          Open communication drives innovation.
                        </p>
                      </div>
                      <div>
                        <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#1A1A1A] mb-2 font-serif tracking-tight leading-tight">
                          Empathic Listening (Rogers)
                        </h3>
                        <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                          Understanding reduces reactivity and restores reasoning.
                        </p>
                      </div>
                      <div>
                        <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#1A1A1A] mb-2 font-serif tracking-tight leading-tight">
                          Neuroscience of Trust (Zak)
                        </h3>
                        <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                          Trust changes brain chemistry and productivity.
                        </p>
                      </div>
                      <div>
                        <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#1A1A1A] mb-2 font-serif tracking-tight leading-tight">
                          Executive Isolation (Gallup)
                        </h3>
                        <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                          Mentorship and peer connection improve decision quality.
                        </p>
                      </div>
                    </div>
                    {renderParagraph("> The takeaway is simple: people don't perform for fear—they perform for trust.", 'research-takeaway')}
                  </div>
                </div>
              </section>

              {/* The Standard */}
              <section 
                id="standard" 
                ref={(el) => (sectionRefs.current.standard = el)} 
                className="py-16 sm:py-24 md:py-32 lg:py-40 bg-white scroll-mt-24"
              >
                <div className="space-y-6 sm:space-y-8">
                  <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#1A1A1A] mb-8 sm:mb-10 md:mb-12 font-serif tracking-tight leading-tight">
                    The Standard
                  </h2>
                  <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                    Every leader leaves a wake.
                  </p>
                  <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                    The goal isn't perfection—it's awareness.
                  </p>
                  <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                    When I recognize the impact of my words, systems, and silence, I can steer differently.
                  </p>
                  {renderParagraph("> Leadership isn't about being in charge.", 'standard-quote1')}
                  {renderParagraph("> It's about being responsible for what your influence creates.", 'standard-quote2')}
                </div>
              </section>

              {/* Closing */}
              <section 
                id="closing" 
                ref={(el) => (sectionRefs.current.closing = el)} 
                className="py-16 sm:py-24 md:py-32 lg:py-40 bg-[#FAFAF9] scroll-mt-24"
              >
                <div className="space-y-6 sm:space-y-8">
                  <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#1A1A1A] mb-8 sm:mb-10 md:mb-12 font-serif tracking-tight leading-tight">
                    Closing
                  </h2>
                  <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                    Servant leadership isn't a model; it's a mindset.
                  </p>
                  <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                    It's what happens when responsibility meets compassion and execution meets humility.
                  </p>
                  <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                    If that's the kind of leader you want to become—or rebuild to be—let's start the conversation.
                  </p>
                </div>
              </section>

              {/* CTA Strip */}
              <div className="py-16 sm:py-24 md:py-32 lg:py-40 bg-white border-t border-[#1A1A1A]/10">
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <a
                    href="/contact"
                    className="bg-[#1A1A1A] text-white px-8 sm:px-10 py-4 sm:py-5 font-medium text-sm sm:text-base hover:bg-[#1A1A1A]/90 transition-colors text-center"
                    aria-label="Start a conversation"
                  >
                    Start a Conversation
                  </a>
                  <a
                    href="https://calendly.com/bartpaden/1-on-1-mentorships"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-transparent text-[#1A1A1A] px-8 sm:px-10 py-4 sm:py-5 font-medium text-sm sm:text-base border border-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white transition-colors text-center"
                    aria-label="Book time with Bart on Calendly"
                  >
                    Book Time
                  </a>
                  <a
                    href="/contact"
                    className="bg-transparent text-[#1A1A1A] px-8 sm:px-10 py-4 sm:py-5 font-medium text-sm sm:text-base border border-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white transition-colors text-center"
                    aria-label="Send an email"
                  >
                    Email
                  </a>
                </div>
              </div>
            </article>
          </div>
        </div>
      </div>
    </>
  );
}
