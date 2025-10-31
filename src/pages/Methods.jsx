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
  { id: 'guiding-principle', label: 'The Guiding Principle' },
  { id: 'step-one', label: 'Step One' },
  { id: 'step-two', label: 'Step Two' },
  { id: 'step-three', label: 'Step Three' },
  { id: 'step-four', label: 'Step Four' },
  { id: 'step-five', label: 'Step Five' },
  { id: 'working-philosophy', label: 'Working Philosophy' },
  { id: 'application', label: 'Application' },
  { id: 'proof', label: 'The Proof' },
  { id: 'goal', label: 'The Goal' },
  { id: 'closing', label: 'Closing' }
];

// Helper to render pull quotes (paragraphs starting with >)
const renderParagraph = (text, key) => {
  if (text.trim().startsWith('>')) {
    const quoteText = text.trim().substring(1).trim();
    return (
      <blockquote key={key} className="border-l-4 border-amber pl-6 py-4 my-8 bg-warm-offWhiteAlt rounded-r-lg">
        <p className="text-xl md:text-2xl font-semibold text-amber italic" style={{ lineHeight: '1.6' }}>
          "{quoteText}"
        </p>
      </blockquote>
    );
  }
  return (
    <p key={key} className="p mb-6" style={{ lineHeight: '1.6' }}>
      {text}
    </p>
  );
};

