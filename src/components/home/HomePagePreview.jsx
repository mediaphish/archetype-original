/**
 * Home page redesign, DRAFT (shown at /home-preview), 2026-10-19.
 *
 * Bart moved the offer from "the advisor outside your room" to an operator who
 * meets people where they are (see src/pages/WorkWithBart.jsx). He agreed The
 * Room no longer belongs in the opening, wanted the journal on the home page,
 * and was "open to a complete re-imagining of the whole thing."
 *
 * Order, settled with Bart the same day: who Bart is, how to work with him,
 * what he is writing now, the three books, then everything else. The offer
 * comes straight after the opening because the point of the change is work. Everything else is one compact row at the bottom.
 * The live home page (HomePage.jsx) is untouched until he approves this.
 */
import React, { useEffect, useState } from 'react';

function spaNavigate(path) {
  return (e) => {
    e.preventDefault();
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.scrollTo({ top: 0, behavior: 'instant' });
  };
}

const OPTIONS = [
  { name: 'One conversation', price: '$500', unit: 'one time', line: 'Ninety minutes on one real situation.' },
  { name: 'A season', price: '$1,500', unit: 'a month', line: 'Three months while you work through a stretch.' },
  { name: 'Ongoing', price: '$3,000', unit: 'a month', line: 'Someone in your corner for the long haul.' },
  { name: 'Rising leaders', price: '$150', unit: 'one conversation', line: 'Three a month, for those early in it.' },
];

const BOOKS = [
  {
    title: 'The Room',
    line: 'Why the conversation you most need often cannot happen inside your own room.',
    cover: '/images/advisory/the-room-cover.png',
    href: '/the-room',
  },
  {
    title: 'Accidental CEO',
    line: 'Building something real, and leading when the weight shows up before the clarity does.',
    cover: '/images/accidental-ceo/accidental-ceo-cover.png',
    href: '/accidental-ceo',
  },
  {
    title: 'Remaining Human',
    line: 'Servant leadership and staying human while intelligent systems reshape how decisions are made.',
    cover: '/images/remaining-human/cover-front.png',
    href: '/remaining-human',
  },
];

/**
 * Why Bart, in his own facts only: the 29-year software company sold in July
 * 2022 (journal, "I Called Myself Retired"), two exits and 12+ industries (site
 * stats), no stake in the outcome (the Advisory page's core idea), developing
 * young leaders (Bart, 2026-10-19), and three books plus a public journal.
 */
const WHY = [
  {
    title: 'I have done it, not studied it.',
    body: 'I spent twenty-nine years building a software company and sold it in 2022. The decisions you are carrying are ones I have carried.',
  },
  {
    title: 'I have seen your situation before.',
    body: 'Two exits and more than a dozen industries. Most problems have a shape, and I have usually seen yours somewhere else first.',
  },
  {
    title: 'I have no stake in your outcome.',
    body: 'I do not work for you or report to you. I can say the thing nobody inside your organization can afford to say.',
  },
  {
    title: 'You can know how I think before you pay me.',
    body: 'Three books and a public journal. Read a few entries. If it does not sound like help, it will not be.',
  },
];

const MORE = [
  { label: 'Daily', title: 'Devotionals', href: '/faith' },
  { label: 'Research', title: 'Culture Science', href: '/culture-science' },
  { label: 'Community', title: 'The Operators', href: '/operators' },
  { label: 'Listen', title: 'The Podcast', href: '/podcast' },
];

function formatDate(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

/** The three newest published journal entries, newest first, nothing dated in the future. */
function useLatestJournal(count = 3) {
  const [posts, setPosts] = useState(null);
  useEffect(() => {
    let cancelled = false;
    fetch('/api/knowledge?type=journal-post')
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const now = Date.now();
        const list = (data.docs || [])
          .filter((p) => p.status === 'published' && p.slug && p.title)
          .filter((p) => new Date(p.publish_date || p.date || 0).getTime() <= now)
          .sort((a, b) => new Date(b.publish_date || b.date || 0) - new Date(a.publish_date || a.date || 0))
          .slice(0, count);
        setPosts(list);
      })
      .catch(() => {
        if (!cancelled) setPosts([]);
      });
    return () => {
      cancelled = true;
    };
  }, [count]);
  return posts;
}

