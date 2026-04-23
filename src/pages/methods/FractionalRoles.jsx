/**
 * Fractional Roles — rebuilt to match fractional-roles-preview baseline (cursor-fractional-roles.md).
 * Horizontal alignment: bottom sections share the same max-width shell as upper sections so copy
 * does not “stagger” (narrow centered columns vs full-width columns).
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
import { Helmet } from 'react-helmet-async';
import SEO from '../../components/SEO';

function navigateTo(path) {
  return (e) => {
    e.preventDefault();
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.scrollTo({ top: 0, behavior: 'instant' });
  };
}

/** One consistent content column edge for marketing subpages — outer 1200px + optional prose width */
function SectionShell({ bgClassName = '', borderClassName = '', pyClassName, children }) {
  return (
    <section className={`w-full ${bgClassName} ${borderClassName}`}>
      <div className={`mx-auto max-w-[1200px] px-6 md:px-12 ${pyClassName}`}>{children}</div>
    </section>
  );
}

export default function FractionalRoles() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: 'Fractional Roles',
    description: 'Leadership presence for the seasons that require more than guidance.'
  };

  const fitsItems = [
    'When culture feels unsteady and a team needs someone to restore alignment',
    'When a growing company needs leadership clarity before adding full-time roles',
    'When a department is stretched and needs temporary executive-level support',
    'When a founder or executive is overloaded and needs a trusted partner in the work',
    'When a team is healthy but preparing for a new season and needs help building toward it',
    "When a company wants to strengthen what's already good without disrupting momentum"
  ];

  const beginItems = [
    'Hourly or short-term',
    'Day or weekly involvement',
    'A defined fractional role up to 40 hours/month',
    'Or a deeper engagement when alignment, goals, and investment are right'
  ];

  return (
    <>
      <SEO pageKey="fractional-roles" />
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      <div className="min-h-screen bg-white">
        {/* SECTION 1 — Hero */}
        <SectionShell bgClassName="border-b border-[#E0DBD4] bg-white" pyClassName="pb-20 pt-[72px] md:pb-[80px] md:pt-[88px]">
          <p className="mb-4 font-sans text-[10px] uppercase tracking-[0.2em] text-ao-red">
            Methods · Archetype Original
          </p>
          <p className="mb-6 font-sans text-[13px] tracking-[0.04em] text-ao-midGray">
            Fractional Roles
          </p>
          <h1 className="mb-7 max-w-[680px] font-serif text-[clamp(36px,4vw,52px)] font-normal italic leading-[1.06] text-[#1a1a1a]">
            Leadership presence for the seasons that require more than guidance.
          </h1>

          <div className="grid grid-cols-1 items-start gap-10 md:grid-cols-2 md:gap-12">
            <div>
              <p className="mb-3 font-sans text-[15px] leading-[1.75] text-[#444]">
                Sometimes an organization needs a steady hand for a moment. Sometimes it needs clarity during
                transition. Sometimes it needs someone who can step into the work — not just advise on it.
              </p>
              <p className="mb-3 font-sans text-[15px] leading-[1.75] text-[#444]">
                Fractional roles exist to meet those seasons with real leadership presence. Not theory. Not
                oversight from a distance. Actual involvement, clarity, and steadiness inside the environment.
              </p>
              <p className="mt-2 border-t border-[#E0DBD4] pt-5 font-sans text-[14px] font-bold text-[#1a1a1a]">
                This isn&apos;t &quot;interim management.&quot; This is experienced leadership brought in for a
                defined season with a clear purpose.
              </p>
            </div>
            <div className="font-sans text-[15px] leading-[1.75] text-[#666] md:border-l md:border-[#E0DBD4] md:pl-12">
              <p className="mb-4">
                Fractional work adapts to what is needed: culture, communication, operations, project direction,
                creative leadership, or helping a team move through transition without losing momentum or trust.
              </p>
              <p>
                The structure is defined by what the organization actually needs — not by a predetermined
                engagement model.
              </p>
            </div>
          </div>
        </SectionShell>

        {/* SECTION 2 — Where it fits */}
        <SectionShell bgClassName="bg-white" pyClassName="py-16 md:py-20">
          <p className="mb-3.5 font-sans text-[10px] uppercase tracking-[0.2em] text-ao-red">Where it fits</p>
          <h2 className="mb-6 max-w-[560px] font-serif text-[32px] font-normal leading-[1.15] text-[#1a1a1a]">
            Organizations bring in fractional support for different reasons.
          </h2>
          <ul className="mb-7 list-none">
            {fitsItems.map((item) => (
              <li
                key={item}
                className="relative border-b border-[#F0EDE8] py-3 pl-6 font-sans text-[15px] leading-[1.65] text-[#333] last:border-b-0"
              >
                <span className="absolute left-0 font-bold text-ao-red">—</span>
                {item}
              </li>
            ))}
          </ul>
          <p className="mt-5 font-sans text-[14px] font-bold text-[#1a1a1a]">
            Fractional roles meet the moment. They add capacity, clarity, and leadership to whatever season you are
            in.
          </p>
        </SectionShell>

        <hr className="border-0 border-t border-[#E0DBD4]" />

        {/* SECTION 3 — Why this works */}
        <section className="w-full bg-ao-dark py-16 md:py-[88px]">
          <div className="mx-auto grid max-w-[1200px] grid-cols-1 items-center gap-10 px-6 md:grid-cols-[1fr_340px] md:gap-[72px] md:px-12">
            <div className="order-2 md:order-1">
              <p className="mb-3.5 font-sans text-[10px] uppercase tracking-[0.2em] text-ao-brown">Why this works</p>
              <h2 className="mb-6 font-serif text-[32px] font-normal leading-[1.15] text-[#F0ECE4]">
                Fractional leadership works when it&apos;s built on lived experience, not frameworks.
              </h2>
              <p className="mb-4 font-sans text-[15px] leading-[1.78] text-[#C8C0B4]">
                Thirty-three years building companies, leading teams, rebuilding culture, and serving clients across
                industries. I know how people respond under pressure, how trust moves inside an organization, and what
                it takes to steady a team when the situation is chaotic or unclear.
              </p>
              <p className="mb-4 font-sans text-[15px] leading-[1.78] text-[#C8C0B4]">
                Companies don&apos;t need a temporary title holder. They need clarity, presence, and leadership they can
                depend on.
              </p>
              <p className="mt-2 border-l-[3px] border-ao-red pl-4 font-sans text-[14px] font-bold leading-snug text-[#E8E0D4]">
                Fractional roles give them that without the weight of a permanent executive hire.
              </p>
            </div>
            <div className="order-1 md:order-2">
              <div className="aspect-[4/3] w-full overflow-hidden md:aspect-[3/4]">
                <img
                  src="/images/Bart-52.jpg"
                  alt="Bart Paden, founder of Archetype Original"
                  loading="lazy"
                  className="h-full w-full object-cover object-top"
                />
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 4 — The roles */}
        <SectionShell bgClassName="bg-white" pyClassName="py-16 md:py-20">
          <p className="mb-3.5 font-sans text-[10px] uppercase tracking-[0.2em] text-ao-red">The roles</p>
          <h2 className="mb-3 font-serif text-[32px] font-normal text-[#1a1a1a]">C-suite fractional leadership.</h2>
          <p className="mb-12 max-w-[640px] font-sans text-[15px] leading-[1.7] text-[#555]">
            Fractional leadership works at the top or it doesn&apos;t work. The value is strategic presence and
            decision authority — not task execution. Every role below comes with a title that means something to the
            team and direct access to whoever holds the room.
          </p>

          {/* COO */}
          <article className="grid grid-cols-1 gap-10 border-t-2 border-ao-dark pb-12 pt-10 md:grid-cols-[200px_1fr] md:gap-12">
            <div>
              <h3 className="font-serif text-[22px] font-normal text-[#1a1a1a]">Fractional COO</h3>
              <p className="mt-1.5 font-sans text-[10px] uppercase tracking-[0.12em] text-ao-red">
                Operations &amp; Culture
              </p>
            </div>
            <div className="font-sans text-[15px] leading-[1.75] text-[#444]">
              <p className="mb-3.5">
                Most organizations don&apos;t have an operations problem. They have a clarity problem that shows up in
                operations.
              </p>
              <p className="mb-3.5">
                Decisions that don&apos;t translate into execution. Teams that are capable but pulling in different
                directions. Systems that worked at twenty people straining at fifty. A founder who is running the
                business and trying to run the business at the same time.
              </p>
              <p className="mb-3.5">
                I&apos;ve been inside that room. Not as a consultant looking at it from the outside — as the person
                responsible for making the inside work while the outside kept growing. I know what it costs when internal
                health gets sacrificed for external performance. I know how to read an organization&apos;s real condition
                before the metrics catch up to it.
              </p>
              <p className="mb-3.5">
                What I bring into a COO role: operational clarity, communication systems that actually hold,
                accountability structures that don&apos;t require enforcement, and the ability to see what the leadership
                team has stopped seeing because they&apos;re too close to it.
              </p>
              <p className="mt-1 border-t border-[#E0DBD4] pt-3.5 font-sans text-[14px] italic text-[#777]">
                This is the role I know best. It shows.
              </p>
            </div>
          </article>

          {/* CMO */}
          <article className="grid grid-cols-1 gap-10 border-t border-[#E0DBD4] pb-12 pt-12 md:grid-cols-[200px_1fr] md:gap-12">
            <div>
              <h3 className="font-serif text-[22px] font-normal text-[#1a1a1a]">Fractional CMO</h3>
              <p className="mt-1.5 font-sans text-[10px] uppercase tracking-[0.12em] text-ao-red">
                Marketing &amp; Brand
              </p>
            </div>
            <div className="font-sans text-[15px] leading-[1.75] text-[#444]">
              <p className="mb-3.5">
                I was the marketing department for twenty-seven of my thirty-three years in business. Not the person who
                hired the marketing department. The person who built the strategy, executed it, measured it, rebuilt
                it, and eventually built a team around it that generated enough business to reach an eight-figure exit.
              </p>
              <p className="mb-3.5">
                I&apos;ve done brand strategy, digital, advertising, content, positioning, and campaign execution across
                multiple industries. I know what it looks like when marketing is working and when it&apos;s producing
                activity without producing results.
              </p>
              <p className="mb-3.5">
                What I bring into a CMO role: a clear-eyed read on where your marketing is actually landing versus where
                you think it is, a strategy built around your real buyer and your real offer, and the ability to lead a
                team without becoming the team.
              </p>
              <p className="mt-1 border-t border-[#E0DBD4] pt-3.5 font-sans text-[14px] italic text-[#777]">
                I&apos;m not here to run campaigns. I&apos;m here to make sure the right campaigns get run by the right
                people toward the right outcome.
              </p>
            </div>
          </article>

          {/* CEO */}
          <article className="grid grid-cols-1 gap-10 border-t border-[#E0DBD4] pb-2 pt-12 md:grid-cols-[200px_1fr] md:gap-12">
            <div>
              <h3 className="font-serif text-[22px] font-normal text-[#1a1a1a]">Fractional CEO</h3>
              <p className="mt-1.5 font-sans text-[10px] uppercase tracking-[0.12em] text-ao-red">
                Leadership Continuity
              </p>
            </div>
            <div className="font-sans text-[15px] leading-[1.75] text-[#444]">
              <p className="mb-3.5">
                I&apos;ve built and led organizations through fast-moving industries and hard seasons. I&apos;ve also
                spent years walking directly alongside CEOs — developing strategy, navigating pressure, and working
                through the decisions that don&apos;t have clean answers — across more industries than most executives
                encounter in a career.
              </p>
              <p className="mb-3.5">
                That combination is what makes this role work. Not just knowing what the seat requires from the inside, but
                understanding how leadership operates across contexts. The patterns that repeat. The places where
                organizations stall for the same reasons regardless of what they make or sell.
              </p>
              <p className="mb-3.5">
                What I bring into a CEO role: clear decision-making, cultural steadiness, honest communication with the
                board and the team, and the ability to hold the room without making it about me.
              </p>
              <p className="mb-3.5">
                This role fits best when there&apos;s a capable team already in place and the need is leadership
                continuity — a transition, a gap, a season that requires steady executive presence without a permanent
                hire.
              </p>
              <p className="mt-1 border-t border-[#E0DBD4] pt-3.5 font-sans text-[14px] italic text-[#777]">
                If the need is building from scratch, that conversation looks different. It&apos;s not that I can&apos;t —
                it&apos;s that building something real requires more than fractional presence, and I&apos;m not going to
                pretend otherwise.
              </p>
            </div>
          </article>
        </SectionShell>

        {/* SECTION 5 — Additional roles */}
        <SectionShell bgClassName="bg-ao-cream" pyClassName="py-14 md:py-14">
          <p className="mb-3.5 font-sans text-[10px] uppercase tracking-[0.2em] text-ao-red">Additional roles</p>
          <h3 className="mb-3 font-serif text-[20px] font-normal text-[#1a1a1a]">
            Other C-suite engagements available depending on the season.
          </h3>
          <p className="mb-6 max-w-[640px] font-sans text-[15px] leading-[1.7] text-[#555]">
            Depending on what an organization needs, I also step into creative, technology, and project delivery
            leadership. These engagements are evaluated individually — the fit matters as much as the role.
          </p>
          <div className="flex flex-wrap gap-3">
            {['Fractional CDO', 'Fractional CTO', 'Executive Project Delivery'].map((label) => (
              <span
                key={label}
                className="rounded-[2px] border border-[#C8C4BE] bg-transparent px-3.5 py-1.5 font-sans text-[12px] text-[#555]"
              >
                {label}
              </span>
            ))}
          </div>
        </SectionShell>

        {/* SECTION 6 — Who this is for — same 1200px shell, left edge aligned with sections above */}
        <SectionShell bgClassName="bg-white" borderClassName="border-t border-[#E0DBD4]" pyClassName="py-14 md:py-16">
          <p className="mb-3.5 font-sans text-[10px] uppercase tracking-[0.2em] text-ao-red">Who this is for</p>
          <p className="max-w-[640px] font-sans text-[15px] leading-[1.75] text-[#444]">
            My work is best suited to organizations with 5 to 250 employees. If you&apos;re true corporate, I&apos;m
            probably not your person — unless you&apos;re building toward something and need someone who&apos;s done it.
          </p>
        </SectionShell>

        <hr className="border-0 border-t border-[#E0DBD4]" />

        {/* SECTION 7 — How we begin — no narrow centered column: uses same SectionShell as other sections */}
        <SectionShell bgClassName="bg-ao-cream" pyClassName="py-16 md:py-20">
          <p className="mb-3.5 font-sans text-[10px] uppercase tracking-[0.2em] text-ao-red">How we begin</p>
          <h2 className="mb-5 font-serif text-[32px] font-normal leading-[1.15] text-[#1a1a1a]">
            Every fractional engagement starts with a conversation.
          </h2>
          <p className="mb-4 max-w-[640px] font-sans text-[15px] leading-[1.78] text-[#444]">
            We name the season you&apos;re in, the weight you&apos;re carrying, and the clarity your team needs. Then we
            determine whether the right level of involvement is:
          </p>
          <ul className="mb-6 list-none">
            {beginItems.map((item) => (
              <li
                key={item}
                className="relative border-b border-[#D4D0CA] py-2.5 pl-6 font-sans text-[14px] text-[#333] last:border-b-0"
              >
                <span className="absolute left-0 font-bold text-ao-red">—</span>
                {item}
              </li>
            ))}
          </ul>
          <p className="font-sans text-[14px] font-bold text-[#1a1a1a]">
            The structure adapts to the need — never the other way around.
          </p>
        </SectionShell>

        {/* SECTION 8 — Advisory bridge (spec: white, border-top; copy matches prompt — not AdvisoryPathStrip cream variant) */}
        <SectionShell bgClassName="bg-white" borderClassName="border-t border-[#E0DBD4]" pyClassName="py-16 md:py-[72px]">
          <p className="mb-3.5 font-sans text-[10px] uppercase tracking-[0.2em] text-ao-red">Advisory path</p>
          <h2 className="mb-3 font-serif text-[28px] font-normal leading-snug text-[#1a1a1a]">
            When methods are not the missing piece.
          </h2>
          <p className="mb-6 max-w-[600px] font-sans text-[15px] leading-[1.72] text-[#555]">
            Consulting addresses what happens inside the system. Advisory is for the conversation that cannot happen there
            — outside your organization, where consequence doesn&apos;t follow what you say.
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

        {/* SECTION 9 — Footer CTA (only centered block per spec) */}
        <section className="w-full bg-ao-dark px-6 py-20 text-center md:px-12 md:py-24">
          <h2 className="mx-auto mb-3 max-w-[560px] font-serif text-[clamp(26px,3vw,36px)] font-normal italic leading-snug text-[#F0ECE4]">
            If this is the right season, let&apos;s talk.
          </h2>
          <p className="mx-auto mb-7 max-w-[480px] font-sans text-[15px] leading-[1.65] text-ao-brown">
            Let&apos;s work through what your team or organization is facing and decide together whether a fractional
            role is the right fit.
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
