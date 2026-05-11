/**
 * Faith Landing Page
 * 
 * Shows intro content, current day's devotional (or most recent), previous devotionals, and subscription form.
 */
import React, { useState, useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import SEO from '../components/SEO';
import Header from '../components/Header';
import JournalSubscription from '../components/JournalSubscription';
import DevotionalPost from './DevotionalPost';
import ShareLinks from '../components/ShareLinks';

const ARCHIVE_PER_PAGE = 10;

function buildPaginationItems(currentPage, totalPages) {
  if (totalPages <= 1) return [];
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const set = new Set(
    [1, totalPages, currentPage - 1, currentPage, currentPage + 1].filter(
      (n) => n >= 1 && n <= totalPages
    )
  );
  const sorted = [...set].sort((a, b) => a - b);
  const out = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) out.push('ellipsis');
    out.push(sorted[i]);
  }
  return out;
}

export default function Faith() {
  const [devotionals, setDevotionals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDevotional, setCurrentDevotional] = useState(null);
  const [previousDevotionals, setPreviousDevotionals] = useState([]);
  const [selectedSlug, setSelectedSlug] = useState(null);
  const [archivePage, setArchivePage] = useState(1);
  const [archiveSearch, setArchiveSearch] = useState('');

  useEffect(() => {
    // Always scroll to top when page loads
    window.scrollTo({ top: 0, behavior: 'instant' });

    // If a devotional slug is provided in the URL, prefer showing that devotional
    // Example: /faith?slug=integrity-under-pressure
    const initialSlug =
      typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('slug')
        : null;
    if (initialSlug) setSelectedSlug(initialSlug);

    // Load devotionals from the knowledge corpus
    fetch('/api/knowledge?type=devotional')
      .then(r => r.json())
      .then(data => {
        const allDevotionals = data.docs || [];
        
        // Get today's date in YYYY-MM-DD format using local timezone (not UTC)
        // This prevents timezone shifts that cause dates to be off by a day
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const todayStr = `${year}-${month}-${day}`; // "2026-01-21" in local timezone
        
        // Filter to ONLY published devotionals with publish_date <= today
        // This ensures only today's and past devotionals are shown
        const publishedDevotionals = allDevotionals.filter(devotional => {
          // Must be published
          if (devotional.status !== 'published' && devotional.status !== undefined) {
            return false;
          }
          
          // Must have a publish_date
          if (!devotional.publish_date) {
            return false;
          }
          
          // Extract date string (YYYY-MM-DD) for accurate comparison
          const publishDateStr = String(devotional.publish_date).split('T')[0].split(' ')[0];
          
          // publish_date must be <= today (compare as strings)
          return publishDateStr <= todayStr;
        });
        
        // Sort by publish_date, newest first
        const sortedDevotionals = publishedDevotionals.sort((a, b) => {
          const dateA = new Date(a.publish_date || a.date || 0);
          const dateB = new Date(b.publish_date || b.date || 0);
          return dateB - dateA;
        });
        
        setDevotionals(sortedDevotionals);
        
        // Find ONLY today's devotional (not most recent)
        const todaysDevotional = sortedDevotionals.find(d => {
          if (!d.publish_date) return false;
          const publishDateStr = String(d.publish_date).split('T')[0].split(' ')[0];
          return publishDateStr === todayStr;
        });
        
        // If a slug is selected, show that devotional (even if it's not today's)
        const selectedDevotional = selectedSlug
          ? sortedDevotionals.find(d => d.slug === selectedSlug)
          : null;

        // Only show today's devotional unless a specific devotional is selected
        const current = selectedDevotional || todaysDevotional || null;
        
        // Previous devotionals are only those with publish_date < today (excluding today's)
        const previous = sortedDevotionals.filter(d => {
          if (!d.publish_date) return false;
          const publishDateStr = String(d.publish_date).split('T')[0].split(' ')[0];
          // If a specific devotional is selected, keep the list focused and exclude the selected one
          if (selectedDevotional && d.slug === selectedDevotional.slug) return false;
          return publishDateStr < todayStr;
        });
        
        setCurrentDevotional(current);
        setPreviousDevotionals(previous);
        
        setLoading(false);
      })
      .catch(error => {
        console.error('Error loading devotionals:', error);
        setLoading(false);
      });
  }, [selectedSlug]);

  const formatDate = (dateString) => {
    if (!dateString) return '';
    
    // Extract YYYY-MM-DD from date string (handles both "2026-01-01" and "2026-01-01T00:00:00.000Z")
    const dateStr = String(dateString).split('T')[0].split(' ')[0];
    
    // If it's a YYYY-MM-DD string, parse it as local date (not UTC) to avoid timezone shifts
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = dateStr.split('-').map(Number);
      // Create date in local timezone, not UTC, so "2026-01-01" displays as January 1, 2026
      const date = new Date(year, month - 1, day);
      if (isNaN(date.getTime())) return '';
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
    
    // Fallback for other date formats
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  /** Single-devotional URL (`/faith?slug=…`): mockup shows prev/next only, not the full archive. */
  const isSingleDevotionalView = Boolean(selectedSlug);

  const { neighborNewer, neighborOlder } = useMemo(() => {
    if (!currentDevotional || !devotionals.length) {
      return { neighborNewer: null, neighborOlder: null };
    }
    const idx = devotionals.findIndex((d) => d.slug === currentDevotional.slug);
    if (idx === -1) return { neighborNewer: null, neighborOlder: null };
    return {
      neighborNewer: idx > 0 ? devotionals[idx - 1] : null,
      neighborOlder: idx < devotionals.length - 1 ? devotionals[idx + 1] : null,
    };
  }, [devotionals, currentDevotional]);

  const filteredDevotionals = useMemo(() => {
    return previousDevotionals.filter((d) => {
      if (!archiveSearch) return true;
      const term = archiveSearch.toLowerCase();
      return (
        (d.title || '').toLowerCase().includes(term) ||
        (d.scripture_reference || '').toLowerCase().includes(term)
      );
    });
  }, [previousDevotionals, archiveSearch]);

  const archiveTotalPages = Math.max(1, Math.ceil(filteredDevotionals.length / ARCHIVE_PER_PAGE));
  const archiveStart = (archivePage - 1) * ARCHIVE_PER_PAGE;
  const archivePageItems = filteredDevotionals.slice(archiveStart, archiveStart + ARCHIVE_PER_PAGE);
  const paginationItems = buildPaginationItems(archivePage, archiveTotalPages);

  const scrollToArchive = () => {
    const el = document.querySelector('.archive-section');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const goToDevotionalSlug = (slug) => {
    setSelectedSlug(slug);
    window.history.pushState({}, '', `/faith?slug=${encodeURIComponent(slug)}`);
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const backToAllDevotionals = (e) => {
    e.preventDefault();
    setSelectedSlug(null);
    window.history.pushState({}, '', '/faith');
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  return (
    <>
      <SEO pageKey="faith" />
      <Helmet>
        <title>Servant Leadership Devotional | Archetype Original</title>
        <meta name="description" content="Daily devotionals connecting Scripture to the real pressures of leadership. Formation for leaders who want to lead with clarity, restraint, and genuine care for people." />
      </Helmet>

      <div className="min-h-screen bg-[#FAFAF9]">
        <Header />

        {!isSingleDevotionalView && (
          <section className="bg-white border-b-2 border-[#FAFAF9]">
            <div className="mx-auto max-w-[1400px] px-6 sm:px-10 py-16 sm:py-20 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-start">
              <div>
                <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8B7D72] mb-4">
                  Servant Leadership Devotional
                </p>
                <h1 className="font-serif text-[clamp(36px,4vw,52px)] font-normal leading-[1.1] tracking-[-0.01em] text-[#1A1A1A] mb-5">
                  Daily formation for leaders who want to lead well.
                </h1>
                <p className="font-sans text-[16px] leading-[1.8] text-[#6B6B6B]">
                  Scripture connected to the real pressures of leadership. Power, responsibility, trust, restraint, and care for people. Written for leaders who take both seriously.
                </p>
              </div>
              <div className="pt-2">
                <p className="font-serif text-[20px] italic font-normal leading-[1.5] text-[#1A1A1A] mb-5">
                  Lead others the way you would want to be led.
                </p>
                <p className="font-sans text-[15px] leading-[1.85] text-[#3A3A3A] mb-4">
                  The goal is not inspiration for inspiration&apos;s sake. It is formation. Each entry invites leaders to slow down, examine their assumptions, and renew how they think about influence and responsibility.
                </p>
                <p className="font-sans text-[15px] leading-[1.85] text-[#3A3A3A] mb-5">
                  These reflections sit at the intersection of faith and the real demands of leading people. They are not theoretical. They are written from inside the rooms where leadership either holds or breaks.
                </p>
                <a
                  href="/journal/golden-rule-leadership-strategy"
                  onClick={(e) => {
                    e.preventDefault();
                    window.history.pushState({}, '', '/journal/golden-rule-leadership-strategy');
                    window.dispatchEvent(new PopStateEvent('popstate'));
                    window.scrollTo({ top: 0, behavior: 'instant' });
                  }}
                  className="font-sans text-[13px] font-semibold uppercase tracking-[0.06em] text-[#DB0812] hover:text-[#b30610]"
                >
                  Read: The Golden Rule Has Always Been a Leadership Strategy &rarr;
                </a>
              </div>
            </div>
          </section>
        )}

        {!loading && currentDevotional && (
          <section className="bg-[#E1DED8] py-[72px] border-b-2 border-[#FAFAF9]">
            <div className="mx-auto max-w-[1400px] px-6 sm:px-10">
              <div className="flex items-end justify-between mb-8 gap-4 flex-wrap">
                <div>
                  <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8B7D72] mb-1.5">
                    {selectedSlug ? 'Devotional' : "Today's Devotional"}
                  </p>
                  <time className="font-sans text-[13px] text-[#6B6B6B]">
                    {formatDate(currentDevotional.publish_date || currentDevotional.date)}
                  </time>
                </div>
                <ShareLinks
                  url={typeof window !== 'undefined' ? `${window.location.origin}/faith?slug=${encodeURIComponent(currentDevotional.slug)}` : ''}
                  title={currentDevotional.title}
                  description={currentDevotional.summary || ''}
                />
              </div>
              <div className="bg-white border border-[#1A1A1A]/08 px-6 sm:px-10 md:px-14 py-10 sm:py-12">
                <DevotionalPost post={currentDevotional} />
              </div>
            </div>
          </section>
        )}

        {loading && (
          <section className="bg-[#E1DED8] py-[72px]">
            <div className="mx-auto max-w-[1400px] px-6 sm:px-10">
              <p className="font-sans text-[14px] text-[#6B6B6B]">Loading...</p>
            </div>
          </section>
        )}

        {!loading && !currentDevotional && (
          <section className="bg-[#E1DED8] py-[72px]">
            <div className="mx-auto max-w-[1400px] px-6 sm:px-10">
              <p className="font-sans text-[14px] text-[#6B6B6B]">No devotional available yet. Check back soon.</p>
            </div>
          </section>
        )}

        {!loading && currentDevotional && isSingleDevotionalView && (
          <section className="bg-[#FAFAF9] py-16 sm:py-[64px] border-b-2 border-[#FAFAF9]">
            <div className="mx-auto max-w-[1400px] px-6 sm:px-10">
              <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8B7D72] mb-6">
                Continue reading
              </p>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-[2px] mb-6">
                {neighborNewer && (
                  <a
                    href={`/faith?slug=${encodeURIComponent(neighborNewer.slug)}`}
                    onClick={(e) => {
                      e.preventDefault();
                      goToDevotionalSlug(neighborNewer.slug);
                    }}
                    className="block bg-white border border-[#1A1A1A]/08 p-8 cursor-pointer hover:bg-[#FAFAF9] transition-colors no-underline text-inherit"
                  >
                    <span className="font-sans text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8B7D72] block mb-2.5">
                      Next &rarr;
                    </span>
                    <div className="font-serif text-[20px] font-normal text-[#1A1A1A] leading-[1.25] mb-2">
                      {neighborNewer.title}
                    </div>
                    {neighborNewer.scripture_reference && (
                      <span className="font-sans text-[12px] font-medium text-[#8B7D72] block mb-2.5">
                        {neighborNewer.scripture_reference}
                      </span>
                    )}
                    {neighborNewer.summary && (
                      <p className="font-sans text-[13px] leading-[1.65] text-[#6B6B6B] m-0">
                        {neighborNewer.summary}
                      </p>
                    )}
                  </a>
                )}
                {neighborOlder && (
                  <a
                    href={`/faith?slug=${encodeURIComponent(neighborOlder.slug)}`}
                    onClick={(e) => {
                      e.preventDefault();
                      goToDevotionalSlug(neighborOlder.slug);
                    }}
                    className="block bg-white border border-[#1A1A1A]/08 p-8 cursor-pointer hover:bg-[#FAFAF9] transition-colors no-underline text-inherit"
                  >
                    <span className="font-sans text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8B7D72] block mb-2.5">
                      &larr; Previous
                    </span>
                    <div className="font-serif text-[20px] font-normal text-[#1A1A1A] leading-[1.25] mb-2">
                      {neighborOlder.title}
                    </div>
                    {neighborOlder.scripture_reference && (
                      <span className="font-sans text-[12px] font-medium text-[#8B7D72] block mb-2.5">
                        {neighborOlder.scripture_reference}
                      </span>
                    )}
                    {neighborOlder.summary && (
                      <p className="font-sans text-[13px] leading-[1.65] text-[#6B6B6B] m-0">
                        {neighborOlder.summary}
                      </p>
                    )}
                  </a>
                )}
              </div>
              <a
                href="/faith"
                onClick={backToAllDevotionals}
                className="font-sans text-[12px] font-semibold uppercase tracking-[0.08em] text-[#6B6B6B] hover:text-[#1A1A1A] transition-colors"
              >
                &larr; Back to all devotionals
              </a>
            </div>
          </section>
        )}

        {previousDevotionals.length > 0 && !isSingleDevotionalView && (
          <section className="archive-section bg-[#FAFAF9] py-[72px]">
            <div className="mx-auto max-w-[1400px] px-6 sm:px-10">

              <div className="flex items-end justify-between mb-8 flex-wrap gap-6">
                <div>
                  <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8B7D72] mb-2">
                    Previous Devotionals
                  </p>
                  <h2 className="font-serif text-[28px] font-normal text-[#1A1A1A]">
                    Browse the archive
                  </h2>
                </div>
                <div className="relative w-full sm:w-[280px] max-w-full">
                  <svg
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A8A9AD] pointer-events-none"
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden
                  >
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input
                    type="search"
                    value={archiveSearch}
                    onChange={(e) => {
                      setArchiveSearch(e.target.value);
                      setArchivePage(1);
                    }}
                    placeholder="Search devotionals..."
                    className="w-full h-[44px] pl-10 pr-4 border border-[#1A1A1A]/15 bg-white focus:bg-white focus:border-[#1A1A1A] focus:outline-none transition-colors font-sans text-[14px] text-[#1A1A1A] placeholder:text-[#A8A9AD]"
                  />
                </div>
              </div>

              {filteredDevotionals.length === 0 ? (
                <div className="bg-white border border-[#1A1A1A]/08 px-7 py-12 text-center">
                  <p className="font-sans text-[14px] text-[#6B6B6B]">No devotionals match your search. Try a different term.</p>
                </div>
              ) : (
                <>
                  <div className="bg-white border border-[#1A1A1A]/08">
                    {archivePageItems.map((devotional, i) => (
                      <div
                        key={devotional.slug}
                        className={`grid grid-cols-1 sm:grid-cols-[120px_1fr_auto] gap-4 sm:gap-6 items-start px-6 sm:px-7 py-5 cursor-pointer hover:bg-[#FAFAF9] transition-colors ${
                          i < archivePageItems.length - 1 ? 'border-b border-[#1A1A1A]/06' : ''
                        }`}
                        onClick={() => goToDevotionalSlug(devotional.slug)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            goToDevotionalSlug(devotional.slug);
                          }
                        }}
                        role="button"
                        tabIndex={0}
                      >
                        <time className="font-sans text-[12px] font-medium text-[#6B6B6B] whitespace-nowrap">
                          {formatDate(devotional.publish_date || devotional.date)}
                        </time>
                        <div>
                          <div className="font-serif text-[17px] font-normal text-[#1A1A1A] leading-[1.3] mb-1">
                            {devotional.title}
                          </div>
                          {devotional.scripture_reference && (
                            <div className="font-sans text-[12px] font-medium text-[#8B7D72] mb-1.5">
                              {devotional.scripture_reference}
                            </div>
                          )}
                          {devotional.summary && (
                            <div className="font-sans text-[13px] leading-[1.6] text-[#6B6B6B]">
                              {devotional.summary}
                            </div>
                          )}
                        </div>
                        <a
                          href={`/faith?slug=${encodeURIComponent(devotional.slug)}`}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            goToDevotionalSlug(devotional.slug);
                          }}
                          className="font-sans text-[11px] font-semibold uppercase tracking-[0.08em] text-[#DB0812] hover:text-[#b30610] whitespace-nowrap sm:justify-self-end"
                        >
                          Read &rarr;
                        </a>
                      </div>
                    ))}
                  </div>

                  {archiveTotalPages > 1 && (
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white border border-[#1A1A1A]/08 border-t-0 px-6 sm:px-7 py-5">
                      <span className="font-sans text-[13px] text-[#6B6B6B]">
                        Showing {archiveStart + 1}-{Math.min(archiveStart + ARCHIVE_PER_PAGE, filteredDevotionals.length)} of {filteredDevotionals.length}
                      </span>
                      <div className="flex items-center gap-1 flex-wrap">
                        <button
                          type="button"
                          disabled={archivePage === 1}
                          onClick={() => {
                            setArchivePage((p) => p - 1);
                            scrollToArchive();
                          }}
                          className="font-sans text-[12px] font-semibold uppercase tracking-[0.06em] text-[#6B6B6B] border border-[#1A1A1A]/12 px-3.5 h-9 flex items-center disabled:opacity-35 disabled:cursor-not-allowed hover:bg-[#FAFAF9] transition-colors"
                        >
                          &larr; Prev
                        </button>
                        {paginationItems.map((item, idx) =>
                          item === 'ellipsis' ? (
                            <span key={`ellipsis-${idx}`} className="font-sans text-[13px] text-[#A8A9AD] px-1">
                              ...
                            </span>
                          ) : (
                            <button
                              type="button"
                              key={item}
                              onClick={() => {
                                setArchivePage(item);
                                scrollToArchive();
                              }}
                              className={`font-sans text-[13px] font-medium w-9 h-9 flex items-center justify-center border transition-colors ${
                                item === archivePage
                                  ? 'bg-[#1A1A1A] text-white border-[#1A1A1A]'
                                  : 'text-[#6B6B6B] border-[#1A1A1A]/12 hover:bg-[#FAFAF9]'
                              }`}
                            >
                              {item}
                            </button>
                          )
                        )}
                        <button
                          type="button"
                          disabled={archivePage === archiveTotalPages}
                          onClick={() => {
                            setArchivePage((p) => p + 1);
                            scrollToArchive();
                          }}
                          className="font-sans text-[12px] font-semibold uppercase tracking-[0.06em] text-[#6B6B6B] border border-[#1A1A1A]/12 px-3.5 h-9 flex items-center disabled:opacity-35 disabled:cursor-not-allowed hover:bg-[#FAFAF9] transition-colors"
                        >
                          Next &rarr;
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </section>
        )}

        <section className="bg-white border-t border-[#1A1A1A]/08 py-[72px]">
          <div className="mx-auto max-w-[600px] px-6 sm:px-10">
            <JournalSubscription />
          </div>
        </section>

        <div className="bg-[#2B2929] px-6 sm:px-10 py-20 text-center">
          <h2 className="font-serif text-[clamp(26px,3vw,40px)] font-normal text-white mb-4">
            The work behind the devotional.
          </h2>
          <p className="font-sans text-[15px] leading-[1.75] text-white/60 max-w-[480px] mx-auto mb-10">
            Understand the leadership framework that connects these reflections to how organizations actually function.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <a
              href="/culture-science"
              onClick={(e) => {
                e.preventDefault();
                window.history.pushState({}, '', '/culture-science');
                window.dispatchEvent(new PopStateEvent('popstate'));
                window.scrollTo({ top: 0, behavior: 'instant' });
              }}
              className="bg-[#DB0812] text-white font-sans text-[12px] font-semibold uppercase tracking-[0.1em] px-8 py-3 min-h-[44px] inline-flex items-center justify-center transition-opacity hover:opacity-90"
            >
              Explore Culture Science
            </a>
            <a
              href="/meet-bart"
              onClick={(e) => {
                e.preventDefault();
                window.history.pushState({}, '', '/meet-bart');
                window.dispatchEvent(new PopStateEvent('popstate'));
                window.scrollTo({ top: 0, behavior: 'instant' });
              }}
              className="border border-white/30 text-white/80 font-sans text-[12px] font-semibold uppercase tracking-[0.1em] px-8 py-3 min-h-[44px] inline-flex items-center justify-center hover:border-white/70 hover:text-white transition-all"
            >
              Meet Bart
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
