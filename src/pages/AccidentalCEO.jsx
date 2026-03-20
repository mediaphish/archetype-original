/**
 * Accidental CEO — book landing page (Lulu direct order links).
 * Copy and section order are fixed per content spec; styling matches public marketing pages.
 */
import React, { useState, useEffect } from 'react';
import SEO from '../components/SEO';
import { OptimizedImage } from '../components/OptimizedImage';
import { markdownToHtml } from '../lib/faqMarkdownToHtml';

const ACCIDENTAL_CEO_FAQ_CATEGORY = 'accidental-ceo';

/** Display order on this page (matches knowledge corpus slugs) */
const ACCIDENTAL_CEO_FAQ_ORDER = [
  'accidental-ceo-what-kind-of-book',
  'accidental-ceo-who-is-this-book-for',
  'accidental-ceo-how-different-from-other-leadership-books',
  'accidental-ceo-where-can-i-order',
  'accidental-ceo-why-order-directly',
  'accidental-ceo-can-i-use-archy-instead-of-reading',
  'accidental-ceo-is-bart-available-for-speaking',
];

const LULU_ORDER_URL =
  'https://www.lulu.com/shop/bart-paden/accidental-ceo/paperback/product-zmzpjrv.html';

function goToPath(e, path) {
  e.preventDefault();
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
  window.scrollTo({ top: 0, behavior: 'instant' });
}

function scrollToIntro(e) {
  e.preventDefault();
  document.getElementById('accidental-ceo-intro')?.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
  });
}

const learnItems = [
  'How culture is built through daily standards, not vision statements',
  'Why leaders must protect culture before it drifts',
  'How empowerment creates ownership, not compliance',
  'What accountability looks like under pressure',
  'How to lead with clarity, boundaries, and care',
  'Why sustainable servant leadership is the only model that lasts',
];

const audienceItems = [
  'Founders carrying more than expected',
  'Leaders responsible for people, not just outcomes',
  'Operators navigating growth, pressure, and uncertainty',
  'Anyone who stepped into leadership before feeling ready',
];

