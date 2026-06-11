/**
 * Consulting — rebuilt to match consulting-preview.html / cursor-consulting.md.
 * Advisory bridge uses the same wide content shell as other marketing subpages (no narrow centered stagger).
 *
 * Voice Guideline:
 * {
 *   "voice_guideline": {
 *     "default": "first-person singular",
 *     "exceptions": ["collaboration", "Archetype philosophy"],
 *     "owner": "Bart Paden"
 *   }
 * }
 */
import React from 'react';
import SEO from '../../components/SEO';
import SchemaJsonLd from '../../components/SchemaJsonLd';
import { buildServiceSchema } from '../../lib/schemaBuilders.js';

function navigateTo(path) {
  return (e) => {
    e.preventDefault();
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.scrollTo({ top: 0, behavior: 'instant' });
  };
}

function scrollToHowItWorks(e) {
  e.preventDefault();
  document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function SectionShell({ bgClassName = '', borderClassName = '', pyClassName, children }) {
  return (
    <section className={`w-full ${bgClassName} ${borderClassName}`}>
      <div className={`mx-auto max-w-[1200px] px-6 md:px-12 ${pyClassName}`}>{children}</div>
    </section>
  );
}

function EmDashRow({ children, borderClassName = 'border-[#F0EDE8]', textClassName = 'text-[#333]' }) {
  return (
    <li
      className={`relative border-b ${borderClassName} py-2 pl-6 font-sans text-[14px] leading-[1.65] ${textClassName} last:border-b-0`}
    >
      <span className="absolute left-0 font-bold text-ao-red">—</span>
      {children}
    </li>
  );
}

const HERO_OVERLAY =
  'linear-gradient(to right, rgba(43, 41, 41, 0.96) 0%, rgba(43, 41, 41, 0.92) 35%, rgba(43, 41, 41, 0.55) 60%, rgba(43, 41, 41, 0.10) 100%)';
const HERO_TEXTURE =
  'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.012) 2px, rgba(255,255,255,0.012) 4px)';

export default function Consulting() {
  const notItems = [
    'Theory or academic models applied generically',
    'Slide decks with buzzwords and no follow-through',
    'One-size-fits-all frameworks',
    'Advice from someone who has never led through pressure'
  ];

  const isItems = [
    "Honest assessment of what's actually happening",
    'Clarity on where misalignment exists and why',
    'Strategic guidance grounded in lived leadership and research',
    'Practical systems that support both people and performance',
    'Support through implementation — not just recommendations'
  ];

  const whoItems = [
    'Cultural drift or misalignment between stated values and actual behavior',
    'Leadership turnover or transition requiring stability and continuity',
    'Communication breakdowns creating confusion, friction, or distrust',
    'Accountability gaps that allow problems to persist without resolution',
    'Rapid growth exposing structural weaknesses or cultural fragility',
    'Team conflict rooted in unclear expectations or relational tension',
    'System failures where processes no longer serve the people using them',
    'Organizational health assessments before problems become crises'
  ];

  const differentItems = [
    'Leading organizations through growth, crisis, and cultural transformation',
    'Pattern recognition across industries, team dynamics, and leadership styles',
    'Deep study of psychology, neuroscience, communication, and organizational behavior',
    'Development of Culture Science and ALI as tools for assessing organizational health',
    'A posture of service, not superiority — clarity without ego'
  ];

  const howWorkShowsUpItems = [
    'One-on-one sessions with leadership',
    'Group seminars that put the whole room in the same conversation',
    'Keynote presentations that name what the organization has been feeling',
    'Team training that translates strategy into daily behavior',
    'Ongoing advisory presence until the alignment holds independently'
  ];

  const phases = [
    {
      title: 'Assessment',
      sub: "Understanding what's actually happening",
      body:
        "I begin by listening, observing, and asking the questions that reveal where drift, friction, or misalignment exists. This isn't theoretical. It's conversational, relational, and grounded in what leaders and teams are experiencing daily."
    },
    {
      title: 'Diagnosis',
      sub: 'Naming the real problem',
      body:
        "Most symptoms point to deeper structural, relational, or cultural issues. The diagnostic phase identifies root causes, not just surface-level friction. Leaders receive honest, direct insight into what's working, what's not, and why."
    },
    {
      title: 'Strategic Clarity',
      sub: 'Building a path forward',
      body:
        'Once the real problem is clear, we map a realistic path toward alignment. This includes communication redesign, accountability structures, leadership posture shifts, or cultural recalibration — whatever the organization actually needs.'
    },
    {
      title: 'Implementation Support',
      sub: 'Staying present through the work',
      body:
        'Recommendations mean nothing without follow-through. I stay engaged during implementation to ensure clarity holds, systems stabilize, and leaders have the support required to sustain momentum.'
    }
  ];

  return (
    <>
      <SEO pageKey="consulting" />
      <SchemaJsonLd
        schema={buildServiceSchema({
          name: 'Leadership Consulting',
          serviceType: 'Leadership Consulting',
          pageKey: 'consulting',
          path: '/consulting',
        })}
      />

      <div className="min-h-screen bg-white">
        {/* SECTION 1 — Hero */}
        <section
          className="relative flex min-h-[88vh] items-center bg-cover bg-[position:70%_center] bg-no-repeat md:bg-center"
          style={{ backgroundImage: "url('/images/ao-consulting-hero-01.jpg')" }}
        >
          <div className="pointer-events-none absolute inset-0 z-[1]" style={{ background: HERO_OVERLAY }} />
          <div
            className="pointer-events-none absolute inset-0 z-[2]"
            style={{ backgroundImage: HERO_TEXTURE }}
          />
          <div className="relative z-[3] max-w-[580px] px-6 py-12 md:px-16 md:py-20">
            <p className="mb-4 font-sans text-[10px] uppercase tracking-[0.2em] text-ao-brown">Archetype Original</p>
            <p className="mb-5 font-sans text-[13px] tracking-[0.04em] text-ao-midGray">Consulting</p>
            <h1 className="mb-5 max-w-[520px] font-serif text-[clamp(28px,7vw,36px)] font-normal italic leading-[1.06] text-[#F0ECE4] md:text-[clamp(32px,3.8vw,48px)]">
              Real solutions for real organizations.
            </h1>
            <p className="mb-9 max-w-[440px] font-sans text-[16px] leading-[1.7] text-ao-midGray">
              No frameworks. No fluff. Just clarity, alignment, and the work required to move forward.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-3.5">
              <a
                href="/engagement-inquiry"
                onClick={navigateTo('/engagement-inquiry')}
                className="inline-flex min-h-[44px] w-full items-center justify-center rounded-[3px] bg-ao-red px-7 py-3.5 text-center font-sans text-[13px] font-bold tracking-[0.04em] text-white transition-opacity hover:opacity-90 sm:w-auto"
              >
                Start a Conversation
              </a>
              <a
                href="#how-it-works"
                onClick={scrollToHowItWorks}
                className="inline-flex min-h-[44px] w-full items-center justify-center rounded-[3px] border border-[#3A3028] bg-transparent px-7 py-3.5 text-center font-sans text-[13px] text-[#C8B8A8] transition-colors hover:border-[#5a4d42] sm:w-auto"
              >
                How it works
              </a>
            </div>
          </div>
        </section>

        {/* SECTION 2 — What consulting is */}
        <SectionShell bgClassName="border-b border-[#E0DBD4] bg-white" pyClassName="py-16 md:py-20">
          <p className="mb-3.5 font-sans text-[10px] uppercase tracking-[0.2em] text-ao-red">What consulting is</p>
          <h2 className="mb-5 max-w-[560px] font-serif text-[32px] font-normal leading-[1.15] text-[#1a1a1a]">
            Most organizations don&apos;t fail for lack of talent. They fail because things drift.
          </h2>
          <p className="mb-4 max-w-[700px] font-sans text-[15px] leading-[1.75] text-[#444]">
            Most consulting engagements begin with surface-level symptoms — missed deadlines, unclear roles, communication
            friction, leadership misalignment. The actual problem usually lives deeper: drift between stated values and
            operational reality, eroded trust, inconsistent accountability, or a culture shaped by reaction instead of
            intention.
          </p>
          <p className="mb-6 max-w-[700px] font-sans text-[15px] leading-[1.75] text-[#444]">
            Organizations rarely fail for lack of talent or ambition. They fail because systems, communication, and
            leadership slowly drift out of alignment — and by the time leaders notice, the symptoms are everywhere.
            Consulting, done right, doesn&apos;t just fix the symptoms. It addresses the source.
          </p>
          <p className="mb-9 max-w-[640px] border-l-[3px] border-ao-red pl-5 font-serif text-[18px] italic leading-[1.6] text-[#333]">
            The work isn&apos;t about what sounds good in a boardroom. It&apos;s about what actually works inside the
            organization people experience every day.
          </p>

          <div className="mb-7 grid grid-cols-1 gap-10 md:grid-cols-2 md:gap-12">
            <div>
              <p className="mb-4 font-sans text-[10px] uppercase tracking-[0.16em] text-ao-midGray">It is not</p>
              <ul className="list-none">
                {notItems.map((t) => (
                  <EmDashRow key={t}>{t}</EmDashRow>
                ))}
              </ul>
            </div>
            <div>
              <p className="mb-4 font-sans text-[10px] uppercase tracking-[0.16em] text-ao-midGray">It is</p>
              <ul className="list-none">
                {isItems.map((t) => (
                  <EmDashRow key={t}>{t}</EmDashRow>
                ))}
              </ul>
            </div>
          </div>
          <p className="max-w-[640px] font-sans text-[14px] font-bold text-[#1a1a1a]">
            Every engagement is tailored to the real conditions inside your organization. There are no templates. There is
            only truth, clarity, and the commitment to see the work through.
          </p>
        </SectionShell>

        {/* SECTION 3 — Who it serves */}
        <SectionShell bgClassName="bg-ao-cream" pyClassName="py-16 md:py-20">
          <p className="mb-3.5 font-sans text-[10px] uppercase tracking-[0.2em] text-ao-red">Who it serves</p>
          <h2 className="mb-5 max-w-[560px] font-serif text-[32px] font-normal leading-[1.15] text-[#1a1a1a]">
            Organizations navigating the moments that matter most.
          </h2>
          <p className="mb-6 font-sans text-[15px] leading-[1.7] text-[#555]">
            Consulting supports leadership teams, departments, and entire organizations navigating:
          </p>
          <ul className="mb-6 max-w-[760px] list-none">
            {whoItems.map((t) => (
              <li
                key={t}
                className="relative border-b border-[#D4D0CA] py-3 pl-6 font-sans text-[15px] leading-[1.65] text-[#333] last:border-b-0"
              >
                <span className="absolute left-0 font-bold text-ao-red">—</span>
                {t}
              </li>
            ))}
          </ul>
          <p className="mt-5 font-sans text-[14px] font-bold text-[#1a1a1a]">
            Whether the work is reactive or proactive, consulting provides clarity, alignment, and the practical steps
            required to move forward with confidence.
          </p>
        </SectionShell>

        <hr className="border-0 border-t border-[#E0DBD4]" />

        {/* SECTION 4 — How it works */}
        <section id="how-it-works" className="w-full bg-white">
          <div className="mx-auto max-w-[1200px] px-6 py-16 md:px-12 md:py-20">
            <p className="mb-3.5 font-sans text-[10px] uppercase tracking-[0.2em] text-ao-red">How it works</p>
            <h2 className="mb-9 font-serif text-[32px] font-normal leading-[1.15] text-[#1a1a1a]">
              Every engagement is adaptive. Most follow a similar rhythm.
            </h2>
            <p className="mb-9 max-w-[640px] font-sans text-[15px] leading-[1.7] text-[#555]">
              Every consulting engagement is adaptive, but most follow a similar rhythm:
            </p>

            <div className="max-w-[760px] space-y-0">
              {phases.map((ph, i) => (
                <div
                  key={ph.title}
                  className={`border-[#E0DBD4] py-6 ${i < phases.length - 1 ? 'border-b' : ''}`}
                >
                  <div className="mb-2.5 flex flex-wrap items-baseline gap-x-4 gap-y-1">
                    <span className="font-serif text-[18px] font-normal text-[#1a1a1a]">{ph.title}</span>
                    <span className="font-sans text-[13px] text-ao-midGray">— {ph.sub}</span>
                  </div>
                  <p className="max-w-[700px] font-sans text-[15px] leading-[1.75] text-[#444]">{ph.body}</p>
                </div>
              ))}
            </div>

            <p className="mt-7 max-w-[640px] border-l-[3px] border-ao-red pl-5 font-sans text-[15px] italic leading-relaxed text-[#555]">
              Consulting isn&apos;t a one-time fix. It&apos;s the scaffolding that helps organizations rebuild strength from the
              inside out.
            </p>
          </div>
        </section>

        {/* SECTION 5 — What makes this different */}
        <section className="w-full bg-ao-dark py-16 md:py-[88px]">
          <div className="mx-auto grid max-w-[1200px] grid-cols-1 items-center gap-10 px-6 md:grid-cols-[1fr_340px] md:gap-[72px] md:px-12">
            <div className="order-2 md:order-1">
              <p className="mb-3.5 font-sans text-[10px] uppercase tracking-[0.2em] text-ao-brown">
                What makes this different
              </p>
              <h2 className="mb-6 font-serif text-[32px] font-normal leading-[1.15] text-[#F0ECE4]">
                I don&apos;t arrive with a model. I arrive with experience.
              </h2>
              <p className="mb-4 font-sans text-[15px] leading-[1.78] text-[#C8C0B4]">
                Most consultants bring frameworks built elsewhere and hope they fit. Thirty-three years of lived
                leadership — building companies, leading teams through collapse and recovery, navigating pressure, and
                understanding how culture actually responds to leadership behavior.
              </p>
              <p className="mb-4 font-sans text-[15px] leading-[1.78] text-[#C8C0B4]">The foundation of this work includes:</p>
              <ul className="mb-6 max-w-[640px] list-none">
                {differentItems.map((t) => (
                  <EmDashRow key={t} borderClassName="border-[#3a3636]" textClassName="text-[#C8C0B4]">
                    {t}
                  </EmDashRow>
                ))}
              </ul>
              <p className="border-l-[3px] border-ao-red pl-4 font-serif text-[17px] italic leading-[1.6] text-[#E8E0D4]">
                I don&apos;t arrive with a model. I arrive with experience, honesty, and the ability to see what leaders are
                too close to notice.
              </p>
            </div>
            <div className="order-1 md:order-2">
              <div className="aspect-[4/3] w-full overflow-hidden md:aspect-[3/4]">
                <img
                  src="/images/ao-bp-standing-table.jpg"
                  alt="Bart Paden, founder of Archetype Original"
                  loading="lazy"
                  className="h-full w-full object-cover object-center"
                />
              </div>
            </div>
          </div>
        </section>

        {/* How the work shows up — before Advisory bridge (cursor-consulting-addition.md) */}
        <section id="how-work-shows-up" className="w-full bg-ao-cream scroll-mt-24">
          <div className="mx-auto grid max-w-[1200px] grid-cols-1 items-start gap-10 px-6 py-12 md:grid-cols-2 md:gap-[72px] md:px-12 md:py-20">
            <div>
              <p className="mb-3.5 font-sans text-[10px] uppercase tracking-[0.2em] text-ao-red">
                How the work shows up
              </p>
              <h2 className="mb-5 font-serif text-[32px] font-normal leading-[1.15] text-[#1a1a1a]">
                The format follows what the organization needs.
              </h2>
              <p className="mb-3.5 font-sans text-[15px] leading-[1.78] text-[#444]">
                How the work shows up looks different for every organization. Sometimes it&apos;s a series of one-on-one
                sessions with the leadership team. Sometimes it&apos;s a seminar that puts the whole room in the same
                conversation at the same time. Sometimes it&apos;s a keynote that names what everyone in the building has
                been feeling but nobody has said out loud. Sometimes it&apos;s ongoing presence — showing up week after week
                until the alignment holds on its own.
              </p>
              <p className="mb-0 font-sans text-[15px] leading-[1.78] text-[#444]">
                The format is never the point. The format follows what the organization actually needs to move.
              </p>
            </div>
            <div className="max-w-[760px] md:justify-self-end md:max-w-none">
              <ul className="list-none">
                {howWorkShowsUpItems.map((t, idx) => (
                  <li
                    key={t}
                    className={`relative border-[#D4D0CA] py-3 pl-6 font-sans text-[14px] leading-[1.65] text-[#333] ${
                      idx < howWorkShowsUpItems.length - 1 ? 'border-b' : ''
                    }`}
                  >
                    <span className="absolute left-0 font-bold text-ao-red">—</span>
                    {t}
                  </li>
                ))}
              </ul>
              <p className="mt-0 border-t border-[#D4D0CA] pt-4 font-sans text-[13px] italic leading-[1.65] text-ao-brown">
                Whatever shape the engagement takes, the contract is the same. Consulting. Not a speaking contract. Not a
                seminar fee. Not a training package. One engagement, built around what your organization needs, delivered
                however that work needs to arrive.
              </p>
            </div>
          </div>
        </section>

        {/* SECTION 6 — Advisory bridge (1200px shell — aligned with page grid) */}
        <SectionShell bgClassName="bg-white" borderClassName="border-t border-[#E0DBD4]" pyClassName="py-16 md:py-[72px]">
          <p className="mb-3.5 font-sans text-[10px] uppercase tracking-[0.2em] text-ao-red">Advisory path</p>
          <h2 className="mb-3 font-serif text-[28px] font-normal leading-snug text-[#1a1a1a]">
            When methods are not the missing piece.
          </h2>
          <p className="mb-6 max-w-[600px] font-sans text-[15px] leading-[1.72] text-[#555]">
            Consulting addresses what happens inside the system. Advisory is for the conversation that cannot happen there —
            outside your organization, where consequence doesn&apos;t follow what you say.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <a
              href="/advisory"
              onClick={navigateTo('/advisory')}
              className="inline-flex min-h-[44px] items-center justify-center rounded-[3px] bg-ao-red px-6 py-3 text-[13px] font-bold text-white transition-opacity hover:opacity-90"
            >
              How advisory works
            </a>
            <a
              href="/engagement-inquiry"
              onClick={navigateTo('/engagement-inquiry')}
              className="inline-flex min-h-[44px] items-center justify-center rounded-[3px] border border-[#ccc] bg-transparent px-6 py-3 text-[13px] font-medium text-ao-dark transition-colors hover:border-ao-dark"
            >
              Explore working together
            </a>
          </div>
        </SectionShell>

        {/* SECTION 7 — Footer CTA */}
        <section className="w-full bg-ao-dark px-6 py-20 text-center md:px-12 md:py-24">
          <h2 className="mx-auto mb-3 max-w-[640px] font-serif text-[clamp(26px,3vw,36px)] font-normal italic leading-snug text-[#F0ECE4]">
            If your organization needs clarity, let&apos;s talk.
          </h2>
          <p className="mx-auto mb-7 max-w-[480px] font-sans text-[15px] leading-[1.65] text-ao-brown">
            Whether you&apos;re addressing cultural drift, navigating a leadership transition, or strengthening what&apos;s
            already working — the conversation starts here.
          </p>
          <a
            href="/engagement-inquiry"
            onClick={navigateTo('/engagement-inquiry')}
            className="inline-flex min-h-[44px] items-center justify-center rounded-[3px] bg-ao-red px-8 py-3.5 text-[13px] font-bold tracking-[0.04em] text-white transition-opacity hover:opacity-90"
          >
            Start a Conversation
          </a>
        </section>
      </div>
    </>
  );
}
