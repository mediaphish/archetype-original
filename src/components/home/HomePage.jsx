import React from 'react';

/** SPA navigation consistent with Header */
function spaNavigate(path) {
  return (e) => {
    e.preventDefault();
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };
}

export default function HomePage() {
  const nav = spaNavigate;

  return (
    <>
      {/* Hero — mobile: photo band + solid panel (readable). md+: full-bleed image + gradient (desktop/tablet). */}
      <section className="home-hero-bg relative flex min-h-0 flex-col md:min-h-[90vh] md:items-center md:bg-cover md:bg-[url('/images/Bart-4.jpg')] md:bg-no-repeat">
        {/* Mobile only: dedicated image strip — keeps copy off busy photo */}
        <div className="relative h-[min(42vh,320px)] min-h-[220px] w-full shrink-0 overflow-hidden md:hidden">
          <img
            src="/images/Bart-4.jpg"
            alt=""
            className="h-full w-full object-cover object-[center_22%]"
            loading="eager"
            decoding="async"
          />
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/25 via-black/45 to-stone-950"
            aria-hidden
          />
        </div>

        {/* md+ only: scrim + texture over full-bleed background */}
        <div
          className="pointer-events-none absolute inset-0 z-[1] hidden md:block"
          style={{
            background:
              'linear-gradient(to right, rgba(43, 41, 41, 0.97) 0%, rgba(43, 41, 41, 0.94) 38%, rgba(43, 41, 41, 0.55) 62%, rgba(43, 41, 41, 0.12) 100%)',
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 z-[2] hidden md:block"
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.012) 2px, rgba(255,255,255,0.012) 4px)',
          }}
        />

        <div className="relative z-[3] w-full max-w-[580px] bg-stone-950 px-6 py-10 pb-12 md:bg-transparent md:px-16 md:py-20 md:pb-20">
          <p className="mb-6 font-sans text-[11px] uppercase tracking-[0.2em] text-ao-brown">
            Leadership Advisory · Archetype Original
          </p>
          <h1 className="mb-6 font-serif text-[clamp(28px,7vw,38px)] font-normal italic leading-[1.06] text-[#F0ECE4] md:text-[clamp(32px,3.8vw,52px)]">
            The most honest conversation you&apos;ve ever had about your organization hasn&apos;t happened yet.
          </h1>
          <p className="mb-10 max-w-[460px] font-sans text-base leading-[1.72] text-ao-midGray">
            Not because your team isn&apos;t honest. Because everyone in your room lives inside the system your decisions shape.
            What reaches you has already been filtered by consequence before it arrives.
          </p>
          <div className="flex max-w-full flex-col gap-3.5 sm:flex-row sm:gap-[14px]">
            <a
              href="/engagement-inquiry"
              onClick={nav('/engagement-inquiry')}
              className="inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-[3px] bg-ao-red px-7 py-3.5 text-center font-sans text-[13px] font-bold tracking-[0.04em] text-white"
            >
              Start the conversation
            </a>
            <a
              href="https://aobooks.samcart.com/products/the-room"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-[3px] border border-white/70 bg-black/30 px-7 py-3.5 text-center font-sans text-[13px] font-semibold text-[#F4F1EC] shadow-md backdrop-blur-[2px] transition-colors hover:border-white/85 hover:bg-black/40 md:border-white/55 md:bg-white/[0.12] md:text-[#F0ECE4] md:shadow-sm md:hover:bg-white/[0.18]"
            >
              Read The Room — $27
            </a>
          </div>
        </div>
      </section>

      {/* Interrupt bar */}
      <div className="border-t-[3px] border-ao-red bg-ao-cream px-6 py-6 md:px-12 md:py-6">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="grid w-full max-w-md grid-cols-2 gap-x-4 gap-y-6 sm:max-w-none lg:flex lg:w-auto lg:flex-nowrap lg:items-center lg:justify-start lg:gap-0">
            {[
              ['33', 'Years building'],
              ['2', 'Exits'],
              ['12+', 'Industries'],
              ['3', 'Books'],
            ].map(([n, l], i) => (
              <React.Fragment key={l}>
                {i > 0 && <div className="hidden h-10 w-px shrink-0 bg-[#C8C4BE] lg:block" aria-hidden />}
                <div className="min-w-0 px-2 text-center sm:px-6 lg:min-w-[100px] lg:px-7">
                  <div className="font-serif text-[32px] font-normal leading-none text-ao-dark">{n}</div>
                  <div className="mt-1 font-sans text-[10px] uppercase tracking-[0.08em] text-ao-midGray">{l}</div>
                </div>
              </React.Fragment>
            ))}
          </div>
          <blockquote className="w-full border-l-2 border-ao-red pl-8 font-serif text-[15px] italic leading-[1.62] text-[#444] lg:max-w-none lg:flex-1 lg:pl-8">
            <strong className="font-normal not-italic text-ao-dark">
              It is impossible to have a fully honest room.
            </strong>{' '}
            Not because your people are dishonest. Because everyone in that room lives inside the system your decisions shape —
            and no one inside a system is ever fully free of its consequences.
          </blockquote>
        </div>
      </div>

      {/* The problem */}
      <section className="bg-white px-6 py-16 md:px-12 md:py-24">
        <div className="mx-auto max-w-[1200px]">
          <p className="mb-3.5 font-sans text-[10px] uppercase tracking-[0.2em] text-ao-red">The problem</p>
          <h2 className="mb-3 max-w-[580px] font-serif text-[clamp(26px,3vw,40px)] font-normal leading-tight text-[#1a1a1a]">
            You&apos;ve already felt it. You just haven&apos;t been able to name it.
          </h2>
          <p className="mb-14 max-w-[520px] font-sans text-base leading-[1.65] text-[#666]">
            These aren&apos;t hypotheticals. They happen in healthy organizations, led by capable people, with cultures built on
            genuine trust.
          </p>
          <div className="grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-10">
            {[
              {
                id: 'Scenario 01',
                body: 'The decision had full support. The data pointed one direction. Six months later something costs you that nobody saw coming — or nobody said.',
                punch: 'The concern existed. It never surfaced.',
              },
              {
                id: 'Scenario 02',
                body: 'A hire felt right. Chemistry was there. Three months into execution the misalignment becomes visible. Someone had a reservation. They calculated the cost of raising it.',
                punch: "The filter wasn't fear. It was math.",
              },
              {
                id: 'Scenario 03',
                body: 'Someone left. Their real reason never fully surfaced. The exit interview gave you something you could work with. The actual thing went with them.',
                punch: 'You managed the answer. You never heard the truth.',
              },
            ].map((s) => (
              <div key={s.id} className="border-t-2 border-ao-dark pt-5">
                <p className="mb-3 font-sans text-[10px] uppercase tracking-[0.12em] text-ao-midGray">{s.id}</p>
                <p className="mb-3.5 font-serif text-[15px] leading-[1.72] text-[#333]">{s.body}</p>
                <p className="font-sans text-[12px] font-bold text-ao-red">{s.punch}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Structural reality */}
      <section className="bg-ao-dark px-6 py-16 md:px-12 md:py-24">
        <div className="mx-auto max-w-[860px]">
          <p className="mb-7 font-sans text-[10px] uppercase tracking-[0.2em] text-ao-brown">The structural reality</p>
          <p className="mb-5 font-serif text-[clamp(18px,2.2vw,22px)] font-normal leading-[1.72] text-[#E8E0D4]">
            The healthier your culture, the harder this is to see. In a healthy culture people engage. They push back on smaller
            things. They ask good questions. The conversation feels alive.{' '}
            <em className="italic text-[#E8C49A]">
              And still the largest concerns, the sharpest risks, the alternative someone was considering but decided not to raise —
              those do not reliably make it to the table.
            </em>{' '}
            Not because the culture failed. Because the system is working exactly as systems work when human beings operate inside
            them.
          </p>
          <p className="font-sans text-[12px] text-ao-brown">— From The Room by Bart Paden</p>
        </div>
      </section>

      {/* Who you're talking to */}
      <section className="bg-white px-6 py-16 md:px-12 md:py-24">
        <div className="mx-auto grid max-w-[1200px] grid-cols-1 items-start gap-12 md:grid-cols-[300px_1fr] md:gap-16">
          <div>
            <div className="aspect-[4/3] w-full overflow-hidden md:aspect-[3/4]">
              <img
                src="/images/Bart-52.jpg"
                alt="Bart Paden, founder of Archetype Original"
                className="h-full w-full object-cover object-top"
                loading="lazy"
              />
            </div>
            <p className="mt-2.5 font-sans text-[11px] text-ao-midGray">Bart Paden · Founder, Archetype Original</p>
          </div>
          <div>
            <p className="mb-3.5 font-sans text-[10px] uppercase tracking-[0.2em] text-ao-red">Who you&apos;re talking to</p>
            <h2 className="mb-4 font-serif text-[clamp(22px,2.8vw,32px)] font-normal leading-tight text-[#1a1a1a]">
              Not a theorist. Someone who&apos;s been inside the rooms you&apos;re describing.
            </h2>
            <p className="mb-3.5 font-sans text-[15px] leading-[1.75] text-[#444]">
              Thirty-three years building and leading companies across manufacturing, medical, insurance, legal, retail, law
              enforcement, education, government, nonprofit, and real estate — not as an outside observer, but as the person
              responsible for outcomes that affected real people.
            </p>
            <p className="mb-5 font-sans text-[15px] leading-[1.75] text-[#444]">
              Built and exited two companies. The most significant: a software engineering firm that grew from a home office to more
              than 100 people before its acquisition in 2022.
            </p>
            <div className="my-5 border-l-[3px] border-ao-red pl-[18px]">
              <p className="mb-2 font-sans text-[13px] leading-[1.72] text-[#555]">
                The pattern recognition he brings doesn&apos;t come from studying organizations. It comes from building them,
                leading them through pressure, and carrying the cost when decisions didn&apos;t land.
              </p>
              <p className="font-sans text-[13px] leading-[1.72] text-[#555]">
                The advisory is available to a limited number of leaders at any given time. That limit is intentional.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Two ways + Accidental CEO strip (flush) */}
      <section className="bg-ao-cream px-6 py-16 md:px-12 md:py-24">
        <div className="mx-auto max-w-[1000px]">
          <p className="mb-3.5 font-sans text-[10px] uppercase tracking-[0.2em] text-ao-red">Two ways to begin</p>
          <h2 className="mb-2 font-serif text-[clamp(26px,3vw,40px)] font-normal text-[#1a1a1a]">The book. Or the room.</h2>
          <p className="mb-8 font-sans text-base text-[#777]">Most people read the book first. Some already know they need the room.</p>

          <div className="mb-0 grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="border border-[#D8D4CE] bg-white p-8">
              <p className="mb-3 font-sans text-[10px] uppercase tracking-[0.12em] text-ao-midGray">Option 01 — The book</p>
              <h3 className="mb-2.5 font-serif text-2xl font-normal text-[#1a1a1a]">Read The Room</h3>
              <p className="mb-2 font-sans text-[13px] leading-[1.65] text-[#555]">
                Seventy pages. The full structural case for why your room cannot be fully honest — and what exists outside of it. No
                filler. Every chapter earns the next one.
              </p>
              <p className="mb-[18px] font-sans text-[12px] italic text-[#888]">Most people who read it reach out.</p>
              <p className="mb-2.5 font-sans text-[11px] text-ao-midGray">Ebook · $27</p>
              <a
                href="https://aobooks.samcart.com/products/the-room"
                target="_blank"
                rel="noopener noreferrer"
                className="mb-2 block rounded-[3px] bg-ao-red py-3 text-center font-sans text-[12px] font-bold tracking-[0.04em] text-white"
              >
                Get The Room — $27
              </a>
              <a
                href="/the-room"
                onClick={nav('/the-room')}
                className="block rounded-[3px] border border-[#ccc] py-[11px] text-center font-sans text-[12px] text-[#555]"
              >
                See full book page
              </a>
            </div>

            <div className="border-2 border-ao-dark bg-white p-8">
              <p className="mb-3 font-sans text-[10px] uppercase tracking-[0.12em] text-ao-midGray">Option 02 — The advisory</p>
              <h3 className="mb-2.5 font-serif text-2xl font-normal text-[#1a1a1a]">Start the conversation</h3>
              <p className="mb-2 font-sans text-[13px] leading-[1.65] text-[#555]">
                One room. Outside your system. No stake in your outcomes. No curriculum. No deliverables list. The conversation goes
                where it needs to go.
              </p>
              <p className="mb-[18px] font-sans text-[12px] italic text-[#888]">If you already know you need this, skip the book.</p>
              <p className="mb-2.5 font-sans text-[11px] text-ao-midGray">Private advisory · Limited availability</p>
              <a
                href="/engagement-inquiry"
                onClick={nav('/engagement-inquiry')}
                className="mb-2 block rounded-[3px] bg-ao-red py-3 text-center font-sans text-[12px] font-bold tracking-[0.04em] text-white"
              >
                Contact Bart directly
              </a>
              <a
                href="/advisory"
                onClick={nav('/advisory')}
                className="block rounded-[3px] border border-[#ccc] py-[11px] text-center font-sans text-[12px] text-[#555]"
              >
                How the advisory works
              </a>
            </div>
          </div>

          {/* Accidental CEO strip — zero gap: negative margin top or attach inside same bg */}
          <div className="mt-0 grid grid-cols-1 items-center gap-6 border-t-0 bg-ao-dark px-6 py-7 md:grid-cols-[minmax(0,140px)_1fr_auto] md:gap-8 md:px-8">
            <div className="mx-auto flex max-h-[160px] w-full max-w-[130px] shrink-0 items-center justify-center md:mx-0 md:max-h-[180px] md:max-w-[140px]">
              <img
                src="/images/accidental-ceo/accidental-ceo-cover.png"
                alt="Accidental CEO by Bart Paden"
                className="h-auto max-h-[160px] w-full object-contain md:max-h-[180px]"
                loading="lazy"
              />
            </div>
            <div className="text-center md:text-left">
              <p className="mb-1.5 font-sans text-[10px] uppercase tracking-[0.14em] text-ao-brown">Also by Bart Paden</p>
              <h3 className="mb-1.5 font-serif text-[17px] font-normal leading-snug text-[#E8E0D4]">
                Still trying to get a read on who Bart is? Read his full story in Accidental CEO.
              </h3>
              <p className="font-sans text-[12px] leading-normal text-ao-brown">
                The story of building something real — before any of this had a name.
              </p>
            </div>
            <div className="flex justify-center md:justify-end">
              <a
                href="https://www.lulu.com/shop/bart-paden/accidental-ceo/paperback/product-zmzpjrv.html"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex whitespace-nowrap rounded-[3px] border border-ao-red px-5 py-[11px] font-sans text-[12px] font-bold text-ao-red"
              >
                Order Accidental CEO →
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Body of work */}
      <section className="border-t border-[#E0DBD4] bg-white px-6 py-16 md:px-12 md:py-[72px]">
        <div className="mx-auto max-w-[1200px]">
          <p className="mb-5 font-sans text-[10px] uppercase tracking-[0.2em] text-ao-red">The body of work</p>
          <div className="mt-5 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
            {[
              {
                label: 'Research',
                title: 'Culture Science',
                desc: 'ALI, Scoreboard Leadership, The Bad Leader Project. The research engine behind the advisory.',
                link: 'Explore →',
                href: '/culture-science',
              },
              {
                label: 'Diagnostic',
                title: 'Archetype Leadership Index',
                desc: "Seven leadership conditions measured across your organization. What your internal rooms can't surface.",
                link: 'See ALI →',
                href: '/culture-science/ali',
              },
              {
                label: 'Journal',
                title: 'Long-form thinking',
                desc: 'Culture, accountability, servant leadership, AI, and what leading people actually costs.',
                link: 'Read the journal →',
                href: '/journal',
              },
              {
                label: 'Books',
                title: 'Three books on leadership',
                desc: 'The Room, Accidental CEO, Remaining Human. The human cost of every decision leaders make.',
                link: 'See all books →',
                href: '/books',
              },
            ].map((item) => (
              <div key={item.href} className="border-t border-[#E0DBD4] pt-4">
                <p className="mb-1.5 font-sans text-[10px] uppercase tracking-[0.12em] text-ao-red">{item.label}</p>
                <h3 className="mb-1.5 font-serif text-base font-normal leading-snug text-[#1a1a1a]">{item.title}</h3>
                <p className="mb-2 font-sans text-[12px] leading-relaxed text-ao-midGray">{item.desc}</p>
                <a href={item.href} onClick={nav(item.href)} className="mt-2 block font-sans text-[12px] text-ao-red">
                  {item.link}
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pre-footer CTA */}
      <section className="bg-ao-dark px-6 py-16 text-center md:px-12 md:py-24">
        <h2 className="mb-3 font-serif text-[clamp(26px,3vw,40px)] font-normal italic text-[#F0ECE4]">The room is available.</h2>
        <p className="mx-auto mb-8 max-w-[500px] font-sans text-base leading-[1.65] text-ao-brown">
          To a limited number of leaders. When you&apos;re ready, the conversation starts with Bart — not a process, not a team, not
          a form that routes you somewhere else.
        </p>
        <a
          href="/engagement-inquiry"
          onClick={nav('/engagement-inquiry')}
          className="inline-flex min-h-[44px] items-center justify-center rounded-[3px] bg-ao-red px-7 py-3.5 font-sans text-[13px] font-bold tracking-[0.04em] text-white"
        >
          Contact Bart directly
        </a>
      </section>
    </>
  );
}