export default function HomePagePreview() {
  const nav = spaNavigate;
  const posts = useLatestJournal(3);

  return (
    <>
      {/* Hero */}
      <section className="home-hero-bg relative flex min-h-0 flex-col md:min-h-[86vh] md:justify-center md:items-start md:bg-cover md:bg-[url('/images/Bart-4.jpg')] md:bg-no-repeat">
        <div className="relative h-[min(42vh,320px)] min-h-[220px] w-full shrink-0 overflow-hidden md:hidden">
          <img src="/images/Bart-4.jpg" alt="" className="h-full w-full object-cover object-[center_22%]" loading="eager" decoding="async" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/25 via-black/45 to-stone-950" aria-hidden />
        </div>
        <div
          className="pointer-events-none absolute inset-0 z-[1] hidden md:block"
          style={{
            background:
              'linear-gradient(to right, rgba(43, 41, 41, 0.97) 0%, rgba(43, 41, 41, 0.94) 38%, rgba(43, 41, 41, 0.55) 62%, rgba(43, 41, 41, 0.12) 100%)',
          }}
        />
        <div className="relative z-[3] w-full max-w-[600px] bg-stone-950 px-6 py-10 pb-12 text-left md:bg-transparent md:px-16 md:py-20 md:pb-20">
          <p className="mb-6 font-sans text-[11px] uppercase tracking-[0.2em] text-ao-brown">Bart Paden · Archetype Original</p>
          <h1 className="mb-6 font-serif text-[clamp(28px,7vw,38px)] font-normal italic leading-[1.06] text-[#F0ECE4] md:text-[clamp(32px,3.8vw,52px)]">
            Thirty-four years of building things. On your side of the table.
          </h1>
          <p className="mb-10 max-w-[480px] font-sans text-base leading-[1.72] text-ao-midGray">
            I have built companies, led them, and sold two of them. I write about what that taught me, and I sit with leaders
            who are in the middle of it now.
          </p>
          <div className="flex max-w-full flex-col gap-3.5 sm:flex-row sm:gap-[14px]">
            <a
              href="/work-with-bart"
              onClick={nav('/work-with-bart')}
              className="inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-[3px] bg-ao-red px-7 py-3.5 text-center font-sans text-[13px] font-bold tracking-[0.04em] text-white"
            >
              Work with Bart
            </a>
            <a
              href="/journal"
              onClick={nav('/journal')}
              className="inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-[3px] border border-white/70 bg-black/30 px-7 py-3.5 text-center font-sans text-[13px] font-semibold text-[#F4F1EC] shadow-md md:border-white/55 md:bg-white/[0.12] md:text-[#F0ECE4] md:shadow-sm"
            >
              Read the journal
            </a>
          </div>
        </div>
      </section>

      {/* Numbers */}
      <section className="border-b border-[#E0DBD4] bg-ao-cream px-6 py-10 md:px-12">
        <div className="mx-auto grid max-w-[1000px] grid-cols-2 gap-8 text-center sm:grid-cols-4">
          {[
            ['34', 'Years building'],
            ['2', 'Exits'],
            ['12+', 'Industries'],
            ['3', 'Books'],
          ].map(([n, label]) => (
            <div key={label}>
              <div className="font-serif text-[32px] font-normal leading-none text-ao-dark">{n}</div>
              <div className="mt-2 font-sans text-[10px] uppercase tracking-[0.14em] text-ao-midGray">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Work with Bart */}
      <section className="bg-ao-dark px-6 py-16 md:px-12 md:py-24">
        <div className="mx-auto max-w-[1200px]">
          <p className="mb-3.5 font-sans text-[10px] uppercase tracking-[0.2em] text-ao-brown">Work with Bart</p>
          <h2 className="mb-4 max-w-[640px] font-serif text-[clamp(26px,3vw,40px)] font-normal leading-tight text-[#F0ECE4]">
            I meet you where you are.
          </h2>
          <p className="mb-12 max-w-[560px] font-sans text-base leading-[1.7] text-[#C9C1B6]">
            No program. No curriculum. Bring the situation you are actually in, at the size you need.
          </p>
          <div className="mb-14 grid gap-x-12 gap-y-8 md:grid-cols-2">
            {WHY.map((w) => (
              <div key={w.title} className="border-l-2 border-ao-red pl-5">
                <h3 className="mb-2 font-serif text-xl font-normal leading-snug text-[#F0ECE4]">{w.title}</h3>
                <p className="font-sans text-[15px] leading-[1.65] text-[#C9C1B6]">{w.body}</p>
              </div>
            ))}
          </div>
          <div className="grid gap-px overflow-hidden border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-4">
            {OPTIONS.map((o) => (
              <div key={o.name} className="bg-ao-dark p-6">
                <h3 className="font-serif text-xl font-normal text-[#F0ECE4]">{o.name}</h3>
                <p className="mt-4">
                  <span className="font-serif text-3xl text-[#F0ECE4]">{o.price}</span>
                  <span className="ml-2 font-sans text-[12px] text-[#A89F94]">{o.unit}</span>
                </p>
                <p className="mt-3 font-sans text-[14px] leading-[1.6] text-[#C9C1B6]">{o.line}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 flex flex-wrap gap-4">
            <a
              href="/work-with-bart"
              onClick={nav('/work-with-bart')}
              className="inline-flex min-h-[44px] items-center justify-center rounded-[3px] bg-ao-red px-7 py-3.5 font-sans text-[13px] font-bold tracking-[0.04em] text-white"
            >
              See how it works
            </a>
            <a
              href="/engagement-inquiry?option=conversation"
              onClick={nav('/engagement-inquiry?option=conversation')}
              className="inline-flex min-h-[44px] items-center justify-center rounded-[3px] border border-white/40 px-7 py-3.5 font-sans text-[13px] font-semibold text-[#F0ECE4] hover:bg-white/10"
            >
              Book a conversation
            </a>
          </div>
        </div>
      </section>

      {/* From the journal */}
      <section className="bg-white px-6 py-16 md:px-12 md:py-24">
        <div className="mx-auto max-w-[1200px]">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="mb-3.5 font-sans text-[10px] uppercase tracking-[0.2em] text-ao-red">From the journal</p>
              <h2 className="max-w-[620px] font-serif text-[clamp(26px,3vw,40px)] font-normal leading-tight text-[#1a1a1a]">
                What I am thinking about right now.
              </h2>
            </div>
            <a href="/journal" onClick={nav('/journal')} className="font-sans text-[13px] font-semibold text-ao-red">
              All entries →
            </a>
          </div>
          {posts === null ? (
            <p className="font-sans text-sm text-ao-midGray">Loading the latest entries…</p>
          ) : posts.length === 0 ? (
            <a href="/journal" onClick={nav('/journal')} className="font-sans text-sm text-ao-red">
              Read the journal →
            </a>
          ) : (
            <div className="grid gap-10 md:grid-cols-3">
              {posts.map((p) => (
                <a key={p.slug} href={`/journal/${p.slug}`} onClick={nav(`/journal/${p.slug}`)} className="group block">
                  {p.image ? (
                    <div className="mb-5 aspect-[16/10] overflow-hidden bg-stone-100">
                      <img
                        src={p.image}
                        alt=""
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                        loading="lazy"
                      />
                    </div>
                  ) : null}
                  <p className="mb-2 font-sans text-[11px] uppercase tracking-[0.12em] text-ao-midGray">
                    {formatDate(p.publish_date || p.date)}
                  </p>
                  <h3 className="mb-2.5 font-serif text-xl font-normal leading-snug text-[#1a1a1a] group-hover:text-ao-red">
                    {p.title}
                  </h3>
                  {p.summary ? (
                    <p className="line-clamp-3 font-sans text-[14px] leading-[1.65] text-[#555]">{p.summary}</p>
                  ) : null}
                </a>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Books */}
      <section className="border-t border-[#E0DBD4] bg-ao-cream px-6 py-16 md:px-12 md:py-24">
        <div className="mx-auto max-w-[1200px]">
          <p className="mb-3.5 font-sans text-[10px] uppercase tracking-[0.2em] text-ao-red">The books</p>
          <h2 className="mb-12 max-w-[620px] font-serif text-[clamp(26px,3vw,40px)] font-normal leading-tight text-[#1a1a1a]">
            Three books on what leading people actually costs.
          </h2>
          <div className="grid gap-10 sm:grid-cols-3">
            {BOOKS.map((b) => (
              <a key={b.href} href={b.href} onClick={nav(b.href)} className="group block">
                <div className="mb-5 flex aspect-[3/4] items-center justify-center overflow-hidden bg-white p-6 shadow-sm">
                  <img src={b.cover} alt={`${b.title} cover`} className="max-h-full max-w-full object-contain" loading="lazy" />
                </div>
                <h3 className="mb-2 font-serif text-xl font-normal text-[#1a1a1a] group-hover:text-ao-red">{b.title}</h3>
                <p className="font-sans text-[14px] leading-[1.6] text-[#555]">{b.line}</p>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* More from Bart */}
      <section className="border-t border-[#E0DBD4] bg-white px-6 py-16 md:px-12 md:py-[72px]">
        <div className="mx-auto max-w-[1200px]">
          <p className="mb-5 font-sans text-[10px] uppercase tracking-[0.2em] text-ao-red">More from Bart</p>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {MORE.map((m) => (
              <a key={m.href} href={m.href} onClick={nav(m.href)} className="group border-t border-[#E0DBD4] pt-4">
                <p className="mb-1.5 font-sans text-[10px] uppercase tracking-[0.12em] text-ao-red">{m.label}</p>
                <h3 className="font-serif text-base font-normal leading-snug text-[#1a1a1a] group-hover:text-ao-red">{m.title}</h3>
              </a>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