export default function Methods() {
  const [activeSection, setActiveSection] = useState('intro');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const sectionRefs = useRef({});
  const contentRef = useRef(null);
  const clickedSectionRef = useRef(null);

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
    
    if (event && event.currentTarget) {
      event.currentTarget.style.transform = 'scale(0.95)';
      setTimeout(() => {
        if (event.currentTarget) {
          event.currentTarget.style.transform = '';
        }
      }, 150);
    }

    const element = sectionRefs.current[id];
    if (element) {
      const offset = 100;
      const elementPosition = element.offsetTop - offset;
      window.scrollTo({
        top: elementPosition,
        behavior: 'smooth'
      });
      setIsMobileMenuOpen(false);
      
      setTimeout(() => {
        clickedSectionRef.current = null;
      }, 1000);
    }
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    "name": "Leadership Mentorship Method",
    "description": "Five-step process for building leadership clarity and confidence",
    "step": [
      {
        "@type": "HowToStep",
        "position": 1,
        "name": "Listening and Discovery",
        "text": "Every engagement starts with listening. Before we talk about revenue, process, or structure, I want to understand what's actually happening. Where do you feel tension? What conversations keep looping? What's missing that used to be present?"
      },
      {
        "@type": "HowToStep",
        "position": 2,
        "name": "Building Clarity",
        "text": "Clarity isn't a mood—it's an outcome. It comes from asking the right questions until direction becomes obvious. We build clarity in three layers: Personal Clarity, Structural Clarity, and Directional Clarity."
      },
      {
        "@type": "HowToStep",
        "position": 3,
        "name": "Execution and Ownership",
        "text": "Together, we translate clarity into structure—communication rhythms, decision frameworks, accountability lanes, and operational patterns that fit your organization's scale. You own the system. I'll help you design it, test it, and refine it, but I never hold the keys."
      },
      {
        "@type": "HowToStep",
        "position": 4,
        "name": "Accountability and Growth",
        "text": "Accountability is the bridge between intention and outcome. It's not control—it's respect. We design rhythms of check-in that fit real life—not forced touchpoints, but honest follow-ups when they matter."
      },
      {
        "@type": "HowToStep",
        "position": 5,
        "name": "Release",
        "text": "When the person or team I'm serving no longer needs me, that's success. You'll know we've hit that point when you make clear decisions without hesitation, your systems support your standards, your people move with purpose, and you trust yourself again."
      }
    ]
  };

  return (
    <>
      <SEO pageKey="methods" />
      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify(jsonLd)}
        </script>
      </Helmet>
      
      <div className="min-h-screen bg-warm-offWhite py-12 pt-28">
        <div className="max-w-7xl mx-auto px-4">
          {/* Sequential Navigation */}
          <div className="mb-8 flex items-center justify-start border-b border-warm-border pb-4 mt-8">
            <a
              href="/philosophy"
              className="inline-flex items-center text-warm-gray hover:text-amber transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-amber rounded px-2 py-1"
              aria-label="Previous page: Philosophy"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="text-sm">Philosophy</span>
            </a>
          </div>

          <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
            {/* Anchor Navigation Sidebar */}
            <aside className="lg:w-64 flex-shrink-0">
              {/* Mobile menu button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden w-full flex items-center justify-between p-4 bg-warm-offWhiteAlt border border-warm-border rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-amber"
                aria-label="Toggle navigation menu"
              >
                <span className="font-medium text-warm-charcoal">Table of Contents</span>
                <svg className="w-5 h-5 text-warm-charcoal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {isMobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>

              {/* Navigation menu */}
              <nav 
                className={`${isMobileMenuOpen ? 'block' : 'hidden'} lg:block sticky top-24 bg-warm-offWhiteAlt border border-warm-border rounded-lg p-4`}
                aria-label="Page sections"
              >
                <ul className="space-y-2">
                  {sections.map((section) => (
                    <li key={section.id}>
                      <a
                        href={`#${section.id}`}
                        onClick={(e) => {
                          e.preventDefault();
                          scrollToSection(section.id, e);
                        }}
                        className={`block px-3 py-2 rounded-lg text-sm transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-amber active:scale-95 ${
                          activeSection === section.id
                            ? 'bg-amber text-white font-semibold shadow-md'
                            : 'text-warm-charcoal hover:bg-warm-border hover:text-amber'
                        }`}
                      >
                        {section.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            </aside>

            {/* Main Content */}
            <article ref={contentRef} className="flex-1 max-w-4xl">
              <h1 className="h1 mb-12">Methods</h1>

              {/* Intro */}
              <section id="intro" ref={(el) => (sectionRefs.current.intro = el)} className="mb-16 scroll-mt-24">
                <p className="p mb-6 font-semibold text-warm-charcoal text-xl" style={{ lineHeight: '1.6' }}>
                  No programs. No subscriptions. No hidden systems.
                </p>
                <p className="p mb-6" style={{ lineHeight: '1.6' }}>
                  Just real conversations that lead to real progress.
                </p>
                <p className="p mb-6" style={{ lineHeight: '1.6' }}>
                  Every engagement I take on—whether mentorship, consulting, or fractional leadership—begins with one priority: help the person in front of me build clarity and confidence they can sustain without me.
                </p>
                <p className="p mb-6" style={{ lineHeight: '1.6' }}>
                  There's no formula for that. The process shifts depending on who's sitting across the table. But the rhythm is consistent: listen deeply, tell the truth, build alignment, and walk it out together.
                </p>
              </section>

              {/* The Guiding Principle */}
              <section id="guiding-principle" ref={(el) => (sectionRefs.current['guiding-principle'] = el)} className="mb-16 scroll-mt-24">
                <h2 className="h2 mb-6">The Guiding Principle</h2>
                <p className="p mb-6" style={{ lineHeight: '1.6' }}>
                  Methods don't make leaders—discipline does.
                </p>
                <p className="p mb-6" style={{ lineHeight: '1.6' }}>
                  I've spent decades watching people chase frameworks and hacks hoping for quick transformation. They don't work. Frameworks are useful only if they meet you where you are and evolve as you grow. I don't start with a playbook; I start with a conversation.
                </p>
                <p className="p mb-6" style={{ lineHeight: '1.6' }}>
                  That conversation sets the tone for everything that follows: curiosity, honesty, and ownership.
                </p>
                {renderParagraph("> Systems don't change people—clarity does.", 'guiding-quote')}
              </section>

              {/* Step One */}
              <section id="step-one" ref={(el) => (sectionRefs.current['step-one'] = el)} className="mb-16 scroll-mt-24">
                <h2 className="h2 mb-6">Step One — Listening and Discovery</h2>
                <p className="p mb-6" style={{ lineHeight: '1.6' }}>
                  Every engagement starts with listening.
                </p>
                <p className="p mb-6" style={{ lineHeight: '1.6' }}>
                  Before we talk about revenue, process, or structure, I want to understand what's actually happening.
                </p>
                <ul className="space-y-3 mb-6">
                  <li className="p flex items-start" style={{ lineHeight: '1.6' }}>
                    <span className="text-amber mr-3 mt-1 font-bold">•</span>
                    <span>Where do you feel tension?</span>
                  </li>
                  <li className="p flex items-start" style={{ lineHeight: '1.6' }}>
                    <span className="text-amber mr-3 mt-1 font-bold">•</span>
                    <span>What conversations keep looping?</span>
                  </li>
                  <li className="p flex items-start" style={{ lineHeight: '1.6' }}>
                    <span className="text-amber mr-3 mt-1 font-bold">•</span>
                    <span>What's missing that used to be present?</span>
                  </li>
                </ul>
                <p className="p mb-6" style={{ lineHeight: '1.6' }}>
                  This is where trust begins. Leaders often arrive tired, frustrated, or overwhelmed. My job is to clear space for truth—to make it safe enough to say what's real without fear of judgment.
                </p>
                <p className="p mb-6" style={{ lineHeight: '1.6' }}>
                  When people feel heard, they start to think again. Once the noise quiets, patterns emerge. That's when we can name the real issue, not just the visible symptoms.
                </p>
              </section>

              {/* Step Two */}
              <section id="step-two" ref={(el) => (sectionRefs.current['step-two'] = el)} className="mb-16 scroll-mt-24">
                <h2 className="h2 mb-6">Step Two — Building Clarity</h2>
                <p className="p mb-6" style={{ lineHeight: '1.6' }}>
                  Clarity isn't a mood—it's an outcome. It comes from asking the right questions until direction becomes obvious.
                </p>
                <p className="p mb-4" style={{ lineHeight: '1.6' }}>
                  We build clarity in three layers:
                </p>
                <ul className="space-y-4 mb-6">
                  <li className="p flex items-start" style={{ lineHeight: '1.6' }}>
                    <span className="text-amber mr-3 mt-1 font-bold">•</span>
                    <div>
                      <strong className="text-warm-charcoal">Personal Clarity</strong> — Who are you, what do you value, and how does that show up in your leadership?
                    </div>
                  </li>
                  <li className="p flex items-start" style={{ lineHeight: '1.6' }}>
                    <span className="text-amber mr-3 mt-1 font-bold">•</span>
                    <div>
                      <strong className="text-warm-charcoal">Structural Clarity</strong> — What systems, roles, and rhythms need to align around those values?
                    </div>
                  </li>
                  <li className="p flex items-start" style={{ lineHeight: '1.6' }}>
                    <span className="text-amber mr-3 mt-1 font-bold">•</span>
                    <div>
                      <strong className="text-warm-charcoal">Directional Clarity</strong> — Where are you going, and how do we measure progress without losing people along the way?
                    </div>
                  </li>
                </ul>
                <p className="p mb-6" style={{ lineHeight: '1.6' }}>
                  Once clarity appears, decision-making speeds up. Teams move with purpose. And leaders find calm again.
                </p>
              </section>

              {/* Step Three */}
              <section id="step-three" ref={(el) => (sectionRefs.current['step-three'] = el)} className="mb-16 scroll-mt-24">
                <h2 className="h2 mb-6">Step Three — Execution and Ownership</h2>
                <p className="p mb-6" style={{ lineHeight: '1.6' }}>
                  Insight means nothing without movement. Together, we translate clarity into structure—communication rhythms, decision frameworks, accountability lanes, and operational patterns that fit your organization's scale.
                </p>
                <p className="p mb-6" style={{ lineHeight: '1.6' }}>
                  Here's the difference: you own the system. I'll help you design it, test it, and refine it, but I never hold the keys.
                </p>
                <p className="p mb-6" style={{ lineHeight: '1.6' }}>
                  This ensures you can sustain momentum long after my engagement ends.
                </p>
                {renderParagraph("> Ownership is the point of mentorship.", 'ownership-quote')}
              </section>

              {/* Step Four */}
              <section id="step-four" ref={(el) => (sectionRefs.current['step-four'] = el)} className="mb-16 scroll-mt-24">
                <h2 className="h2 mb-6">Step Four — Accountability and Growth</h2>
                <p className="p mb-6" style={{ lineHeight: '1.6' }}>
                  Accountability is the bridge between intention and outcome.
                </p>
                <p className="p mb-6" style={{ lineHeight: '1.6' }}>
                  It's not control—it's respect. It says, "I believe you can deliver, and I'm here to make sure you do."
                </p>
                <p className="p mb-6" style={{ lineHeight: '1.6' }}>
                  I don't hover. Accountability has to come from the person being accountable, not the one holding them accountable. We design rhythms of check-in that fit real life—not forced touchpoints, but honest follow-ups when they matter.
                </p>
                {renderParagraph("> The goal is simple: responsibility without dependence.", 'accountability-quote')}
              </section>

              {/* Step Five */}
              <section id="step-five" ref={(el) => (sectionRefs.current['step-five'] = el)} className="mb-16 scroll-mt-24">
                <h2 className="h2 mb-6">Step Five — Release</h2>
                <p className="p mb-6" style={{ lineHeight: '1.6' }}>
                  My method ends where yours begins.
                </p>
                <p className="p mb-6" style={{ lineHeight: '1.6' }}>
                  When the person or team I'm serving no longer needs me, that's success.
                </p>
                <p className="p mb-4" style={{ lineHeight: '1.6' }}>
                  You'll know we've hit that point when:
                </p>
                <ul className="space-y-3 mb-6">
                  <li className="p flex items-start" style={{ lineHeight: '1.6' }}>
                    <span className="text-amber mr-3 mt-1">•</span>
                    <span>You make clear decisions without hesitation.</span>
                  </li>
                  <li className="p flex items-start" style={{ lineHeight: '1.6' }}>
                    <span className="text-amber mr-3 mt-1">•</span>
                    <span>Your systems support your standards.</span>
                  </li>
                  <li className="p flex items-start" style={{ lineHeight: '1.6' }}>
                    <span className="text-amber mr-3 mt-1">•</span>
                    <span>Your people move with purpose, not pressure.</span>
                  </li>
                  <li className="p flex items-start" style={{ lineHeight: '1.6' }}>
                    <span className="text-amber mr-3 mt-1">•</span>
                    <span>You trust yourself again.</span>
                  </li>
                </ul>
                <p className="p mb-6" style={{ lineHeight: '1.6' }}>
                  We'll celebrate that moment—because it means the work did what it was meant to do.
                </p>
              </section>

              {/* Working Philosophy */}
              <section id="working-philosophy" ref={(el) => (sectionRefs.current['working-philosophy'] = el)} className="mb-16 scroll-mt-24">
                <h2 className="h2 mb-6">Working Philosophy</h2>
                <div className="space-y-6">
                  <div>
                    <h3 className="h3 mb-3">1. Real over performative.</h3>
                    <p className="p" style={{ lineHeight: '1.6' }}>
                      If we can't be honest, nothing else works. There's no script, no pretense, and no façade of improvement for optics.
                    </p>
                  </div>
                  <div>
                    <h3 className="h3 mb-3">2. Presence over persistence.</h3>
                    <p className="p" style={{ lineHeight: '1.6' }}>
                      When I'm with a client, I'm all in. When I'm not, I'm building this leadership universe through writing, research, and reflection. There's no "drip campaign" to keep you dependent.
                    </p>
                  </div>
                  <div>
                    <h3 className="h3 mb-3">3. Relationship over system.</h3>
                    <p className="p" style={{ lineHeight: '1.6' }}>
                      I don't sell programs. I build partnerships rooted in trust and truth. Systems serve people—not the other way around.
                    </p>
                  </div>
                  <div>
                    <h3 className="h3 mb-3">4. Responsibility over revenue.</h3>
                    <p className="p" style={{ lineHeight: '1.6' }}>
                      My goal isn't to protect a pipeline—it's to protect people. Financial success follows authentic progress.
                    </p>
                  </div>
                  <div>
                    <h3 className="h3 mb-3">5. Release over retention.</h3>
                    <p className="p" style={{ lineHeight: '1.6' }}>
                      Every great mentor works toward becoming unnecessary. Freedom, not dependence, is the ultimate metric of success.
                    </p>
                  </div>
                </div>
              </section>

              {/* Application */}
              <section id="application" ref={(el) => (sectionRefs.current.application = el)} className="mb-16 scroll-mt-24">
                <h2 className="h2 mb-6">Application — How This Plays Out</h2>
                <div className="space-y-6">
                  <div>
                    <h3 className="h3 mb-3">
                      <a href="/what-i-do#mentorship" className="text-amber hover:text-amber-dark transition-colors">Mentorship</a>
                    </h3>
                    <p className="p" style={{ lineHeight: '1.6' }}>
                      One-to-one work with leaders at every level. We blend clarity, confidence, and personal growth into actionable leadership rhythms.
                    </p>
                  </div>
                  <div>
                    <h3 className="h3 mb-3">
                      <a href="/what-i-do#consulting" className="text-amber hover:text-amber-dark transition-colors">Consulting</a>
                    </h3>
                    <p className="p" style={{ lineHeight: '1.6' }}>
                      Business structure, cultural alignment, communication frameworks, and process clarity. Rooted in lived experience across industries.
                    </p>
                  </div>
                  <div>
                    <h3 className="h3 mb-3">
                      <a href="/what-i-do#speaking" className="text-amber hover:text-amber-dark transition-colors">Speaking & Workshops</a>
                    </h3>
                    <p className="p" style={{ lineHeight: '1.6' }}>
                      Leadership talks and group sessions that bring these principles to teams in motion. Always practical, always personal.
                    </p>
                  </div>
                  <div>
                    <h3 className="h3 mb-3">
                      <a href="/what-i-do#fractional" className="text-amber hover:text-amber-dark transition-colors">Fractional Leadership</a>
                    </h3>
                    <p className="p" style={{ lineHeight: '1.6' }}>
                      Hands-on leadership during seasons of change or growth. Steadying the ship while helping new leaders rise.
                    </p>
                  </div>
                </div>
                <p className="p mt-6" style={{ lineHeight: '1.6' }}>
                  Each path connects back to the same center: serve people, clarify purpose, and build systems that last.
                </p>
              </section>

              {/* The Proof */}
              <section id="proof" ref={(el) => (sectionRefs.current.proof = el)} className="mb-16 scroll-mt-24">
                <aside aria-label="Research insights" className="border-l-4 border-amber bg-warm-offWhiteAlt rounded-r-lg p-6 mb-8">
                  <h2 className="h2 mb-6">The Proof — Why This Works</h2>
                  <p className="p mb-6" style={{ lineHeight: '1.6' }}>
                    Three decades of lived experience line up with what science has been saying all along:
                  </p>
                  <div className="space-y-4 mb-6">
                    <div>
                      <h3 className="h3 mb-2">Psychological Safety (Edmondson)</h3>
                      <p className="p" style={{ lineHeight: '1.6' }}>
                        Safety to speak equals speed to learn.
                      </p>
                    </div>
                    <div>
                      <h3 className="h3 mb-2">Neuroscience of Trust (Zak)</h3>
                      <p className="p" style={{ lineHeight: '1.6' }}>
                        Trust reduces stress and increases performance.
                      </p>
                    </div>
                    <div>
                      <h3 className="h3 mb-2">Cognitive Resilience (Seligman)</h3>
                      <p className="p" style={{ lineHeight: '1.6' }}>
                        Optimism and ownership turn setbacks into recovery faster.
                      </p>
                    </div>
                    <div>
                      <h3 className="h3 mb-2">Accountability Theory (Lerner)</h3>
                      <p className="p" style={{ lineHeight: '1.6' }}>
                        Shared responsibility increases motivation and results.
                      </p>
                    </div>
                  </div>
                  {renderParagraph("> Leaders don't need more tools—they need alignment between belief and behavior.", 'proof-quote')}
                </aside>
              </section>

              {/* The Goal */}
              <section id="goal" ref={(el) => (sectionRefs.current.goal = el)} className="mb-16 scroll-mt-24">
                <h2 className="h2 mb-6">The Goal</h2>
                <p className="p mb-6" style={{ lineHeight: '1.6' }}>
                  When this method works, you'll find clarity that feels like calm, teams that run without you hovering, and results that make sense again. You'll have structure without suffocation, standards without arrogance, and confidence without noise.
                </p>
                {renderParagraph("> That's what it means to lead from health instead of exhaustion.", 'goal-quote')}
              </section>

              {/* Closing */}
              <section id="closing" ref={(el) => (sectionRefs.current.closing = el)} className="mb-16 scroll-mt-24">
                <h2 className="h2 mb-6">Closing</h2>
                <p className="p mb-6" style={{ lineHeight: '1.6' }}>
                  Real leadership isn't a program.
                </p>
                <p className="p mb-6" style={{ lineHeight: '1.6' }}>
                  It's a process of rediscovering what's true and living it out with discipline.
                </p>
                <p className="p mb-6" style={{ lineHeight: '1.6' }}>
                  If you're ready to rebuild clarity and lead from strength and humility—let's talk.
                </p>
              </section>

              {/* CTA Strip */}
              <div className="mt-16 pt-12 border-t border-warm-border">
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <a
                    href="#contact"
                    className="btn-cta text-center"
                    aria-label="Start a conversation with Archy"
                  >
                    Start a Conversation
                  </a>
                  <a
                    href="https://calendly.com/bartpaden/1-on-1-mentorships"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-cta text-center"
                    aria-label="Book time with Bart on Calendly"
                  >
                    Book Time
                  </a>
                  <a
                    href="#contact"
                    className="btn-cta text-center"
                    aria-label="Send an email to Bart"
                  >
                    Email
                  </a>
                </div>
              </div>

              {/* Sequential Navigation Footer */}
              <div className="mt-12 pt-8 border-t border-warm-border flex items-center justify-between">
                <a
                  href="/philosophy"
                  className="inline-flex items-center text-warm-gray hover:text-amber transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-amber rounded px-2 py-1"
                  aria-label="Previous page: Philosophy"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  <span className="text-sm">← Philosophy</span>
                </a>
                <div></div>
              </div>
            </article>
          </div>
        </div>
      </div>
    </>
  );
}