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
import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import SEO from '../../components/SEO';
import { OptimizedImage } from '../../components/OptimizedImage';

export default function Consulting() {
  const [scrollY, setScrollY] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024); // lg breakpoint - disable parallax on mobile
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    const handleScroll = () => {
      if (!isMobile) {
        setScrollY(window.scrollY);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', checkMobile);
    };
  }, [isMobile]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    "name": "Consulting",
    "description": "Strategic consulting for organizational clarity, alignment, and culture"
  };

  return (
    <>
      <SEO pageKey="consulting" />
      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify(jsonLd)}
        </script>
      </Helmet>
      
      <div className="min-h-screen bg-[#FAFAF9]">
        {/* Hero Section with Parallax */}
        <section className="w-full bg-white py-16 sm:py-20 md:py-24 lg:py-20 relative overflow-hidden">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
              {/* Left Content */}
              <div>
                <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl font-bold text-[#1A1A1A] mb-6 sm:mb-8 leading-[0.9] tracking-tight">
                  Consulting
                </h1>
                <p className="text-xl sm:text-2xl md:text-3xl font-light leading-relaxed text-[#1A1A1A]/70">
                  Real solutions for real organizations. No frameworks. No fluff. Just clarity, alignment, and the work required to move forward.
                </p>
              </div>
              
              {/* Right: 3-Layer Parallax (Desktop) / Static (Mobile) */}
              <div className="relative h-[300px] sm:h-[400px] md:h-[450px] lg:h-[500px]">
                {/* Desktop: Parallax layers */}
                <div className="hidden lg:block absolute inset-0">
                  {/* Layer 3 (Back): Can move any direction for depth */}
                  <div 
                    className="absolute inset-0 z-10"
                    style={{ 
                      transform: `translateY(${scrollY * 0.05}px)`,
                      transition: 'transform 0.1s ease-out'
                    }}
                  >
                    <OptimizedImage
                      src="/images/consulting-layer-3.png"
                      alt="Consulting Background"
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  </div>
                  
                  {/* Layer 2 (Middle - Character): Moves HORIZONTALLY ONLY (grounded) */}
                  <div 
                    className="absolute inset-0 z-20"
                    style={{ 
                      transform: `translateX(${scrollY * 0.08}px)`,
                      transition: 'transform 0.1s ease-out'
                    }}
                  >
                    <OptimizedImage
                      src="/images/consulting-layer-2.png"
                      alt="Bart"
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  </div>
                  
                  {/* Layer 1 (Front): Moves HORIZONTALLY ONLY (grounded) */}
                  <div 
                    className="absolute inset-0 z-30"
                    style={{ 
                      transform: `translateX(${scrollY * -0.15}px)`,
                      transition: 'transform 0.1s ease-out'
                    }}
                  >
                    <OptimizedImage
                      src="/images/consulting-layer-1.png"
                      alt="Consulting Foreground"
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  </div>
                </div>
                
                {/* Mobile: Static layers (no parallax) */}
                <div className="lg:hidden absolute inset-0">
                  {/* Layer 3: Back */}
                  <div className="absolute inset-0 z-10">
                    <OptimizedImage
                      src="/images/consulting-layer-3.png"
                      alt="Consulting Background"
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  </div>
                  
                  {/* Layer 2: Middle */}
                  <div className="absolute inset-0 z-20">
                    <OptimizedImage
                      src="/images/consulting-layer-2.png"
                      alt="Bart"
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  </div>
                  
                  {/* Layer 1: Front */}
                  <div className="absolute inset-0 z-30">
                    <OptimizedImage
                      src="/images/consulting-layer-1.png"
                      alt="Consulting Foreground"
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  </div>
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
                Most consulting engagements begin with surface-level symptoms—missed deadlines, unclear roles, communication friction, leadership misalignment. The actual problem usually lives deeper: drift between stated values and operational reality, eroded trust, inconsistent accountability, or a culture shaped by reaction instead of intention.
              </p>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                Organizations rarely fail for lack of talent or ambition. They fail because systems, communication, and leadership slowly drift out of alignment—and by the time leaders notice, the symptoms are everywhere. Consulting, done right, doesn't just fix the symptoms. It addresses the source.
              </p>
              <p className="text-lg sm:text-xl leading-relaxed text-[#1A1A1A] italic font-serif">
                The work isn't about what sounds good in a boardroom. It's about what actually works inside the organization people experience every day.
              </p>
            </div>
          </div>
        </section>

        {/* Section 2: What Consulting Is */}
        <section className="w-full bg-[#FAFAF9] py-16 sm:py-24 md:py-32">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="flex items-center mb-8 sm:mb-10">
                <div className="w-1 h-10 sm:h-12 md:h-14 bg-[#C85A3C] mr-4 sm:mr-6"></div>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#1A1A1A] font-serif tracking-tight leading-tight">
                  What Consulting Is
                </h2>
              </div>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                Consulting is strategic, practical, and adaptive work designed to help organizations strengthen culture, clarify communication, rebuild trust, align systems, and sustain the alignment required for long-term health.
              </p>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                It is not:
              </p>
              <ul className="list-disc space-y-3 pl-6 sm:pl-8">
                <li className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] marker:text-[#C85A3C]">
                  Theory or academic models applied generically
                </li>
                <li className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] marker:text-[#C85A3C]">
                  Slide decks with buzzwords and no follow-through
                </li>
                <li className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] marker:text-[#C85A3C]">
                  One-size-fits-all frameworks
                </li>
                <li className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] marker:text-[#C85A3C]">
                  Advice from someone who has never led through pressure
                </li>
              </ul>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                It is:
              </p>
              <ul className="list-disc space-y-3 pl-6 sm:pl-8">
                <li className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] marker:text-[#C85A3C]">
                  Honest assessment of what's actually happening
                </li>
                <li className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] marker:text-[#C85A3C]">
                  Clarity on where misalignment exists and why
                </li>
                <li className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] marker:text-[#C85A3C]">
                  Strategic guidance grounded in lived leadership and research
                </li>
                <li className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] marker:text-[#C85A3C]">
                  Practical systems that support both people and performance
                </li>
                <li className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] marker:text-[#C85A3C]">
                  Support through implementation—not just recommendations
                </li>
              </ul>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                Every engagement is tailored to the real conditions inside your organization. There are no templates. There is only truth, clarity, and the commitment to see the work through.
              </p>
            </div>
          </div>
        </section>

        {/* Section 3: Who Consulting Serves */}
        <section className="w-full bg-white py-16 sm:py-24 md:py-32">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="flex items-center mb-8 sm:mb-10">
                <div className="w-1 h-10 sm:h-12 md:h-14 bg-[#C85A3C] mr-4 sm:mr-6"></div>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#1A1A1A] font-serif tracking-tight leading-tight">
                  Who Consulting Serves
                </h2>
              </div>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                Consulting supports leadership teams, departments, and entire organizations navigating:
              </p>
              <ul className="list-disc space-y-3 pl-6 sm:pl-8">
                <li className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] marker:text-[#C85A3C]">
                  Cultural drift or misalignment between stated values and actual behavior
                </li>
                <li className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] marker:text-[#C85A3C]">
                  Leadership turnover or transition requiring stability and continuity
                </li>
                <li className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] marker:text-[#C85A3C]">
                  Communication breakdowns creating confusion, friction, or distrust
                </li>
                <li className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] marker:text-[#C85A3C]">
                  Accountability gaps that allow problems to persist without resolution
                </li>
                <li className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] marker:text-[#C85A3C]">
                  Rapid growth exposing structural weaknesses or cultural fragility
                </li>
                <li className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] marker:text-[#C85A3C]">
                  Team conflict rooted in unclear expectations or relational tension
                </li>
                <li className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] marker:text-[#C85A3C]">
                  System failures where processes no longer serve the people using them
                </li>
                <li className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] marker:text-[#C85A3C]">
                  Organizational health assessments before problems become crises
                </li>
              </ul>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                Whether the work is reactive (fixing what's broken) or proactive (strengthening what's working), consulting provides clarity, alignment, and the practical steps required to move forward with confidence.
              </p>
            </div>
          </div>
        </section>

        {/* Section 4: How Consulting Works */}
        <section className="w-full bg-[#FAFAF9] py-16 sm:py-24 md:py-32">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="flex items-center mb-8 sm:mb-10">
                <div className="w-1 h-10 sm:h-12 md:h-14 bg-[#C85A3C] mr-4 sm:mr-6"></div>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#1A1A1A] font-serif tracking-tight leading-tight">
                  How Consulting Works
                </h2>
              </div>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                Every consulting engagement is adaptive, but most follow a similar rhythm:
              </p>
              <div className="space-y-4">
                <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                  <strong className="text-[#1A1A1A]">Assessment</strong> — Understanding what's actually happening
                </p>
                <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] pl-4">
                  I begin by listening, observing, and asking the questions that reveal where drift, friction, or misalignment exists. This isn't theoretical. It's conversational, relational, and grounded in what leaders and teams are experiencing daily.
                </p>
              </div>
              <div className="space-y-4">
                <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                  <strong className="text-[#1A1A1A]">Diagnosis</strong> — Naming the real problem
                </p>
                <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] pl-4">
                  Most symptoms point to deeper structural, relational, or cultural issues. The diagnostic phase identifies root causes, not just surface-level friction. Leaders receive honest, direct insight into what's working, what's not, and why.
                </p>
              </div>
              <div className="space-y-4">
                <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                  <strong className="text-[#1A1A1A]">Strategic Clarity</strong> — Building a path forward
                </p>
                <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] pl-4">
                  Once the real problem is clear, we map a realistic path toward alignment. This includes communication redesign, accountability structures, leadership posture shifts, or cultural recalibration—whatever the organization actually needs.
                </p>
              </div>
              <div className="space-y-4">
                <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                  <strong className="text-[#1A1A1A]">Implementation Support</strong> — Staying present through the work
                </p>
                <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] pl-4">
                  Recommendations mean nothing without follow-through. I stay engaged during implementation to ensure clarity holds, systems stabilize, and leaders have the support required to sustain momentum.
                </p>
              </div>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                The timeline varies based on organizational size, complexity, and readiness. Some engagements last weeks. Others span months. The work continues until alignment is restored and the organization can sustain it independently.
              </p>
              <p className="text-lg sm:text-xl leading-relaxed text-[#1A1A1A] italic font-serif">
                Consulting isn't a one-time fix. It's the scaffolding that helps organizations rebuild strength from the inside out.
              </p>
            </div>
          </div>
        </section>

        {/* Section 5: What Makes This Different */}
        <section className="w-full bg-white py-16 sm:py-24 md:py-32">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="flex items-center mb-8 sm:mb-10">
                <div className="w-1 h-10 sm:h-12 md:h-14 bg-[#C85A3C] mr-4 sm:mr-6"></div>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#1A1A1A] font-serif tracking-tight leading-tight">
                  What Makes This Different
                </h2>
              </div>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                Most consultants bring frameworks built elsewhere and hope they fit. I bring 32 years of lived leadership—building companies, leading teams through collapse and recovery, navigating pressure, and understanding how culture actually responds to leadership behavior.
              </p>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                The foundation of this work includes:
              </p>
              <ul className="list-disc space-y-3 pl-6 sm:pl-8">
                <li className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] marker:text-[#C85A3C]">
                  Leading organizations through growth, crisis, and cultural transformation
                </li>
                <li className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] marker:text-[#C85A3C]">
                  Pattern recognition across industries, team dynamics, and leadership styles
                </li>
                <li className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] marker:text-[#C85A3C]">
                  Deep study of psychology, neuroscience, communication, and organizational behavior
                </li>
                <li className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] marker:text-[#C85A3C]">
                  Development of Culture Science and the Archetype Leadership Index (ALI) as tools for assessing organizational health
                </li>
                <li className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] marker:text-[#C85A3C]">
                  A posture of service, not superiority—clarity without ego
                </li>
              </ul>
              <p className="text-lg sm:text-xl leading-relaxed text-[#1A1A1A] italic font-serif">
                I don't arrive with a model. I arrive with experience, honesty, and the ability to see what leaders are too close to notice.
              </p>
            </div>
          </div>
        </section>

        {/* Section 6: Fractional Leadership Connection */}
        <section className="w-full bg-[#FAFAF9] py-16 sm:py-24 md:py-32">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="flex items-center mb-8 sm:mb-10">
                <div className="w-1 h-10 sm:h-12 md:h-14 bg-[#C85A3C] mr-4 sm:mr-6"></div>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#1A1A1A] font-serif tracking-tight leading-tight">
                  Fractional Leadership — When Consulting Isn't Enough
                </h2>
              </div>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                Some organizations need more than guidance—they need leadership presence. When cultural pressure, transition, or instability requires a steady hand inside the organization, Fractional Leadership provides exactly that.
              </p>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                Where consulting offers strategic clarity and system design, Fractional Leadership offers active leadership during critical seasons—embedded, accountable, and present.
              </p>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                <a 
                  href="/methods/fractional-roles" 
                  className="text-[#1A1A1A] hover:text-[#C85A3C] hover:underline transition-colors"
                  onClick={(e) => {
                    e.preventDefault();
                    window.history.pushState({}, '', '/methods/fractional-roles');
                    window.dispatchEvent(new PopStateEvent('popstate'));
                  }}
                >
                  Learn more about Fractional Leadership here.
                </a>
              </p>
            </div>
          </div>
        </section>

        {/* Section 7: Closing CTA */}
        <section className="w-full bg-white py-16 sm:py-24 md:py-32">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-3xl mx-auto text-center space-y-6">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#1A1A1A] font-serif tracking-tight">
                If Your Organization Needs Clarity
              </h2>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                Whether you're addressing cultural drift, navigating a leadership transition, or strengthening what's already working—consulting provides the strategic insight and practical support required to move forward with alignment.
              </p>
              <div className="mt-12">
                <a
                  href="/contact"
                  className="inline-block px-10 py-5 bg-[#1A1A1A] text-white font-medium text-base hover:bg-[#1A1A1A]/90 transition-colors rounded-sm"
                >
                  Start a Conversation
                </a>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

