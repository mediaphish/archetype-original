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
  { id: 'opening-frame', label: 'Opening Frame' },
  { id: 'what-i-offer', label: 'What I Offer' },
  { id: 'how-i-work', label: 'How I Work' },
  { id: 'what-informs', label: 'What Informs My Work' },
  { id: 'why-this-works', label: 'Why This Works' },
  { id: 'closing', label: 'Ready to Begin' }
];

const services = [
  {
    id: 'mentorship',
    number: '01',
    title: 'Mentorship',
    subtitle: 'Helping leaders at every level find clarity, courage, and confidence',
    link: '/methods/mentorship',
    nextService: 'Consulting',
    content: (
      <>
        <p className="text-base sm:text-lg leading-relaxed text-[#6B6B6B]">
          Mentorship isn't a program. It's a relationship built on clarity, trust, development, and the honesty it takes to grow as a leader. Some leaders come to mentorship because they're under pressure. Others come because they're ready to sharpen their skills, expand their capacity, or step into responsibility they've never held before. Both are valid. Both matter. Both are leadership.
        </p>
        <p className="text-base sm:text-lg leading-relaxed text-[#6B6B6B]">
          I mentor leaders the same way real leadership works—adaptively. Some conversations require steadiness and presence. Others require direct truth. Some are about navigating conflict; others are about uncovering potential. Sometimes a leader needs someone to slow things down; other times they need someone to push them forward. The approach shifts with the moment because leadership does too. I don't push people forward — I <a href="/journal/clearing-the-path" className="text-[#C85A3C] hover:text-[#B54A32] underline" onClick={(e) => { e.preventDefault(); window.history.pushState({}, '', '/journal/clearing-the-path'); window.dispatchEvent(new PopStateEvent('popstate')); window.scrollTo({ top: 0, behavior: 'instant' }); }}>clear what's in their way</a>.
        </p>
        <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] font-semibold">
          If you're ready to grow, change, or lead with more clarity than you have today, we can begin with a conversation.
        </p>
      </>
    ),
    benefits: [
      'Regularly scheduled conversations focused on real challenges',
      'Honest feedback rooted in experience, not theory',
      'Strategic thinking for culture, communication, and leadership posture',
      'Clarity when the path forward feels unclear',
      'Support that meets you where you are, not where someone thinks you should be'
    ]
  },
  {
    id: 'consulting',
    number: '02',
    title: 'Consulting',
    subtitle: 'Strengthening systems, communication, alignment, and culture',
    link: '/methods/consulting',
    nextService: 'Fractional Roles',
    content: (
      <>
        <p className="text-base sm:text-lg leading-relaxed text-[#6B6B6B]">
          Consulting, the way I practice it, isn't built on models, slide decks, or theories. It's built on reality—what's actually happening inside a team, a department, or an organization. People don't need a consultant who read three books and built a framework. They need someone who can walk in, see the truth, understand the pressure, and help them move forward with clarity. I help identify and resolve <a href="/journal/leadership-bottlenecks-will-choke-the-life-out-of-a-business" className="text-[#C85A3C] hover:text-[#B54A32] underline" onClick={(e) => { e.preventDefault(); window.history.pushState({}, '', '/journal/leadership-bottlenecks-will-choke-the-life-out-of-a-business'); window.dispatchEvent(new PopStateEvent('popstate')); window.scrollTo({ top: 0, behavior: 'instant' }); }}>leadership bottlenecks</a> that stifle innovation and growth.
        </p>
        <p className="text-base sm:text-lg leading-relaxed text-[#6B6B6B]">
          Consulting can be about solving problems, strengthening what's already working, or helping build what comes next.
        </p>
        <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] font-semibold">
          If your organization needs clarity—whether to fix something, refine something, or build something—we can start with a conversation.
        </p>
      </>
    ),
    benefits: [
      "Culture and leadership audits to surface what's not working",
      'Communication systems that create clarity instead of confusion',
      'Accountability structures that empower instead of control',
      'Realignment of values, behaviors, and operational design',
      'Strategic facilitation for teams navigating transition or conflict'
    ]
  },
  {
    id: 'fractional-roles',
    number: '03',
    title: 'Fractional Roles',
    subtitle: 'Stepping in when teams need stability and direction during transitional seasons',
    link: '/methods/fractional-roles',
    nextService: 'Speaking & Seminars',
    content: (
      <>
        <p className="text-base sm:text-lg leading-relaxed text-[#6B6B6B]">
          Some seasons require more than guidance — they require leadership presence. Fractional Leadership brings an experienced leader into your organization for a defined period to provide clarity, steadiness, and alignment during transition, growth, or cultural pressure.
        </p>
        <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] font-semibold">
          Fractional Leadership can take different forms depending on the season — cultural stabilization, operational clarity, leadership alignment, or helping a team prepare for what comes next. The flagship role in this work is the Fractional Chief Culture Officer (CCO), a hands-on senior leader focused on culture, communication, and the environment people experience every day.
        </p>
      </>
    ),
    benefits: [
      'Interim executive presence during transitions',
      'Culture stabilization and team alignment',
      'Strategic decision-making and priority-setting',
      'Leadership coaching for emerging leaders',
      'Operational guidance without long-term overhead'
    ]
  },
  {
    id: 'speaking-seminars',
    number: '04',
    title: 'Speaking & Seminars',
    subtitle: 'Sharing lived leadership and research-backed insight',
    link: '/methods/speaking-seminars',
    nextService: 'Training & Education',
    content: (
      <>
        <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] font-semibold">
          Speaking, the way I practice it, isn't performance — it's leadership in a room. These sessions bring clarity, language, and steadiness into environments where people are already carrying responsibility, pressure, or expectation. I speak from lived experience, research, and the posture of service that defines all of my work. Talks and seminars adapt to the room: sometimes calm strength, sometimes direct truth, sometimes a recalibration of what leadership actually is. The goal is always the same: clarity people can act on the next day.
        </p>
      </>
    ),
    benefits: [
      'Servant leadership in practice',
      'Building trust and psychological safety',
      'The cost of scoreboard leadership',
      'Culture as competitive advantage',
      'Communication that creates clarity, not confusion',
      'Leadership in seasons of pressure and transition'
    ]
  },
  {
    id: 'training-education',
    number: '05',
    title: 'Training & Education',
    subtitle: 'Tools, Playbooks, and Curriculum designed to support and affect positive change in leadership',
    link: '/methods/training-education',
    nextService: null, // Last item, no next button
    content: (
      <>
        <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] font-semibold">
          Training and education offerings deliver clarity, alignment, and leadership development in formats teams can absorb together. This section will expand into its own page.
        </p>
      </>
    ),
    benefits: [
      'Custom leadership development programs',
      'Team workshops on communication, trust, and accountability',
      'Leadership playbooks tailored to your organization',
      'Onboarding and culture integration for new leaders',
      'Train-the-trainer programs to scale leadership development internally'
    ]
  }
];

