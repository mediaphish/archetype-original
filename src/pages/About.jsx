import React from 'react';
import { Helmet } from 'react-helmet-async';
import SEO from '../components/SEO';

/**
 * Meet Bart (/meet-bart) — layout and copy per meet-bart-preview.html / cursor-meet-bart.md
 * Fonts loaded on this page only (Playfair Display + Inter).
 */
export default function About() {
  const goToPath = (e, path) => {
    e.preventDefault();
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: 'Bart Paden',
    url: 'https://www.archetypeoriginal.com/meet-bart',
    jobTitle: 'Founder',
    sameAs: [],
  };

  const labelClass =
    'mb-5 font-inter text-[11px] font-semibold uppercase tracking-[0.16em] text-ao-brown sm:mb-6';

  return (
    <>
      <SEO pageKey="about" />
      <Helmet>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;1,400&family=Inter:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      <div className="min-h-screen bg-[#FAFAF9] font-inter text-[15px] leading-[1.75] text-[#1A1A1A] antialiased">
        {/* Hero */}
        <section className="relative flex min-h-[90vh] items-end overflow-hidden">
          <div
            className="absolute inset-0 bg-cover bg-[center_20%] bg-no-repeat"
            style={{ backgroundImage: "url('/images/meet-bart-hero.jpg')" }}
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'linear-gradient(to right, rgba(26,26,26,0.88) 0%, rgba(26,26,26,0.72) 40%, rgba(26,26,26,0.2) 70%, rgba(26,26,26,0) 100%)',
            }}
            aria-hidden
          />
          <div className="relative z-[2] mx-auto w-full max-w-[1400px] px-6 pb-16 pt-24 sm:px-10 sm:pb-24 md:px-10">
            <p className={labelClass}>Meet Bart · Archetype Original</p>
            <h1 className="mb-7 max-w-[680px] font-playfair text-[clamp(36px,5vw,64px)] font-normal leading-[1.1] text-white">
              Thirty-three years inside organizations where leadership either held or broke.
            </h1>
            <p className="mb-11 max-w-[480px] text-base leading-[1.65] text-white/[0.72]">
              Not a theorist. Not a coach with a framework. A founder who built companies, developed
              hundreds of people, and learned what actually separates healthy from broken.
            </p>
            <div className="flex flex-wrap gap-4">
              <a
                href="/engagement-inquiry"
                onClick={(e) => goToPath(e, '/engagement-inquiry')}
                className="inline-block rounded-[2px] bg-ao-red px-8 py-3.5 text-[13px] font-semibold uppercase tracking-[0.06em] text-white transition-opacity hover:opacity-90"
              >
                Start a Conversation
              </a>
              <a
                href="/the-room"
                onClick={(e) => goToPath(e, '/the-room')}
                className="inline-block rounded-[2px] border border-white/40 bg-transparent px-8 py-3.5 text-[13px] font-semibold uppercase tracking-[0.06em] text-white transition-colors hover:border-white hover:bg-white/[0.08]"
              >
                Read The Room ($27)
              </a>
            </div>
          </div>
        </section>

        {/* The Story */}
        <section className="bg-white">
          <div className="mx-auto max-w-[1400px] px-6 py-20 sm:px-10 sm:py-24 md:py-[100px]">
            <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-[1fr_360px] lg:gap-[100px]">
              <div>
                <p className={labelClass}>The Story</p>
                <h2 className="mb-10 font-playfair text-[clamp(28px,3vw,40px)] font-normal leading-[1.2] text-[#1A1A1A]">
                  I didn&apos;t plan on becoming a leader. Most people who end up doing it well
                  don&apos;t.
                </h2>
                <div className="space-y-6 text-[#3A3A3A] [&_p]:leading-[1.85]">
                  <p>
                    It started before I knew it was starting. I was doing design work as far back as
                    1993. By the time I graduated college in 1998 and landed at Precious Moments in
                    Carthage, Missouri, I already knew what I could do. Yep, my first color palette was
                    pink and sad eyes. In four and a half years I helped grow their online sales from
                    $20,000 a year to over $1.2 million. Not because of genius. Because of curiosity,
                    effort, and honestly, it was an absolute blast.
                  </p>
                  <p>
                    From 2004 until 2010 those years were defined by one word: grind. I got up early,
                    helped get the kids to school, and was immediately on the clock. I would work until
                    three in the afternoon, then step away. That part was non-negotiable. Time with the
                    family. Dinner. Helping with homework. Being present. Husband first. Father first.
                    Then after everyone went to bed, back on the clock until the wee hours. A few hours
                    of sleep and do it again. Wash, rinse, repeat. It was a grind, but the order of
                    things never changed. The family was always first. The work fit around that, not the
                    other way around.
                  </p>
                  <p>
                    That season is where servant leadership stopped being a concept and became a way of
                    living. Not because I read about it. Because there was no other way to survive it
                    with your family intact. You learn fast that the people in your home are the first
                    people you lead. If you can&apos;t serve them well under pressure, you have no
                    business asking anyone else to follow you.
                  </p>
                  <p>
                    I didn&apos;t do it perfectly. There were seasons where I was running so hard I
                    stopped seeing the people around me clearly. I know what it costs when that happens.
                    The people closest to me paid for it too. But the fruit of those years is evident.
                    We&apos;re still standing. Still together. Still building.
                  </p>
                  <p>
                    Through the grind I learned what leadership actually costs in an organization too.
                    Not in theory. In the moments that don&apos;t make the highlight reel. The employee
                    who needed insurance and couldn&apos;t afford it, so I reduced my own income to cover
                    it. The client who crossed a line with one of my people, and I cleared the room and
                    ended the relationship on the spot. The team member sitting on a leather couch in my
                    office pouring out something that had nothing to do with deliverables, and realizing
                    that was the most important meeting of the week. The quiet fracture that starts when
                    culture drifts degree by degree until nobody recognizes the room they&apos;re in
                    anymore.
                  </p>
                  <p>
                    I built a software company from a home office to more than 100 people over twenty
                    years. I sold it in 2022. What followed was one of the hardest seasons of my life. A
                    gym I had invested in was bleeding. The culture had been damaged. The partnership
                    fractured. I became the sole owner and walked into a room that felt familiar but
                    carried a presence that needed serious work. Health declining. Tank empty. I reset the
                    center, protected the people inside it, told the truth early, and refused to feed the
                    drama. When it was time to hand it to the next steward, I did that with dignity too.
                    Sold it in March 2025.
                  </p>
                  <p className="!mt-1 font-playfair text-xl italic leading-snug text-[#1A1A1A] sm:text-[20px]">
                    I didn&apos;t get relief. I got room to breathe.
                  </p>
                  <p>
                    That&apos;s the through line of thirty-three years. Not the wins. Not the exits. The
                    consistency of showing up the same way whether anyone was watching or not. Word and
                    deed in the same direction. Every time. In every kind of room.
                  </p>
                  <p>
                    For over twenty years I worked inside manufacturing, medical, insurance, legal,
                    retail, law enforcement, education, government, nonprofit, and real estate. Not as a
                    consultant looking in from the outside. As the person building systems, solving
                    problems, and delivering outcomes that affected how those organizations actually ran.
                    You learn a lot about how a business thinks, operates, and leads when you&apos;re
                    responsible for getting it right inside their walls. That pattern recognition
                    isn&apos;t something you can study your way into. You have to earn it the hard way.
                  </p>
                  <p>
                    I wrote three books about what I learned. I&apos;m writing a fourth. I built a survey
                    system that measures what&apos;s actually happening inside a culture, not what leaders
                    hope is happening. I built an AI trained on everything I&apos;ve written and taught,
                    because the questions leaders need to ask don&apos;t always come at convenient hours.
                  </p>
                  <p>
                    But the work that matters most happens in one room. Outside your system. With one leader
                    who finally has somewhere honest to think.
                  </p>
                  <p>That&apos;s what I built Archetype Original to be.</p>
                  <p>
                    Not a consulting firm. Not a coaching practice. A room where the truth finally has
                    somewhere to go.
                  </p>
                  <p>If you&apos;ve read this far, you probably already know whether you need it.</p>
                </div>
              </div>
              <div className="lg:sticky lg:top-[88px]">
                <img
                  src="/images/meet-bart-working.jpg"
                  alt="Bart Paden in conversation"
                  className="mb-6 block aspect-[3/4] w-full object-cover object-[center_top]"
                  loading="lazy"
                />
                <div className="border-l-2 border-ao-red pl-5">
                  <p className="text-sm italic leading-[1.65] text-[#6B6B6B]">
                    Advisory is available to a limited number of leaders at any given time. That limit is
                    intentional.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* The Posture */}
        <section className="bg-ao-dark">
          <div className="mx-auto max-w-[1400px] px-6 py-20 sm:px-10 sm:py-24 md:py-[100px]">
            <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[1fr_420px] lg:gap-20">
              <div>
                <p className={labelClass}>The Posture</p>
                <h2 className="mb-9 font-playfair text-[clamp(28px,3vw,40px)] font-normal leading-[1.2] text-white">
                  Leadership is stewardship. Not authority. Not performance. Responsibility.
                </h2>
                <div className="mb-9 flex flex-col gap-5">
                  <div className="border-l border-white/10 py-5 pl-6 pr-1">
                    <p className="text-[15px] leading-[1.7] text-white/[0.78]">
                      The Golden Rule:{' '}
                      <strong className="font-medium text-white">
                        treat people the way you want to be treated.
                      </strong>{' '}
                      Not a slogan. A mechanism. One of the most reliable drivers of trust and performance
                      I&apos;ve seen in thirty-three years.
                    </p>
                  </div>
                  <div className="border-l border-white/10 py-5 pl-6 pr-1">
                    <p className="text-[15px] leading-[1.7] text-white/[0.78]">
                      <strong className="font-medium text-white">I am second.</strong> Not smaller. Not
                      weaker. Committed to the people around me before my own comfort. That posture produces
                      trust. Trust produces performance.
                    </p>
                  </div>
                  <div className="border-l border-white/10 py-5 pl-6 pr-1">
                    <p className="text-[15px] leading-[1.7] text-white/[0.78]">
                      <strong className="font-medium text-white">
                        Your organization cannot be healthier than you are.
                      </strong>{' '}
                      When the leader grows, the culture grows. When the leader fractures, the culture
                      fractures.
                    </p>
                  </div>
                </div>
                <p className="border-t border-white/[0.08] pt-7 text-[15px] italic leading-[1.75] text-white/60">
                  My faith is foundational to this. Servant leadership isn&apos;t a model. It&apos;s what
                  happens when responsibility meets character and clarity meets courage.
                </p>
              </div>
              <div>
                <img
                  src="/images/meet-bart-hero.jpg"
                  alt="Bart Paden"
                  className="block h-[360px] w-full object-cover object-[center_top] sm:h-[480px] lg:h-[560px]"
                  loading="lazy"
                />
              </div>
            </div>
          </div>
        </section>

        {/* How This Shows Up */}
        <section className="bg-ao-cream">
          <div className="mx-auto max-w-[1400px] px-6 py-20 sm:px-10 sm:py-24 md:py-[100px]">
            <div className="mb-14 max-w-[480px] sm:mb-16">
              <p className={labelClass}>How This Shows Up</p>
              <h2 className="font-playfair text-[clamp(28px,3vw,40px)] font-normal leading-[1.2] text-[#1A1A1A]">
                Four ways to work together.
              </h2>
            </div>
            <div className="grid grid-cols-1 gap-0.5 md:grid-cols-3">
              {[
                {
                  n: '01',
                  title: 'Leadership Advisory',
                  body: 'One room, outside your system. The honest conversation that cannot happen inside your building. No stakes in your outcomes. No deliverables list.',
                  href: '/advisory',
                  link: 'How advisory works',
                },
                {
                  n: '02',
                  title: 'Fractional Roles',
                  body: 'C-suite presence for the seasons that require more than guidance. COO, CMO, CEO. Real leadership in the room, not a consultant looking in from outside.',
                  href: '/methods/fractional-roles',
                  link: 'See the roles',
                },
                {
                  n: '03',
                  title: 'Consulting',
                  body: 'Clarity for teams. Alignment for organizations. Cultural repair, operational steadiness, and communication systems that support real growth.',
                  href: '/methods/consulting',
                  link: 'How consulting works',
                },
              ].map((card) => (
                <div key={card.n} className="bg-white p-8 sm:p-10">
                  <span className="mb-4 block font-playfair text-[13px] text-ao-red">{card.n}</span>
                  <h3 className="mb-3.5 font-playfair text-[22px] font-normal text-[#1A1A1A]">
                    {card.title}
                  </h3>
                  <p className="mb-6 text-sm leading-[1.7] text-[#6B6B6B]">{card.body}</p>
                  <a
                    href={card.href}
                    onClick={(e) => goToPath(e, card.href)}
                    className="group inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-ao-red transition-[gap] duration-200 hover:gap-2.5"
                  >
                    {card.link}
                    <span aria-hidden>→</span>
                  </a>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Close */}
        <section className="relative flex min-h-[560px] items-center overflow-hidden bg-[#1A1A1A]">
          <div
            className="absolute inset-0 bg-cover bg-[center_30%] bg-no-repeat opacity-[0.28]"
            style={{ backgroundImage: "url('/images/meet-bart-close.jpg')" }}
            aria-hidden
          />
          <div className="relative z-[2] mx-auto flex w-full max-w-[1400px] flex-col items-center px-6 py-20 text-center sm:px-10 sm:py-24">
            <p className={`${labelClass} text-center`}>If You&apos;re Ready</p>
            <h2 className="mb-6 max-w-[560px] font-playfair text-[clamp(32px,4vw,52px)] font-normal leading-[1.15] text-white">
              The room is available.
            </h2>
            <p className="mb-11 max-w-[520px] text-base leading-[1.75] text-white/[0.7]">
              If you&apos;re carrying leadership weight, or growing into it, the conversation starts here.
              One room. Outside your system. No stakes in your outcomes. Just the truth, spoken somewhere
              it has room to go.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <a
                href="/engagement-inquiry"
                onClick={(e) => goToPath(e, '/engagement-inquiry')}
                className="inline-block rounded-[2px] bg-ao-red px-8 py-3.5 text-[13px] font-semibold uppercase tracking-[0.06em] text-white transition-opacity hover:opacity-90"
              >
                Start a Conversation
              </a>
              <a
                href="/advisory"
                onClick={(e) => goToPath(e, '/advisory')}
                className="inline-block rounded-[2px] border border-white/30 bg-transparent px-8 py-3.5 text-[13px] font-semibold uppercase tracking-[0.06em] text-white/80 transition-colors hover:border-white/70 hover:text-white"
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
