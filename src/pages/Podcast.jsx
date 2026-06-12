import React, { useState, useEffect, useMemo, useRef } from 'react';
import SEO from '../components/SEO';
import JournalSubscription from '../components/JournalSubscription';
import { formatDate } from '../lib/formatPublishDate';

const PAGE_SIZE = 12;

const SPOTIFY_URL = import.meta.env.VITE_PODCAST_SPOTIFY_URL || '';
const APPLE_URL = import.meta.env.VITE_PODCAST_APPLE_URL || '';
const YOUTUBE_URL = import.meta.env.VITE_PODCAST_YOUTUBE_URL || '';

function toLabel(cat) {
  if (cat === 'all') return 'All';
  return cat.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

function episodeTypeLabel(type) {
  if (!type) return '';
  const t = String(type).toLowerCase();
  if (t === 'guest') return 'Guest';
  if (t === 'solo') return 'Solo';
  return String(type);
}

function PlayIconPlaceholder({ size = 'md' }) {
  const sizes = {
    sm: {
      outer: 'w-10 h-10 border-2',
      triangle: 'border-t-[6px] border-b-[6px] border-l-[10px] ml-0.5',
    },
    md: {
      outer: 'w-16 h-16 sm:w-20 sm:h-20 border-4',
      triangle: 'border-t-[12px] border-b-[12px] border-l-[18px] ml-1',
    },
  };
  const s = sizes[size] || sizes.md;
  return (
    <div
      className={`${s.outer} rounded-full border-[#8B7D72] flex items-center justify-center group-hover:border-white transition-colors`}
    >
      <div
        className={`w-0 h-0 border-t-transparent border-b-transparent border-l-[#8B7D72] group-hover:border-l-white transition-colors ${s.triangle}`}
      />
    </div>
  );
}

function EpisodeThumbnail({ youtubeId, title, size = 'md' }) {
  const [imgError, setImgError] = useState(false);
  const showImage = youtubeId && !imgError;

  return (
    <div className="w-full overflow-hidden bg-[#2B2929] aspect-video flex items-center justify-center relative group">
      {showImage ? (
        <img
          src={`https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`}
          alt={title || 'Episode thumbnail'}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <PlayIconPlaceholder size={size} />
      )}
      {showImage && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
          <PlayIconPlaceholder size={size} />
        </div>
      )}
    </div>
  );
}

function PodcastHeroMark() {
  return (
    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-[#DB0812] flex items-center justify-center p-4">
      <img
        src="/brand/ao-podcast-mark.svg"
        alt=""
        className="w-full h-full"
        aria-hidden="true"
      />
    </div>
  );
}

function PlatformButton({ href, icon, label }) {
  const className =
    'inline-flex items-center gap-2 px-5 py-2.5 border border-[#1A1A1A]/15 text-sm font-medium text-[#1A1A1A] hover:border-[#DB0812] hover:text-[#DB0812] transition-colors';
  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {icon}
        {label}
      </a>
    );
  }
  return (
    <span className={className}>
      {icon}
      {label}
    </span>
  );
}

const SpotifyIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141 4.32-1.32 9.66-.660 13.32 1.56.42.18.6.84.42 1.26zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.78-.18-.601.18-1.2.78-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.299z" />
  </svg>
);

const AppleIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 0a12 12 0 1 0 0 24 12 12 0 0 0 0-24zm0 4a8 8 0 1 1 0 16 8 8 0 0 1 0-16zm0 1.5A6.5 6.5 0 1 0 12 18.5a6.5 6.5 0 0 0 0-13zm0 2.05a4.45 4.45 0 1 1 0 8.9 4.45 4.45 0 0 1 0-8.9zm4.7 5.85a.95.95 0 1 1 0-1.9.95.95 0 0 1 0 1.9z" />
  </svg>
);

const YouTubeIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
);