export default function Methods() {
  const [openAccordion, setOpenAccordion] = useState(0); // First item (Mentorship) open by default
  const [scrollY, setScrollY] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [activeSection, setActiveSection] = useState('opening-frame');
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

  const toggleAccordion = (index) => {
    if (openAccordion === index) {
      setOpenAccordion(-1); // Close if already open
    } else {
      setOpenAccordion(index); // Open clicked item
    }
  };

  const openNextAccordion = (currentIndex) => {
    if (currentIndex < services.length - 1) {
      setOpenAccordion(currentIndex + 1);
      // Scroll to the next accordion item
      setTimeout(() => {
        const nextElement = document.getElementById(`accordion-${currentIndex + 1}`);
        if (nextElement) {
          nextElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 100);
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleAccordion(index);
    }
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    "name": "Leadership Methods",
    "description": "Adaptive leadership practice for leaders, teams, and organizations"
  };

  return (
    <>
      <SEO pageKey="methods" />
      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify(jsonLd)}
        </script>
      </Helmet>
      
      <div className="min-h-screen bg-[#FAFAF9]">
        {/* Hero Section with Parallax */}
        <section ref={heroRef} className="w-full bg-white py-24 sm:py-32 md:py-40 lg:py-48 relative overflow-hidden">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
              {/* Left Content */}
              <div>
                <h1 className="font-serif text-7xl sm:text-8xl md:text-9xl font-bold text-[#1A1A1A] mb-6 sm:mb-8 leading-[0.9] tracking-tight">
                  Methods
                </h1>
                <p className="text-xl sm:text-2xl md:text-3xl font-light leading-relaxed text-[#1A1A1A]/70">
                  An adaptive leadership practice
                </p>
              </div>
              
              {/* Right: 3-Layer Parallax (Desktop Only) */}
              <div className="relative h-[500px] hidden lg:block">
                {/* Layer 3: Back (slowest) */}
                <div 
                  className="absolute inset-0 z-10"
                  style={{ 
                    transform: `translateY(${scrollY * 0.05}px)`,
                    transition: 'transform 0.1s ease-out'
                  }}
                >
                  <img 
                    src="/images/methods-layer-3.png" 
                    alt="Methods Background Layer" 
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
                    src="/images/methods-layer-2.png" 
                    alt="Methods Middle Layer" 
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                </div>
                
                {/* Layer 1: Front - Moves HORIZONTALLY ONLY (grounded) */}
                <div 
                  className="absolute inset-0 z-30"
                  style={{ 
                    transform: `translateX(${scrollY * -0.15}px)`,
                    transition: 'transform 0.1s ease-out'
                  }}
                >
                  <img 
                    src="/images/methods-layer-1.png" 
                    alt="Methods Foreground Layer" 
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

        {/* Section I: Opening Frame */}
        <section 
          id="opening-frame" 
          ref={(el) => (sectionRefs.current['opening-frame'] = el)} 
          className="w-full bg-white py-16 sm:py-24 md:py-32 lg:py-40 scroll-mt-32"
        >
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8">
              <p className="text-base sm:text-lg leading-relaxed text-[#6B6B6B]">
                Leadership doesn't happen in ideal conditions. It happens in motion—inside pressure, relationships, expectations, and the realities leaders are already navigating. Most programs and models break down at that point because they rely on steps, templates, or theory. This work doesn't. It adjusts to what is actually happening. When <a href="/journal/leadership-bottlenecks-will-choke-the-life-out-of-a-business" className="text-[#C85A3C] hover:text-[#B54A32] underline" onClick={(e) => { e.preventDefault(); window.history.pushState({}, '', '/journal/leadership-bottlenecks-will-choke-the-life-out-of-a-business'); window.dispatchEvent(new PopStateEvent('popstate')); window.scrollTo({ top: 0, behavior: 'instant' }); }}>leadership bottlenecks</a> form, this approach adapts.
              </p>
              <p className="text-base sm:text-lg leading-relaxed text-[#6B6B6B]">
                This approach works because it brings clarity to the moment. Leaders can't make aligned decisions when the situation feels foggy or overwhelming. When we slow the moment down and name what's really going on—behaviorally, relationally, culturally—leaders regain their footing. Clarity creates steadiness, and steadiness changes everything.
              </p>
              <p className="text-base sm:text-lg leading-relaxed text-[#6B6B6B]">
                It also works because it addresses the whole picture, not just the symptoms. Pressure, communication, behavior, trust, expectations, and culture all affect each other. When one shifts, the rest move with it. An adaptive method sees those connections and responds accordingly.
              </p>
              <p className="text-base sm:text-lg leading-relaxed text-[#6B6B6B]">
                The years I've spent leading, serving clients, building companies, working across industries, writing, researching, and developing Culture Science and the Archetype Leadership Index (ALI) all support this work. They sharpen my ability to read what's happening early—before drift becomes damage.
              </p>
              <p className="text-base sm:text-lg leading-relaxed text-[#6B6B6B]">
                But at its core, this works because it stays human. Real conversations. Real awareness. Real decisions that move people and organizations forward with confidence.
              </p>
              
              {/* Pull Quote */}
              <blockquote className="border-l-4 border-[#C85A3C] pl-6 sm:pl-8 my-10 sm:my-12">
                <p className="text-2xl sm:text-3xl md:text-4xl italic font-serif text-[#1A1A1A] leading-relaxed">
                  "When leaders see clearly, they lead clearly. That's why this approach changes things."
                </p>
              </blockquote>
            </div>
          </div>
        </section>

        {/* Section II: What I Offer (Accordion) */}
        <section 
          id="what-i-offer" 
          ref={(el) => (sectionRefs.current['what-i-offer'] = el)} 
          className="w-full bg-[#FAFAF9] py-16 sm:py-24 md:py-32 lg:py-40 scroll-mt-32"
        >
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#1A1A1A] mb-12 sm:mb-16 font-serif tracking-tight">
                What I Offer
              </h2>
              
              <div className="space-y-4">
                {services.map((service, index) => (
                  <div
                    key={service.id}
                    id={`accordion-${index}`}
                    className="bg-white border border-gray-200 rounded-sm overflow-hidden"
                  >
                    {/* Accordion Header */}
                    <button
                      onClick={() => toggleAccordion(index)}
                      onKeyDown={(e) => handleKeyDown(e, index)}
                      className="w-full flex items-center justify-between p-6 sm:p-8 hover:bg-gray-50 transition-colors text-left"
                      aria-expanded={openAccordion === index}
                      aria-controls={`accordion-content-${index}`}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="flex items-center gap-4 sm:gap-6">
                        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#C85A3C] flex items-center justify-center flex-shrink-0">
                          <span className="text-base sm:text-lg font-bold font-serif text-white">
                            {service.number}
                          </span>
                        </div>
                        <div>
                          <h3 className="text-xl sm:text-2xl font-bold font-serif text-[#1A1A1A] mb-1">
                            {service.title}
                          </h3>
                          <p className="text-base sm:text-lg text-[#6B6B6B] font-medium">
                            {service.subtitle}
                          </p>
                        </div>
                      </div>
                      <svg
                        className={`w-6 h-6 text-[#1A1A1A] transition-transform duration-300 flex-shrink-0 ${
                          openAccordion === index ? 'rotate-180' : ''
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    
                    {/* Accordion Content */}
                    <div
                      id={`accordion-content-${index}`}
                      className={`overflow-hidden transition-all duration-300 ${
                        openAccordion === index ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
                      }`}
                    >
                      <div className="border-t border-gray-100 px-6 sm:px-8 pb-8 pt-4">
                        <div className="space-y-4 mb-6">
                          {service.content}
                        </div>
                        
                        {/* Benefits List (if exists) */}
                        {service.benefits && service.benefits.length > 0 && (
                          <div className="mb-6">
                            <p className="text-base sm:text-lg font-semibold text-[#1A1A1A] mb-3">
                              {index === 0 && 'What mentorship looks like:'}
                              {index === 1 && 'What consulting engagements include:'}
                              {index === 2 && 'What fractional leadership provides:'}
                              {index === 3 && 'Speaking topics include:'}
                              {index === 4 && 'What training and education includes:'}
                            </p>
                            <ul className="list-disc space-y-2 pl-6 sm:pl-8">
                              {service.benefits.map((benefit, benefitIndex) => (
                                <li key={benefitIndex} className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] marker:text-[#C85A3C]">
                                  {benefit}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {/* Buttons */}
                        <div className="mt-8 flex flex-col sm:flex-row gap-4">
                          <a
                            href={service.link}
                            className="flex-1 bg-[#1A1A1A] text-white px-6 sm:px-10 py-3 sm:py-4 font-medium text-sm sm:text-base hover:bg-[#1A1A1A]/90 transition-colors rounded-sm text-center"
                          >
                            Learn More
                          </a>
                          {service.nextService ? (
                            <button
                              onClick={() => openNextAccordion(index)}
                              className="flex-1 bg-transparent text-[#1A1A1A] px-6 sm:px-10 py-3 sm:py-4 font-medium text-sm sm:text-base border-2 border-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white transition-colors rounded-sm"
                            >
                              Next: {service.nextService} →
                            </button>
                          ) : (
                            <a
                              href="/contact"
                              className="flex-1 bg-transparent text-[#1A1A1A] px-6 sm:px-10 py-3 sm:py-4 font-medium text-sm sm:text-base border-2 border-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white transition-colors rounded-sm text-center"
                            >
                              Start a Conversation
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Section III: How I Work */}
        <section 
          id="how-i-work" 
          ref={(el) => (sectionRefs.current['how-i-work'] = el)} 
          className="w-full bg-white py-16 sm:py-24 md:py-32 lg:py-40 scroll-mt-32"
        >
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8">
              <div className="flex items-center mb-8 sm:mb-10">
                <div className="w-1 h-10 sm:h-12 md:h-14 bg-[#C85A3C] mr-4 sm:mr-6"></div>
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#1A1A1A] font-serif tracking-tight leading-tight">
                  How I Work with Leaders, Teams, and Organizations
                </h2>
              </div>
              <p className="text-base sm:text-lg leading-relaxed text-[#6B6B6B]">
                When I work with a leader, a team, or an entire organization, the approach is always adaptive. Some situations require steadiness and presence. Some require direct truth. Some require pattern recognition and clarity. Others require building alignment that hasn't existed yet. The method shifts with the moment because leadership shifts with the moment.
              </p>
              <p className="text-base sm:text-lg leading-relaxed text-[#6B6B6B]">
                The guidance I bring into a conversation comes from the full weight of what I've lived—three decades leading teams, building companies, creating software platforms, serving clients across industries, and seeing how real people respond to leadership under pressure. It also comes from the research behind Culture Science and the ongoing development of the Archetype Leadership Index (ALI). These tools aren't installed inside organizations—they're used by me (and eventually my team) to help leaders understand the forces shaping their environment, and they will strengthen this work as they mature.
              </p>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] font-semibold">
                Most leaders don't need a program. They need clarity, perspective, and direction that makes sense of the moment they're in. That's what I bring.
              </p>
            </div>
          </div>
        </section>

        {/* Section IV: What Informs My Work */}
        <section 
          id="what-informs" 
          ref={(el) => (sectionRefs.current['what-informs'] = el)} 
          className="w-full bg-[#FAFAF9] py-16 sm:py-24 md:py-32 lg:py-40 scroll-mt-32"
        >
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8">
              <div className="flex items-center mb-8 sm:mb-10">
                <div className="w-1 h-10 sm:h-12 md:h-14 bg-[#C85A3C] mr-4 sm:mr-6"></div>
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#1A1A1A] font-serif tracking-tight leading-tight">
                  What Informs My Work
                </h2>
              </div>
              <p className="text-base sm:text-lg leading-relaxed text-[#6B6B6B]">
                The foundation of this work isn't theoretical. It's lived. It comes from:
              </p>
              <ul className="space-y-4">
                <li className="pl-6 border-l-2 border-[#C85A3C] text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                  32 years across web, creative, software, client service, and operational leadership
                </li>
                <li className="pl-6 border-l-2 border-[#C85A3C] text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                  Leading teams, building companies, navigating collapse and recovery
                </li>
                <li className="pl-6 border-l-2 border-[#C85A3C] text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                  Pattern recognition from working across multiple industries
                </li>
                <li className="pl-6 border-l-2 border-[#C85A3C] text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                  Watching how culture responds to leadership behavior and vice versa
                </li>
                <li className="pl-6 border-l-2 border-[#C85A3C] text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                  Writing that forces clarity and accountability
                </li>
                <li className="pl-6 border-l-2 border-[#C85A3C] text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                  Research across leadership, psychology, communication, and organizational behavior — including <a href="/journal/the-case-for-servant-leadership-part-1" className="text-[#C85A3C] hover:text-[#B54A32] underline" onClick={(e) => { e.preventDefault(); window.history.pushState({}, '', '/journal/the-case-for-servant-leadership-part-1'); window.dispatchEvent(new PopStateEvent('popstate')); window.scrollTo({ top: 0, behavior: 'instant' }); }}>servant leadership research</a> and the <a href="/journal/psychology-of-servant-leadership-part-1-servant-mindset" className="text-[#C85A3C] hover:text-[#B54A32] underline" onClick={(e) => { e.preventDefault(); window.history.pushState({}, '', '/journal/psychology-of-servant-leadership-part-1-servant-mindset'); window.dispatchEvent(new PopStateEvent('popstate')); window.scrollTo({ top: 0, behavior: 'instant' }); }}>psychology of servant leadership</a>
                </li>
                <li className="pl-6 border-l-2 border-[#C85A3C] text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                  Developing Culture Science and ALI as tools that support clarity—not systems to install
                </li>
              </ul>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] font-semibold">
                What I do is grounded in experience but sharpened by study. The combination makes the work both intuitive and precise.
              </p>
            </div>
          </div>
        </section>

        {/* Section V: Why This Works */}
        <section 
          id="why-this-works" 
          ref={(el) => (sectionRefs.current['why-this-works'] = el)} 
          className="w-full bg-white py-16 sm:py-24 md:py-32 lg:py-40 scroll-mt-32"
        >
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8">
              <div className="flex items-center mb-8 sm:mb-10">
                <div className="w-1 h-10 sm:h-12 md:h-14 bg-[#C85A3C] mr-4 sm:mr-6"></div>
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#1A1A1A] font-serif tracking-tight leading-tight">
                  Why This Works
                </h2>
              </div>
              <p className="text-base sm:text-lg leading-relaxed text-[#6B6B6B]">
                Leadership doesn't happen in ideal conditions. It happens in motion—inside pressure, relationships, expectations, and the realities leaders are already navigating. Most programs and models break down at that point because they rely on steps, templates, or theory. This work doesn't. It adjusts to what is actually happening.
              </p>
              <p className="text-base sm:text-lg leading-relaxed text-[#6B6B6B]">
                This approach works because it brings clarity to the moment. Leaders can't make aligned decisions when the situation feels foggy or overwhelming. When we slow the moment down and name what's really going on—behaviorally, relationally, culturally—leaders regain their footing. Clarity creates steadiness, and steadiness changes everything.
              </p>
              <p className="text-base sm:text-lg leading-relaxed text-[#6B6B6B]">
                It also works because it addresses the whole picture, not just the symptoms. Pressure, communication, behavior, trust, expectations, and culture all affect each other. When one shifts, the rest move with it. An adaptive method sees those connections and responds accordingly.
              </p>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] font-semibold">
                The outcome of this work isn't a model. It's clarity leaders can act on. Clarity creates steadiness. Steadiness creates alignment. Alignment creates momentum.
              </p>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] font-semibold">
                That's why this works.
              </p>
            </div>
          </div>
        </section>

        {/* Closing CTA */}
        <section 
          id="closing" 
          ref={(el) => (sectionRefs.current.closing = el)} 
          className="w-full bg-[#FAFAF9] py-16 sm:py-24 md:py-32 lg:py-40 scroll-mt-32"
        >
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#1A1A1A] mb-6 sm:mb-8 font-serif tracking-tight">
                Ready to Begin?
              </h2>
              <p className="text-base sm:text-lg leading-relaxed text-[#6B6B6B] mb-12">
                Let's start with a conversation about what you're navigating and where clarity is needed most.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center mt-12">
                <a
                  href="/contact"
                  className="px-10 py-5 bg-[#1A1A1A] text-white font-medium text-base hover:bg-[#1A1A1A]/90 transition-colors rounded-sm"
                >
                  Start a Conversation
                </a>
                <a
                  href={process.env.NEXT_PUBLIC_CALENDLY_SCHEDULING_URL || import.meta.env.VITE_CALENDLY_SCHEDULING_URL || 'https://calendly.com/bartpaden/1-on-1-mentorships'}
                  className="px-10 py-5 bg-transparent text-[#1A1A1A] font-medium text-base border-2 border-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white transition-colors rounded-sm"
                >
                  Book Time
                </a>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
