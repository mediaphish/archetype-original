/**
 * Home page redesign, 2026-10-19, live 2026-10-21.
 *
 * Bart moved the offer from "the advisor outside your room" to an operator who
 * meets people where they are (see src/pages/WorkWithBart.jsx). He agreed The
 * Room no longer belongs in the opening, wanted the journal on the home page,
 * and was "open to a complete re-imagining of the whole thing."
 *
 * Order, settled with Bart the same day: who Bart is, how to work with him,
 * what he is writing now, the three books, then everything else. The offer
 * comes straight after the opening because the point of the change is work. Everything else is one compact row at the bottom.
 * The previous home page (Leadership Advisory and the honest room) is in git
 * history before 2026-10-21.
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

// In the order Bart wrote them (set 2026-10-20). Photos are his desk shots of each book.
const BOOKS = [
  {
    title: 'Accidental CEO',
    line: 'Building something real, and leading when the weight shows up before the clarity does.',
    cover: '/images/books/accidental-ceo-desk.jpg',
    href: '/accidental-ceo',
  },
  {
    title: 'Remaining Human',
    line: 'Servant leadership and staying human while intelligent systems reshape how decisions are made.',
    cover: '/images/books/remaining-human-desk.jpg',
    href: '/remaining-human',
  },
  {
    title: 'The Room',
    line: 'Why the conversation you most need often cannot happen inside your own room.',
    cover: '/images/books/the-room-desk.jpg',
    href: '/the-room',
  },
]

/**
 * Why Bart, rewritten 2026-10-19 after reading his journal for voice (Bart:
 * "I care how it goes for you" read as generic). His own facts only: the 29-year software company sold in July
 * 2022 (journal, "I Called Myself Retired"), two exits and 12+ industries (site
 * stats), outside their ecosystem (Bart's correction of the Advisory idea), developing
 * young leaders and four years studying business, leadership and AI (Bart,
 * 2026-10-19), and three books plus a public journal. Bart rejected "no stake in
 * your outcome": he does have a stake, he just does not live in their ecosystem.
 */
const WHY = [
  {
    title: 'I have carried what you are carrying.',
    body: 'I have built several businesses over thirty-four years. The longest was a software company I grew for twenty-nine years and sold in July 2022, and through it I was connected to 13 different industries.',
  },
  {
    title: 'Then I went back and checked my work.',
    body: 'I spent the four years since studying business, leadership and AI, and testing three decades of my own decisions against the research. I care about what works, not what sounds good in a meeting.',
  },
  {
    title: 'I do not live inside your ecosystem.',
    body: 'Everyone around you is shaped by the system you lead, and so is everything they tell you. I am not. I have a real stake in how this goes for you, but none of the pressure that comes from living inside it. That is what lets me tell you the truth and help you do something with it.',
  },
  {
    title: 'Your people matter more than the plan.',
    body: 'My favorite part of building businesses was never the product. It was developing people into real leaders. A plan that hits the number and diminishes the people doing the work is not one I will help you run.',
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

export default function HomePage() {
  const nav = spaNavigate;
  const posts = useLatestJournal(3);

  return (
    <>
      {/* Hero
          Bart, 2026-10-23: the text must never sit on his face, and the phone
          crop was wrong. On wider screens the photo now fills only the right
          side and fades into a solid panel behind the text, so the two cannot
          overlap at any width. On phones the photo is a taller frame on him,
          with the text below. */}
      <section className="relative flex min-h-0 flex-col bg-stone-950 md:min-h-[86vh] md:justify-center md:items-start md:bg-ao-dark">
        <div className="relative h-[min(58vh,460px)] min-h-[300px] w-full shrink-0 overflow-hidden md:hidden">
          <img src="/images/bart-room-laptop-2026-v3.jpg" alt="" className="h-full w-full object-cover object-[66%_30%]" loading="eager" decoding="async" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-b from-transparent to-stone-950" aria-hidden />
        </div>
        <div className="pointer-events-none absolute inset-y-0 right-0 z-[1] hidden w-[68%] overflow-hidden md:block lg:w-[66%] xl:w-full" aria-hidden>
          <img src="/images/bart-room-laptop-2026-v3.jpg" alt="" className="h-full w-full object-cover object-[60%_30%]" loading="eager" decoding="async" />
          <div
            className="absolute inset-0 xl:hidden"
            style={{
              background:
                'linear-gradient(to right, rgba(43, 41, 41, 1) 0%, rgba(43, 41, 41, 1) 4%, rgba(43, 41, 41, 0.75) 22%, rgba(43, 41, 41, 0.3) 38%, rgba(43, 41, 41, 0) 52%)',
            }}
          />
          {/* Wide screens: the photo runs under the text with a light fade (Bart, 2026-10-23: too dark on the left). */}
          <div
            className="absolute inset-0 hidden xl:block"
            style={{
              background:
                'linear-gradient(to right, rgba(43, 41, 41, 0.72) 0%, rgba(43, 41, 41, 0.58) 26%, rgba(43, 41, 41, 0.25) 44%, rgba(43, 41, 41, 0) 60%)',
            }}
          />
        </div>
        {/* Text lines up with the logo: same width and side padding as the header (Bart, 2026-10-22). */}
        <div className="relative z-[3] mx-auto w-full max-w-[1600px] md:px-6 lg:px-10 xl:px-14">
        <div className="w-full max-w-[600px] bg-stone-950 px-6 pt-4 pb-12 text-left md:max-w-[400px] md:bg-transparent md:px-0 md:py-20 md:pb-20 lg:max-w-[460px] xl:max-w-[540px]">
          <p className="mb-6 font-sans text-[11px] uppercase tracking-[0.2em] text-ao-brown">Bart Paden · Archetype Original</p>
          <h1 className="mb-6 font-serif text-[clamp(28px,7vw,38px)] font-normal italic leading-[1.06] text-[#F0ECE4] md:text-[clamp(32px,3.2vw,50px)]">
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
        </div>
      </section>

      {/* Numbers */}
      <section className="border-b border-[#E0DBD4] bg-ao-cream px-6 py-10 md:px-12">
        <div className="mx-auto grid max-w-[1000px] grid-cols-2 gap-8 text-center sm:grid-cols-4">
          {[
            ['34', 'Years building'],
            ['2', 'Exits'],
            ['13', 'Industries'],
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
            There is no program here, because your situation was not built from one. You bring what is actually in front
            of you, and we work it until you can see it clearly. Then we work the next thing.
          </p>
          <div className="mb-8 grid gap-x-12 gap-y-8 md:grid-cols-2">
            {WHY.map((w) => (
              <div key={w.title} className="border-l-2 border-ao-red pl-5">
                <h3 className="mb-2 font-serif text-xl font-normal leading-snug text-[#F0ECE4]">{w.title}</h3>
                <p className="font-sans text-[15px] leading-[1.65] text-[#C9C1B6]">{w.body}</p>
              </div>
            ))}
          </div>
          <p className="mb-14 max-w-[640px] font-serif text-lg italic leading-[1.6] text-[#E8E0D4]">
            You can see how I think before you spend a dollar. Read one of my three books, or a few entries in the journal.
          </p>
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
                <div className="mb-5 aspect-square overflow-hidden shadow-sm">
                  <img
                    src={b.cover}
                    alt={`${b.title} by Bart Paden, standing on a desk`}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                    loading="lazy"
                  />
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
