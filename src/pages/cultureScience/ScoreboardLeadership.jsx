/**
 * Scoreboard Leadership Anti-Project Page
 * Editorial Minimal Design - Diagnostic Lens for Toxic Leadership Patterns
 */
import React, { useState, useEffect } from 'react';
import SEO from '../../components/SEO';

export default function ScoreboardLeadership() {
  const [scrollY, setScrollY] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

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
    };

    // Initial scroll position
    handleScroll();
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  const handleLinkClick = (e, href) => {
    e.preventDefault();
    window.history.pushState({}, '', href);
    window.dispatchEvent(new PopStateEvent('popstate'));
    // Scroll to top when navigating to a new page
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  return (
    <>
      <SEO pageKey="scoreboard-leadership" />
      <div className="min-h-screen bg-white">
        {/* SECTION 1: HERO WITH PARALLAX */}
        <section className="w-full bg-white py-20 sm:py-24 md:py-28 relative overflow-hidden">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center max-w-4xl mx-auto">
              {/* Left Content */}
              <div>
                {/* Badge */}
                <div className="mb-6">
                  <span className="inline-block px-4 py-2 border border-[#1A1A1A]/10 text-xs font-medium tracking-wider text-[#6B6B6B] uppercase">
                    Anti-Project
                  </span>
                </div>
                
                {/* Title */}
                <h1 className="font-serif font-bold text-4xl sm:text-5xl md:text-6xl text-[#1A1A1A] tracking-tight mb-8">
                  Scoreboard Leadership
                </h1>
              </div>
              
              {/* Right: 2-Layer Parallax (Desktop Only) */}
              <div className="relative h-[500px] hidden lg:block">
                {/* Layer 2: Back - Moves VERTICALLY (slow) */}
                <div 
                  className="absolute inset-0 z-10"
                  style={{ 
                    transform: isMobile ? 'translateY(0)' : `translateY(${scrollY * 0.05}px)`,
                    transition: 'transform 0.1s ease-out'
                  }}
                >
                  <img 
                    src="/images/scoreboard-layer-2.png" 
                    alt="Scoreboard Leadership Background" 
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                </div>
                
                {/* Layer 1: Front - Moves HORIZONTALLY (faster) */}
                <div 
                  className="absolute inset-0 z-20"
                  style={{ 
                    transform: isMobile ? 'translateX(0)' : `translateX(${scrollY * -0.15}px)`,
                    transition: 'transform 0.1s ease-out'
                  }}
                >
                  <img 
                    src="/images/scoreboard-layer-1.png" 
                    alt="Scoreboard Leadership Foreground" 
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

        {/* SECTION 2: DEFINITION */}
        <section className="bg-[#FAFAF9] py-16 sm:py-32">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-4xl mx-auto space-y-8">
              {/* Section Header with Orange Border */}
              <div className="flex items-start gap-4 sm:gap-6">
                <div className="w-1 h-12 sm:h-16 bg-[#C85A3C] flex-shrink-0 mt-2"></div>
                <h2 className="font-serif font-bold text-3xl sm:text-4xl md:text-5xl text-[#1A1A1A] tracking-tight">
                  Definition
                </h2>
              </div>
              
              {/* Content */}
              <div className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] space-y-6">
                <p>
                  Scoreboard Leadership is a dominance pattern where <strong>metrics are weaponized to drive compliance</strong>, optics outrank outcomes, and people become a means to public wins. The score replaces the standard; theater replaces trust. As I've written, <a href="/journal/leadership-isnt-a-scoreboard" className="text-[#C85A3C] hover:text-[#B54A32] underline" onClick={(e) => { e.preventDefault(); window.history.pushState({}, '', '/journal/leadership-isnt-a-scoreboard'); window.dispatchEvent(new PopStateEvent('popstate')); window.scrollTo({ top: 0, behavior: 'instant' }); }}>leadership isn't a scoreboard</a> — great leaders don't compete with their team; they build platforms for their people to rise.
                </p>
                <p>
                  You get velocity spikes, shallow accountability, and hidden churn. The antidote isn't anti-measurement — it's <strong>servant-led standards</strong>: clear roles, honest rhythms, and leaders who carry the cost instead of pushing it down.
                </p>
                <p>
                  This diagnostic names the disease so you can install a healthier operating system — one that compounds performance without burning out the people who create it.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 3: THE GOLDEN RULE CONTRAST */}
        <section className="bg-white py-16 sm:py-32">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-4xl mx-auto space-y-8">
              {/* Section Header with Orange Border */}
              <div className="flex items-start gap-4 sm:gap-6">
                <div className="w-1 h-12 sm:h-16 bg-[#C85A3C] flex-shrink-0 mt-2"></div>
                <h2 className="font-serif font-bold text-3xl sm:text-4xl md:text-5xl text-[#1A1A1A] tracking-tight">
                  The Golden Rule Contrast
                </h2>
              </div>
              
              {/* Content */}
              <div className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] space-y-6">
                <p>
                  Scoreboard Leadership fails for one core reason: it violates the most reliable leadership principle ever written — <strong>the Golden Rule</strong>.
                </p>
                <p>
                  When you treat people the way you'd want to be treated, you naturally create clarity, trust, responsibility, alignment, and stability. You lead with the same expectations and honesty you'd want from someone above you.
                </p>
                <p>
                  Scoreboard Leadership can't coexist with that. You can't use people to chase metrics and simultaneously treat them the way you'd want to be treated. <strong>One builds people; the other uses them.</strong> The difference shows up quickly — in culture, in morale, and in outcomes.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 4: SYMPTOMS → SOLUTIONS */}
        <section className="bg-[#FAFAF9] py-16 sm:py-32">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-4xl mx-auto space-y-8">
              {/* Section Header with Orange Border */}
              <div className="flex items-start gap-4 sm:gap-6">
                <div className="w-1 h-12 sm:h-16 bg-[#C85A3C] flex-shrink-0 mt-2"></div>
                <h2 className="font-serif font-bold text-3xl sm:text-4xl md:text-5xl text-[#1A1A1A] tracking-tight">
                  Symptoms → Solutions
                </h2>
              </div>
              
              {/* Content */}
              <div className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                <ul className="list-disc pl-6 sm:pl-8 space-y-4 marker:text-[#C85A3C]">
                  <li>
                    <strong>KPI theater</strong> Solution: Score service — NPS by team, on-time handoffs, first-time quality.
                  </li>
                  <li>
                    <strong>Top-down pressure cycles</strong> — Often driven by <a href="/journal/manufactured-crisis" className="text-[#C85A3C] hover:text-[#B54A32] underline" onClick={(e) => { e.preventDefault(); window.history.pushState({}, '', '/journal/manufactured-crisis'); window.dispatchEvent(new PopStateEvent('popstate')); window.scrollTo({ top: 0, behavior: 'instant' }); }}>manufactured crisis</a> and fear. Solution: Servant standards with owner-operators + weekly inspect-and-improve.
                  </li>
                  <li>
                    <strong>Prestige over people</strong> — When leaders <a href="/journal/stop-turning-your-team-into-opponents" className="text-[#C85A3C] hover:text-[#B54A32] underline" onClick={(e) => { e.preventDefault(); window.history.pushState({}, '', '/journal/stop-turning-your-team-into-opponents'); window.dispatchEvent(new PopStateEvent('popstate')); window.scrollTo({ top: 0, behavior: 'instant' }); }}>turn their team into opponents</a> through competition. Solution: Reward maintenance wins, cross-team assists, and clean handoffs.
                  </li>
                  <li>
                    <strong>Churn masked by hype</strong> — Hidden by <a href="/journal/the-proxy-trap" className="text-[#C85A3C] hover:text-[#B54A32] underline" onClick={(e) => { e.preventDefault(); window.history.pushState({}, '', '/journal/the-proxy-trap'); window.dispatchEvent(new PopStateEvent('popstate')); window.scrollTo({ top: 0, behavior: 'instant' }); }}>proxy traps</a> and delegation failures. Solution: Track role tenure, cross-training depth, and regretted attrition.
                  </li>
                  <li>
                    <strong>Hero dependency</strong> — Created by <a href="/journal/shadow-of-shame" className="text-[#C85A3C] hover:text-[#B54A32] underline" onClick={(e) => { e.preventDefault(); window.history.pushState({}, '', '/journal/shadow-of-shame'); window.dispatchEvent(new PopStateEvent('popstate')); window.scrollTo({ top: 0, behavior: 'instant' }); }}>shadow of shame</a> and fear-based control. Solution: One-page plays with backups and rituals that survive PTO and turnover.
                  </li>
                  <li>
                    <strong>Busy over outcomes</strong> — Often driven by <a href="/journal/cult-of-confusion" className="text-[#C85A3C] hover:text-[#B54A32] underline" onClick={(e) => { e.preventDefault(); window.history.pushState({}, '', '/journal/cult-of-confusion'); window.dispatchEvent(new PopStateEvent('popstate')); window.scrollTo({ top: 0, behavior: 'instant' }); }}>cult of confusion</a> where clarity is withheld. Solution: One page, one owner, one outcome per initiative — inspect weekly.
                  </li>
                  <li>
                    <strong>Vanity pipeline</strong> — When <a href="/journal/the-pursuit-of-power-corrupts" className="text-[#C85A3C] hover:text-[#B54A32] underline" onClick={(e) => { e.preventDefault(); window.history.pushState({}, '', '/journal/the-pursuit-of-power-corrupts'); window.dispatchEvent(new PopStateEvent('popstate')); window.scrollTo({ top: 0, behavior: 'instant' }); }}>the pursuit of power corrupts</a> decision-making. Solution: Qualify for fit; publish kill-criteria; celebrate strategic "no" calls.
                  </li>
                  <li>
                    <strong>Meeting fog</strong> Solution: Agenda → output → owner. Daily 10-minute huddles that ship decisions.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 5: SERVANT STANDARDS — PRINCIPLES */}
        <section className="bg-white py-16 sm:py-32">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-4xl mx-auto space-y-8">
              {/* Section Header with Orange Border */}
              <div className="flex items-start gap-4 sm:gap-6">
                <div className="w-1 h-12 sm:h-16 bg-[#C85A3C] flex-shrink-0 mt-2"></div>
                <h2 className="font-serif font-bold text-3xl sm:text-4xl md:text-5xl text-[#1A1A1A] tracking-tight">
                  Servant Standards — Principles
                </h2>
              </div>
              
              {/* Content */}
              <div className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                <ul className="list-disc pl-6 sm:pl-8 space-y-4 marker:text-[#C85A3C]">
                  <li>
                    <strong>People over optics</strong> We measure what improves service, not what flatters leadership.
                  </li>
                  <li>
                    <strong>Owner standard</strong> Single-point ownership with freedom in method and clarity in outcomes.
                  </li>
                  <li>
                    <strong>Honest rhythms</strong> Short, frequent inspect-and-improve cycles replace performative meetings.
                  </li>
                  <li>
                    <strong>One-page plays</strong> Every effort fits on one page: purpose, owner, steps, risks, next review.
                  </li>
                  <li>
                    <strong>Service prestige</strong> We celebrate assists, clean handoffs, and maintenance wins as headline achievements.
                  </li>
                  <li>
                    <strong>Compounding culture</strong> Decisions favor long-term trust and repeatability over short-term theatrics.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 6: FROM DIAGNOSIS TO DELIVERY */}
        <section className="bg-[#FAFAF9] py-16 sm:py-32">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-4xl mx-auto space-y-8">
              {/* Section Header with Orange Border */}
              <div className="flex items-start gap-4 sm:gap-6">
                <div className="w-1 h-12 sm:h-16 bg-[#C85A3C] flex-shrink-0 mt-2"></div>
                <h2 className="font-serif font-bold text-3xl sm:text-4xl md:text-5xl text-[#1A1A1A] tracking-tight">
                  From Diagnosis to Delivery
                </h2>
              </div>
              
              {/* Content */}
              <div className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] space-y-6">
                <p>
                  Scoreboard Leadership names the dysfunction; Archetype Original installs the cure. Start with the ten servant-led plays, then customize workshops for your team's constraints and goals.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 7: FAQ */}
        <section className="bg-white py-16 sm:py-32">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-4xl mx-auto space-y-8">
              {/* Section Header with Orange Border */}
              <div className="flex items-start gap-4 sm:gap-6">
                <div className="w-1 h-12 sm:h-16 bg-[#C85A3C] flex-shrink-0 mt-2"></div>
                <h2 className="font-serif font-bold text-3xl sm:text-4xl md:text-5xl text-[#1A1A1A] tracking-tight">
                  FAQ
                </h2>
              </div>
              
              {/* Content */}
              <div className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] space-y-8">
                <div>
                  <h3 className="font-bold mb-2">
                    Q: Is Scoreboard Leadership against metrics?
                  </h3>
                  <p>
                    A: No. It's against weaponized metrics and optics-driven behavior. We keep measurement, but we point it at service and outcomes.
                  </p>
                </div>
                
                <div>
                  <h3 className="font-bold mb-2">
                    Q: What changes first?
                  </h3>
                  <p>
                    A: Standards and rhythms: one-page plays, weekly inspect-and-improve, and redefining prestige around service and trust.
                  </p>
                </div>
                
                <div>
                  <h3 className="font-bold mb-2">
                    Q: How fast can we see impact?
                  </h3>
                  <p>
                    A: Most teams feel relief in 2–4 weeks as meetings shrink and owners gain clarity. Measurable compounding typically follows in 1–2 quarters.
                  </p>
                </div>
                
                <div>
                  <h3 className="font-bold mb-2">
                    Q: Does this replace our KPIs?
                  </h3>
                  <p>
                    A: It reframes them. Keep your KPIs; add counter-metrics like first-time quality, handoff reliability, and role tenure.
                  </p>
                </div>
                
                <div>
                  <h3 className="font-bold mb-2">
                    Q: What if leadership is the bottleneck?
                  </h3>
                  <p>
                    A: We start there. Servant standards are leader-carried first. Pressure is replaced with clarity and consistency.
                  </p>
                </div>
                
                <div>
                  <h3 className="font-bold mb-2">
                    Q: How do we engage?
                  </h3>
                  <p>
                    A: Begin with the 10 Plays and a half-day workshop. When you're ready, contact Archetype Original to plan rollout.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 8: READY TO MOVE FORWARD (CTA) */}
        <section className="bg-white py-16 sm:py-32">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-4xl mx-auto space-y-8">
              {/* Section Header with Orange Border */}
              <div className="flex items-start gap-4 sm:gap-6">
                <div className="w-1 h-12 sm:h-16 bg-[#C85A3C] flex-shrink-0 mt-2"></div>
                <h2 className="font-serif font-bold text-3xl sm:text-4xl md:text-5xl text-[#1A1A1A] tracking-tight">
                  Ready to Move Forward?
                </h2>
              </div>
              
              {/* Content */}
              <div className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] space-y-6">
                <p>
                  Scoreboard Leadership is a diagnostic lens under Archetype Original. For more research and deeper analysis, visit the standalone site. To explore consulting, playbooks, or workshops, let's start a conversation.
                </p>
              </div>
              
              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <a
                  href="https://scoreboardleadership.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-[#1A1A1A] text-white px-8 sm:px-10 py-4 sm:py-5 font-medium text-sm sm:text-base hover:bg-[#1A1A1A]/90 transition-colors text-center"
                >
                  Visit ScoreboardLeadership.com
                </a>
                <a
                  href="/contact"
                  onClick={(e) => handleLinkClick(e, '/contact')}
                  className="border-2 border-[#1A1A1A] text-[#1A1A1A] px-8 sm:px-10 py-4 sm:py-5 font-medium text-sm sm:text-base hover:bg-[#1A1A1A] hover:text-white transition-colors text-center"
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
