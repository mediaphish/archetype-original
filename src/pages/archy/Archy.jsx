import React from 'react';
import SEO from '../../components/SEO';

/**
 * Meet Archy (/archy) — matches marketing system used on Meet Bart and Advisory:
 * font-serif / font-sans, AO tokens, section rhythm from cursor-archy.md + archy-preview.html.
 * Opens floating Archy chat via `ao-open-chat` (same as the rest of the site).
 */
export default function Archy() {
  const goToPath = (e, path) => {
    e.preventDefault();
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const openArchyChat = (e) => {
    e.preventDefault();
    window.dispatchEvent(new CustomEvent('ao-open-chat'));
  };

  const labelClass =
    'mb-5 font-sans text-[10px] font-semibold uppercase tracking-[0.16em] text-ao-brown sm:mb-6';

  const labelWhiteSoft =
    'mb-0 font-sans text-[11px] font-bold uppercase tracking-[0.16em] text-white/70 sm:mb-0';

  return (
    <>
      <SEO pageKey="archy" />
      <div className="min-h-screen bg-warm-offWhite font-sans text-[15px] leading-[1.75] text-[#1A1A1A] antialiased">
        {/* 1. Hero */}
        <section className="relative flex min-h-[80vh] items-center overflow-hidden bg-ao-dark">
          <div className="mx-auto grid w-full max-w-[1400px] grid-cols-1 items-center gap-12 px-6 py-20 sm:px-10 lg:grid-cols-[1fr_480px] lg:gap-[60px] lg:py-24">
            <div>
              <p className={labelClass}>Meet Archy · Archetype Original</p>
              <h1 className="mb-7 font-serif text-[clamp(36px,4.5vw,60px)] font-normal leading-[1.1] text-white">
                <span className="block">Not a chatbot.</span>
                <span className="block">Bart&apos;s brain.</span>
                <span className="mt-1 block font-serif italic text-ao-red">Available now.</span>
              </h1>
              <p className="mb-10 max-w-[520px] text-base leading-[1.75] text-white/[0.65]">
                Archy is trained on every word Bart has written, every framework he has built, and
                thirty-three years of pattern recognition from real organizations. He doesn&apos;t
                pull from the internet. He pulls from the corpus.
              </p>
              <div className="flex flex-wrap gap-4">
                <button
                  type="button"
                  onClick={openArchyChat}
                  className="inline-block min-h-[44px] rounded-[2px] bg-ao-red px-8 py-3.5 text-center text-[13px] font-semibold uppercase tracking-[0.06em] text-white transition-opacity hover:opacity-90"
                >
                  Talk to Archy
                </button>
                <a
                  href="/culture-science/ali"
                  onClick={(e) => goToPath(e, '/culture-science/ali')}
                  className="inline-block min-h-[44px] rounded-[2px] border border-white/40 bg-transparent px-8 py-3.5 text-center text-[13px] font-semibold uppercase tracking-[0.06em] text-white transition-colors hover:border-white hover:bg-white/[0.08]"
                >
                  Explore ALI
                </a>
              </div>
            </div>
            <div className="flex justify-center lg:justify-end">
              <img
                src="/images/archy-at-the-desk.jpg"
                alt="Archy at Bart&apos;s desk"
                className="h-auto w-full max-w-[420px] object-contain drop-shadow-[0_20px_60px_rgba(0,0,0,0.4)]"
                loading="eager"
              />
            </div>
          </div>
        </section>

        {/* 2. Warning band */}
        <section className="bg-ao-red">
          <div className="mx-auto grid max-w-[1400px] grid-cols-1 items-center gap-8 px-6 py-12 sm:px-10 sm:py-14 md:grid-cols-[auto_1fr] md:gap-10 lg:px-10 lg:py-12">
            <p className={labelWhiteSoft}>Before you assume</p>
            <p className="font-serif text-[clamp(18px,2vw,26px)] font-normal leading-[1.45] text-white">
              He is not a generic AI assistant. He doesn&apos;t know everything about everything. He
              knows one thing deeply: how leadership actually works inside real organizations,
              because that&apos;s all he has ever been trained on.
            </p>
          </div>
        </section>

        {/* 3. What Archy Is */}
        <section className="bg-white">
          <div className="mx-auto grid max-w-[1400px] grid-cols-1 items-center gap-12 px-6 py-20 sm:px-10 sm:py-24 lg:grid-cols-[1fr_440px] lg:gap-[100px] md:py-[100px]">
            <div>
              <p className={labelClass}>What Archy Is</p>
              <h2 className="mb-10 font-serif text-[clamp(28px,3vw,40px)] font-normal leading-[1.2] text-[#1A1A1A]">
                The digitized extension of thirty-three years of lived leadership.
              </h2>
              <div className="space-y-6 text-[#3A3A3A] [&_p]:leading-[1.85]">
                <p>
                  Most AI tools are generalists. They know a little about everything. Ask them a
                  leadership question and they&apos;ll give you a competent, generic answer that
                  could have come from anywhere.
                </p>
                <p>
                  Archy is different because his source material is different. He is trained
                  exclusively on Bart&apos;s corpus: the books, the frameworks, the journal, the
                  notes from real engagements with real organizations. When you ask Archy a
                  question, you are pulling from a specific point of view built on decades of
                  pattern recognition, not from an aggregated summary of the internet.
                </p>
                <p>
                  That corpus is growing. Every engagement Bart leads, every advisory session,
                  every consulting project, every note from every room adds to what Archy knows. He
                  doesn&apos;t get more generic over time. He gets more specific.
                </p>
                <p>
                  Right now that corpus sits at roughly 200,000 words. The target is 500,000: the
                  threshold at which Archy becomes comprehensive enough to address most leadership
                  and organizational questions with real depth. That milestone unlocks a paid access
                  tier for leaders who want Archy as a standing resource.
                </p>
                <p>Until then, he is free. And he is already more useful than most tools leaders are paying for.</p>
              </div>
            </div>
            <div className="w-full overflow-hidden rounded-sm lg:max-w-[440px]">
              <img
                src="/images/archy-in-conversation.jpg"
                alt="Archy in conversation at the table"
                className="h-auto w-full object-cover object-[center_top] md:h-[500px] md:max-h-[560px]"
                loading="lazy"
              />
            </div>
          </div>
        </section>

        {/* 4. How He Works */}
        <section className="bg-ao-dark">
          <div className="mx-auto grid max-w-[1400px] grid-cols-1 items-center gap-12 px-6 py-20 sm:px-10 sm:py-24 lg:grid-cols-[440px_1fr] lg:gap-[100px] md:py-[100px]">
            <div className="order-2 w-full overflow-hidden rounded-sm lg:order-1 lg:max-w-[440px]">
              <img
                src="/images/archy-in-the-hallway.jpg"
                alt="Archy in the hallway"
                className="h-auto w-full object-cover object-center md:h-[500px] md:max-h-[560px]"
                loading="lazy"
              />
            </div>
            <div className="order-1 lg:order-2">
              <p className={labelClass}>How He Works</p>
              <h2 className="mb-10 font-serif text-[clamp(28px,3vw,40px)] font-normal leading-[1.2] text-white">
                Context-aware across every corner of the site. Connected to every AO system.
              </h2>
              <div className="space-y-6 text-white/[0.72] [&_p]:leading-[1.85]">
                <p>
                  Archy isn&apos;t a page you visit once. He is present across the entire Archetype
                  Original ecosystem. Every page on the site has access to him. If you don&apos;t
                  understand what you&apos;re reading, ask Archy. If you want to go deeper on a
                  concept, ask Archy. He knows the site and he knows the material behind it.
                </p>
                <p>
                  Inside ALI, he goes further. When a leader runs their survey and gets their data
                  back, Archy is the intelligence layer that makes that data actionable. He
                  doesn&apos;t just show you a score. He tells you what the score means, what&apos;s
                  driving it, what to address first, and what the pattern says about where your
                  organization is headed. Every condition in the ALI dashboard has an &quot;Ask
                  Archy&quot; entry point for exactly that reason.
                </p>
                <p>
                  He is also the intelligence behind The Operators, Bart&apos;s peer community for
                  founders and executives. He understands the frameworks, the language, and the
                  context that community operates in.
                </p>
                <p>
                  When a question goes beyond what the corpus can honestly answer, when what&apos;s
                  needed is a real conversation with a real person who has been in that room, Archy
                  says so. He routes to Bart directly. That handoff is intentional. It protects the
                  integrity of every answer he gives.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 5. The Ecosystem */}
        <section className="bg-ao-cream">
          <div className="mx-auto max-w-[1400px] px-6 py-20 sm:px-10 sm:py-24 md:py-[100px]">
            <div className="mb-14 max-w-[720px]">
              <p className={labelClass}>The Ecosystem</p>
              <h2 className="mb-5 font-serif text-[clamp(28px,3vw,40px)] font-normal leading-[1.2] text-[#1A1A1A]">
                Archy is wired into every AO system.
              </h2>
              <p className="text-base leading-[1.75] text-[#666]">
                He is not a standalone feature. He is the connective intelligence across the entire
                Archetype Original platform.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-0.5 md:grid-cols-3">
              {[
                {
                  label: 'Leadership Intelligence',
                  title: 'ALI Integration',
                  body:
                    'When ALI measures the leadership conditions inside your organization, Archy interprets that data. He connects scores to patterns, patterns to causes, and causes to action. The dashboard tells you what. Archy tells you why and what to do about it.',
                },
                {
                  label: 'Site-wide',
                  title: 'Context Awareness',
                  body:
                    "Every page on the site has access to Archy. Reading about servant leadership and want to go deeper? Ask him. Reviewing the consulting approach and have a question about how it applies to your situation? Ask him. He knows the context you're in.",
                },
                {
                  label: 'Community',
                  title: 'The Operators',
                  body:
                    'Archy is the intelligence layer behind The Operators, the peer community for founders and executives navigating real leadership challenges. He understands the frameworks, the language, and the specific context that community operates in.',
                },
              ].map((card) => (
                <div key={card.title} className="bg-white p-8 sm:p-10">
                  <p className="mb-4 font-sans text-[11px] font-semibold uppercase tracking-[0.16em] text-ao-red">
                    {card.label}
                  </p>
                  <h3 className="mb-3.5 font-serif text-[22px] font-normal text-[#1A1A1A]">{card.title}</h3>
                  <p className="text-sm leading-[1.7] text-[#6B6B6B]">{card.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 6. Where This Is Going */}
        <section className="bg-white">
          <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-12 px-6 py-20 sm:px-10 sm:py-24 lg:grid-cols-2 lg:gap-[100px] lg:items-start md:py-[100px]">
            <div>
              <p className={labelClass}>Where This Is Going</p>
              <h2 className="mb-10 font-serif text-[clamp(28px,3vw,40px)] font-normal leading-[1.2] text-[#1A1A1A]">
                The goal is an autonomous agent that gives real answers to hard leadership questions.
              </h2>
              <div className="space-y-6 text-[#3A3A3A] [&_p]:leading-[1.85]">
                <p>
                  Not a search engine. Not a summarizer. An agent that understands the specific
                  situation a leader is facing, draws on a comprehensive corpus of lived leadership
                  experience, and provides a genuine answer: the kind of answer that used to require
                  an appointment.
                </p>
                <p>
                  Every word Bart writes adds to that corpus. Every engagement he leads feeds Archy
                  new pattern recognition from real organizations. Every ALI deployment adds data
                  about how leadership conditions actually behave in the field. The corpus compounds.
                </p>
                <p>
                  At 500,000 words, Archy becomes something most leadership tools will never be: a
                  genuine domain expert with a consistent point of view, trained by someone who was
                  actually in the rooms he&apos;s describing. Not aggregated wisdom. Specific wisdom.
                  Hard-earned and documented.
                </p>
                <p>
                  That&apos;s what&apos;s being built. The free version available today is the
                  foundation. What it becomes is the reason to pay attention now.
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-0.5">
              <div className="bg-warm-offWhite p-8 sm:p-10">
                <div className="mb-2 flex flex-wrap items-baseline gap-1 font-serif text-[56px] font-normal leading-none text-[#1A1A1A]">
                  <span>200</span>
                  <span className="font-serif text-[28px] font-normal text-ao-red">k</span>
                </div>
                <p className="mb-3 font-sans text-[13px] font-semibold uppercase tracking-[0.06em] text-[#6B6B6B]">
                  Words in corpus today
                </p>
                <p className="mb-6 text-sm leading-[1.7] text-[#6B6B6B]">
                  Books, frameworks, journal posts, engagement notes, and leadership materials built
                  over thirty-three years.
                </p>
                <div className="mb-2 h-[3px] w-full rounded-full bg-[#1A1A1A]/10">
                  <div className="h-full w-[40%] rounded-full bg-ao-red" />
                </div>
                <div className="flex justify-between font-sans text-[11px] text-[#6B6B6B]">
                  <span>Current</span>
                  <span>500k target</span>
                </div>
              </div>
              <div className="bg-warm-offWhite p-8 sm:p-10">
                <div className="mb-2 font-serif text-[56px] font-normal leading-none text-[#1A1A1A]">
                  500k
                </div>
                <p className="mb-3 font-sans text-[13px] font-semibold uppercase tracking-[0.06em] text-[#6B6B6B]">
                  Target threshold
                </p>
                <p className="text-sm leading-[1.7] text-[#6B6B6B]">
                  The point at which Archy becomes comprehensive enough to address most leadership and
                  organizational questions with genuine depth. This unlocks paid access.
                </p>
              </div>
              <div className="bg-warm-offWhite p-8 sm:p-10">
                <div className="mb-2 font-serif text-[56px] font-normal leading-none text-[#1A1A1A]">
                  + Every
                </div>
                <p className="mb-3 font-sans text-[13px] font-semibold uppercase tracking-[0.06em] text-[#6B6B6B]">
                  Engagement feeds the corpus
                </p>
                <p className="text-sm leading-[1.7] text-[#6B6B6B]">
                  Every advisory session, consulting engagement, and mentorship conversation adds to
                  what Archy knows. The corpus grows with every room Bart enters.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 7. Close */}
        <section className="bg-ao-dark px-6 py-24 text-center sm:px-10 sm:py-28 md:py-[100px]">
          <div className="mx-auto max-w-[640px]">
            <p className={`${labelClass} text-center`}>He&apos;s Ready When You Are</p>
            <h2 className="mb-6 font-serif text-[clamp(32px,4vw,52px)] font-normal leading-[1.15] text-white">
              Ask him something real.
            </h2>
            <p className="mb-11 text-base leading-[1.75] text-white/[0.7]">
              Not a test question. Not a generic prompt. Ask him the leadership question you&apos;ve
              been carrying. See what thirty-three years of pattern recognition says about it.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <button
                type="button"
                onClick={openArchyChat}
                className="inline-block min-h-[44px] rounded-[2px] bg-ao-red px-8 py-3.5 text-[13px] font-semibold uppercase tracking-[0.06em] text-white transition-opacity hover:opacity-90"
              >
                Talk to Archy
              </button>
              <a
                href="/meet-bart"
                onClick={(e) => goToPath(e, '/meet-bart')}
                className="inline-block min-h-[44px] rounded-[2px] border border-white/30 bg-transparent px-8 py-3.5 text-[13px] font-semibold uppercase tracking-[0.06em] text-white/80 transition-colors hover:border-white/70 hover:text-white"
              >
                Meet Bart
              </a>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
