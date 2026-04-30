import React, { useEffect, useMemo, useState } from 'react';
import { markdownToHtml } from '../lib/faqMarkdownToHtml';
import { FAQ_CATEGORY_CONFIG, normalizeFaqCategory } from '../lib/faqCategories';

const DESKTOP_PER_PAGE = 18;
const MOBILE_BATCH_SIZE = 12;
/** Match Tailwind md (768px): at this width and up we paginate; below we use Show More. */
const DESKTOP_MEDIA = '(min-width: 768px)';

function readDesktopPaginationMatch() {
  if (typeof window === 'undefined') return false;
  try {
    return window.matchMedia(DESKTOP_MEDIA).matches;
  } catch {
    return window.innerWidth >= 768;
  }
}

function getPrimaryCategory(faq) {
  if (!Array.isArray(faq.categories) || !faq.categories.length) return '';
  return normalizeFaqCategory(faq.categories[0]);
}

function includesCategory(faq, category) {
  if (!Array.isArray(faq.categories)) return false;
  return faq.categories.some((item) => normalizeFaqCategory(item) === category);
}

function matchesQuery(faq, query) {
  if (!query) return true;
  const normalized = query.toLowerCase();
  const titleMatch = String(faq.title || '').toLowerCase().includes(normalized);
  const bodyMatch = String(faq.body || '').toLowerCase().includes(normalized);
  const categoryMatch = Array.isArray(faq.categories)
    ? faq.categories.some((item) => String(item).toLowerCase().includes(normalized))
    : false;
  return titleMatch || bodyMatch || categoryMatch;
}

