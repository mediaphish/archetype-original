/**
 * Scoreboard Leadership (Culture Science Anti-Project).
 * Layout + copy: scoreboard-leadership-preview.html & cursor-scoreboard-leadership.md
 */
import React from 'react';
import SEO from '../../components/SEO';

function go(path) {
  return (e) => {
    e.preventDefault();
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.scrollTo({ top: 0, behavior: 'instant' });
  };
}

const sectionLabel = 'block text-[11px] font-semibold uppercase tracking-[0.16em] text-ao-brown';
const inner = 'mx-auto w-full max-w-[1400px] px-6 py-24 sm:px-10 md:px-10';

/** Red dash row (not a bullet list; matches preview pseudo-element) */
function DashLine({ children, dark }) {
  return (
    <div
      className={`relative pl-4 text-sm leading-relaxed ${
        dark ? 'text-white/65' : 'text-warm-grey'
      }`}
    >
      <span className="absolute left-0 top-[10px] h-px w-[5px] bg-ao-red" aria-hidden />
      {children}
    </div>
  );
}

const servantProduces = [
  'Clarity over confusion',
  'Trust over compliance',
  'Ownership over dependency',
  'Long-term stability over short-term spikes',
  'People who stay and grow',
];

const scoreboardProduces = [
  'Pressure over purpose',
  'Fear over candor',
  'Compliance over commitment',
  'Velocity spikes followed by collapse',
  'People who leave and warn others',
];

const symptoms = [
  {
    title: 'KPI Theater',
    body: (
      <>
        The metrics look great. The experience doesn&apos;t match. Teams optimize for the number on the dashboard
        instead of the outcome it was supposed to represent. The score becomes the product.
      </>
    ),
    solution: 'Score service: NPS by team, on-time handoffs, first-time quality. Measure what improves service, not what flatters leadership.',
  },
  {
    title: 'Top-Down Pressure Cycles',
    body: (
      <>
        Urgency gets manufactured from the top and absorbed by the bottom. Deadlines pile up without context.
        People are moving fast but nobody is sure in the right direction. Pressure replaces clarity as the operating
        fuel.
      </>
    ),
    solution: 'Servant standards with owner-operators and weekly inspect-and-improve. Clear roles replace manufactured urgency.',
  },
  {
    title: 'Prestige Over People',
    body: (
      <>
        Individual wins get celebrated. Team health gets ignored. The highest-visibility performers are rewarded
        regardless of how they got there. Collaboration quietly dies because nobody gets credit for it.
      </>
    ),
    solution: 'Reward maintenance wins, cross-team assists, and clean handoffs. Turn team health into outcomes instead of individual heroics.',
  },
  {
    title: 'Churn Masked by Hype',
    body: (
      <>
        The energy in the room feels high. But good people keep leaving. The exits get explained away one at a time,
        never connected, never examined as a pattern. By the time the pattern is obvious, the institutional knowledge is
        already out the door.
      </>
    ),
    solution: 'Track role tenure, cross-training depth, and regretted attrition. Surface what the scoreboard is hiding.',
  },
  {
    title: 'Hero Dependency',
    body: (
      <>
        One or two people hold everything together. When they are out, things fall apart. The organization has confused
        individual heroics with operational health. The hero is exhausted. The system is fragile.
      </>
    ),
    solution: 'One-page plays with backups and rituals that survive PTO and turnover. Build systems that don&apos;t require superhumans.',
  },
  {
    title: 'Busy Over Outcomes',
    body: (
      <>
        The team is always working. Nobody is sure what they are working toward. Activity replaces accountability.
        Meetings beget meetings. The calendar is full and the needle isn&apos;t moving.
      </>
    ),
    solution: 'One page, one owner, one outcome per initiative. Inspect weekly. Clarity replaces activity as the standard.',
  },
  {
    title: 'Vanity Pipeline',
    body: (
      <>
        The pipeline looks impressive on a slide. Qualification is loose. Kill criteria don&apos;t exist. Deals that
        should be cut stay alive because closing them would hurt the number. The pipeline flatters leadership instead of
        serving the business.
      </>
    ),
    solution: 'Qualify for fit. Publish kill criteria. Celebrate strategic no calls. The pipeline serves the mission, not the scoreboard.',
  },
  {
    title: 'Meeting Fog',
    body: (
      <>
        Every meeting ends with more questions than it started with. No decisions. No owners. No next moves.
        Information gets shared but nothing gets resolved. The calendar is full of conversations that never convert to
        action.
      </>
    ),
    solution: 'Agenda to output to owner. Daily 10-minute huddles that ship decisions. Every meeting ends with a clear next move and a name on it.',
  },
];