export default function AccidentalCEO() {
  const [bookFaqs, setBookFaqs] = useState([]);
  const [faqsLoading, setFaqsLoading] = useState(true);
  const [expandedFaqs, setExpandedFaqs] = useState(() => new Set());

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch('/knowledge.json');
        const data = await response.json();
        const docs = data.docs || data.documents || [];
        const raw = docs.filter(
          (doc) =>
            doc.type === 'faq' &&
            Array.isArray(doc.categories) &&
            doc.categories.some(
              (c) => c.toLowerCase() === ACCIDENTAL_CEO_FAQ_CATEGORY
            )
        );
        const orderIndex = (slug) => {
          const i = ACCIDENTAL_CEO_FAQ_ORDER.indexOf(slug);
          return i === -1 ? 999 : i;
        };
        raw.sort((a, b) => orderIndex(a.slug) - orderIndex(b.slug));
        if (!cancelled) setBookFaqs(raw);
      } catch (e) {
        console.error('Accidental CEO FAQs load error:', e);
        if (!cancelled) setBookFaqs([]);
      } finally {
        if (!cancelled) setFaqsLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleFaq = (slug) => {
    setExpandedFaqs((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  };

  const openFaqsPageFiltered = (e) => {
    e.preventDefault();
    window.history.pushState({}, '', '/faqs?category=accidental-ceo');
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  return (
    <>
      <SEO pageKey="accidental-ceo" />
      <div className="bg-white text-[#1A1A1A]">
        {/* 1. Hero */}
        <section
          className="py-8 sm:py-12 md:py-20 lg:py-24"
          aria-labelledby="accidental-ceo-hero-heading"
        >
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-8 md:gap-14 items-center">
              <div className="order-2 md:order-1 flex flex-col justify-center">
                <h1
                  id="accidental-ceo-hero-heading"
                  className="font-serif font-bold text-balance text-[#1A1A1A] mb-6"
                  style={{
                    fontSize: 'clamp(2.25rem, 4vw + 1rem, 4rem)',
                    lineHeight: '1.1',
                    letterSpacing: '-0.02em',
                  }}
                >
                  Accidental CEO
                </h1>
                <div className="space-y-4 mb-8 max-w-xl">
                  <p className="text-lg sm:text-xl md:text-2xl leading-relaxed text-[#1A1A1A]/80 font-light">
                    I didn&apos;t set out to be a CEO.
                  </p>
                  <p className="text-lg sm:text-xl md:text-2xl leading-relaxed text-[#1A1A1A]/80 font-light">
                    I became one because people needed leadership before I felt ready to give it.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-4">
                  <a
                    href={LULU_ORDER_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center min-h-[44px] bg-[#1A1A1A] text-white px-8 py-4 font-medium text-sm sm:text-base hover:bg-[#1A1A1A]/90 transition-colors text-center"
                  >
                    Order the Book
                  </a>
                  <button
                    type="button"
                    onClick={scrollToIntro}
                    className="inline-flex items-center justify-center min-h-[44px] bg-transparent text-[#1A1A1A] px-8 py-4 font-medium text-sm sm:text-base border border-[#1A1A1A]/25 hover:border-[#1A1A1A] hover:bg-[#FAFAF9] transition-colors text-center"
                  >
                    Learn More
                  </button>
                </div>
              </div>
              <div className="order-1 md:order-2 flex justify-center md:justify-end w-full">
                <div className="w-full max-w-lg sm:max-w-xl md:max-w-xl lg:max-w-2xl rounded-lg overflow-hidden bg-black shadow-md">
                  <OptimizedImage
                    src="/images/accidental-ceo/front-back.png"
                    alt="Accidental CEO — front and back cover"
                    className="w-full h-auto object-contain"
                    loading="eager"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 2. Intro */}
        <section
          id="accidental-ceo-intro"
          className="py-16 md:py-24 border-t border-[#1A1A1A]/10"
          aria-labelledby="accidental-ceo-intro-heading"
        >
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-6xl mx-auto">
              <div className="max-w-3xl">
                <h2
                  id="accidental-ceo-intro-heading"
                  className="font-serif text-2xl sm:text-3xl md:text-4xl font-bold text-[#1A1A1A] mb-8"
                >
                  Leadership Isn&apos;t Learned in Theory
                </h2>
                <div className="space-y-6 text-base sm:text-lg leading-relaxed text-[#1A1A1A]/80">
                  <p>
                    Accidental CEO is a leadership story about building something real, navigating growth and strain, and choosing to lead when the weight shows up before the clarity does.
                  </p>
                  <p>
                    This is not a theory book. It&apos;s a firsthand account of leadership formed through pressure, responsibility, and the decisions no one applauds.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. Core idea */}
        <section
          className="py-16 md:py-24 bg-[#FAFAF9] border-y border-[#1A1A1A]/10"
          aria-labelledby="accidental-ceo-core-heading"
        >
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-6xl mx-auto">
              <h2
                id="accidental-ceo-core-heading"
                className="font-serif text-xl sm:text-2xl font-semibold text-[#1A1A1A]/90 mb-10 md:mb-14 max-w-2xl"
              >
                What Actually Holds a Culture Together
              </h2>
              <div className="max-w-2xl space-y-6 md:space-y-8">
                <p className="font-serif text-2xl sm:text-3xl md:text-4xl font-medium text-[#1A1A1A] leading-snug">
                  Success doesn&apos;t hold a culture together.
                </p>
                <p className="font-serif text-2xl sm:text-3xl md:text-4xl font-medium text-[#1A1A1A] leading-snug">
                  Standards do.
                </p>
                <p className="font-serif text-2xl sm:text-3xl md:text-4xl font-medium text-[#1A1A1A] leading-snug">
                  Care does.
                </p>
                <p className="font-serif text-2xl sm:text-3xl md:text-4xl font-medium text-[#1A1A1A] leading-snug">
                  Clarity does.
                </p>
                <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]/80 max-w-2xl pt-4">
                  And leaders who refuse to choose between people and performance do.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 4. What you'll learn */}
        <section
          className="py-16 md:py-24"
          aria-labelledby="accidental-ceo-learn-heading"
        >
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-6xl mx-auto">
              <h2
                id="accidental-ceo-learn-heading"
                className="font-serif text-2xl sm:text-3xl md:text-4xl font-bold text-[#1A1A1A] mb-8 md:mb-10"
              >
                What You&apos;ll Take From This
              </h2>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-3 max-w-4xl list-disc pl-5 marker:text-[#C85A3C] text-base sm:text-lg leading-relaxed text-[#1A1A1A]/85">
                {learnItems.map((item) => (
                  <li key={item} className="pl-1">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* 5. Who this is for */}
        <section
          className="py-16 md:py-24 border-t border-[#1A1A1A]/10"
          aria-labelledby="accidental-ceo-audience-heading"
        >
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-6xl mx-auto">
              <h2
                id="accidental-ceo-audience-heading"
                className="font-serif text-2xl sm:text-3xl md:text-4xl font-bold text-[#1A1A1A] mb-8 md:mb-10"
              >
                Who This Is For
              </h2>
              <ul className="max-w-2xl space-y-4 text-base sm:text-lg leading-relaxed text-[#1A1A1A]/70">
                {audienceItems.map((item) => (
                  <li
                    key={item}
                    className="border-b border-[#1A1A1A]/10 pb-4 last:border-0 last:pb-0"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* 6. Leadership has a cost */}
        <section
          className="py-20 md:py-28"
          aria-labelledby="accidental-ceo-cost-heading"
        >
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-6xl mx-auto">
              <div className="max-w-2xl">
                <h2
                  id="accidental-ceo-cost-heading"
                  className="font-serif text-2xl sm:text-3xl md:text-4xl font-bold text-[#1A1A1A] mb-10"
                >
                  Leadership Has a Cost
                </h2>
                <div className="space-y-6 text-base sm:text-lg leading-relaxed text-[#1A1A1A]/80">
                  <p>This book doesn&apos;t ignore it.</p>
                  <p>
                    Accidental CEO addresses burnout, pressure, and the emotional weight leaders carry. It explores what happens when leaders ignore their limits—and what it takes to rebuild clarity, trust, and direction when things begin to fracture.
                  </p>
                  <p>This isn&apos;t about leading perfectly.</p>
                </div>
                <p className="mt-12 font-serif text-xl sm:text-2xl md:text-3xl font-medium text-[#1A1A1A] leading-snug border-l-4 border-[#C85A3C] pl-6">
                  It&apos;s about leading in a way that lasts.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Reviews (placeholder until quotes are provided) */}
        <section
          className="py-16 md:py-24 border-t border-[#1A1A1A]/10 bg-[#FAFAF9]"
          aria-labelledby="accidental-ceo-reviews-heading"
        >
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-3xl mx-auto text-center">
              <h2
                id="accidental-ceo-reviews-heading"
                className="font-serif text-2xl sm:text-3xl md:text-4xl font-bold text-[#1A1A1A] mb-4"
              >
                Reviews &amp; endorsements
              </h2>
              <p className="text-base sm:text-lg text-[#1A1A1A]/60 leading-relaxed">
                Reader reviews and endorsements coming soon.
              </p>
            </div>
          </div>
        </section>

        {/* 7. Archy */}
        <section
          className="py-16 md:py-24"
          aria-labelledby="accidental-ceo-archy-heading"
        >
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-6xl mx-auto">
              <div className="rounded-2xl border border-[#1A1A1A]/10 bg-[#FAFAF9] p-6 md:p-10">
                <div className="flex flex-col md:flex-row md:items-start gap-6 md:gap-8">
                  <div
                    className="shrink-0 w-12 h-12 rounded-full bg-white border border-[#1A1A1A]/10 flex items-center justify-center text-[#C85A3C]"
                    aria-hidden="true"
                  >
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.75}
                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                      />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2
                      id="accidental-ceo-archy-heading"
                      className="font-serif text-2xl sm:text-3xl font-bold text-[#1A1A1A] mb-6"
                    >
                      Go Deeper with Archy
                    </h2>
                    <div className="space-y-5 text-base sm:text-lg leading-relaxed text-[#1A1A1A]/80 max-w-2xl">
                      <p>Have questions about the book?</p>
                      <p>Archy has it all.</p>
                      <p>
                        The book gives you the story. Archy helps you work it out. Every principle, every concept, built into a conversation you can step into anytime.
                      </p>
                      <p>
                        Ask about leadership, culture, decisions, or something you&apos;re working through right now.
                      </p>
                      <p>
                        Start where you are. Follow the thread where it leads.
                      </p>
                    </div>
                    <div className="mt-8">
                      <a
                        href="/archy"
                        onClick={(e) => goToPath(e, '/archy')}
                        className="inline-flex items-center justify-center min-h-[44px] bg-[#1A1A1A] text-white px-8 py-4 font-medium text-sm sm:text-base hover:bg-[#1A1A1A]/90 transition-colors"
                      >
                        Start a Conversation with Archy
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Book FAQs (same corpus as main FAQ page) */}
        <section
          className="py-16 md:py-24 border-t border-[#1A1A1A]/10 bg-white"
          aria-labelledby="accidental-ceo-faq-heading"
        >
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-4xl mx-auto">
              <h2
                id="accidental-ceo-faq-heading"
                className="font-serif text-2xl sm:text-3xl md:text-4xl font-bold text-[#1A1A1A] mb-8"
              >
                Accidental CEO — FAQs
              </h2>

              {faqsLoading ? (
                <p className="text-lg text-[#1A1A1A]/60">Loading questions…</p>
              ) : bookFaqs.length === 0 ? (
                <p className="text-lg text-[#1A1A1A]/60">
                  Questions will appear here shortly.
                </p>
              ) : (
                <div className="space-y-4">
                  {bookFaqs.map((faq) => {
                    const isExpanded = expandedFaqs.has(faq.slug);
                    return (
                      <div
                        key={faq.slug}
                        className="bg-white border border-[#1A1A1A]/10 rounded-lg overflow-hidden hover:shadow-md transition-all duration-300"
                      >
                        <button
                          type="button"
                          onClick={() => toggleFaq(faq.slug)}
                          className="w-full px-6 py-5 text-left flex items-start justify-between gap-4 hover:bg-[#FAFAF9] transition-colors focus:outline-none focus:ring-2 focus:ring-[#C85A3C] focus:ring-inset"
                          aria-expanded={isExpanded}
                        >
                          <h3 className="text-lg sm:text-xl font-semibold text-[#1A1A1A] flex-1 pr-2">
                            {faq.title}
                          </h3>
                          <svg
                            className={`w-6 h-6 text-[#6B6B6B] flex-shrink-0 transition-transform duration-200 ${
                              isExpanded ? 'rotate-180' : ''
                            }`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 9l-7 7-7-7"
                            />
                          </svg>
                        </button>
                        {isExpanded && (
                          <div className="px-6 py-5 border-t border-[#1A1A1A]/10 bg-[#FAFAF9]">
                            <div
                              className="prose prose-sm max-w-none text-[#1A1A1A]/80 mb-4 space-y-4 [&>p]:mb-4 [&>ul]:mb-4 [&>ol]:mb-4 [&>li]:mb-1"
                              dangerouslySetInnerHTML={{
                                __html: markdownToHtml(faq.body || ''),
                              }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <p className="mt-10 text-sm text-[#6B6B6B]">
                <a
                  href="/faqs?category=accidental-ceo"
                  onClick={openFaqsPageFiltered}
                  className="text-[#C85A3C] font-medium hover:text-[#B54A32] underline"
                >
                  Open this category on the full FAQs page
                </a>
              </p>
            </div>
          </div>
        </section>

        {/* 8. Final CTA */}
        <section
          className="py-16 md:py-24 border-t border-[#1A1A1A]/10 pb-24 md:pb-32"
          aria-labelledby="accidental-ceo-final-heading"
        >
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-6xl mx-auto text-center">
              <h2
                id="accidental-ceo-final-heading"
                className="font-serif text-2xl sm:text-3xl md:text-4xl font-bold text-[#1A1A1A] mb-4"
              >
                If You&apos;ve Felt the Weight of Leadership…
              </h2>
              <p className="text-lg sm:text-xl text-[#1A1A1A]/75 mb-8 max-w-2xl mx-auto leading-relaxed">
                …before you felt ready for it, this will feel familiar.
              </p>
              <div className="space-y-4 text-base sm:text-lg leading-relaxed text-[#1A1A1A]/80 max-w-2xl mx-auto mb-10">
                <p>This isn&apos;t about becoming a different kind of leader.</p>
                <p>
                  It&apos;s about becoming the kind of leader people can trust—under pressure, over time, and when it matters most.
                </p>
              </div>
              <a
                href={LULU_ORDER_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center min-h-[44px] bg-[#1A1A1A] text-white px-10 py-4 font-medium text-sm sm:text-base hover:bg-[#1A1A1A]/90 transition-colors"
              >
                Order Accidental CEO
              </a>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