export default function FAQs() {
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSlug, setExpandedSlug] = useState('');
  const [page, setPage] = useState(1);
  const [mobileVisibleCount, setMobileVisibleCount] = useState(MOBILE_BATCH_SIZE);
  /** Set immediately on the client so pagination is not delayed behind other content. */
  const [useDesktopPagination, setUseDesktopPagination] = useState(readDesktopPaginationMatch);

  useEffect(() => {
    const mediaQuery = window.matchMedia(DESKTOP_MEDIA);
    const syncLayout = () => {
      setUseDesktopPagination(mediaQuery.matches || window.innerWidth >= 768);
    };
    syncLayout();
    mediaQuery.addEventListener('change', syncLayout);
    window.addEventListener('resize', syncLayout);
    return () => {
      mediaQuery.removeEventListener('change', syncLayout);
      window.removeEventListener('resize', syncLayout);
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const categoryParam = normalizeFaqCategory(params.get('category') || '');
    const queryParam = (params.get('q') || '').trim();
    const pageParam = parseInt(params.get('page') || '1', 10);

    if (categoryParam && FAQ_CATEGORY_CONFIG.some((item) => item.key === categoryParam)) {
      setSelectedCategory(categoryParam);
    }
    if (queryParam) setSearchQuery(queryParam);
    if (!Number.isNaN(pageParam) && pageParam > 0) setPage(pageParam);
  }, []);

  useEffect(() => {
    const loadFAQs = async () => {
      try {
        const response = await fetch('/knowledge.json');
        const data = await response.json();
        const docs = data.docs || data.documents || [];
        const faqDocs = docs
          .filter((doc) => doc.type === 'faq')
          .sort((a, b) => String(a.title || '').localeCompare(String(b.title || ''), undefined, { sensitivity: 'base' }));
        setFaqs(faqDocs);
      } catch (error) {
        console.error('Error loading FAQs:', error);
      } finally {
        setLoading(false);
      }
    };

    loadFAQs();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedCategory !== 'all') params.set('category', selectedCategory);
    if (searchQuery.trim()) params.set('q', searchQuery.trim());
    if (useDesktopPagination && page > 1) params.set('page', String(page));
    const query = params.toString();
    const url = query ? `/faqs?${query}` : '/faqs';
    window.history.replaceState({}, '', url);
  }, [selectedCategory, searchQuery, page, useDesktopPagination]);

  useEffect(() => {
    setPage(1);
    setMobileVisibleCount(MOBILE_BATCH_SIZE);
    setExpandedSlug('');
  }, [selectedCategory, searchQuery]);

  const searchMatchedFaqs = useMemo(() => faqs.filter((faq) => matchesQuery(faq, searchQuery)), [faqs, searchQuery]);

  const tabCounts = useMemo(() => {
    const counts = {
      all: searchMatchedFaqs.length,
    };
    FAQ_CATEGORY_CONFIG.forEach((item) => {
      counts[item.key] = searchMatchedFaqs.filter((faq) => includesCategory(faq, item.key)).length;
    });
    return counts;
  }, [searchMatchedFaqs]);

  const categoryFilteredFaqs = useMemo(() => {
    if (selectedCategory === 'all') return searchMatchedFaqs;
    return searchMatchedFaqs.filter((faq) => includesCategory(faq, selectedCategory));
  }, [searchMatchedFaqs, selectedCategory]);

  const totalPages = Math.max(1, Math.ceil(categoryFilteredFaqs.length / DESKTOP_PER_PAGE));
  const safePage = Math.min(page, totalPages);

  useEffect(() => {
    if (page !== safePage) {
      setPage(safePage);
    }
  }, [page, safePage]);

  const desktopFaqs = useMemo(() => {
    const start = (safePage - 1) * DESKTOP_PER_PAGE;
    return categoryFilteredFaqs.slice(start, start + DESKTOP_PER_PAGE);
  }, [categoryFilteredFaqs, safePage]);

  const mobileFaqs = useMemo(
    () => categoryFilteredFaqs.slice(0, mobileVisibleCount),
    [categoryFilteredFaqs, mobileVisibleCount]
  );

  const visibleFaqs = useDesktopPagination ? desktopFaqs : mobileFaqs;

  const groupedFaqs = useMemo(() => {
    if (selectedCategory !== 'all') return [];
    return FAQ_CATEGORY_CONFIG.map((category) => ({
      ...category,
      items: visibleFaqs.filter((faq) => getPrimaryCategory(faq) === category.key),
    })).filter((group) => group.items.length > 0);
  }, [selectedCategory, visibleFaqs]);

  const hasMoreMobile = !useDesktopPagination && mobileVisibleCount < categoryFilteredFaqs.length;

  const rangeStart =
    categoryFilteredFaqs.length === 0 ? 0 : useDesktopPagination ? (safePage - 1) * DESKTOP_PER_PAGE + 1 : 1;
  const rangeEnd = useDesktopPagination
    ? Math.min(safePage * DESKTOP_PER_PAGE, categoryFilteredFaqs.length)
    : Math.min(mobileVisibleCount, categoryFilteredFaqs.length);

  const renderPaginationBar = () => {
    if (!useDesktopPagination || totalPages <= 1) return null;
    const pageNumbers = Array.from({ length: totalPages }, (_, idx) => idx + 1);
    return (
      <div className="flex flex-col items-center gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
        <p className="text-[13px] text-[#6B6B6B] order-2 sm:order-1 sm:mr-4">
          Page {safePage} of {totalPages}
          <span className="text-[#A8A9AD]">
            {' '}
            ({rangeStart}-{rangeEnd} of {categoryFilteredFaqs.length})
          </span>
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2 order-1 sm:order-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage <= 1}
            className="min-h-[40px] px-3 border border-[rgba(26,26,26,0.16)] bg-white text-sm text-[#1A1A1A] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Prev
          </button>
          <div className="flex flex-wrap items-center justify-center gap-1.5 max-w-full">
            {pageNumbers.map((pageNumber) => (
              <button
                key={pageNumber}
                type="button"
                onClick={() => setPage(pageNumber)}
                className={`min-w-[40px] h-10 px-2 border text-sm ${
                  safePage === pageNumber
                    ? 'bg-[#1A1A1A] border-[#1A1A1A] text-white'
                    : 'bg-white border-[rgba(26,26,26,0.16)] text-[#1A1A1A]'
                }`}
              >
                {pageNumber}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage >= totalPages}
            className="min-h-[40px] px-3 border border-[rgba(26,26,26,0.16)] bg-white text-sm text-[#1A1A1A] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>
    );
  };

  const resultMessage = searchQuery.trim()
    ? `${categoryFilteredFaqs.length} results for "${searchQuery.trim()}"`
    : '';

  const onCategorySelect = (category) => {
    setSelectedCategory(category);
  };

  const toggleAccordion = (slug) => {
    setExpandedSlug((prev) => (prev === slug ? '' : slug));
  };

  const navigate = (event, path) => {
    event.preventDefault();
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const renderFaqItem = (faq) => {
    const isOpen = expandedSlug === faq.slug;
    return (
      <article key={faq.slug} className="border-b border-[rgba(26,26,26,0.08)] bg-white">
        <button
          type="button"
          onClick={() => toggleAccordion(faq.slug)}
          aria-expanded={isOpen}
          className="w-full px-4 sm:px-10 py-[22px] text-left flex items-center justify-between gap-6"
        >
          <h3 className="text-[14px] sm:text-[15px] leading-[1.5] font-semibold text-[#1A1A1A]">{faq.title}</h3>
          <svg
            className={`w-5 h-5 shrink-0 ${isOpen ? 'rotate-180 text-[#DB0812]' : 'text-[#A8A9AD]'}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {isOpen && (
          <div className="bg-[#E1DED8] border-b-2 border-[rgba(26,26,26,0.10)] px-4 sm:px-10 pt-6 pb-8">
            <div
              className="max-w-[760px] text-[14px] leading-[1.8] text-[#3A3A3A] [&>p]:mb-4 [&>p:last-child]:mb-0 [&>ul]:mb-4 [&>ol]:mb-4"
              dangerouslySetInnerHTML={{ __html: markdownToHtml(faq.body || '') }}
            />
          </div>
        )}
      </article>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white py-24">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-8">
          <p className="text-[#6B6B6B]">Loading FAQs...</p>
        </div>
      </div>
    );
  }

  const paginationTop = renderPaginationBar();
  const paginationBottom = renderPaginationBar();

  return (
    <div className="bg-[#FAFAF9] text-[#1A1A1A]">
      <section className="bg-white border-b-2 border-[#FAFAF9]">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-8 py-14 sm:py-20 grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-20">
          <div>
            <div className="text-[11px] font-semibold tracking-[0.16em] uppercase text-[#8B7D72] mb-5">
              Frequently Asked Questions
            </div>
            <h1 className="font-serif text-[38px] sm:text-[52px] leading-[1.08] mb-6">
              Common questions, answered directly.
            </h1>
            <p className="text-[16px] leading-[1.8] text-[#6B6B6B]">
              148 questions covering the work, the tools, the philosophy, and what it looks like to work with Bart. Use the filters to find what you are looking for.
            </p>
          </div>
          <div className="pt-1">
            <p className="text-[15px] leading-[1.85] text-[#3A3A3A] mb-5">
              These answers come from the same philosophy that drives everything else here: clarity matters more than comfort, and most questions deserve a real answer.
            </p>
            <p className="text-[15px] leading-[1.85] text-[#3A3A3A]">
              If you do not find what you are looking for, start a conversation with Archy or reach out directly.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-[#E1DED8] border-b-2 border-[#FAFAF9]">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-8 py-7">
          <div className="max-w-[640px] relative">
            <svg className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-[#6B6B6B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search questions..."
              className="w-full bg-white border border-[rgba(26,26,26,0.12)] text-[#1A1A1A] placeholder-[#6B6B6B] h-[52px] pl-12 pr-4 outline-none focus:border-[#DB0812]"
            />
          </div>
          {resultMessage && <p className="text-[13px] text-[#6B6B6B] mt-3">{resultMessage}</p>}
        </div>
      </section>

      <section className="sticky top-[58px] md:top-[72px] z-20 bg-white border-b border-[rgba(26,26,26,0.10)]">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-8 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-6 min-w-max">
            <button
              type="button"
              onClick={() => onCategorySelect('all')}
              className={`h-12 text-[12px] uppercase tracking-[0.08em] font-semibold border-b-2 ${
                selectedCategory === 'all' ? 'text-[#1A1A1A] border-[#DB0812]' : 'text-[#6B6B6B] border-transparent'
              }`}
            >
              All <span className="font-normal text-[#A8A9AD] ml-1">{tabCounts.all}</span>
            </button>
            {FAQ_CATEGORY_CONFIG.map((category) => (
              <button
                key={category.key}
                type="button"
                onClick={() => onCategorySelect(category.key)}
                className={`h-12 text-[12px] uppercase tracking-[0.08em] font-semibold border-b-2 whitespace-nowrap ${
                  selectedCategory === category.key
                    ? 'text-[#1A1A1A] border-[#DB0812]'
                    : 'text-[#6B6B6B] border-transparent'
                }`}
              >
                {category.label}
                <span className="font-normal text-[#A8A9AD] ml-1">{tabCounts[category.key] || 0}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="py-10 sm:py-14">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-8">
          {visibleFaqs.length === 0 ? (
            <div className="py-24 text-center">
              <h2 className="text-[30px] font-serif text-[#1A1A1A] mb-3">No results found.</h2>
              <p className="text-[#6B6B6B]">Try a different search term or browse by category above.</p>
            </div>
          ) : (
            <>
              {paginationTop && <div className="mb-8">{paginationTop}</div>}
              {selectedCategory === 'all' ? (
                <div className="space-y-10">
                  {groupedFaqs.map((group) => (
                    <div key={group.key}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8B7D72]">
                          {group.label}
                        </div>
                        <div className="text-[12px] text-[#6B6B6B]">{group.items.length}</div>
                      </div>
                      <div>{group.items.map((faq) => renderFaqItem(faq))}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div>{visibleFaqs.map((faq) => renderFaqItem(faq))}</div>
              )}

              {paginationBottom && <div className="mt-10">{paginationBottom}</div>}

              {hasMoreMobile && (
                <div className="mt-8 flex justify-center md:hidden">
                  <button
                    type="button"
                    onClick={() => setMobileVisibleCount((count) => count + MOBILE_BATCH_SIZE)}
                    className="h-11 px-6 bg-white border border-[rgba(26,26,26,0.16)] text-[13px] tracking-[0.06em] uppercase font-semibold text-[#1A1A1A]"
                  >
                    Show More
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      <section className="bg-[#2B2929] py-14 sm:py-20">
        <div className="mx-auto max-w-[860px] px-4 sm:px-8 text-center">
          <h2 className="font-serif text-white text-[34px] sm:text-[44px] leading-[1.15] mb-4">Still have questions?</h2>
          <p className="text-white/80 text-[15px] leading-[1.8] mb-8">
            Can&apos;t find what you&apos;re looking for? Chat with Archy or reach out directly.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="/contact"
              onClick={(event) => navigate(event, '/contact')}
              className="min-h-[44px] inline-flex items-center justify-center px-8 py-3 bg-[#DB0812] text-white text-[13px] uppercase tracking-[0.08em] font-semibold"
            >
              Contact Us
            </a>
            <a
              href="/archy"
              onClick={(event) => navigate(event, '/archy')}
              className="min-h-[44px] inline-flex items-center justify-center px-8 py-3 border border-white/40 text-white text-[13px] uppercase tracking-[0.08em] font-semibold"
            >
              Chat with Archy
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

