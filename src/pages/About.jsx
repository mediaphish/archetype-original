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
  { id: 'origins', label: 'Origins' },
  { id: 'builders-decade', label: 'The Builder\'s Decade' },
  { id: 'service-before-spotlight', label: 'Service Before Spotlight' },
  { id: 'cost-and-comeback', label: 'The Cost and the Comeback' },
  { id: 'archetype-original', label: 'Back to Purpose' },
  { id: 'how-i-engage', label: 'How I Engage' },
  { id: 'rules-of-engagement', label: 'Rules of Engagement' },
  { id: 'where-we-start', label: 'Where We Start' },
  { id: 'why-this-works', label: 'Why This Works' },
  { id: 'what-you-take-with-you', label: 'What You Take With You' },
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

export default function About() {
  const [activeSection, setActiveSection] = useState('intro');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const sectionRefs = useRef({});

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 200;

      for (let i = sections.length - 1; i >= 0; i--) {
        const section = sections[i];
        const element = sectionRefs.current[section.id];
        if (element && element.offsetTop <= scrollPosition) {
          setActiveSection(section.id);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Check on mount

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id) => {
    const element = sectionRefs.current[id];
    if (element) {
      const offset = 100; // Account for fixed header
      const elementPosition = element.offsetTop - offset;
      window.scrollTo({
        top: elementPosition,
        behavior: 'smooth'
      });
      setIsMobileMenuOpen(false);
    }
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
      
      <div className="min-h-screen bg-warm-offWhite py-12 pt-28">
        <div className="max-w-7xl mx-auto px-4">
          {/* Back button */}
          <div className="mb-8 mt-8">
            <a 
              href="/" 
              className="inline-flex items-center text-warm-gray hover:text-amber transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-amber rounded px-2 py-1"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Home
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
                <span className="font-medium text-warm-charcoal">Navigation</span>
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
                          scrollToSection(section.id);
                        }}
                        className={`block px-3 py-2 rounded-lg text-sm transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-amber ${
                          activeSection === section.id
                            ? 'bg-amber text-white font-semibold'
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
            <article className="flex-1 max-w-4xl">
              <h1 className="h1 mb-12">About Bart</h1>

              {/* Intro */}
              <section id="intro" ref={(el) => (sectionRefs.current.intro = el)} className="mb-16 scroll-mt-24">
                <p className="p mb-6 font-semibold text-warm-charcoal text-xl" style={{ lineHeight: '1.6' }}>
                  I build leaders worth following.
                </p>
                <p className="p mb-6" style={{ lineHeight: '1.6' }}>
                  I didn't set out to be a leader—leadership found me the day my first employee walked into the office and asked me for insurance. I didn't have the revenue, so I used my own income to make it work. That decision wasn't strategy; it was responsibility. Since then I've built teams, defended people when it mattered, led through seasons of growth and collapse, and rebuilt cultures when trust was thin. Those years forged what I now teach: leadership is personal, culture is fragile, and health begins at the top.
                </p>
                <p className="p mb-6" style={{ lineHeight: '1.6' }}>
                  I mentor executives and founders, but I'm just as committed to emerging leaders and students. Strength and humility can live in the same sentence. That's the kind of leader I help build.
                </p>
              </section>

              {/* Origins */}
              <section id="origins" ref={(el) => (sectionRefs.current.origins = el)} className="mb-16 scroll-mt-24">
                <h2 className="h2 mb-6">From Design to Direction</h2>
                <p className="p mb-6" style={{ lineHeight: '1.6' }}>
                  I started in creative work—design, web, and brand. The work taught me to solve real problems for real people and to translate vision into something tangible. Early opportunities stretched into responsibility. I learned quickly that you don't earn influence by talking about values—you earn it by living them when it costs you.
                </p>
                {renderParagraph('> Influence starts with responsibility, not position.', 'origins-quote')}
              </section>

              {/* The Builder's Decade */}
              <section id="builders-decade" ref={(el) => (sectionRefs.current['builders-decade'] = el)} className="mb-16 scroll-mt-24">
                <h2 className="h2 mb-6">Team, Standards, and Service</h2>
                <p className="p mb-6" style={{ lineHeight: '1.6' }}>
                  As teams formed around the work, I discovered the weight and privilege of leadership. Hiring talented people required more than a budget—it required standards that protected them. I defended team members when it mattered, pushed for clarity when conversations got loud, and chose consistency over the "glory project" chase. Serving people well built momentum that marketing alone could never buy.
                </p>
                <h3 className="h3 mb-4 mt-8">What that looked like (themes, not stories)</h3>
                <ul className="space-y-3 mb-6">
                  <li className="p flex items-start" style={{ lineHeight: '1.6' }}>
                    <span className="text-amber mr-3 mt-1">•</span>
                    <span>Hiring for character and fit, then teaching the craft and the system.</span>
                  </li>
                  <li className="p flex items-start" style={{ lineHeight: '1.6' }}>
                    <span className="text-amber mr-3 mt-1">•</span>
                    <span>Protecting the team from toxic dynamics—even when it risked revenue.</span>
                  </li>
                  <li className="p flex items-start" style={{ lineHeight: '1.6' }}>
                    <span className="text-amber mr-3 mt-1">•</span>
                    <span>Building simple rhythms so good people could do great work.</span>
                  </li>
                </ul>
              </section>

              {/* Service Before Spotlight */}
              <section id="service-before-spotlight" ref={(el) => (sectionRefs.current['service-before-spotlight'] = el)} className="mb-16 scroll-mt-24">
                <h2 className="h2 mb-6">Community as Culture</h2>
                <p className="p mb-6" style={{ lineHeight: '1.6' }}>
                  At a pivotal moment, I paused billable work to serve my community at scale. That choice didn't polish a brand; it clarified an identity. Leadership isn't a speech—it's a decision you make when no one owes you applause. The lesson stuck: culture is built by what you sacrifice for.
                </p>
                {renderParagraph('> The fastest way to define culture is to choose service when it costs you.', 'service-quote')}
              </section>

              {/* The Cost and the Comeback */}
              <section id="cost-and-comeback" ref={(el) => (sectionRefs.current['cost-and-comeback'] = el)} className="mb-16 scroll-mt-24">
                <h2 className="h2 mb-6">The Cost and the Comeback</h2>
                <p className="p mb-6" style={{ lineHeight: '1.6' }}>
                  Later, misalignment and pressure took a toll. I learned how quickly "high performance" becomes "over-performing under constant strain." Selling a company, rebuilding health, and regaining clarity wasn't an abstract principle—it was survival. That season gave me empathy for leaders who carry more than most people will ever see.
                </p>
                <p className="p mb-6" style={{ lineHeight: '1.6' }}>
                  Today, my coaching often begins where leaders feel most alone: in the fog between exhaustion and expectation. We quiet the noise, tell the truth, and rebuild from the inside out.
                </p>
              </section>

              {/* Archetype Original */}
              <section id="archetype-original" ref={(el) => (sectionRefs.current['archetype-original'] = el)} className="mb-16 scroll-mt-24">
                <h2 className="h2 mb-6">Back to Purpose — Archetype Original</h2>
                <p className="p mb-6" style={{ lineHeight: '1.6' }}>
                  Archetype Original exists to help leaders build organizations that hold—cultures protected by clear standards, operations aligned to purpose, and growth that doesn't cost your soul. I blend three decades across software, marketing, fitness, and leadership rooms into practical guidance leaders can live with.
                </p>
                <p className="p mb-6" style={{ lineHeight: '1.6' }}>
                  I mentor executives and founders; I also invest deeply in emerging leaders and students. The future depends on who they become—so I teach them early that competence without character can't carry weight for long.
                </p>
              </section>

              {/* How I Engage */}
              <section id="how-i-engage" ref={(el) => (sectionRefs.current['how-i-engage'] = el)} className="mb-16 scroll-mt-24">
                <h2 className="h2 mb-6">How I Engage (today's work)</h2>
                <div className="space-y-6">
                  <div>
                    <h3 className="h3 mb-3">
                      <a href="/what-i-do#mentorship" className="text-amber hover:text-amber-dark transition-colors">Mentorship</a>
                    </h3>
                    <p className="p" style={{ lineHeight: '1.6' }}>
                      One-to-one guidance for executives, founders, emerging leaders, and students. We build clarity, confidence, and decision discipline without burnout.
                    </p>
                  </div>
                  <div>
                    <h3 className="h3 mb-3">
                      <a href="/what-i-do#consulting" className="text-amber hover:text-amber-dark transition-colors">Consulting</a>
                    </h3>
                    <p className="p" style={{ lineHeight: '1.6' }}>
                      Practical help for culture, organizational design, communication rhythms, and go-to-market alignment. Strategy that people can actually live with.
                    </p>
                  </div>
                  <div>
                    <h3 className="h3 mb-3">
                      <a href="/what-i-do#speaking" className="text-amber hover:text-amber-dark transition-colors">Speaking & Workshops</a>
                    </h3>
                    <p className="p" style={{ lineHeight: '1.6' }}>
                      Keynotes, classroom talks, and team workshops that translate principles into practice.
                    </p>
                  </div>
                  <div>
                    <h3 className="h3 mb-3">
                      <a href="/what-i-do#fractional" className="text-amber hover:text-amber-dark transition-colors">Fractional Leadership</a>
                    </h3>
                    <p className="p" style={{ lineHeight: '1.6' }}>
                      Interim executive coverage to stabilize operations and lead through change—clear lanes, steady cadence, clean handoff.
                    </p>
                  </div>
                </div>
              </section>

              {/* Rules of Engagement */}
              <section id="rules-of-engagement" ref={(el) => (sectionRefs.current['rules-of-engagement'] = el)} className="mb-16 scroll-mt-24">
                <h2 className="h2 mb-6">What It's Like to Work Together (rules of engagement)</h2>
                <ul className="space-y-4">
                  <li className="p flex items-start" style={{ lineHeight: '1.6' }}>
                    <span className="text-amber mr-3 mt-1 font-bold">•</span>
                    <span><strong className="text-warm-charcoal">Honest by default.</strong> I won't be a "yes-man." We address the real issue, directly.</span>
                  </li>
                  <li className="p flex items-start" style={{ lineHeight: '1.6' }}>
                    <span className="text-amber mr-3 mt-1 font-bold">•</span>
                    <span><strong className="text-warm-charcoal">Human first.</strong> I treat people the way I want to be treated—especially under pressure.</span>
                  </li>
                  <li className="p flex items-start" style={{ lineHeight: '1.6' }}>
                    <span className="text-amber mr-3 mt-1 font-bold">•</span>
                    <span><strong className="text-warm-charcoal">No dependency.</strong> Success is when you don't need me anymore.</span>
                  </li>
                  <li className="p flex items-start" style={{ lineHeight: '1.6' }}>
                    <span className="text-amber mr-3 mt-1 font-bold">•</span>
                    <span><strong className="text-warm-charcoal">Shared accountability.</strong> Accountability is owned most by the person being accountable.</span>
                  </li>
                  <li className="p flex items-start" style={{ lineHeight: '1.6' }}>
                    <span className="text-amber mr-3 mt-1 font-bold">•</span>
                    <span><strong className="text-warm-charcoal">Conversation over program.</strong> Real situations. Real plans. Real execution. No subscriptions.</span>
                  </li>
                </ul>
              </section>

              {/* Where We Start */}
              <section id="where-we-start" ref={(el) => (sectionRefs.current['where-we-start'] = el)} className="mb-16 scroll-mt-24">
                <h2 className="h2 mb-6">Where We Start (personal clarity first)</h2>
                <p className="p mb-6" style={{ lineHeight: '1.6' }}>
                  When trust has been broken or confidence shaken, the first clarity is personal. We name what's true about who you are, what you value, and what healthy leadership looks like for you. Then we rebuild structural and directional clarity around that center—roles, decision rights, communication cadence, priorities, and next steps.
                </p>
                <h3 className="h3 mb-4 mt-8">Signals we're on track</h3>
                <ul className="space-y-3 mb-6">
                  <li className="p flex items-start" style={{ lineHeight: '1.6' }}>
                    <span className="text-amber mr-3 mt-1">•</span>
                    <span>Language becomes clearer; decisions stop looping.</span>
                  </li>
                  <li className="p flex items-start" style={{ lineHeight: '1.6' }}>
                    <span className="text-amber mr-3 mt-1">•</span>
                    <span>Teams stop protecting themselves and start protecting the mission.</span>
                  </li>
                  <li className="p flex items-start" style={{ lineHeight: '1.6' }}>
                    <span className="text-amber mr-3 mt-1">•</span>
                    <span>Energy returns without bravado.</span>
                  </li>
                  <li className="p flex items-start" style={{ lineHeight: '1.6' }}>
                    <span className="text-amber mr-3 mt-1">•</span>
                    <span>You feel strong and calm at the same time.</span>
                  </li>
                </ul>
              </section>

              {/* Why This Works */}
              <section id="why-this-works" ref={(el) => (sectionRefs.current['why-this-works'] = el)} className="mb-16 scroll-mt-24">
                <aside aria-label="Research insights" className="border-l-4 border-amber bg-warm-offWhiteAlt rounded-r-lg p-6 mb-8">
                  <h2 className="h2 mb-6">Why This Works (research in plain language)</h2>
                  <p className="p mb-6" style={{ lineHeight: '1.6' }}>
                    Modern research keeps confirming what experience has already taught me. When people feel heard and supported, their minds unlock. Psychological safety, trust, and empathy aren't soft skills—they're performance multipliers.
                  </p>
                  <div className="space-y-4 mb-6">
                    <div>
                      <h3 className="h3 mb-2">Psychological Safety (Edmondson)</h3>
                      <p className="p" style={{ lineHeight: '1.6' }}>
                        Teams that can tell the truth learn faster and perform better.
                      </p>
                    </div>
                    <div>
                      <h3 className="h3 mb-2">Empathic Listening (Rogers)</h3>
                      <p className="p" style={{ lineHeight: '1.6' }}>
                        Listening to understand reduces anxiety and restores cognitive clarity.
                      </p>
                    </div>
                    <div>
                      <h3 className="h3 mb-2">Neuroscience of Trust (Zak/HBR)</h3>
                      <p className="p" style={{ lineHeight: '1.6' }}>
                        High-trust environments lower stress chemistry and increase productivity and engagement.
                      </p>
                    </div>
                    <div>
                      <h3 className="h3 mb-2">Executive Isolation (Gallup)</h3>
                      <p className="p" style={{ lineHeight: '1.6' }}>
                        Many leaders lack a safe place to process; mentorship restores clarity and better decisions.
                      </p>
                    </div>
                  </div>
                  {renderParagraph('> Empathy restores access to reason. Trust unlocks performance.', 'research-quote')}
                </aside>
              </section>

              {/* What You Take With You */}
              <section id="what-you-take-with-you" ref={(el) => (sectionRefs.current['what-you-take-with-you'] = el)} className="mb-16 scroll-mt-24">
                <h2 className="h2 mb-6">What I Hope You Take With You</h2>
                <p className="p mb-6" style={{ lineHeight: '1.6' }}>
                  I want you to reach a point where you don't need me. Not because I lost interest—but because you recovered your center, built systems that fit, and grew leaders who can carry the mission. I'll celebrate your independence every single time.
                </p>
              </section>

              {/* Closing */}
              <section id="closing" ref={(el) => (sectionRefs.current.closing = el)} className="mb-16 scroll-mt-24">
                <h2 className="h2 mb-6">Closing</h2>
                <p className="p mb-6" style={{ lineHeight: '1.6' }}>
                  When I'm with a client, I'm 100% theirs.
                </p>
                <p className="p mb-6" style={{ lineHeight: '1.6' }}>
                  When I'm not, I'm building this leadership universe—writing, researching, and refining tools you can use. If you're ready to steady the ground under your feet and lead with strength and humility, let's talk.
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
            </article>
          </div>
        </div>
      </div>
    </>
  );
}