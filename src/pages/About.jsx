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
                <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-[#1A1A1A] mb-6 sm:mb-8 font-serif tracking-tight text-balance">
                  About Bart
                </h1>
                <h2 className="text-4xl sm:text-5xl md:text-6xl font-sans font-normal text-[#1A1A1A] mb-6 sm:mb-8 leading-tight">
                  Thirty-two years building companies and growing people.
                </h2>
              </div>
              
              {/* Right: 3-Layer Parallax */}
              {!isMobile && (
                <div className="relative w-full max-w-lg lg:max-w-xl mx-auto lg:mx-0" style={{ aspectRatio: '1/1', height: 'auto' }}>
                  {/* Layer 3 (back) - Monitor - floats UP as you scroll */}
                  <div 
                    className="absolute inset-0 z-0"
                    style={{ 
                      transform: `translateY(${scrollY * -0.12}px)`
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
                  
                  {/* Layer 2 (middle) - Archy - slight movement */}
                  <div 
                    className="absolute inset-0 z-10"
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
                  
                  {/* Layer 1 (front) - Cartoon Bart - moves slowest */}
                  <div 
                    className="absolute inset-0 z-20"
                    style={{ 
                      transform: `translateY(${scrollY * 0.05}px)`
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
                <div className="relative w-full max-w-lg mx-auto" style={{ aspectRatio: '1/1' }}>
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

        {/* The Work Found Me */}
        <section className="w-full bg-[#FAFAF9] py-16 sm:py-24 md:py-32">
          <div className="container mx-auto px-4 sm:px-6 md:px-12 max-w-4xl">
            <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-8 lg:gap-12 items-start">
              <div className="flex justify-center lg:justify-start">
                <img
                  src="/images/bart-paden.jpg"
                  alt="Bart"
                  className="w-60 h-auto object-contain rounded-sm"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              </div>
              <div className="space-y-4 sm:space-y-6">
                <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-[#1A1A1A] tracking-tight">
                  I build leaders worth following.
                </h2>
                <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                  I didn't set out to be a leader—leadership found me the day my first employee walked into the office and asked me for insurance. I didn't have the revenue, so I used my own income to make it work. That decision wasn't strategy; it was responsibility. Since then I've built teams, defended people when it mattered, led through seasons of growth and collapse, and rebuilt cultures when trust was thin. Those years forged what I now teach: leadership is personal, culture is fragile, and health begins at the top.
                </p>
                <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                  I mentor executives and founders, but I'm just as committed to emerging leaders and students. Strength and humility can live in the same sentence. That's the kind of leader I help build.
                </p>
                <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                  I started in creative work—design, web, and brand. The work taught me to solve real problems for real people and to translate vision into something tangible. Early opportunities stretched into responsibility. I learned quickly that you don't earn influence by talking about values—you earn it by living them when it costs you.
                </p>
                <div className="border-l-4 border-[#C85A3C] pl-8 sm:pl-10 my-12 sm:my-16">
                  <p className="text-2xl sm:text-3xl md:text-4xl italic font-serif text-[#1A1A1A] leading-relaxed">
                    "Influence starts with responsibility, not position."
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Leadership in the Real World */}
        <section className="w-full bg-white py-16 sm:py-24 md:py-32">
          <div className="container mx-auto px-4 sm:px-6 md:px-12 max-w-4xl">
            <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-[#1A1A1A] mb-8 sm:mb-10 tracking-tight">
              Leadership in the Real World
            </h2>
            <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] mb-6 sm:mb-8">
              As teams formed around the work, I discovered the weight and privilege of leadership. Hiring talented people required more than a budget—it required standards that protected them. I defended team members when it mattered, pushed for clarity when conversations got loud, and chose consistency over the "glory project" chase. Serving people well built momentum that marketing alone could never buy.
            </p>
            <h3 className="font-serif text-2xl sm:text-3xl md:text-4xl font-bold text-[#1A1A1A] mb-4 sm:mb-6 mt-8 sm:mt-10">
              What that looked like (themes, not stories)
            </h3>
            <ul className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
              <li className="flex items-start text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                <span className="text-[#C85A3C] mr-3 mt-1">•</span>
                <span>Hiring for character and fit, then teaching the craft and the system.</span>
              </li>
              <li className="flex items-start text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                <span className="text-[#C85A3C] mr-3 mt-1">•</span>
                <span>Protecting the team from toxic dynamics—even when it risked revenue.</span>
              </li>
              <li className="flex items-start text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                <span className="text-[#C85A3C] mr-3 mt-1">•</span>
                <span>Building simple rhythms so good people could do great work.</span>
              </li>
            </ul>
            <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] mb-6 sm:mb-8">
              At a pivotal moment, I paused billable work to serve my community at scale. That choice didn't polish a brand; it clarified an identity. Leadership isn't a speech—it's a decision you make when no one owes you applause. The lesson stuck: culture is built by what you sacrifice for.
            </p>
            <div className="border-l-4 border-[#C85A3C] pl-8 sm:pl-10 my-12 sm:my-16">
              <p className="text-2xl sm:text-3xl md:text-4xl italic font-serif text-[#1A1A1A] leading-relaxed">
                "The fastest way to define culture is to choose service when it costs you."
              </p>
            </div>
          </div>
        </section>

        {/* The Years That Tested Everything */}
        <section className="w-full bg-[#FAFAF9] py-16 sm:py-24 md:py-32">
          <div className="container mx-auto px-4 sm:px-6 md:px-12 max-w-4xl">
            <div className="border-2 border-[#C85A3C] bg-white p-8 sm:p-10 md:p-12 space-y-4 sm:space-y-6">
              <h3 className="font-serif text-2xl sm:text-3xl md:text-4xl font-bold text-[#1A1A1A]">
                The Years That Tested Everything
              </h3>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                Later, misalignment and pressure took a toll. I learned how quickly "high performance" becomes "over-performing under constant strain." Selling a company, rebuilding health, and regaining clarity wasn't an abstract principle—it was survival. That season gave me empathy for leaders who carry more than most people will ever see.
              </p>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                Today, my coaching often begins where leaders feel most alone: in the fog between exhaustion and expectation. We quiet the noise, tell the truth, and rebuild from the inside out.
              </p>
            </div>
          </div>
        </section>

        {/* What Defines My Work */}
        <section className="w-full bg-white py-16 sm:py-24 md:py-32">
          <div className="container mx-auto px-4 sm:px-6 md:px-12 max-w-4xl">
            <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-[#1A1A1A] mb-8 sm:mb-10 tracking-tight">
              What Defines My Work
            </h2>
            <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] mb-6 sm:mb-8">
              Archetype Original exists to help leaders build organizations that hold—cultures protected by clear standards, operations aligned to purpose, and growth that doesn't cost your soul. I blend three decades across software, marketing, fitness, and leadership rooms into practical guidance leaders can live with.
            </p>
            <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] mb-6 sm:mb-8">
              I mentor executives and founders; I also invest deeply in emerging leaders and students. The future depends on who they become—so I teach them early that competence without character can't carry weight for long.
            </p>
            <h3 className="font-serif text-2xl sm:text-3xl md:text-4xl font-bold text-[#1A1A1A] mb-4 sm:mb-6 mt-8 sm:mt-10">
              What It's Like to Work Together (rules of engagement)
            </h3>
            <ul className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
              <li className="flex items-start text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                <span className="text-[#C85A3C] mr-3 mt-1 font-bold">•</span>
                <span><strong className="text-[#1A1A1A]">Honest by default.</strong> I won't be a "yes-man." We address the real issue, directly.</span>
              </li>
              <li className="flex items-start text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                <span className="text-[#C85A3C] mr-3 mt-1 font-bold">•</span>
                <span><strong className="text-[#1A1A1A]">Human first.</strong> I treat people the way I want to be treated—especially under pressure.</span>
              </li>
              <li className="flex items-start text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                <span className="text-[#C85A3C] mr-3 mt-1 font-bold">•</span>
                <span><strong className="text-[#1A1A1A]">No dependency.</strong> Success is when you don't need me anymore.</span>
              </li>
              <li className="flex items-start text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                <span className="text-[#C85A3C] mr-3 mt-1 font-bold">•</span>
                <span><strong className="text-[#1A1A1A]">Shared accountability.</strong> Accountability is owned most by the person being accountable.</span>
              </li>
              <li className="flex items-start text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                <span className="text-[#C85A3C] mr-3 mt-1 font-bold">•</span>
                <span><strong className="text-[#1A1A1A]">Conversation over program.</strong> Real situations. Real plans. Real execution. No subscriptions.</span>
              </li>
            </ul>
            <h3 className="font-serif text-2xl sm:text-3xl md:text-4xl font-bold text-[#1A1A1A] mb-4 sm:mb-6 mt-8 sm:mt-10">
              Where We Start (personal clarity first)
            </h3>
            <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] mb-6 sm:mb-8">
              When trust has been broken or confidence shaken, the first clarity is personal. We name what's true about who you are, what you value, and what healthy leadership looks like for you. Then we rebuild structural and directional clarity around that center—roles, decision rights, communication cadence, priorities, and next steps.
            </p>
            <h4 className="font-serif text-xl sm:text-2xl md:text-3xl font-bold text-[#1A1A1A] mb-4 sm:mb-6 mt-6 sm:mt-8">
              Signals we're on track
            </h4>
            <ul className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
              <li className="flex items-start text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                <span className="text-[#C85A3C] mr-3 mt-1">•</span>
                <span>Language becomes clearer; decisions stop looping.</span>
              </li>
              <li className="flex items-start text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                <span className="text-[#C85A3C] mr-3 mt-1">•</span>
                <span>Teams stop protecting themselves and start protecting the mission.</span>
              </li>
              <li className="flex items-start text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                <span className="text-[#C85A3C] mr-3 mt-1">•</span>
                <span>Energy returns without bravado.</span>
              </li>
              <li className="flex items-start text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                <span className="text-[#C85A3C] mr-3 mt-1">•</span>
                <span>You feel strong and calm at the same time.</span>
              </li>
            </ul>
            <div className="border-2 border-[#C85A3C] bg-white p-8 sm:p-10 md:p-12 space-y-4 sm:space-y-6 mt-8 sm:mt-10">
              <h3 className="font-serif text-2xl sm:text-3xl md:text-4xl font-bold text-[#1A1A1A] mb-4 sm:mb-6">
                Why This Works (research in plain language)
              </h3>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] mb-6 sm:mb-8">
                Modern research keeps confirming what experience has already taught me. When people feel heard and supported, their minds unlock. Psychological safety, trust, and empathy aren't soft skills—they're performance multipliers.
              </p>
              <div className="space-y-4 sm:space-y-6 mb-6 sm:mb-8">
                <div>
                  <h4 className="font-serif text-xl sm:text-2xl md:text-3xl font-bold text-[#1A1A1A] mb-2 sm:mb-3">
                    Psychological Safety (Edmondson)
                  </h4>
                  <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                    Teams that can tell the truth learn faster and perform better.
                  </p>
                </div>
                <div>
                  <h4 className="font-serif text-xl sm:text-2xl md:text-3xl font-bold text-[#1A1A1A] mb-2 sm:mb-3">
                    Empathic Listening (Rogers)
                  </h4>
                  <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                    Listening to understand reduces anxiety and restores cognitive clarity.
                  </p>
                </div>
                <div>
                  <h4 className="font-serif text-xl sm:text-2xl md:text-3xl font-bold text-[#1A1A1A] mb-2 sm:mb-3">
                    Neuroscience of Trust (Zak/HBR)
                  </h4>
                  <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                    High-trust environments lower stress chemistry and increase productivity and engagement.
                  </p>
                </div>
                <div>
                  <h4 className="font-serif text-xl sm:text-2xl md:text-3xl font-bold text-[#1A1A1A] mb-2 sm:mb-3">
                    Executive Isolation (Gallup)
                  </h4>
                  <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                    Many leaders lack a safe place to process; mentorship restores clarity and better decisions.
                  </p>
                </div>
              </div>
              <div className="border-l-4 border-[#C85A3C] pl-8 sm:pl-10 mt-8 sm:mt-10">
                <p className="text-2xl sm:text-3xl md:text-4xl italic font-serif text-[#1A1A1A] leading-relaxed">
                  "Empathy restores access to reason. Trust unlocks performance."
                </p>
              </div>
            </div>
            <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] mb-6 sm:mb-8 mt-8 sm:mt-10">
              I want you to reach a point where you don't need me. Not because I lost interest—but because you recovered your center, built systems that fit, and grew leaders who can carry the mission. I'll celebrate your independence every single time.
            </p>
          </div>
        </section>

        {/* How I Show Up Today */}
        <section className="w-full bg-[#FAFAF9] py-16 sm:py-24 md:py-32">
          <div className="container mx-auto px-4 sm:px-6 md:px-12 max-w-4xl">
            <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-[#1A1A1A] mb-8 sm:mb-10 tracking-tight">
              How I Show Up Today
            </h2>
            <div className="space-y-8 sm:space-y-10">
              <div className="border-l-4 border-[#C85A3C] pl-6 sm:pl-8 space-y-3 sm:space-y-4">
                <h3 className="text-xl sm:text-2xl font-bold text-[#1A1A1A]">Mentorship</h3>
                <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                  One-to-one guidance for executives, founders, emerging leaders, and students. We build clarity, confidence, and decision discipline without burnout.
                </p>
              </div>
              <div className="border-l-4 border-[#C85A3C] pl-6 sm:pl-8 space-y-3 sm:space-y-4">
                <h3 className="text-xl sm:text-2xl font-bold text-[#1A1A1A]">Consulting</h3>
                <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                  Practical help for culture, organizational design, communication rhythms, and go-to-market alignment. Strategy that people can actually live with.
                </p>
              </div>
              <div className="border-l-4 border-[#C85A3C] pl-6 sm:pl-8 space-y-3 sm:space-y-4">
                <h3 className="text-xl sm:text-2xl font-bold text-[#1A1A1A]">Speaking & Workshops</h3>
                <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                  Keynotes, classroom talks, and team workshops that translate principles into practice.
                </p>
              </div>
              <div className="border-l-4 border-[#C85A3C] pl-6 sm:pl-8 space-y-3 sm:space-y-4">
                <h3 className="text-xl sm:text-2xl font-bold text-[#1A1A1A]">Fractional Leadership</h3>
                <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                  Interim executive coverage to stabilize operations and lead through change—clear lanes, steady cadence, clean handoff.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Closing CTA */}
        <section className="w-full bg-white py-16 sm:py-24 md:py-32">
          <div className="container mx-auto px-4 sm:px-6 md:px-12 max-w-4xl">
            <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-[#1A1A1A] mb-8 sm:mb-10 tracking-tight">
              Closing
            </h2>
            <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] mb-6 sm:mb-8">
              When I'm with a client, I'm 100% theirs.
            </p>
            <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] mb-8 sm:mb-10">
              When I'm not, I'm building this leadership universe—writing, researching, and refining tools you can use. If you're ready to steady the ground under your feet and lead with strength and humility, let's talk.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <a 
                href="/contact" 
                className="px-8 sm:px-10 py-4 sm:py-5 bg-[#1A1A1A] text-white font-medium text-sm sm:text-base hover:bg-[#1A1A1A]/90 transition-colors"
              >
                Start a Conversation
              </a>
              <a 
                href={import.meta.env.VITE_CALENDLY_SCHEDULING_URL || 'https://calendly.com/bartpaden/1-on-1-mentorships'} 
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
