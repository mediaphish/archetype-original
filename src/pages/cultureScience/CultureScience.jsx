/**
 * Culture Science Index Page
 * Editorial Minimal Design - Flat, no gradients/shadows
 */
import React, { useState, useEffect } from 'react';
import SEO from '../../components/SEO';

export default function CultureScience() {
  const [scrollY, setScrollY] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // md breakpoint - disable parallax on mobile
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    const handleScroll = () => {
      if (!isMobile) {
        setScrollY(window.scrollY);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', checkMobile);
    };
  }, [isMobile]);

  return (
    <>
      <SEO pageKey="culture-science" />
      <div className="min-h-screen bg-[#FAFAF9]">
        {/* Hero Section with 3-Layer Parallax */}
        <section className="w-full bg-[#FAFAF9] py-20 sm:py-24 md:py-28 relative overflow-hidden">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center max-w-4xl mx-auto">
              {/* Left Content */}
              <div>
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#1A1A1A] mb-6 sm:mb-8 font-serif tracking-tight">
                  Culture Science for Small Business
                </h1>
                <p className="text-2xl sm:text-3xl md:text-4xl font-light leading-snug text-[#1A1A1A]">
                  Where leadership, behavioral research, and lived experience converge.
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
                    src="/images/science-layer-3.png" 
                    alt="Culture Science Background" 
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
                    src="/images/science-layer-2.png" 
                    alt="Culture Science Middle Layer" 
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                </div>
                
                {/* Layer 1: Archy - Moves HORIZONTALLY ONLY (grounded) */}
                <div 
                  className="absolute inset-0 z-30"
                  style={{ 
                    transform: `translateX(${scrollY * -0.15}px)`,
                    transition: 'transform 0.1s ease-out'
                  }}
                >
                  <img 
                    src="/images/science-layer-1.png" 
                    alt="Archy" 
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                </div>
              </div>
              
              {/* Mobile: Static image */}
              {isMobile && (
                <div className="relative w-full max-w-lg mx-auto lg:hidden" style={{ aspectRatio: '1/1' }}>
                  <img 
                    src="/images/science-layer-1.png" 
                    alt="Archy" 
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

        {/* First Content Section */}
        <section className="py-16 sm:py-24 md:py-32 bg-white">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-4xl mx-auto">
              <div className="space-y-6 sm:space-y-8 text-base sm:text-lg leading-relaxed text-[#6B6B6B]">
                <p className="text-pretty">
                  Most leaders don't see the gap between how they think they lead and how their teams actually experience leadership. They measure performance, track KPIs, and celebrate wins—but they rarely measure the thing that makes everything else possible: leadership clarity.
                </p>
                
                <p className="text-pretty">
                  Culture Science exists to change that. It's where 32 years of building companies meets behavioral research, trust psychology, and the lived experience of thousands of leaders and teams.
                </p>
                
                <p className="text-pretty">
                  This isn't another engagement survey. It's not a personality test. It's evidence-based culture measurement designed specifically for small and mid-sized businesses—the companies that don't have HR departments, consultants on retainer, or culture committees.
                </p>
                
                <p className="text-pretty">
                  Culture Science measures what matters: How clear is leadership? How safe do people feel? How much trust exists? How well do teams communicate? These aren't soft metrics. They're the foundation of everything else.
                </p>
                
                <p className="text-pretty">
                  The research is clear: Psychological safety drives performance. Trust unlocks innovation. Clarity removes friction. When leaders get these right, teams stop surviving and start creating.
                </p>
                
                <p className="text-pretty">
                  Culture Science exists to change that.
                </p>
                
                <p className="text-pretty">
                  Most leaders don't see the gap between how they think they lead and how their teams actually experience leadership.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* What Culture Science Actually Is */}
        <section className="py-16 sm:py-24 md:py-32 lg:py-40 bg-[#FAFAF9]">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#1A1A1A] mb-6 sm:mb-8 font-serif tracking-tight text-balance">
                What Culture Science Actually Is
              </h2>
              
              <div className="space-y-6 sm:space-y-8 text-base sm:text-lg leading-relaxed text-[#6B6B6B]">
                <p className="text-pretty">
                  Culture Science is the intersection of three things: Research, Reality, and Responsibility.
                </p>
                
                <p className="text-pretty">
                  <strong>Research:</strong> Behavioral science, trust psychology, psychological safety studies, and leadership neuroscience. The work of Amy Edmondson, Paul Zak, Carl Rogers, and decades of Gallup research.
                </p>
                
                <p className="text-pretty">
                  <strong>Reality:</strong> 32 years of building companies, leading teams, and watching what actually works—and what doesn't. The lived experience of thousands of leaders and team members.
                </p>
                
                <p className="text-pretty">
                  <strong>Responsibility:</strong> The commitment to measure what matters, share what we learn, and build tools that help leaders lead better—without losing what makes them human.
                </p>
                
                <p className="text-pretty font-semibold text-[#1A1A1A]">
                  Culture Science = Research + Reality + Responsibility
                </p>
                
                <p className="text-pretty">
                  Culture Science includes:
                </p>
                
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Behavioral science and trust psychology</li>
                  <li>Psychological safety research</li>
                  <li>Leadership neuroscience</li>
                  <li>Evidence-based culture measurement</li>
                  <li>Anonymous team assessments</li>
                  <li>Longitudinal tracking and benchmarking</li>
                </ul>
                
                <blockquote className="my-10 sm:my-12 pl-6 sm:pl-8 border-l-4 border-[#C85A3C]">
                  <p className="text-xl sm:text-2xl md:text-3xl italic font-serif text-[#1A1A1A] leading-tight">
                    To help small and mid-sized businesses build cultures where people thrive, leaders grow, and clarity becomes normal again.
                  </p>
                </blockquote>
              </div>
            </div>
          </div>
        </section>

        {/* The Problem We're Solving */}
        <section className="py-16 sm:py-24 md:py-32 lg:py-40 bg-white">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-7xl mx-auto">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#1A1A1A] mb-6 sm:mb-8 font-serif tracking-tight text-balance">
                The Problem We're Solving (Plainly)
              </h2>
              
              <div className="space-y-6 sm:space-y-8 text-base sm:text-lg leading-relaxed text-[#6B6B6B] mb-12 sm:mb-16">
                <p className="text-pretty">
                  Most leaders assume their teams experience leadership the same way they do. They assume clarity exists because they feel clear. They assume trust exists because they trust their team. They assume communication works because they communicate.
                </p>
                
                <p className="text-pretty">
                  These assumptions are wrong. Research shows this consistently. Leaders score culture higher than the people under them—every time.
                </p>
                
                <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#1A1A1A] mb-6 sm:mb-8 font-serif tracking-tight">
                  The four biggest cultural blind spots:
                </h3>
              </div>
              
              <div className="space-y-12 sm:space-y-16">
                {/* Card 1 */}
                <div className="flex items-start gap-4 sm:gap-6">
                  <div className="flex-shrink-0 relative">
                    <div className="w-1 h-12 sm:h-16 bg-[#C85A3C]"></div>
                    <span className="text-6xl sm:text-7xl md:text-8xl font-bold text-[#6B6B6B]/20 leading-none font-serif tracking-tight block mt-2">
                      1
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#1A1A1A] mb-4 sm:mb-6 font-serif tracking-tight">
                      Leaders and teams experience culture differently
                    </h3>
                    <p className="text-base sm:text-lg leading-relaxed text-[#6B6B6B]">
                      Research shows this consistently. Leaders score culture higher than the people under them—every time.
                    </p>
                  </div>
                </div>
                
                {/* Card 2 */}
                <div className="flex items-start gap-4 sm:gap-6">
                  <div className="flex-shrink-0 relative">
                    <div className="w-1 h-12 sm:h-16 bg-[#C85A3C]"></div>
                    <span className="text-6xl sm:text-7xl md:text-8xl font-bold text-[#6B6B6B]/20 leading-none font-serif tracking-tight block mt-2">
                      2
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#1A1A1A] mb-4 sm:mb-6 font-serif tracking-tight">
                      Most companies measure performance but never measure leadership clarity
                    </h3>
                    <p className="text-base sm:text-lg leading-relaxed text-[#6B6B6B] mb-4">
                      They track KPIs, revenue, and output. But not:
                    </p>
                    <ul className="list-disc space-y-2 ml-6 text-base sm:text-lg text-[#6B6B6B] marker:text-[#C85A3C]">
                      <li><span className="text-[#1A1A1A]">Consistency</span></li>
                      <li><span className="text-[#1A1A1A]">Trust</span></li>
                      <li><span className="text-[#1A1A1A]">Communication quality</span></li>
                      <li><span className="text-[#1A1A1A]">Team psychological safety</span></li>
                      <li><span className="text-[#1A1A1A]">Operational clarity</span></li>
                      <li><span className="text-[#1A1A1A]">Expectations</span></li>
                    </ul>
                  </div>
                </div>
                
                {/* Card 3 */}
                <div className="flex items-start gap-4 sm:gap-6">
                  <div className="flex-shrink-0 relative">
                    <div className="w-1 h-12 sm:h-16 bg-[#C85A3C]"></div>
                    <span className="text-6xl sm:text-7xl md:text-8xl font-bold text-[#6B6B6B]/20 leading-none font-serif tracking-tight block mt-2">
                      3
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#1A1A1A] mb-4 sm:mb-6 font-serif tracking-tight">
                      People rarely tell leadership the truth
                    </h3>
                    <p className="text-base sm:text-lg leading-relaxed text-[#6B6B6B]">
                      Without psychological safety, feedback is filtered, problems are hidden, and leaders make decisions with incomplete information.
                    </p>
                  </div>
                </div>
                
                {/* Card 4 */}
                <div className="flex items-start gap-4 sm:gap-6">
                  <div className="flex-shrink-0 relative">
                    <div className="w-1 h-12 sm:h-16 bg-[#C85A3C]"></div>
                    <span className="text-6xl sm:text-7xl md:text-8xl font-bold text-[#6B6B6B]/20 leading-none font-serif tracking-tight block mt-2">
                      4
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#1A1A1A] mb-4 sm:mb-6 font-serif tracking-tight">
                      Leaders don't lack desire. They lack a mirror
                    </h3>
                    <p className="text-base sm:text-lg leading-relaxed text-[#6B6B6B]">
                      Most leaders want to lead well. They just don't have a clear picture of how their leadership actually feels to the people experiencing it.
                    </p>
                  </div>
                </div>
              </div>
              
              <p className="text-base sm:text-lg leading-relaxed text-[#6B6B6B] mt-12 sm:mt-16 text-pretty">
                Culture Science builds that mirror.
              </p>
            </div>
          </div>
        </section>

        {/* The Research Behind It */}
        <section className="py-16 sm:py-24 md:py-32 lg:py-40 bg-[#FAFAF9]">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#1A1A1A] mb-12 sm:mb-16 font-serif tracking-tight text-balance">
                The Research Behind It (Explained in Human Words)
              </h2>
              
              <div className="space-y-12 sm:space-y-16">
                {/* Research 1 */}
                <div>
                  <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#1A1A1A] mb-4 sm:mb-6 font-serif tracking-tight">
                    Psychological Safety — Dr. Amy Edmondson
                  </h3>
                  <p className="text-base sm:text-lg leading-relaxed text-[#6B6B6B] text-pretty">
                    Teams that feel safe to speak up learn faster and adapt better. When people can ask questions, admit mistakes, and challenge ideas without fear, performance improves.
                  </p>
                </div>
                
                {/* Research 2 */}
                <div>
                  <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#1A1A1A] mb-4 sm:mb-6 font-serif tracking-tight">
                    Empathic Listening — Dr. Carl Rogers
                  </h3>
                  <p className="text-base sm:text-lg leading-relaxed text-[#6B6B6B] text-pretty">
                    Listening to understand reduces reactivity and unlocks reasoning. When leaders truly hear what their teams are saying, better decisions follow.
                  </p>
                </div>
                
                {/* Research 3 */}
                <div>
                  <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#1A1A1A] mb-4 sm:mb-6 font-serif tracking-tight">
                    The Neuroscience of Trust — Paul Zak
                  </h3>
                  <p className="text-base sm:text-lg leading-relaxed text-[#6B6B6B] text-pretty">
                    Trust changes brain chemistry—lower cortisol, higher oxytocin, better performance. When people trust their leaders, they work harder, innovate more, and stay longer.
                  </p>
                </div>
                
                {/* Research 4 */}
                <div>
                  <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#1A1A1A] mb-4 sm:mb-6 font-serif tracking-tight">
                    Executive Isolation — Gallup
                  </h3>
                  <p className="text-base sm:text-lg leading-relaxed text-[#6B6B6B] text-pretty">
                    Leaders without a safe place to process make poorer decisions. Isolation leads to blind spots, and blind spots lead to cultural breakdown.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Why Small & Mid-Sized Businesses */}
        <section className="py-16 sm:py-24 md:py-32 lg:py-40 bg-white">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-7xl mx-auto">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#1A1A1A] mb-12 sm:mb-16 font-serif tracking-tight text-balance">
                Why This Matters for Small & Mid-Sized Businesses
              </h2>
              
              <div className="grid md:grid-cols-2 gap-12 mb-12 sm:mb-16">
                {/* Left Column */}
                <div>
                  <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#1A1A1A] mb-6 sm:mb-8 font-serif tracking-tight">
                    Large companies have:
                  </h3>
                  <ul className="list-disc list-inside space-y-3 text-base sm:text-lg text-[#6B6B6B]">
                    <li>HR departments</li>
                    <li>Culture committees</li>
                    <li>Consultants on retainer</li>
                    <li>Engagement surveys</li>
                    <li>Performance management systems</li>
                  </ul>
                </div>
                
                {/* Right Column with Orange Border */}
                <div className="border-l-[6px] border-[#C85A3C] pl-6 sm:pl-8 md:pl-12">
                  <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#1A1A1A] mb-6 sm:mb-8 font-serif tracking-tight">
                    Small companies have... you.
                  </h3>
                  <p className="text-base sm:text-lg leading-relaxed text-[#6B6B6B] text-pretty">
                    You're the leader, the HR person, the culture builder, and the decision maker. You don't have a team of consultants or a culture committee. You have your team, your values, and your commitment to building something real.
                  </p>
                </div>
              </div>
              
              <div className="mb-8 sm:mb-10">
                <p className="text-base sm:text-lg leading-relaxed text-[#6B6B6B] mb-4 text-pretty">
                  This is where culture breaks:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4 text-base sm:text-lg text-[#6B6B6B]">
                  <li>When leaders assume clarity exists because they feel clear</li>
                  <li>When teams don't feel safe to speak up</li>
                  <li>When communication breaks down under pressure</li>
                  <li>When trust erodes slowly, invisibly</li>
                  <li>When leaders make decisions without seeing the full picture</li>
                </ul>
              </div>
              
              <p className="text-base sm:text-lg leading-relaxed text-[#6B6B6B] text-pretty">
                Culture Science exists to help you see what you can't see—and build what you can't build without clarity.
              </p>
            </div>
          </div>
        </section>

        {/* Introducing ALI */}
        <section className="py-16 sm:py-24 md:py-32 lg:py-40 bg-[#FAFAF9]">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#1A1A1A] mb-6 sm:mb-8 font-serif tracking-tight text-balance">
                Introducing ALI (Archetype Leadership Index)
              </h2>
              
              <div className="space-y-6 sm:space-y-8 text-base sm:text-lg leading-relaxed text-[#6B6B6B] mb-12 sm:mb-16">
                <p className="text-pretty">
                  ALI is the first diagnostic in the Culture Science toolkit. It measures six dimensions of servant leadership: Clarity, Empathy, Humility, Strength, Accountability, and Trust.
                </p>
                
                <p className="text-pretty">
                  It's a 10-question assessment that your team completes anonymously. You get a scorecard showing how your leadership scores across all six dimensions—and what it means.
                </p>
                
                <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#1A1A1A] mb-4 sm:mb-6 font-serif tracking-tight">
                  What ALI Measures
                </h3>
                
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Clarity: Do people know what matters, why it matters, and where they fit?</li>
                  <li>Empathy: Do leaders listen to understand, or to respond?</li>
                  <li>Humility: Can leaders admit mistakes, ask for help, and share credit?</li>
                  <li>Strength: Do leaders make hard decisions with confidence and care?</li>
                  <li>Accountability: Do people own outcomes, or deflect responsibility?</li>
                  <li>Trust: Do people feel safe to speak up, take risks, and be human?</li>
                </ul>
                
                <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#1A1A1A] mb-4 sm:mb-6 font-serif tracking-tight">
                  How It Works
                </h3>
                
                <ol className="list-decimal list-inside space-y-3 ml-4">
                  <li>Your team completes a short, anonymous assessment (about 15 minutes)</li>
                  <li>You get a detailed scorecard showing how your leadership scores across all six dimensions</li>
                  <li>We meet to review results, identify patterns, and build an action plan</li>
                </ol>
                
                <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#1A1A1A] mb-4 sm:mb-6 font-serif tracking-tight">
                  What You Get
                </h3>
                
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>A clear picture of how your leadership actually feels to your team</li>
                  <li>Specific insights into where you're strong and where you can grow</li>
                  <li>An action plan for building what's missing</li>
                </ul>
              </div>
              
              <div className="text-center">
                <a
                  href="/culture-science/ali"
                  className="inline-block bg-[#1A1A1A] text-white px-8 sm:px-10 py-4 sm:py-5 font-medium text-sm sm:text-base hover:bg-[#1A1A1A]/90 transition-colors"
                >
                  Join the ALI Pilot
                </a>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