const standards = [
  {
    title: 'People Over Optics',
    body: 'We measure what improves service, not what flatters leadership. The metric serves the mission, not the other way around.',
  },
  {
    title: 'Owner Standard',
    body: 'Single-point ownership with freedom in method and clarity in outcomes. Every initiative has a name on it.',
  },
  {
    title: 'Honest Rhythms',
    body: 'Short, frequent inspect-and-improve cycles replace performative meetings. Cadence creates accountability without pressure.',
  },
  {
    title: 'One-Page Plays',
    body: 'Every effort fits on one page: purpose, owner, steps, risks, next review. If it cannot be explained simply, it cannot be executed consistently.',
  },
  {
    title: 'Service Prestige',
    body: 'We celebrate assists, clean handoffs, and maintenance wins as headline achievements. The team wins together or not at all.',
  },
  {
    title: 'Compounding Culture',
    body: 'Decisions favor long-term trust and repeatability over short-term theatrics. What we build today determines what we can sustain tomorrow.',
  },
];

export default function ScoreboardLeadership() {
  return (
    <>
      <SEO pageKey="scoreboard-leadership" />
      <div className="min-h-screen bg-[#FAFAF9] font-inter text-[15px] leading-[1.75] text-[#1A1A1A] antialiased">
        {/* Hero */}
        <section className="border-b border-[#1A1A1A]/[0.08] bg-white px-6 pb-[60px] pt-20 sm:px-10 md:px-10">
          <div className="mx-auto max-w-[1400px]">
            <p className={`${sectionLabel} mb-6`}>Anti-Project · Culture Science</p>
            <h1 className="max-w-[800px] font-playfair text-[clamp(3rem,6vw,5.5rem)] font-normal leading-none text-[#1A1A1A]">
              Scoreboard Leadership
            </h1>
            <p className="mt-8 max-w-[560px] text-lg leading-[1.75] text-warm-grey">
              When leadership becomes a game to win instead of a mission to serve, everyone eventually loses.
            </p>
            <div className="mt-12 flex flex-wrap gap-4">
              <a
                href="/engagement-inquiry"
                onClick={go('/engagement-inquiry')}
                className="inline-block bg-ao-red px-8 py-3.5 text-xs font-semibold uppercase tracking-[0.06em] text-white transition-opacity hover:opacity-90"
              >
                Start a Conversation
              </a>
              <a
                href="https://scoreboardleadership.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block border border-[#1A1A1A]/20 px-8 py-3.5 text-xs font-semibold uppercase tracking-[0.06em] text-[#1A1A1A] transition-colors hover:border-[#1A1A1A]"
              >
                ScoreboardLeadership.com
              </a>
            </div>
          </div>
        </section>

        {/* Definition */}
        <section className="bg-white">
          <div className={`${inner} py-24 sm:py-28`}>
            <div className="grid grid-cols-1 items-start gap-16 lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-[100px]">
              <div className="lg:sticky lg:top-[88px]">
                <span className={sectionLabel}>Definition</span>
                <h2 className="mt-5 font-playfair text-[clamp(1.75rem,2.5vw,2.375rem)] font-normal leading-tight text-[#1A1A1A]">
                  What Scoreboard Leadership actually is.
                </h2>
                <p className="mt-6 text-sm leading-[1.75] text-warm-grey">
                  A diagnostic framework for one of the most common and most damaging leadership patterns in small and
                  mid-sized organizations.
                </p>
              </div>
              <div className="min-w-0 space-y-6 text-[15px] leading-[1.85] text-[#3A3A3A]">
                <p>Scoreboard Leadership is what happens when winning becomes the only thing that matters.</p>
                <p>Not winning for the team. Not winning for the customer. Winning for the score.</p>
                <p>
                  Metrics get weaponized. Compliance replaces commitment. People stop being people and start being inputs.
                  The number on the board becomes the standard and anyone not adding to it becomes a liability. Velocity
                  spikes. Morale quietly erodes. The best people start doing the math on whether it is worth staying.
                </p>
                <p>
                  It looks like high performance from the outside. From the inside it feels like pressure without purpose,
                  accountability without dignity, and results without trust.
                </p>
                <p>
                  This is not a leadership style. It is a leadership operating system built on the wrong foundation and it
                  compounds in the wrong direction. Every quarter that runs this way makes the next one harder. The culture
                  you are burning through takes years to rebuild. The people you are losing take institutional knowledge with
                  them that no hire can replace.
                </p>
                <p>
                  The antidote is not anti-measurement. Measurement matters. The antidote is servant-led standards: clear
                  roles, honest rhythms, and leaders who carry the cost instead of pushing it down to the people doing the
                  work.
                </p>
                <p className="mt-2 border-l-2 border-ao-red pl-5 font-playfair text-lg italic leading-snug text-[#1A1A1A]">
                  Scoreboard Leadership names the disease. Archetype Original installs the cure.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Golden Rule Contrast */}
        <section className="bg-ao-cream">
          <div className={`${inner} py-24 sm:py-28`}>
            <div className="grid grid-cols-1 items-start gap-16 lg:grid-cols-2 lg:gap-20">
              <div>
                <span className={sectionLabel}>The Golden Rule Contrast</span>
                <h2 className="mt-5 font-playfair text-[clamp(1.75rem,3vw,2.625rem)] font-normal leading-tight text-[#1A1A1A]">
                  Scoreboard Leadership fails for one reason. It violates the most reliable leadership principle ever
                  written.
                </h2>
                <p className="mt-8 text-[15px] leading-[1.85] text-[#3A3A3A]">
                  When you treat people the way you want to be treated, you naturally create clarity, trust,
                  responsibility, alignment, and stability. You lead with the same expectations and honesty you would want
                  from someone above you.
                </p>
                <p className="mt-6 text-[15px] leading-[1.85] text-[#3A3A3A]">
                  Scoreboard Leadership cannot coexist with that. You cannot use people to chase metrics and simultaneously
                  treat them the way you would want to be treated. One builds people. The other uses them. The difference
                  shows up quickly, in culture, in morale, and in outcomes.
                </p>
              </div>
              <div className="flex flex-col gap-0.5 pt-2">
                <div className="bg-white p-8">
                  <span className="mb-4 block text-[11px] font-bold uppercase tracking-[0.16em] text-ao-brown">
                    Servant Leadership Produces
                  </span>
                  <div className="flex flex-col gap-2.5">
                    {servantProduces.map((t) => (
                      <DashLine key={t}>{t}</DashLine>
                    ))}
                  </div>
                </div>
                <div className="bg-ao-dark p-8">
                  <span className="mb-4 block text-[11px] font-bold uppercase tracking-[0.16em] text-ao-brown">
                    Scoreboard Leadership Produces
                  </span>
                  <div className="flex flex-col gap-2.5">
                    {scoreboardProduces.map((t) => (
                      <DashLine key={t} dark>
                        {t}
                      </DashLine>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Symptoms */}
        <section className="bg-[#FAFAF9]">
          <div className={`${inner} py-24 sm:py-28`}>
            <div className="mb-16 max-w-[680px]">
              <span className={sectionLabel}>Symptoms and Solutions</span>
              <h2 className="mt-5 font-playfair text-[clamp(1.75rem,3vw,2.625rem)] font-normal leading-tight text-[#1A1A1A]">
                What it looks like inside the organization. And what replaces it.
              </h2>
              <p className="mt-4 text-[15px] leading-[1.75] text-warm-grey">
                These symptoms show up in healthy organizations led by capable people. They are not signs of bad intent.
                They are signs of a system running on the wrong operating principles.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-0.5 md:grid-cols-2">
              {symptoms.map((s) => (
                <div key={s.title} className="bg-white p-10">
                  <span className="mb-2.5 block text-[11px] font-bold uppercase tracking-[0.16em] text-ao-red">
                    Symptom
                  </span>
                  <h3 className="mb-4 font-playfair text-xl font-normal text-[#1A1A1A]">{s.title}</h3>
                  <p className="mb-4 text-sm leading-[1.7] text-[#3A3A3A]">{s.body}</p>
                  <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.12em] text-ao-brown">
                    Solution
                  </span>
                  <p className="text-sm leading-[1.7] text-warm-grey">{s.solution}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Servant Standards */}
        <section className="bg-ao-dark">
          <div className={`${inner} py-24 sm:py-28`}>
            <div className="mb-16 max-w-[600px]">
              <span className={`${sectionLabel} text-ao-brown`}>Servant Standards</span>
              <h2 className="mt-5 font-playfair text-[clamp(1.75rem,3vw,2.625rem)] font-normal leading-tight text-white">
                The principles that replace Scoreboard Leadership.
              </h2>
              <p className="mt-4 text-[15px] leading-[1.75] text-white/60">
                These are not aspirational values. They are operational standards. The actual behaviors and systems that
                produce a healthier operating environment.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-0.5 md:grid-cols-2 lg:grid-cols-3">
              {standards.map((st) => (
                <div
                  key={st.title}
                  className="border border-white/[0.06] bg-white/[0.04] p-10"
                >
                  <h3 className="mb-3 font-playfair text-xl font-normal text-white">{st.title}</h3>
                  <p className="text-sm leading-[1.7] text-white/60">{st.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Diagnosis to Delivery */}
        <section className="bg-white">
          <div className={`${inner} py-24 sm:py-28`}>
            <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-2 lg:gap-20">
              <div>
                <span className={sectionLabel}>From Diagnosis to Delivery</span>
                <h2 className="mt-5 font-playfair text-[clamp(1.75rem,3vw,2.625rem)] font-normal leading-tight text-[#1A1A1A]">
                  Scoreboard Leadership names the dysfunction. Archetype Original installs the cure.
                </h2>
                <p className="mt-6 text-[15px] leading-[1.85] text-[#3A3A3A]">
                  This is a diagnostic lens under Archetype Original. The conversation that cannot happen here, outside your
                  organization, where consequence disappears, is where the work actually starts. That conversation happens
                  in the advisory room.
                </p>
                <div className="mt-8 flex flex-wrap gap-4">
                  <a
                    href="/engagement-inquiry"
                    onClick={go('/engagement-inquiry')}
                    className="inline-block bg-ao-red px-8 py-3.5 text-xs font-semibold uppercase tracking-[0.06em] text-white transition-opacity hover:opacity-90"
                  >
                    Start a Conversation
                  </a>
                  <a
                    href="/advisory"
                    onClick={go('/advisory')}
                    className="inline-block border border-[#1A1A1A]/20 px-8 py-3.5 text-xs font-semibold uppercase tracking-[0.06em] text-[#1A1A1A] transition-colors hover:border-[#1A1A1A]"
                  >
                    How Advisory Works
                  </a>
                </div>
              </div>
              <div className="flex flex-col gap-0.5">
                {[
                  { num: '2-4', label: 'Quarters to measurable change' },
                  { num: '1', label: 'Conversation to start' },
                  { num: '0', label: 'Frameworks required to begin' },
                ].map((row) => (
                  <div key={row.label} className="bg-[#FAFAF9] px-10 py-8">
                    <div className="font-playfair text-5xl font-normal leading-none text-[#1A1A1A]">{row.num}</div>
                    <div className="mt-2 text-[13px] font-medium uppercase tracking-[0.06em] text-warm-grey">{row.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Close */}
        <section className="bg-ao-dark px-6 py-24 text-center sm:px-10 md:px-10">
          <div className="mx-auto max-w-[640px]">
            <span className={`${sectionLabel} mx-auto text-ao-brown`}>If You&apos;re Running This Pattern</span>
            <h2 className="mx-auto mt-5 max-w-[640px] font-playfair text-[clamp(2rem,4vw,3.25rem)] font-normal leading-[1.15] text-white">
              The conversation starts here. Not with a framework. With honesty.
            </h2>
            <p className="mx-auto mt-6 max-w-[480px] text-base leading-[1.75] text-white/65">
              Scoreboard Leadership is diagnosable. It is fixable. The first step is a conversation outside your system,
              where you can finally say what you are actually seeing.
            </p>
            <div className="mt-11 flex flex-wrap justify-center gap-4">
              <a
                href="/engagement-inquiry"
                onClick={go('/engagement-inquiry')}
                className="inline-block bg-ao-red px-8 py-3.5 text-xs font-semibold uppercase tracking-[0.06em] text-white transition-opacity hover:opacity-90"
              >
                Start a Conversation
              </a>
              <a
                href="/advisory"
                onClick={go('/advisory')}
                className="inline-block border border-white/30 px-8 py-3.5 text-xs font-semibold uppercase tracking-[0.06em] text-white/80 transition-colors hover:border-white/70 hover:text-white"
              >
                How Advisory Works
              </a>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
