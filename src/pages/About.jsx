import React from 'react';
import { Helmet } from 'react-helmet-async';
import SEO from '../components/SEO';
import { OptimizedImage } from '../components/OptimizedImage';

export default function About() {
  const goToPath = (e, path) => {
    e.preventDefault();
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.scrollTo({ top: 0, behavior: 'instant' });
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
        {/* Hero — full-bleed editorial (aligned with homepage; no floating portrait tile) */}
        <section
          className="home-hero-bg relative flex min-h-[72vh] items-center bg-cover bg-no-repeat"
          style={{ backgroundImage: "url('/images/Bart-4.jpg')" }}
        >
          <div
            className="pointer-events-none absolute inset-0 z-[1]"
            style={{
              background:
                'linear-gradient(to right, rgba(43, 41, 41, 0.97) 0%, rgba(43, 41, 41, 0.94) 42%, rgba(43, 41, 41, 0.55) 68%, rgba(43, 41, 41, 0.12) 100%)',
            }}
          />
          <div
            className="pointer-events-none absolute inset-0 z-[2]"
            style={{
              backgroundImage:
                'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.012) 2px, rgba(255,255,255,0.012) 4px)',
            }}
          />
          <div className="relative z-[3] w-full">
            <div className="mx-auto max-w-[1200px] px-6 py-14 md:px-12 md:py-20">
              <p className="mb-5 font-sans text-[11px] uppercase tracking-[0.2em] text-ao-brown">Meet Bart · Archetype Original</p>
              <h1 className="mb-5 max-w-[540px] font-serif text-[clamp(36px,6vw,56px)] font-normal leading-[0.98] tracking-tight text-[#F0ECE4]">
                Meet Bart
              </h1>
              <p className="max-w-xl font-sans text-lg leading-relaxed text-ao-midGray md:text-xl">
                Thirty-two years building people, teams, and leaders who do work that matters.
              </p>
            </div>
          </div>
        </section>

        {/* The Work Found Me Before I Knew Its Name */}
        <section 
          id="work-found-me" 
          className="w-full bg-ao-cream py-16 sm:py-24 md:py-32 scroll-mt-32"
        >
          <div className="container mx-auto px-4 sm:px-6 md:px-12 max-w-4xl">
            <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-8 lg:gap-12 items-start">
              <div className="flex justify-center lg:justify-start">
                <OptimizedImage
                  src="/images/bart-headshot-002.jpg"
                  alt="Bart"
                  className="h-60 w-60 object-contain"
                  width={240}
                  height={240}
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              </div>
              <div className="space-y-3 sm:space-y-4">
                <div className="flex items-center mb-8 sm:mb-10">
                  <div className="w-1 h-10 sm:h-12 md:h-14 bg-[#DB0812] mr-4 sm:mr-6"></div>
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
          className="w-full bg-white py-16 sm:py-24 md:py-32 scroll-mt-32"
        >
          <div className="container mx-auto px-4 sm:px-6 md:px-12 max-w-4xl">
            <div className="flex items-center mb-8 sm:mb-10">
              <div className="w-1 h-10 sm:h-12 md:h-14 bg-[#DB0812] mr-4 sm:mr-6"></div>
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
          className="w-full bg-ao-cream py-16 sm:py-24 md:py-32 scroll-mt-32"
        >
          <div className="container mx-auto px-4 sm:px-6 md:px-12 max-w-4xl">
            <div className="flex items-center mb-8 sm:mb-10">
              <div className="w-1 h-10 sm:h-12 md:h-14 bg-[#DB0812] mr-4 sm:mr-6"></div>
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
              Those years taught me things I couldn't have learned any other way. I saw firsthand how <a href="/journal/when-leadership-sank-kodak" className="text-[#DB0812] hover:text-[#b30610] underline" onClick={(e) => { e.preventDefault(); window.history.pushState({}, '', '/journal/when-leadership-sank-kodak'); window.dispatchEvent(new PopStateEvent('popstate')); }}>leadership failures</a> can destroy even the strongest organizations:
            </p>
            <ul className="list-disc space-y-3 sm:space-y-4 mb-3 sm:mb-4 pl-6 sm:pl-8">
              <li className="text-base sm:text-lg leading-normal text-[#1A1A1A] marker:text-[#DB0812]">
                What people consistently do matters far more than what they say.
              </li>
              <li className="text-base sm:text-lg leading-normal text-[#1A1A1A] marker:text-[#DB0812]">
                Clarity settles a room faster than authority ever will.
              </li>
              <li className="text-base sm:text-lg leading-normal text-[#1A1A1A] marker:text-[#DB0812]">
                Confusion spreads fast if the leader doesn't tell the truth.
              </li>
              <li className="text-base sm:text-lg leading-normal text-[#1A1A1A] marker:text-[#DB0812]">
                Pressure exposes whether culture is solid or fragile.
              </li>
              <li className="text-base sm:text-lg leading-normal text-[#1A1A1A] marker:text-[#DB0812]">
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
          className="w-full bg-white py-16 sm:py-24 md:py-32 scroll-mt-32"
        >
          <div className="container mx-auto px-4 sm:px-6 md:px-12 max-w-4xl">
            <div className="flex items-center mb-8 sm:mb-10">
              <div className="w-1 h-10 sm:h-12 md:h-14 bg-[#DB0812] mr-4 sm:mr-6"></div>
              <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-[#1A1A1A] tracking-tight">
                The Questions That Followed
              </h2>
            </div>
            <p className="text-base sm:text-lg leading-normal text-[#1A1A1A] mb-3 sm:mb-4">
              Stepping away from the company I helped build forced a reckoning. There were mornings when the silence felt heavy. Afternoons spent replaying decisions. Nights asking questions I had avoided for years:
            </p>
            <ul className="list-disc space-y-3 sm:space-y-4 mb-3 sm:mb-4 pl-6 sm:pl-8">
              <li className="text-base sm:text-lg leading-normal text-[#1A1A1A] marker:text-[#DB0812]">
                Did my leadership matter?
              </li>
              <li className="text-base sm:text-lg leading-normal text-[#1A1A1A] marker:text-[#DB0812]">
                Did I leave people better than I found them?
              </li>
              <li className="text-base sm:text-lg leading-normal text-[#1A1A1A] marker:text-[#DB0812]">
                Did the sacrifices mean anything?
              </li>
              <li className="text-base sm:text-lg leading-normal text-[#1A1A1A] marker:text-[#DB0812]">
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
          className="w-full bg-ao-cream py-16 sm:py-24 md:py-32 scroll-mt-32"
        >
          <div className="container mx-auto px-4 sm:px-6 md:px-12 max-w-4xl">
            <div className="flex items-center mb-8 sm:mb-10">
              <div className="w-1 h-10 sm:h-12 md:h-14 bg-[#DB0812] mr-4 sm:mr-6"></div>
              <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-[#1A1A1A] tracking-tight">
                The Posture That Shapes My Leadership
              </h2>
            </div>
            <p className="text-base sm:text-lg leading-normal text-[#1A1A1A] mb-3 sm:mb-4">
              Two sentences have guided my leadership for decades: <a href="/journal/golden-rule-leadership-strategy" className="text-[#DB0812] hover:text-[#b30610] underline" onClick={(e) => { e.preventDefault(); window.history.pushState({}, '', '/journal/golden-rule-leadership-strategy'); window.dispatchEvent(new PopStateEvent('popstate')); }}>The Golden Rule</a> — "treat others the way you would want to be treated." And: "I am second."
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
          className="w-full bg-white py-16 sm:py-24 md:py-32 scroll-mt-32"
        >
          <div className="container mx-auto px-4 sm:px-6 md:px-12 max-w-4xl">
            <div className="flex items-center mb-8 sm:mb-10">
              <div className="w-1 h-10 sm:h-12 md:h-14 bg-[#DB0812] mr-4 sm:mr-6"></div>
              <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-[#1A1A1A] tracking-tight">
                The Research That Made It Clear
              </h2>
            </div>
            <p className="text-base sm:text-lg leading-normal text-[#1A1A1A] mb-3 sm:mb-4">
              When the company was no longer mine to build, and the people I had developed were no longer mine to develop, the questions became unavoidable. Did any of it matter? Did people grow under my care? Was the way I led actually good?
            </p>
            <p className="text-base sm:text-lg leading-normal text-[#1A1A1A] mb-3 sm:mb-4">
              Those questions sent me into years of research across psychology, communication, neuroscience, anthropology, organizational behavior, and cultural theory. What I found didn't just validate the work — it explained it. The <a href="/journal/the-case-for-servant-leadership-part-1" className="text-[#DB0812] hover:text-[#b30610] underline" onClick={(e) => { e.preventDefault(); window.history.pushState({}, '', '/journal/the-case-for-servant-leadership-part-1'); window.dispatchEvent(new PopStateEvent('popstate')); }}>servant leadership research</a> confirmed what I had lived.
            </p>
            <p className="text-base sm:text-lg leading-normal text-[#1A1A1A]">
              There were names for the instincts I followed. There was data behind the decisions I made. There were patterns behind the results I saw. That research became the book. The book became Archetype Original. Archetype Original became my next act.
            </p>
          </div>
        </section>

        {/* How I Show Up Today */}
        <section 
          id="show-up" 
          className="w-full bg-ao-cream py-16 sm:py-24 md:py-32 scroll-mt-32"
        >
          <div className="container mx-auto px-4 sm:px-6 md:px-12 max-w-4xl">
            <div className="flex items-center mb-8 sm:mb-10">
              <div className="w-1 h-10 sm:h-12 md:h-14 bg-[#DB0812] mr-4 sm:mr-6"></div>
              <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-[#1A1A1A] tracking-tight">
                How I Show Up Today
              </h2>
            </div>
            <p className="text-base sm:text-lg leading-normal text-[#1A1A1A] mb-6 sm:mb-8">
              Today, I work with leaders, teams, and organizations who want to build something healthy — something real, sustainable, and worth belonging to.
            </p>
            
            {/* Methods Grid - Card Layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 mb-6 sm:mb-8">
              
              {/* Card 1: Mentorship */}
              <div className="space-y-3 border border-[#D8D4CE] border-l-4 border-l-ao-red bg-white p-6 sm:p-8 sm:space-y-4">
                <h3 className="text-xl sm:text-2xl font-bold text-[#DB0812]">
                  Mentorship
                </h3>
                <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]/80">
                  helping leaders at every level find clarity, courage, and confidence
                </p>
              </div>
              
              {/* Card 2: Consulting */}
              <div className="space-y-3 border border-[#D8D4CE] border-l-4 border-l-ao-red bg-white p-6 sm:p-8 sm:space-y-4">
                <h3 className="text-xl sm:text-2xl font-bold text-[#DB0812]">
                  Consulting
                </h3>
                <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]/80">
                  strengthening systems, communication, alignment, and culture
                </p>
              </div>
              
              {/* Card 3: Fractional Leadership */}
              <div className="space-y-3 border border-[#D8D4CE] border-l-4 border-l-ao-red bg-white p-6 sm:p-8 sm:space-y-4">
                <h3 className="text-xl sm:text-2xl font-bold text-[#DB0812]">
                  Fractional Leadership
                </h3>
                <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]/80">
                  stepping in when teams need stability and direction during transitional seasons
                </p>
              </div>
              
              {/* Card 4: Speaking & Seminars */}
              <div className="space-y-3 border border-[#D8D4CE] border-l-4 border-l-ao-red bg-white p-6 sm:p-8 sm:space-y-4">
                <h3 className="text-xl sm:text-2xl font-bold text-[#DB0812]">
                  Speaking & Seminars
                </h3>
                <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]/80">
                  sharing lived leadership and research-backed insight
                </p>
              </div>
              
              {/* Card 5: Training & Education - Full Width */}
              <div className="md:col-span-2 space-y-3 border border-[#D8D4CE] border-l-4 border-l-ao-red bg-white p-6 sm:p-8 sm:space-y-4">
                <h3 className="text-xl sm:text-2xl font-bold text-[#DB0812]">
                  Training & Education
                </h3>
                <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]/80">
                  Tools, Playbooks and Curriculum designed to support and affect positive change in leadership
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

        {/* Philosophy (excerpt — matches /philosophy intro) */}
        <section
          id="philosophy-excerpt"
          className="w-full scroll-mt-32 border-t border-[#1A1A1A]/10 bg-white py-16 sm:py-24 md:py-32"
        >
          <div className="container mx-auto max-w-4xl px-4 sm:px-6 md:px-12">
            <div className="flex items-center mb-8 sm:mb-10">
              <div className="mr-4 h-10 w-1 bg-[#DB0812] sm:h-12 md:h-14"></div>
              <h2 className="font-serif text-3xl font-bold tracking-tight text-[#1A1A1A] sm:text-4xl md:text-5xl">
                Philosophy
              </h2>
            </div>
            <div className="space-y-4 sm:space-y-5">
              <p className="font-serif text-2xl font-bold leading-tight text-[#1A1A1A] sm:text-3xl md:text-4xl">
                Leadership is stewardship.
              </p>
              <p className="text-base leading-normal text-[#1A1A1A] sm:text-lg">
                It's not about holding power—it's about holding responsibility.
              </p>
              <p className="text-base leading-normal text-[#1A1A1A] sm:text-lg">
                I've spent over three decades watching companies rise and fall, teams thrive and fracture, and leaders find or lose their way. What separates the healthy from the broken isn't intelligence, charisma, or vision—it's alignment. When what you believe, say, and do line up, trust takes root. When they don't, people start protecting themselves instead of the mission.
              </p>
              <p className="text-base leading-normal text-[#1A1A1A] sm:text-lg">
                Archetype Original exists to help leaders rebuild that alignment—to make clarity, character, and culture tangible again.
              </p>
              <a
                href="/philosophy"
                onClick={(e) => goToPath(e, '/philosophy')}
                className="mt-4 inline-block text-[#DB0812] underline decoration-[#DB0812]/40 hover:text-[#b30610]"
              >
                Read the full philosophy page →
              </a>
            </div>
          </div>
        </section>

        {/* Meet Archy teaser */}
        <section
          id="archy-teaser"
          className="w-full scroll-mt-32 bg-ao-cream py-16 sm:py-24 md:py-32"
        >
          <div className="container mx-auto max-w-4xl px-4 sm:px-6 md:px-12">
            <div className="grid gap-10 md:grid-cols-[1fr_200px] md:items-center md:gap-12">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#DB0812]">Meet Archy</p>
                <h2 className="mt-2 font-serif text-3xl font-bold tracking-tight text-[#1A1A1A] sm:text-4xl md:text-5xl">
                  Your AI leadership coach
                </h2>
                <p className="mt-4 text-base leading-relaxed text-[#1A1A1A] sm:text-lg">
                  Archy is the digital extension of how I think about leadership. He's trained on my experience, my frameworks, and the patterns that actually work with real teams.
                </p>
                <a
                  href="/archy"
                  onClick={(e) => goToPath(e, '/archy')}
                  className="mt-6 inline-block min-h-[44px] rounded-[3px] border border-[#1A1A1A] px-6 py-3 text-sm font-medium text-[#1A1A1A] transition-colors hover:bg-[#1A1A1A] hover:text-white"
                >
                  Meet Archy →
                </a>
              </div>
              <div className="flex justify-center md:justify-end">
                <OptimizedImage
                  src="/images/archy-character-008.png"
                  alt=""
                  className="h-auto w-full max-w-[12rem] object-contain md:max-w-[14rem]"
                  loading="lazy"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Advisory bridge */}
        <section
          id="advisory-bridge"
          className="w-full scroll-mt-32 bg-white py-16 sm:py-24 md:py-32"
        >
          <div className="container mx-auto max-w-4xl px-4 sm:px-6 md:px-12">
            <div className="grid gap-10 lg:grid-cols-[1fr_220px] lg:items-start lg:gap-12">
              <div>
                <div className="flex items-center mb-6 sm:mb-8">
                  <div className="mr-4 h-10 w-1 bg-[#DB0812] sm:h-12 md:h-14"></div>
                  <h2 className="font-serif text-3xl font-bold tracking-tight text-[#1A1A1A] sm:text-4xl md:text-5xl">
                    Private advisory
                  </h2>
                </div>
                <p className="text-base leading-relaxed text-[#1A1A1A] sm:text-lg">
                  Some conversations cannot happen inside your building — not because people are dishonest, but because consequence is real. Leadership advisory is one room, outside your system, where the truth can be spoken without pricing it in political terms.
                </p>
                <p className="mt-4 text-base leading-relaxed text-[#1A1A1A] sm:text-lg">
                  If you already feel that gap, start with how advisory works — or read <em>The Room</em> if you want the argument on paper first.
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <a
                    href="/advisory"
                    onClick={(e) => goToPath(e, '/advisory')}
                    className="inline-flex min-h-[44px] items-center justify-center rounded-[3px] bg-ao-red px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                  >
                    Leadership advisory
                  </a>
                  <a
                    href="/the-room"
                    onClick={(e) => goToPath(e, '/the-room')}
                    className="inline-flex min-h-[44px] items-center justify-center rounded-[3px] border border-[#1A1A1A] px-6 py-3 text-sm font-medium text-[#1A1A1A] transition-colors hover:bg-[#1A1A1A] hover:text-white"
                  >
                    The Room (book)
                  </a>
                </div>
              </div>
              <div className="flex justify-center lg:justify-end">
                <OptimizedImage
                  src="/images/Bart-44.jpg"
                  alt=""
                  className="aspect-[4/5] w-full max-w-[220px] border border-[#1A1A1A]/10 object-cover object-top shadow-sm"
                  loading="lazy"
                />
              </div>
            </div>
          </div>
        </section>

        {/* If You're Ready - CTA */}
        <section 
          id="ready" 
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
            <div className="flex flex-wrap justify-center gap-4">
              <a 
                href="/contact" 
                className="rounded-[3px] bg-ao-red px-8 py-4 text-sm font-semibold text-white transition-opacity hover:opacity-90 sm:px-10 sm:py-5 sm:text-base"
              >
                Start a Conversation
              </a>
              <a 
                href={process.env.NEXT_PUBLIC_CALENDLY_SCHEDULING_URL || import.meta.env.VITE_CALENDLY_SCHEDULING_URL || 'https://calendly.com/bartpaden/1-on-1-mentorships'} 
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-[3px] border border-[#1A1A1A] bg-transparent px-8 py-4 text-sm font-medium text-[#1A1A1A] transition-colors hover:bg-[#1A1A1A] hover:text-white sm:px-10 sm:py-5 sm:text-base"
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
