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
  { id: 'mentorship', label: 'Mentorship & Coaching' },
  { id: 'consulting', label: 'Consulting & Advisory' },
  { id: 'speaking', label: 'Speaking & Workshops' },
  { id: 'fractional', label: 'Fractional Leadership' },
  { id: 'difference', label: 'The Difference' },
  { id: 'getting-started', label: 'Getting Started' }
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

export default function WhatIDo() {
  const [activeSection, setActiveSection] = useState('intro');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const sectionRefs = useRef({});

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 200;

      // Update active section
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
    "@type": "Service",
    "serviceType": "Leadership Consulting and Mentorship",
    "provider": {
      "@type": "Person",
      "name": "Bart Paden",
      "jobTitle": "Mentor & Consultant",
      "url": "https://www.archetypeoriginal.com"
    },
    "description": "Mentorship, consulting, speaking, and fractional leadership by Bart Paden—real conversations that build clarity and lasting growth.",
    "areaServed": "Worldwide",
    "offers": [
      {
        "@type": "Offer",
        "itemOffered": {
          "@type": "Service",
          "name": "Mentorship & Coaching",
          "description": "1-on-1 mentorship for emerging leaders, experienced leaders, and students"
        }
      },
      {
        "@type": "Offer",
        "itemOffered": {
          "@type": "Service",
          "name": "Business Consulting",
          "description": "Cultural alignment, organizational structure, marketing, and operational frameworks"
        }
      },
      {
        "@type": "Offer",
        "itemOffered": {
          "@type": "Service",
          "name": "Speaking & Workshops",
          "description": "Keynotes, workshops, and guest lectures on leadership and business culture"
        }
      },
      {
        "@type": "Offer",
        "itemOffered": {
          "@type": "Service",
          "name": "Fractional Leadership",
          "description": "Interim executive roles for organizational stability and growth navigation"
        }
      }
    ]
  };

  return (
    <>
      <SEO pageKey="what-i-do" />
      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify(jsonLd)}
        </script>
      </Helmet>
      
      <div className="min-h-screen bg-warm-offWhite py-12 pt-20">
        <div className="max-w-7xl mx-auto px-4">
          {/* Back button */}
          <div className="mb-8">
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

          {/* Sequential Navigation */}
          <div className="mb-8 flex items-center justify-between border-b border-warm-border pb-4">
            <div></div>
            <a
              href="/philosophy"
              className="inline-flex items-center text-warm-gray hover:text-amber transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-amber rounded px-2 py-1"
              aria-label="Next page: Philosophy"
            >
              <span className="text-sm">Philosophy</span>
              <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
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
              <h1 className="h1 mb-12">What I Do</h1>

              {/* Intro */}
              <section id="intro" ref={(el) => (sectionRefs.current.intro = el)} className="mb-16 scroll-mt-24">
                <p className="p mb-6 font-semibold text-warm-charcoal text-xl" style={{ lineHeight: '1.6' }}>
                  Every engagement I take on has one purpose—help people and businesses grow without losing what makes them human.
                </p>
                <p className="p mb-6" style={{ lineHeight: '1.6' }}>
                  I don't offer canned programs or subscriptions. I bring 32 years of experience in leadership, business development, culture building, marketing, and software to the table, and meet each client where they are.
                </p>
                <p className="p mb-6" style={{ lineHeight: '1.6' }}>
                  I help founders, executives, teams, and students find clarity, confidence, and direction again.
                </p>
              </section>

              {/* Section 1 — Mentorship & Coaching */}
              <section id="mentorship" ref={(el) => (sectionRefs.current.mentorship = el)} className="mb-16 scroll-mt-24">
                <h2 className="h2 mb-6">Mentorship & Coaching</h2>
                <p className="p mb-4 text-warm-gray" style={{ lineHeight: '1.6' }}>
                  <strong className="text-warm-charcoal">1-on-1 Mentorship • Leadership Coaching • Personal Growth</strong>
                </p>
                <p className="p mb-6" style={{ lineHeight: '1.6' }}>
                  Mentorship is personal. It's where I spend the most time, because growth starts with people before it ever reaches an organization.
                </p>
                <p className="p mb-4" style={{ lineHeight: '1.6' }}>
                  I work with:
                </p>
                <ul className="space-y-3 mb-6">
                  <li className="p flex items-start" style={{ lineHeight: '1.6' }}>
                    <span className="text-amber mr-3 mt-1">•</span>
                    <span><strong className="text-warm-charcoal">Emerging leaders</strong> who need clarity on calling, confidence, and communication.</span>
                  </li>
                  <li className="p flex items-start" style={{ lineHeight: '1.6' }}>
                    <span className="text-amber mr-3 mt-1">•</span>
                    <span><strong className="text-warm-charcoal">Experienced leaders</strong> who want to regain calm and focus after burnout or transition.</span>
                  </li>
                  <li className="p flex items-start" style={{ lineHeight: '1.6' }}>
                    <span className="text-amber mr-3 mt-1">•</span>
                    <span><strong className="text-warm-charcoal">Students & young professionals</strong> who are learning how to lead without losing themselves.</span>
                  </li>
                </ul>
                <p className="p mb-6" style={{ lineHeight: '1.6' }}>
                  Each mentorship is built around honest conversation and consistent reflection. There's no scoreboard—just measurable progress in character, confidence, and clarity.
                </p>
                {renderParagraph('> The goal is simple: help you become a leader worth following, not one chasing followers.', 'mentorship-quote')}
              </section>

              {/* Section 2 — Consulting & Advisory */}
              <section id="consulting" ref={(el) => (sectionRefs.current.consulting = el)} className="mb-16 scroll-mt-24">
                <h2 className="h2 mb-6">Consulting & Advisory</h2>
                <p className="p mb-4 text-warm-gray" style={{ lineHeight: '1.6' }}>
                  <strong className="text-warm-charcoal">Business Consulting • Leadership Alignment • Culture & Communication</strong>
                </p>
                <p className="p mb-6" style={{ lineHeight: '1.6' }}>
                  I've spent three decades building, leading, and advising companies—from creative agencies to software firms to fitness brands. That experience lets me help others navigate growth, transition, and change with steadiness.
                </p>
                <p className="p mb-4" style={{ lineHeight: '1.6' }}>
                  Typical focus areas include:
                </p>
                <ul className="space-y-3 mb-6">
                  <li className="p flex items-start" style={{ lineHeight: '1.6' }}>
                    <span className="text-amber mr-3 mt-1">•</span>
                    <span>Cultural alignment and servant-led leadership systems</span>
                  </li>
                  <li className="p flex items-start" style={{ lineHeight: '1.6' }}>
                    <span className="text-amber mr-3 mt-1">•</span>
                    <span>Organizational structure and decision clarity</span>
                  </li>
                  <li className="p flex items-start" style={{ lineHeight: '1.6' }}>
                    <span className="text-amber mr-3 mt-1">•</span>
                    <span>Marketing & brand positioning</span>
                  </li>
                  <li className="p flex items-start" style={{ lineHeight: '1.6' }}>
                    <span className="text-amber mr-3 mt-1">•</span>
                    <span>Operational and team communication frameworks</span>
                  </li>
                  <li className="p flex items-start" style={{ lineHeight: '1.6' }}>
                    <span className="text-amber mr-3 mt-1">•</span>
                    <span>Start-up strategy and scaling systems</span>
                  </li>
                  <li className="p flex items-start" style={{ lineHeight: '1.6' }}>
                    <span className="text-amber mr-3 mt-1">•</span>
                    <span>Integrating AI and technology into human-centered workflows</span>
                  </li>
                </ul>
                <p className="p mb-6" style={{ lineHeight: '1.6' }}>
                  My role is to listen, clarify, and help translate values into daily operations that make sense to real people.
                </p>
                {renderParagraph('> I don't install complexity—I remove noise.', 'consulting-quote')}
              </section>

              {/* Section 3 — Speaking & Workshops */}
              <section id="speaking" ref={(el) => (sectionRefs.current.speaking = el)} className="mb-16 scroll-mt-24">
                <h2 className="h2 mb-6">Speaking & Workshops</h2>
                <p className="p mb-4 text-warm-gray" style={{ lineHeight: '1.6' }}>
                  <strong className="text-warm-charcoal">Keynotes • Workshops • Panels • Guest Lectures</strong>
                </p>
                <p className="p mb-6" style={{ lineHeight: '1.6' }}>
                  Speaking is where mentorship meets momentum. I share stories and frameworks that connect leadership, business, and personal growth in a way that audiences remember.
                </p>
                <p className="p mb-4" style={{ lineHeight: '1.6' }}>
                  Topics I've spoken on include:
                </p>
                <ul className="space-y-3 mb-6">
                  <li className="p flex items-start" style={{ lineHeight: '1.6' }}>
                    <span className="text-amber mr-3 mt-1">•</span>
                    <span>Servant Leadership and Cultural Health</span>
                  </li>
                  <li className="p flex items-start" style={{ lineHeight: '1.6' }}>
                    <span className="text-amber mr-3 mt-1">•</span>
                    <span>Leadership After Collapse</span>
                  </li>
                  <li className="p flex items-start" style={{ lineHeight: '1.6' }}>
                    <span className="text-amber mr-3 mt-1">•</span>
                    <span>Building High-Trust Teams</span>
                  </li>
                  <li className="p flex items-start" style={{ lineHeight: '1.6' }}>
                    <span className="text-amber mr-3 mt-1">•</span>
                    <span>Marketing with Purpose</span>
                  </li>
                  <li className="p flex items-start" style={{ lineHeight: '1.6' }}>
                    <span className="text-amber mr-3 mt-1">•</span>
                    <span>Entrepreneurship and Faith</span>
                  </li>
                  <li className="p flex items-start" style={{ lineHeight: '1.6' }}>
                    <span className="text-amber mr-3 mt-1">•</span>
                    <span>AI and the Future of Creative Work</span>
                  </li>
                </ul>
                <p className="p mb-6" style={{ lineHeight: '1.6' }}>
                  Sessions are practical, emotional, and honest. I leave people thinking differently about how they lead and live.
                </p>
              </section>

              {/* Section 4 — Fractional Leadership */}
              <section id="fractional" ref={(el) => (sectionRefs.current.fractional = el)} className="mb-16 scroll-mt-24">
                <h2 className="h2 mb-6">Fractional Leadership</h2>
                <p className="p mb-4 text-warm-gray" style={{ lineHeight: '1.6' }}>
                  <strong className="text-warm-charcoal">Interim Leadership • Organizational Stability • Growth Navigation</strong>
                </p>
                <p className="p mb-6" style={{ lineHeight: '1.6' }}>
                  Sometimes a business doesn't need another consultant—it needs a leader who can step in and lead for a while.
                </p>
                <p className="p mb-6" style={{ lineHeight: '1.6' }}>
                  I take on short- and long-term fractional roles to help companies stabilize, rebuild culture, and create systems that make sense. These roles often include:
                </p>
                <ul className="space-y-3 mb-6">
                  <li className="p flex items-start" style={{ lineHeight: '1.6' }}>
                    <span className="text-amber mr-3 mt-1">•</span>
                    <span>Interim COO / CMO / CEO support</span>
                  </li>
                  <li className="p flex items-start" style={{ lineHeight: '1.6' }}>
                    <span className="text-amber mr-3 mt-1">•</span>
                    <span>Departmental leadership during transition</span>
                  </li>
                  <li className="p flex items-start" style={{ lineHeight: '1.6' }}>
                    <span className="text-amber mr-3 mt-1">•</span>
                    <span>Launch or restructure management</span>
                  </li>
                  <li className="p flex items-start" style={{ lineHeight: '1.6' }}>
                    <span className="text-amber mr-3 mt-1">•</span>
                    <span>Mentorship of rising leaders within the organization</span>
                  </li>
                </ul>
                <p className="p mb-6" style={{ lineHeight: '1.6' }}>
                  The goal is always to lead from inside until the right permanent leadership is ready—and then step away knowing they can carry it forward.
                </p>
                {renderParagraph('> Leadership isn't about holding power. It's about creating stability long enough for others to rise.', 'fractional-quote')}
              </section>

              {/* Section 5 — The Difference */}
              <section id="difference" ref={(el) => (sectionRefs.current.difference = el)} className="mb-16 scroll-mt-24">
                <h2 className="h2 mb-6">The Difference</h2>
                <p className="p mb-6" style={{ lineHeight: '1.6' }}>
                  There are a lot of people who call themselves consultants or coaches.
                </p>
                <p className="p mb-6" style={{ lineHeight: '1.6' }}>
                  Here's what makes this work different:
                </p>
                <div className="space-y-6 mb-6">
                  <div>
                    <h3 className="h3 mb-3">Experience that translates.</h3>
                    <p className="p" style={{ lineHeight: '1.6' }}>
                      I've led teams through growth, collapse, and rebuild. Nothing here is theory.
                    </p>
                  </div>
                  <div>
                    <h3 className="h3 mb-3">Faith and integrity.</h3>
                    <p className="p" style={{ lineHeight: '1.6' }}>
                      I treat people the way I'd want to be treated. That rule doesn't change with revenue.
                    </p>
                  </div>
                  <div>
                    <h3 className="h3 mb-3">Real conversations.</h3>
                    <p className="p" style={{ lineHeight: '1.6' }}>
                      No scripts. No subscriptions. No fake optimism. Just clarity and courage.
                    </p>
                  </div>
                  <div>
                    <h3 className="h3 mb-3">Release as a goal.</h3>
                    <p className="p" style={{ lineHeight: '1.6' }}>
                      When clients no longer need me, we've done it right.
                    </p>
                  </div>
                </div>
              </section>

              {/* Section 6 — Getting Started */}
              <section id="getting-started" ref={(el) => (sectionRefs.current['getting-started'] = el)} className="mb-16 scroll-mt-24">
                <h2 className="h2 mb-6">Getting Started</h2>
                <p className="p mb-6" style={{ lineHeight: '1.6' }}>
                  Every conversation starts the same way—with honesty.
                </p>
                <p className="p mb-6" style={{ lineHeight: '1.6' }}>
                  Tell me what's happening, what you're trying to build, and what's getting in the way.
                </p>
                <p className="p mb-6" style={{ lineHeight: '1.6' }}>
                  If I can help, I will. If not, I'll help you find someone who can.
                </p>
                {renderParagraph('> Real leadership conversations start long before contracts.', 'getting-started-quote')}
              </section>

              {/* CTA Strip */}
              <div className="mt-16 pt-12 border-t border-warm-border">
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <a
                    href="#contact"
                    className="btn-cta text-center"
                    aria-label="Start a conversation with Archy"
                  >
                    Chat with Archy
                  </a>
                  <a
                    href="https://calendly.com/bartpaden/1-on-1-mentorships"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-cta text-center"
                    aria-label="Schedule a call with Bart on Calendly"
                  >
                    Schedule a Call
                  </a>
                  <a
                    href="mailto:contact@archetypeoriginal.com"
                    className="btn-cta text-center"
                    aria-label="Send an email to Bart"
                  >
                    Send an Email
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