export default function Podcast() {
  const [episodes, setEpisodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedGuest, setSelectedGuest] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [listPage, setListPage] = useState(1);
  const [guestDropdownOpen, setGuestDropdownOpen] = useState(false);
  const guestDropdownRef = useRef(null);

  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }

    const scrollToTop = () => window.scrollTo(0, 0);
    scrollToTop();

    requestAnimationFrame(() => {
      scrollToTop();
      requestAnimationFrame(scrollToTop);
    });

    const timers = [0, 10, 50, 100, 200, 300, 500].map((delay) => setTimeout(scrollToTop, delay));

    fetch('/api/knowledge?type=podcast-episode')
      .then((r) => r.json())
      .then((data) => {
        const docs = data.docs || [];
        const published = docs.filter((ep) => ep.status === 'published');
        const sorted = published.sort((a, b) => {
          const dateA = new Date(a.publish_date || a.created_at || 0);
          const dateB = new Date(b.publish_date || b.created_at || 0);
          return dateB - dateA;
        });
        setEpisodes(sorted);
        setLoading(false);
        requestAnimationFrame(() => {
          scrollToTop();
          requestAnimationFrame(scrollToTop);
        });
        setTimeout(scrollToTop, 100);
        setTimeout(scrollToTop, 200);
      })
      .catch((error) => {
        console.error('Error loading podcast episodes:', error);
        setLoading(false);
      });

    return () => {
      timers.forEach(clearTimeout);
    };
  }, []);

  useEffect(() => {
    const syncFromUrl = () => {
      const q = new URLSearchParams(window.location.search);
      const p = parseInt(q.get('page') || '1', 10);
      setListPage(Number.isFinite(p) && p > 0 ? p : 1);
    };
    syncFromUrl();
    window.addEventListener('popstate', syncFromUrl);
    return () => window.removeEventListener('popstate', syncFromUrl);
  }, []);

  useEffect(() => {
    if (!guestDropdownOpen) return;
    const handleClickOutside = (e) => {
      if (guestDropdownRef.current && !guestDropdownRef.current.contains(e.target)) {
        setGuestDropdownOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [guestDropdownOpen]);

  const { derivedCategories, categoryCounts, typeCounts, guestNames } = useMemo(() => {
    const counts = {};
    let solo = 0;
    let guest = 0;
    const guests = new Set();

    episodes.forEach((ep) => {
      const t = String(ep.episode_type || '').toLowerCase();
      if (t === 'solo') solo += 1;
      if (t === 'guest') guest += 1;
      if (ep.guest?.name) guests.add(ep.guest.name);
      (ep.categories || []).forEach((cat) => {
        const slug = String(cat || '')
          .trim()
          .toLowerCase();
        if (!slug) return;
        counts[slug] = (counts[slug] || 0) + 1;
      });
    });

    const derived = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([cat]) => cat);

    return {
      derivedCategories: derived,
      categoryCounts: counts,
      typeCounts: { solo, guest },
      guestNames: Array.from(guests).sort((a, b) => a.localeCompare(b)),
    };
  }, [episodes]);

  const filteredEpisodes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return episodes.filter((ep) => {
      if (selectedType !== 'all') {
        const t = String(ep.episode_type || '').toLowerCase();
        if (t !== selectedType) return false;
      }
      if (selectedCategory !== 'all') {
        const hasCat = (ep.categories || []).some(
          (c) => String(c || '').trim().toLowerCase() === selectedCategory,
        );
        if (!hasCat) return false;
      }
      if (selectedGuest) {
        if ((ep.guest?.name || '') !== selectedGuest) return false;
      }
      if (q) {
        const haystack = [
          ep.title,
          ep.summary,
          ep.transcript,
          ep.guest?.name,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [episodes, selectedType, selectedCategory, selectedGuest, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredEpisodes.length / PAGE_SIZE));
  const safePage = Math.min(listPage, totalPages);
  const start = (safePage - 1) * PAGE_SIZE;
  const pageSlice = filteredEpisodes.slice(start, start + PAGE_SIZE);

  const featuredEpisode = safePage === 1 && pageSlice.length > 0 ? pageSlice[0] : null;
  const gridEpisodes =
    safePage === 1 && pageSlice.length > 1
      ? pageSlice.slice(1)
      : safePage === 1
        ? []
        : pageSlice;

  useEffect(() => {
    if (listPage > totalPages) {
      const tp = totalPages;
      setListPage(tp);
      window.history.replaceState({}, '', tp <= 1 ? '/podcast' : `/podcast?page=${tp}`);
    }
  }, [filteredEpisodes.length, listPage, totalPages]);

  const goToPodcastPage = (n) => {
    const tp = Math.max(1, Math.ceil(filteredEpisodes.length / PAGE_SIZE));
    const next = Math.max(1, Math.min(n, tp));
    setListPage(next);
    const path = next <= 1 ? '/podcast' : `/podcast?page=${next}`;
    window.history.pushState({}, '', path);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const resetFiltersPage = () => {
    setListPage(1);
    window.history.replaceState({}, '', '/podcast');
  };

  const handleEpisodeClick = (slug) => {
    window.history.pushState({}, '', `/podcast/${slug}`);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const renderEpisodeMeta = (ep) => {
    const date = formatDate(ep.publish_date || ep.created_at);
    const type = episodeTypeLabel(ep.episode_type);
    return [date, type].filter(Boolean).join(' · ');
  };

  const renderCategoryTags = (ep, compact = false) => {
    const cats = (ep.categories || []).slice(0, compact ? 1 : 3);
    const tagClass = compact
      ? 'px-2.5 py-0.5 bg-white border border-[#1A1A1A]/10 text-[#6B6B6B] text-[11px]'
      : 'px-3 py-1 bg-[#FAFAF9] border border-[#1A1A1A]/10 text-[#6B6B6B] text-xs';
    return (
      <>
        {cats.map((cat) => (
          <span key={cat} className={tagClass}>
            {toLabel(cat)}
          </span>
        ))}
        {ep.duration && <span className={tagClass}>{ep.duration}</span>}
      </>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAF9] py-12 sm:py-16 md:py-20">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#DB0812] mx-auto" />
            <p className="mt-4 text-[#6B6B6B]">Loading podcast episodes...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <SEO pageKey="podcast" />
      <div className="min-h-screen bg-[#FAFAF9] text-[#1A1A1A]">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-10 py-14 sm:py-20">
          <div className="text-center mb-14 sm:mb-16">
            <div className="flex justify-center mb-6">
              <PodcastHeroMark />
            </div>
            <h1 className="font-serif text-[clamp(3rem,7vw,5rem)] font-bold leading-[0.95] tracking-[-0.02em] mb-5">
              The Archetype Original Podcast
            </h1>
            <p className="text-lg sm:text-[18px] font-light text-[#6B6B6B] max-w-[600px] mx-auto leading-relaxed mb-4">
              Leadership is not a title. It is a human condition. This show chases it everywhere it
              lives, in the boardroom and the sanctuary, the corner office and the break room.
            </p>
            <p className="text-sm text-[#6B6B6B] max-w-[560px] mx-auto leading-relaxed">
              Two kinds of episodes: solo conversations drawn from 33 years of building companies and
              growing people, and guest conversations with no boxes, no titles required, just people
              who have carried weight and have something true to say about it.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <PlatformButton href={SPOTIFY_URL} icon={<SpotifyIcon />} label="Spotify" />
              <PlatformButton href={APPLE_URL} icon={<AppleIcon />} label="Apple Podcasts" />
              <PlatformButton href={YOUTUBE_URL} icon={<YouTubeIcon />} label="YouTube" />
            </div>
          </div>

          <div className="mb-14 sm:mb-16">
            <div className="flex justify-center mb-6">
              <div className="relative w-full max-w-md">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    resetFiltersPage();
                  }}
                  placeholder="Search episodes, guests, topics"
                  className="w-full border border-[#1A1A1A]/15 px-4 py-3 pl-11 text-sm focus:outline-none focus:border-[#DB0812] transition-colors"
                />
                <svg
                  className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-[#6B6B6B]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-4.35-4.35M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z"
                  />
                </svg>
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-2.5 sm:gap-3">
              <button
                type="button"
                onClick={() => {
                  setSelectedType('all');
                  resetFiltersPage();
                }}
                className={`px-5 py-2 text-xs font-semibold tracking-[0.06em] uppercase border transition-colors ${
                  selectedType === 'all'
                    ? 'bg-[#1A1A1A] text-white border-[#1A1A1A]'
                    : 'bg-transparent text-[#6B6B6B] border-[rgba(26,26,26,0.15)] hover:border-[#DB0812] hover:text-[#DB0812]'
                }`}
              >
                All ({episodes.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedType('solo');
                  resetFiltersPage();
                }}
                className={`px-5 py-2 text-xs font-semibold tracking-[0.06em] uppercase border transition-colors ${
                  selectedType === 'solo'
                    ? 'bg-[#1A1A1A] text-white border-[#1A1A1A]'
                    : 'bg-transparent text-[#6B6B6B] border-[rgba(26,26,26,0.15)] hover:border-[#DB0812] hover:text-[#DB0812]'
                }`}
              >
                Solo ({typeCounts.solo})
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedType('guest');
                  resetFiltersPage();
                }}
                className={`px-5 py-2 text-xs font-semibold tracking-[0.06em] uppercase border transition-colors ${
                  selectedType === 'guest'
                    ? 'bg-[#1A1A1A] text-white border-[#1A1A1A]'
                    : 'bg-transparent text-[#6B6B6B] border-[rgba(26,26,26,0.15)] hover:border-[#DB0812] hover:text-[#DB0812]'
                }`}
              >
                Guest ({typeCounts.guest})
              </button>

              {derivedCategories.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => {
                    setSelectedCategory(selectedCategory === category ? 'all' : category);
                    resetFiltersPage();
                  }}
                  className={`px-5 py-2 text-xs font-semibold tracking-[0.06em] uppercase border transition-colors ${
                    selectedCategory === category
                      ? 'bg-[#1A1A1A] text-white border-[#1A1A1A]'
                      : 'bg-transparent text-[#6B6B6B] border-[rgba(26,26,26,0.15)] hover:border-[#DB0812] hover:text-[#DB0812]'
                  }`}
                >
                  {toLabel(category)} ({categoryCounts[category] || 0})
                </button>
              ))}

              {guestNames.length > 0 && (
                <div className="relative" ref={guestDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setGuestDropdownOpen((open) => !open)}
                    className={`px-5 py-2 text-xs font-semibold tracking-[0.06em] uppercase border transition-colors flex items-center gap-1 ${
                      selectedGuest
                        ? 'bg-[#1A1A1A] text-white border-[#1A1A1A]'
                        : 'bg-transparent text-[#6B6B6B] border-[rgba(26,26,26,0.15)] hover:border-[#DB0812] hover:text-[#DB0812]'
                    }`}
                  >
                    {selectedGuest || 'Guests'}
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {guestDropdownOpen && (
                    <div className="absolute left-0 top-full z-20 mt-1 min-w-[12rem] border border-[#1A1A1A]/15 bg-white py-1 shadow-md">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedGuest('');
                          setGuestDropdownOpen(false);
                          resetFiltersPage();
                        }}
                        className="block w-full px-4 py-2 text-left text-sm text-[#1A1A1A] hover:bg-[#FAFAF9]"
                      >
                        All guests
                      </button>
                      {guestNames.map((name) => (
                        <button
                          key={name}
                          type="button"
                          onClick={() => {
                            setSelectedGuest(name);
                            setGuestDropdownOpen(false);
                            resetFiltersPage();
                          }}
                          className="block w-full px-4 py-2 text-left text-sm text-[#1A1A1A] hover:bg-[#FAFAF9]"
                        >
                          {name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {filteredEpisodes.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-[#6B6B6B]">No episodes match your search or filters.</p>
            </div>
          ) : (
            <>
              {featuredEpisode && (
                <article
                  className="mb-16 lg:mb-20 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 cursor-pointer items-center group"
                  onClick={() => handleEpisodeClick(featuredEpisode.slug)}
                >
                  <EpisodeThumbnail
                    youtubeId={featuredEpisode.youtube_id}
                    title={featuredEpisode.title}
                    size="md"
                  />
                  <div className="flex flex-col justify-center">
                    <div className="mb-4">
                      <span className="inline-block px-2.5 py-1 bg-[#1A1A1A] text-white text-[10px] font-semibold uppercase tracking-[0.12em]">
                        Latest Episode
                      </span>
                    </div>
                    <time className="text-[13px] text-[#6B6B6B] mb-3 block">
                      {renderEpisodeMeta(featuredEpisode)}
                    </time>
                    <h2 className="font-serif text-[clamp(1.75rem,3.5vw,2.75rem)] font-bold text-[#1A1A1A] mb-4 sm:mb-5 leading-tight tracking-[-0.01em] group-hover:text-[#DB0812] transition-colors">
                      {featuredEpisode.title}
                    </h2>
                    <p className="text-base leading-[1.8] text-[#6B6B6B] mb-6 line-clamp-4">
                      {featuredEpisode.summary || ''}
                    </p>
                    <div className="flex flex-wrap gap-2 mb-6">{renderCategoryTags(featuredEpisode)}</div>
                    <span className="text-[15px] font-medium text-[#1A1A1A] group-hover:text-[#DB0812] transition-colors inline-flex items-center gap-1.5">
                      Listen now &rarr;
                    </span>
                  </div>
                </article>
              )}

              {gridEpisodes.length > 0 && (
                <>
                  <h3 className="font-serif text-2xl sm:text-3xl font-bold mb-8 sm:mb-10">All episodes</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 lg:gap-12">
                    {gridEpisodes.map((ep) => (
                      <article
                        key={ep.slug}
                        className="cursor-pointer group"
                        onClick={() => handleEpisodeClick(ep.slug)}
                      >
                        <div className="mb-4">
                          <EpisodeThumbnail youtubeId={ep.youtube_id} title={ep.title} size="sm" />
                        </div>
                        <time className="text-[12px] text-[#6B6B6B] mb-2 block">{renderEpisodeMeta(ep)}</time>
                        <h4 className="font-serif text-[22px] font-bold text-[#1A1A1A] mb-3 leading-snug tracking-[-0.01em] group-hover:text-[#DB0812] transition-colors">
                          {ep.title}
                        </h4>
                        <p className="text-[14px] leading-[1.75] text-[#6B6B6B] mb-3 line-clamp-3">
                          {ep.summary || ''}
                        </p>
                        <div className="flex flex-wrap gap-2 mb-4">{renderCategoryTags(ep, true)}</div>
                        <span className="text-[14px] font-medium text-[#1A1A1A] group-hover:text-[#DB0812] transition-colors inline-flex items-center">
                          Listen now &rarr;
                        </span>
                      </article>
                    ))}
                  </div>
                </>
              )}

              {totalPages > 1 && (
                <nav
                  className="mt-14 flex flex-col items-center justify-center gap-4 sm:mt-20 sm:flex-row"
                  aria-label="Podcast pages"
                >
                  <button
                    type="button"
                    onClick={() => goToPodcastPage(safePage - 1)}
                    disabled={safePage <= 1}
                    className="min-h-[44px] min-w-[8rem] border border-[#1A1A1A]/20 px-4 py-2 text-sm font-medium text-[#1A1A1A] transition-colors hover:border-[#DB0812] hover:text-[#DB0812] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-[#6B6B6B]">
                    Page {safePage} of {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => goToPodcastPage(safePage + 1)}
                    disabled={safePage >= totalPages}
                    className="min-h-[44px] min-w-[8rem] border border-[#1A1A1A]/20 px-4 py-2 text-sm font-medium text-[#1A1A1A] transition-colors hover:border-[#DB0812] hover:text-[#DB0812] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next
                  </button>
                </nav>
              )}
            </>
          )}
        </div>

        <div className="mx-auto max-w-[1400px] px-4 sm:px-10 pb-14 sm:pb-20">
          <JournalSubscription
            podcastMode
            title="Get New Episodes by Email"
            description="Subscribe to get notified when a new episode of The Archetype Original Podcast drops."
          />
        </div>
      </div>
    </>
  );
}
