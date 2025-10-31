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
  { id: 'golden-rule', label: 'The Golden Rule' },
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

export default function Philosophy() {
  const [activeSection, setActiveSection] = useState('intro');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const sectionRefs = useRef({});
  const contentRef = useRef(null);

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
      
      <div className="min-h-screen bg-warm-offWhite py-12 pt-20">
        <div className="max-w-7xl mx-auto px-4">
          {/* Sequential Navigation */}
          <div className="mb-8 flex items-center justify-between border-b border-warm-border pb-4">
            <a 
              href="/" 
              className="inline-flex items-center text-warm-gray hover:text-amber transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-amber rounded px-2 py-1"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="text-sm">Back to Home</span>
            </a>
            <div className="flex items-center gap-4">
              <a
                href="/what-i-do"
                className="inline-flex items-center text-warm-gray hover:text-amber transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-amber rounded px-2 py-1"
                aria-label="Previous page: What I Do"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="text-sm">What I Do</span>
              </a>
              <a
                href="/methods"
                className="inline-flex items-center text-warm-gray hover:text-amber transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-amber rounded px-2 py-1"
                aria-label="Next page: Methods"
              >
                <span className="text-sm">Methods</span>
                <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </a>
            </div>
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
            <article ref={contentRef} className="flex-1 max-w-4xl">
              <h1 className="h1 mb-12">Philosophy</h1>

              {/* Intro */}
              <section id="intro" ref={(el) => (sectionRefs.current.intro = el)} className="mb-16 scroll-mt-24">
                <p className="p mb-6 font-semibold text-warm-charcoal text-xl" style={{ lineHeight: '1.6' }}>
                  Leadership is stewardship.
                </p>
                <p className="p mb-6" style={{ lineHeight: '1.6' }}>
                  It's not about holding power—it's about holding responsibility.
                </p>
                <p className="p mb-6" style={{ lineHeight: '1.6' }}>
                  I've spent over three decades watching companies rise and fall, teams thrive and fracture, and leaders find or lose their way. What separates the healthy from the broken isn't intelligence, charisma, or vision—it's alignment. When what you believe, say, and do line up, trust takes root. When they don't, people start protecting themselves instead of the mission.
                </p>
                <p className="p mb-6" style={{ lineHeight: '1.6' }}>
                  Archetype Original exists to help leaders rebuild that alignment—to make clarity, character, and culture tangible again.
                </p>
              </section>

              {/* The Foundation */}
              <section id="foundation" ref={(el) => (sectionRefs.current.foundation = el)} className="mb-16 scroll-mt-24">
                <h2 className="h2 mb-6">The Foundation — Servant Leadership</h2>
                <p className="p mb-6" style={{ lineHeight: '1.6' }}>
                  Servant leadership has been misunderstood for decades. It isn't weakness or endless sacrifice. It's strength under control. It's stewardship of people and purpose.
                </p>
                <p className="p mb-6" style={{ lineHeight: '1.6' }}>
                  At its core, servant leadership means this:
                </p>
                {renderParagraph("> The leader's role is to ensure the people in their care can thrive in theirs.", 'foundation-core')}
                <p className="p mb-6" style={{ lineHeight: '1.6' }}>
                  It's practical: accountability, clarity, empathy, and example. When leaders take responsibility for the wake they leave behind, organizations stabilize and teams begin to trust again. Servant leadership is the spine of everything I teach—but it's not the only vertebra.
                </p>
              </section>

              {/* The Golden Rule */}
              <section id="golden-rule" ref={(el) => (sectionRefs.current['golden-rule'] = el)} className="mb-16 scroll-mt-24">
                <h2 className="h2 mb-6">The Human Lens</h2>
                <p className="p mb-6" style={{ lineHeight: '1.6' }}>
                  Faith quietly shapes everything I do. The Golden Rule—treat people the way you want to be treated—has guided every decision I've made as a mentor, leader, and business owner. It's not just morality; it's mechanism.
                </p>
                <p className="p mb-6" style={{ lineHeight: '1.6' }}>
                  When you treat people with dignity, they respond with trust. When you build trust, they respond with effort.
                </p>
                {renderParagraph("> Simple. Timeless. Proven.", 'golden-rule-simple')}
                <p className="p mb-6" style={{ lineHeight: '1.6' }}>
                  It's also scalable. You can apply it to a boardroom, a start-up, or a student. Respect and empathy never expire.
                </p>
              </section>

              {/* Business Lens */}
              <section id="business-lens" ref={(el) => (sectionRefs.current['business-lens'] = el)} className="mb-16 scroll-mt-24">
                <h2 className="h2 mb-6">Beyond Leadership — The Business Lens</h2>
                <p className="p mb-6" style={{ lineHeight: '1.6' }}>
                  Culture and clarity mean little without functional systems. Business has rules—cash flow, delivery, margins, accountability—and servant leadership doesn't ignore them. It humanizes them.
                </p>
                <p className="p mb-6" style={{ lineHeight: '1.6' }}>
                  Leadership and business intersect in a single question:
                </p>
                {renderParagraph("> How do we build systems that serve both people and performance?", 'business-question')}
                <p className="p mb-6" style={{ lineHeight: '1.6' }}>
                  That's where I spend most of my time with clients—translating values into operational design. The goal isn't to make a company soft; it's to make it sustainable.
                </p>
                <p className="p mb-4" style={{ lineHeight: '1.6' }}>
                  A healthy company:
                </p>
                <ul className="space-y-3 mb-6">
                  <li className="p flex items-start" style={{ lineHeight: '1.6' }}>
                    <span className="text-amber mr-3 mt-1">•</span>
                    <span>Aligns purpose with structure.</span>
                  </li>
                  <li className="p flex items-start" style={{ lineHeight: '1.6' }}>
                    <span className="text-amber mr-3 mt-1">•</span>
                    <span>Measures success with both numbers and morale.</span>
                  </li>
                  <li className="p flex items-start" style={{ lineHeight: '1.6' }}>
                    <span className="text-amber mr-3 mt-1">•</span>
                    <span>Protects culture as deliberately as it protects profit.</span>
                  </li>
                </ul>
                <p className="p mb-6" style={{ lineHeight: '1.6' }}>
                  I help leaders close the gap between what they say they value and what their systems reward.
                </p>
                <p className="p mb-6" style={{ lineHeight: '1.6' }}>
                  <a href="/methods" className="text-amber hover:text-amber-dark transition-colors underline">Learn more about my methods →</a>
                </p>
              </section>

              {/* Clarity Over Chaos */}
              <section id="clarity-over-chaos" ref={(el) => (sectionRefs.current['clarity-over-chaos'] = el)} className="mb-16 scroll-mt-24">
                <h2 className="h2 mb-6">Clarity Over Chaos</h2>
                <p className="p mb-6" style={{ lineHeight: '1.6' }}>
                  Chaos creeps in when communication and direction get tangled.
                </p>
                <p className="p mb-6" style={{ lineHeight: '1.6' }}>
                  Leaders often mistake energy for clarity. They fill the air with excitement, but no one leaves the room knowing what to do next.
                </p>
                {renderParagraph("> Clarity is an act of service—it removes friction and frees people to move.", 'clarity-service')}
                <p className="p mb-4" style={{ lineHeight: '1.6' }}>
                  When I work with teams, we start by identifying where chaos hides:
                </p>
                <ul className="space-y-3 mb-6">
                  <li className="p flex items-start" style={{ lineHeight: '1.6' }}>
                    <span className="text-amber mr-3 mt-1">•</span>
                    <span>Conflicting messages</span>
                  </li>
                  <li className="p flex items-start" style={{ lineHeight: '1.6' }}>
                    <span className="text-amber mr-3 mt-1">•</span>
                    <span>Undefined authority</span>
                  </li>
                  <li className="p flex items-start" style={{ lineHeight: '1.6' }}>
                    <span className="text-amber mr-3 mt-1">•</span>
                    <span>Overlapping roles</span>
                  </li>
                  <li className="p flex items-start" style={{ lineHeight: '1.6' }}>
                    <span className="text-amber mr-3 mt-1">•</span>
                    <span>Emotional noise</span>
                  </li>
                </ul>
                <p className="p mb-6" style={{ lineHeight: '1.6' }}>
                  Once you can name chaos, you can dismantle it. Teams that see clearly, move clearly.
                </p>
              </section>

              {/* Trust Is the Currency */}
              <section id="trust-is-currency" ref={(el) => (sectionRefs.current['trust-is-currency'] = el)} className="mb-16 scroll-mt-24">
                <h2 className="h2 mb-6">Trust Is the Currency</h2>
                <p className="p mb-6" style={{ lineHeight: '1.6' }}>
                  You can have vision, but if your people don't trust you, everything else is noise.
                </p>
                <p className="p mb-6" style={{ lineHeight: '1.6' }}>
                  Trust is built through small, repeated proof—consistency, follow-through, honesty when it costs you.
                </p>
                <p className="p mb-6" style={{ lineHeight: '1.6' }}>
                  It's broken by secrecy, ego, and spin.
                </p>
                <p className="p mb-6" style={{ lineHeight: '1.6' }}>
                  The neuroscience is undeniable: high-trust environments lower cortisol, boost oxytocin, and literally rewire the brain toward cooperation. But long before the data, experience proved it.
                </p>
                <p className="p mb-6" style={{ lineHeight: '1.6' }}>
                  When leaders are transparent and reliable, people breathe again. When they aren't, everyone starts holding their breath.
                </p>
              </section>

              {/* Accountability */}
              <section id="accountability" ref={(el) => (sectionRefs.current.accountability = el)} className="mb-16 scroll-mt-24">
                <h2 className="h2 mb-6">Accountability Without Ego</h2>
                <p className="p mb-6" style={{ lineHeight: '1.6' }}>
                  Accountability isn't control—it's care. It says, "I believe in you enough to expect more."
                </p>
                <p className="p mb-6" style={{ lineHeight: '1.6' }}>
                  Good leaders don't hide behind authority or policy. They make expectations clear, own their own mistakes, and give people space to rise.
                </p>
                <p className="p mb-6" style={{ lineHeight: '1.6' }}>
                  Ego kills accountability. The moment leadership becomes about defending pride instead of protecting culture, progress stops.
                </p>
                <p className="p mb-6" style={{ lineHeight: '1.6' }}>
                  I've learned this the hard way—and I still practice it daily. Accountability is a mirror you hold up for yourself before anyone else.
                </p>
              </section>

              {/* Simplicity */}
              <section id="simplicity" ref={(el) => (sectionRefs.current.simplicity = el)} className="mb-16 scroll-mt-24">
                <h2 className="h2 mb-6">Simplicity Wins</h2>
                <p className="p mb-6" style={{ lineHeight: '1.6' }}>
                  Complexity feels impressive. Simplicity creates traction.
                </p>
                <p className="p mb-6" style={{ lineHeight: '1.6' }}>
                  Whether it's communication, structure, or vision, I've learned to prune relentlessly.
                </p>
                {renderParagraph("> If something can't be explained clearly, it can't be executed consistently.", 'simplicity-clear')}
                <p className="p mb-6" style={{ lineHeight: '1.6' }}>
                  Every engagement I lead focuses on distillation. We strip away noise until what's left is useful, repeatable, and teachable. That's the mark of a healthy organization: people can explain it without you in the room.
                </p>
              </section>

              {/* Leadership Is Personal */}
              <section id="leadership-is-personal" ref={(el) => (sectionRefs.current['leadership-is-personal'] = el)} className="mb-16 scroll-mt-24">
                <h2 className="h2 mb-6">Leadership Is Personal</h2>
                <p className="p mb-6" style={{ lineHeight: '1.6' }}>
                  The best systems in the world can't fix a leader who's lost themselves.
                </p>
                <p className="p mb-6" style={{ lineHeight: '1.6' }}>
                  That's why my philosophy always returns to the human being leading the humans.
                </p>
                <p className="p mb-6" style={{ lineHeight: '1.6' }}>
                  Health, self-awareness, and honesty aren't luxuries—they're prerequisites.
                </p>
                <p className="p mb-6" style={{ lineHeight: '1.6' }}>
                  When the person at the top grows, everyone under them breathes easier.
                </p>
                {renderParagraph("> \"Your business can't be healthier than you are.\"", 'health-quote')}
              </section>

              {/* Why It Works */}
              <section id="research" ref={(el) => (sectionRefs.current.research = el)} className="mb-16 scroll-mt-24">
                <aside aria-label="Research insights" className="border-l-4 border-amber bg-warm-offWhiteAlt rounded-r-lg p-6 mb-8">
                  <h2 className="h2 mb-6">Why It Works (research summary)</h2>
                  <p className="p mb-6" style={{ lineHeight: '1.6' }}>
                    Modern research confirms what three decades of practice have made obvious: leaders who create safety, clarity, and consistency unlock their team's highest performance.
                  </p>
                  <div className="space-y-4 mb-6">
                    <div>
                      <h3 className="h3 mb-2">Psychological Safety (Edmondson)</h3>
                      <p className="p" style={{ lineHeight: '1.6' }}>
                        Open communication drives innovation.
                      </p>
                    </div>
                    <div>
                      <h3 className="h3 mb-2">Empathic Listening (Rogers)</h3>
                      <p className="p" style={{ lineHeight: '1.6' }}>
                        Understanding reduces reactivity and restores reasoning.
                      </p>
                    </div>
                    <div>
                      <h3 className="h3 mb-2">Neuroscience of Trust (Zak)</h3>
                      <p className="p" style={{ lineHeight: '1.6' }}>
                        Trust changes brain chemistry and productivity.
                      </p>
                    </div>
                    <div>
                      <h3 className="h3 mb-2">Executive Isolation (Gallup)</h3>
                      <p className="p" style={{ lineHeight: '1.6' }}>
                        Mentorship and peer connection improve decision quality.
                      </p>
                    </div>
                  </div>
                  {renderParagraph("> The takeaway is simple: people don't perform for fear—they perform for trust.", 'research-takeaway')}
                </aside>
              </section>

              {/* The Standard */}
              <section id="standard" ref={(el) => (sectionRefs.current.standard = el)} className="mb-16 scroll-mt-24">
                <h2 className="h2 mb-6">The Standard</h2>
                <p className="p mb-6" style={{ lineHeight: '1.6' }}>
                  Every leader leaves a wake.
                </p>
                <p className="p mb-6" style={{ lineHeight: '1.6' }}>
                  The goal isn't perfection—it's awareness.
                </p>
                <p className="p mb-6" style={{ lineHeight: '1.6' }}>
                  When I recognize the impact of my words, systems, and silence, I can steer differently.
                </p>
                {renderParagraph("> Leadership isn't about being in charge.", 'standard-quote1')}
                {renderParagraph("> It's about being responsible for what your influence creates.", 'standard-quote2')}
              </section>

              {/* Closing */}
              <section id="closing" ref={(el) => (sectionRefs.current.closing = el)} className="mb-16 scroll-mt-24">
                <h2 className="h2 mb-6">Closing</h2>
                <p className="p mb-6" style={{ lineHeight: '1.6' }}>
                  Servant leadership isn't a model; it's a mindset.
                </p>
                <p className="p mb-6" style={{ lineHeight: '1.6' }}>
                  It's what happens when responsibility meets compassion and execution meets humility.
                </p>
                <p className="p mb-6" style={{ lineHeight: '1.6' }}>
                  If that's the kind of leader you want to become—or rebuild to be—let's start the conversation.
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