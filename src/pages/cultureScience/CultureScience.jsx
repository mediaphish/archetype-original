/**
 * Culture Science — discipline landing (research, reality, responsibility).
 * Layout and copy aligned with culture-science preview + cursor-culture-science.md
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

const sectionLabel = 'text-[11px] font-semibold uppercase tracking-[0.16em] text-ao-brown';
const body = 'text-[15px] leading-[1.75] text-warm-grey';
const h2 = 'font-playfair text-[clamp(1.75rem,3.5vw,3rem)] font-normal leading-tight text-[#1A1A1A]';

export default function CultureScience() {
  return (
    <>
      <SEO pageKey="culture-science" />
      <div className="min-h-screen bg-[#FAFAF9] font-inter text-[#1A1A1A] antialiased">
        {/* Hero */}
        <section className="relative flex min-h-[88vh] items-end overflow-hidden">
          <div
            className="absolute inset-0 bg-cover bg-[center_30%]"
            style={{ backgroundImage: "url('/images/bart-culture-science-hero.jpg')" }}
            aria-hidden
          />
          <div
            className="absolute inset-0 bg-gradient-to-r from-[rgba(26,26,26,0.92)] via-[rgba(26,26,26,0.55)] to-transparent"
            aria-hidden
          />
          <div className="relative z-10 mx-auto w-full max-w-[1600px] px-6 pb-16 pt-28 sm:px-10 md:px-14 lg:pb-24">
            <div className="max-w-xl text-white">
              <p className={`${sectionLabel} mb-4 text-white/70`}>Culture Science · Archetype Original</p>
              <h1 className="font-playfair text-4xl font-normal leading-[1.1] tracking-tight sm:text-5xl md:text-6xl">
                Where leadership, behavioral research, and lived experience converge.
              </h1>
              <p className="mt-6 text-[15px] leading-[1.75] text-white/80">
                Most leaders never measure the thing that drives everything else. Not performance. Not output.
                The conditions that make performance and output possible: clarity, consistency, trust, communication,
                alignment, stability, and drift. Culture Science exists to make those measurable.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <a
                  href="/culture-science/ali"
                  onClick={go('/culture-science/ali')}
                  className="inline-flex items-center rounded-[2px] bg-ao-red px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.08em] text-white transition-opacity hover:opacity-90"
                >
                  Explore ALI
                </a>
                <a
                  href="/engagement-inquiry"
                  onClick={go('/engagement-inquiry')}
                  className="inline-flex items-center rounded-[2px] border border-white px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.08em] text-white transition-colors hover:bg-white/10"
                >
                  Start a Conversation
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* What Culture Science Is */}
        <section className="bg-white py-16 md:py-24">
          <div className="mx-auto grid max-w-[1600px] items-start gap-16 px-6 sm:px-10 md:grid-cols-[minmax(260px,300px)_1fr] md:gap-24 md:px-14 lg:gap-[100px]">
            <div className="md:sticky md:top-24">
              <p className={sectionLabel}>What Culture Science Is</p>
              <h2 className={`${h2} mt-3`}>Research. Reality. Responsibility.</h2>
              <div className="mt-6 border-t border-black/10 pt-6">
                <p className="font-playfair text-[15px] italic leading-snug text-[#1A1A1A]">
                  Culture Science = Research + Reality + Responsibility
                </p>
                <p className="mt-3 text-[13px] leading-relaxed text-warm-grey">
                  That equation is what every word written here, every tool built here, and every conversation that
                  comes from this work is grounded in.
                </p>
              </div>
            </div>
            <div className={`space-y-6 ${body}`}>
              <p>
                Culture Science is a discipline, not a survey platform, not a consulting methodology, not an
                engagement tool. It is a systematic way of measuring what most organizations never measure and
                seeing what most leaders never see.
              </p>
              <p>It was built at the intersection of three things that rarely sit in the same room.</p>

              <div className="border-t border-black/[0.08] py-8 first:pt-0">
                <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.16em] text-ao-red">Research</p>
                <p>
                  Decades of behavioral science, trust psychology, psychological safety studies, and leadership
                  neuroscience. The work of Edmondson, Zak, Gallup, and hundreds of studies across organizational
                  behavior and human performance. The evidence is clear and consistent: leaders who create clarity,
                  trust, and consistency unlock the best in their teams. Cultures that withhold those things pay for
                  it slowly, invisibly, expensively.
                </p>
              </div>
              <div className="border-t border-black/[0.08] py-8">
                <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.16em] text-ao-red">Reality</p>
                <p>
                  Thirty-three years of building and leading companies across more than twelve industries. Not
                  studying what culture does. Being responsible for it. Watching it hold under pressure and watching
                  it fracture when the conditions that sustain it went unattended. That lived experience is not
                  separate from the research. It is what makes the research useful. Culture Science is the backbone
                  behind every word written, every framework built, and every room entered.
                </p>
              </div>
              <div className="border-b border-t border-black/[0.08] py-8">
                <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.16em] text-ao-red">Responsibility</p>
                <p>
                  The commitment to measure what actually matters, not sentiment, not personality, not engagement as a
                  proxy for health, and to give leaders the honest picture their internal rooms will never produce on
                  their own. Every time. Without exception. That responsibility does not change based on what is
                  convenient or comfortable.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* The Foundation */}
        <section className="bg-[#FAFAF9] py-16 md:py-24">
          <div className="mx-auto max-w-[1600px] px-6 sm:px-10 md:px-14">
            <div className="mb-12 max-w-[680px] md:mb-16">
              <p className={sectionLabel}>The Foundation</p>
              <h2 className={`${h2} mt-3`}>
                This isn&apos;t built on opinion. The research is extensive, consistent, and points in one direction.
              </h2>
              <p className={`mt-6 ${body}`}>
                Culture Science synthesizes decades of research across organizational psychology, neuroscience, trust
                physiology, and behavioral economics. Five core findings drive everything built here, and they all
                point toward the same conclusion: what leaders do to the conditions around their people determines
                almost everything else.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-0.5 md:grid-cols-2">
              {[
                {
                  n: '01',
                  t: 'People need real safety to tell the truth.',
                  p: 'Teams that feel safe to speak up, ask questions, and challenge ideas learn faster and perform better. Psychological safety is one of the strongest predictors of team learning, innovation, and adaptability. Without it, leaders make decisions with filtered information, and pay for it later.',
                  href: 'https://www.hbs.edu/faculty/Publication%20Files/98-066_4446b0b4-2615-46df-8a2e-5f1e9bcfbd54.pdf',
                  lab: 'Edmondson, Psychological Safety and Learning Behavior in Work Teams'
                },
                {
                  n: '02',
                  t: 'Healthy cultures balance demands with support.',
                  p: 'The Job Demands-Resources model shows that chronic overload without support drains motivation and leads to burnout. When expectations, resources, autonomy, and feedback are aligned, people stay engaged and energized. When they are not, people survive instead of contribute.',
                  href: 'https://www.wilmarschaufeli.nl/publications/Schaufeli/350.pdf',
                  lab: 'Bakker and Demerouti, The Job Demands-Resources Model'
                },
                {
                  n: '03',
                  t: 'Trust-centered leadership changes outcomes.',
                  p: 'Across large-scale studies, trust-based and servant-minded leadership models consistently correlate with higher job performance, stronger commitment, and better outcomes at every level. Trust is not a soft metric. It is a performance multiplier.',
                  href: 'https://journals.sagepub.com/doi/10.1177/0149206314523836',
                  lab: 'Hoch et al., Meta-analysis of Servant Leadership'
                },
                {
                  n: '04',
                  t: 'Toxic leadership reliably breaks organizations.',
                  p: 'Abusive, fear-driven, and narcissistic leadership causes burnout, withdrawal, lower engagement, and higher turnover. The research on this is extensive, consistent, and unambiguous. Toxic leadership does not just hurt people. It destroys the conditions that make organizations function.',
                  href: 'https://journals.aom.org/doi/10.5465/AMJ.2000.3312921',
                  lab: 'Tepper, Consequences of Abusive Supervision'
                }
              ].map((c) => (
                <div key={c.n} className="bg-white p-8 md:p-10">
                  <span className="font-playfair text-[13px] text-ao-red">{c.n}</span>
                  <h3 className="mt-2 font-playfair text-xl font-normal leading-snug text-[#1A1A1A] md:text-[1.25rem]">
                    {c.t}
                  </h3>
                  <p className="mt-4 text-[14px] leading-[1.7] text-warm-grey">{c.p}</p>
                  <a
                    href={c.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-block text-[12px] font-medium text-ao-red no-underline hover:underline"
                  >
                    {c.lab}
                  </a>
                </div>
              ))}
              <div className="bg-ao-dark p-8 text-white md:col-span-2 md:p-10">
                <span className="font-playfair text-[13px] text-ao-brown">05</span>
                <h3 className="mt-2 font-playfair text-xl font-normal leading-snug md:text-[1.25rem]">
                  Engagement is an engine, not a perk.
                </h3>
                <p className="mt-4 text-[14px] leading-[1.7] text-white/65">
                  Global engagement research confirms that engaged teams outperform disengaged teams across every
                  meaningful metric: profitability, productivity, customer satisfaction, retention, safety, and quality.
                  Engagement is not a feeling. It is a measurable output of the leadership conditions that either
                  sustain or erode it. This is why Culture Science measures conditions, not sentiment. Sentiment is
                  downstream. Conditions are the cause.
                </p>
                <a
                  href="https://www.gallup.com/workplace/236927/state-american-workplace-report-2017.aspx"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-block text-[12px] font-medium text-ao-brown no-underline hover:underline"
                >
                  Harter et al., Gallup Engagement Meta-analysis
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* The Problem */}
        <section className="bg-ao-cream py-16 md:py-24">
          <div className="mx-auto max-w-[1600px] px-6 sm:px-10 md:px-14">
            <p className={sectionLabel}>The Problem</p>
            <h2 className={`${h2} mt-3 max-w-[760px]`}>
              Leaders score their culture higher than their teams do. Every time.
            </h2>
            <div className="mt-12 grid grid-cols-1 gap-12 md:grid-cols-2 md:gap-20 lg:gap-[80px]">
              <div className={`${body} space-y-6`}>
                <div className="border-l-2 border-ao-red pl-6">
                  <p className="font-playfair text-lg italic leading-relaxed text-[#1A1A1A] md:text-[19px]">
                    The gap between what leaders believe is happening and what teams actually experience, that gap is
                    where culture breaks down. Quietly. Degree by degree. Until something expensive surfaces.
                  </p>
                </div>
                <p>
                  This isn&apos;t opinion. It&apos;s one of the most replicated findings in organizational research.
                  Leaders assume clarity exists because they feel clear. They assume trust exists because they extend
                  it. They assume communication works because they communicate.
                </p>
                <p>
                  Most organizations never measure this gap. They track revenue, output, and performance. They
                  don&apos;t measure the leadership conditions that drive all of those things. They don&apos;t know
                  whether their team experiences clarity. They don&apos;t know whether trust is actually present or
                  just assumed.
                </p>
                <p>
                  Culture Science builds the mirror. Not to judge, to inform. The data shows leaders what their team is
                  actually experiencing, so they can lead from what&apos;s real instead of what they assume.
                </p>
                <p>
                  ALI, the Archetype Leadership Index, is the first tool built from this foundation. It exists because
                  of Culture Science, not above it. Seven conditions: Clarity, Consistency, Trust, Communication,
                  Alignment, Stability, and Drift. Four times a year. The data your internal rooms will never produce on
                  their own.
                </p>
              </div>
              <div className="bg-white p-8 md:p-10">
                <p className={`${sectionLabel}`}>The Four Blind Spots</p>
                <h3 className="mt-2 font-playfair text-[22px] font-normal text-[#1A1A1A]">What most leaders never see.</h3>
                <div className="mt-4 space-y-0 border-b border-t border-black/[0.08]">
                  {[
                    {
                      t: 'Leaders and teams experience culture differently.',
                      b: 'Research shows this consistently. Leaders score culture higher than the people under them, every time.'
                    },
                    {
                      t: 'Performance is measured. Leadership conditions are not.',
                      b: 'Most organizations track output but never measure the clarity, trust, and consistency that produce it.'
                    },
                    {
                      t: 'People rarely tell leadership the full truth.',
                      b: 'Without psychological safety, feedback is filtered and problems stay hidden until they become expensive.'
                    },
                    {
                      t: "Leaders don't lack desire. They lack a mirror.",
                      b: "Most leaders want to lead well. They just don't have an honest picture of how their leadership actually lands."
                    }
                  ].map((row, i) => (
                    <div
                      key={row.t}
                      className={`border-t border-black/[0.08] py-4 first:border-t-0 ${i === 3 ? 'border-b border-black/[0.08]' : ''}`}
                    >
                      <p className="text-[13px] font-semibold text-[#1A1A1A]">{row.t}</p>
                      <p className="mt-1 text-[13px] leading-relaxed text-warm-grey">{row.b}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* The Ecosystem */}
        <section className="bg-ao-dark py-16 text-white md:py-24">
          <div className="mx-auto max-w-[1600px] px-6 sm:px-10 md:px-14">
            <div className="mb-12 max-w-[600px] md:mb-16">
              <p className={`${sectionLabel} text-ao-brown`}>The Ecosystem</p>
              <h2 className="mt-3 font-playfair text-[clamp(1.75rem,3vw,2.25rem)] font-normal leading-tight text-white">
                What Culture Science produced.
              </h2>
              <p className="mt-4 text-[15px] leading-[1.75] text-white/60">
                Every tool below exists because of the research, the lived experience, and the responsibility to give
                leaders something honest. Not tools for their own sake, tools that came from the discipline.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-0.5 md:grid-cols-2">
              {[
                {
                  lab: 'Diagnostic',
                  t: 'Archetype Leadership Index',
                  p: 'Seven leadership conditions measured across your organization four times a year. Anonymous. Honest. Built directly from the Culture Science research foundation. ALI exists because the science showed what needs to be measured, and most organizations never measure it.',
                  a: 'Explore ALI',
                  path: '/culture-science/ali'
                },
                {
                  lab: 'Anti-Project',
                  t: 'Scoreboard Leadership',
                  p: 'A leadership operating system built on the wrong foundation. The only thing that matters is the win. Profits become the score. People become inputs. If you built a business running 180 degrees opposite to servant leadership, this is what it looks like. Culture Science names it so leaders can recognize it, diagnose it, and dismantle it.',
                  a: 'Learn More',
                  path: '/culture-science/anti-projects/scoreboard-leadership'
                },
                {
                  lab: 'Anti-Project',
                  t: 'The Bad Leader Project',
                  p: 'An anonymous story archive of dysfunctional leadership across industries and regions. Pattern recognition at scale. Every story submitted is neutralized for identity and added to the research corpus. The patterns that show up across industries, geographies, and organization sizes are the data Culture Science is built to address.',
                  a: 'Learn More',
                  path: '/culture-science/anti-projects/bad-leader-project'
                },
                {
                  lab: 'Intelligence',
                  t: 'Archy',
                  p: 'The AI trained on the corpus: every book, every framework, every engagement note, every piece of research that Culture Science has produced. When ALI surfaces a gap in your data, Archy tells you what it means and what to do about it. The intelligence layer that makes the data actionable.',
                  a: 'Meet Archy',
                  path: '/archy'
                }
              ].map((card) => (
                <a
                  key={card.t}
                  href={card.path}
                  onClick={go(card.path)}
                  className="group block border border-white/[0.06] bg-white/[0.04] p-8 transition-colors hover:bg-white/[0.07] md:p-10"
                >
                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ao-red">{card.lab}</span>
                  <h3 className="mt-3 font-playfair text-2xl font-normal text-white">{card.t}</h3>
                  <p className="mt-4 text-[14px] leading-[1.7] text-white/60">{card.p}</p>
                  <span className="mt-6 inline-flex items-center gap-1 text-[12px] font-semibold uppercase tracking-[0.08em] text-ao-red transition-all group-hover:gap-2">
                    {card.a} <span aria-hidden>→</span>
                  </span>
                </a>
              ))}
            </div>
          </div>
        </section>

        {/* Who This Is For */}
        <section className="bg-white py-16 md:py-24">
          <div className="mx-auto max-w-[1600px] px-6 sm:px-10 md:px-14">
            <div className="mb-10 max-w-[600px] md:mb-12">
              <p className={sectionLabel}>Who This Is For</p>
              <h2 className={`${h2} mt-3`}>Built for the leader who is also the HR department.</h2>
              <p className={`mt-4 ${body}`}>
                Large organizations have culture committees, HR teams, and consultants on retainer. Leaders in 5 to
                250 person organizations have themselves. Culture Science exists for that leader.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-0.5 md:grid-cols-2">
              <div className="bg-[#FAFAF9] p-10 md:p-12">
                <h3 className="font-playfair text-xl font-normal text-[#1A1A1A]">Large companies have</h3>
                <ul className="mt-6 space-y-2 text-[14px] text-warm-grey">
                  {[
                    'HR departments',
                    'Culture committees',
                    'Consultants on retainer',
                    'Engagement surveys',
                    'Performance management systems',
                    'Dedicated people operations teams'
                  ].map((x) => (
                    <li key={x} className="relative pl-4 before:absolute before:left-0 before:top-2 before:h-1 before:w-1 before:rounded-full before:bg-ao-red before:content-['']">
                      {x}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-ao-cream p-10 md:p-12">
                <h3 className="font-playfair text-xl font-normal text-[#1A1A1A]">You have</h3>
                <ul className="mt-6 space-y-2 text-[14px] text-warm-grey">
                  {[
                    'Your team',
                    'Your values',
                    'Your commitment to building something real',
                    'And now a mirror that shows you what they are actually experiencing'
                  ].map((x) => (
                    <li key={x} className="relative pl-4 before:absolute before:left-0 before:top-2 before:h-1 before:w-1 before:rounded-full before:bg-ao-red before:content-['']">
                      {x}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Close */}
        <section className="bg-ao-dark px-6 py-20 text-center text-white md:px-14 md:py-24">
          <p className={`${sectionLabel} text-ao-brown`}>The Mirror Is Ready</p>
          <h2 className="mx-auto mt-3 max-w-2xl font-playfair text-3xl font-normal leading-tight md:text-4xl">
            Start with what&apos;s actually happening.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[15px] leading-[1.75] text-white/65">
            ALI measures the leadership conditions your team is experiencing right now. Start there. Build from
            what&apos;s real.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <a
              href="/culture-science/ali"
              onClick={go('/culture-science/ali')}
              className="inline-flex items-center rounded-[2px] bg-ao-red px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.08em] text-white transition-opacity hover:opacity-90"
            >
              Explore ALI
            </a>
            <a
              href="/engagement-inquiry"
              onClick={go('/engagement-inquiry')}
              className="inline-flex items-center rounded-[2px] border border-white px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.08em] text-white transition-colors hover:bg-white/10"
            >
              Start a Conversation
            </a>
          </div>
        </section>
      </div>
    </>
  );
}
