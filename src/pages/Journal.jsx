import React, { useState, useEffect, useMemo } from 'react';
import JournalSubscription from '../components/JournalSubscription';
import { OptimizedImage } from '../components/OptimizedImage';

const PAGE_SIZE = 12;

function toLabel(cat) {
  if (cat === 'all') return 'All';
  return cat.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

export default function Journal() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [listPage, setListPage] = useState(1);

  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }

    const scrollToTop = () => window.scrollTo(0, 0);
    scrollToTop();

    requestAnimationFrame(() => {
      scrollToTop();
      requestAnimationFrame(() => {
        scrollToTop();
      });
    });

    const timers = [0, 10, 50, 100, 200, 300, 500].map((delay) =>
      setTimeout(scrollToTop, delay),
    );

    const isNavigatingBack = sessionStorage.getItem('journalPostNavigating') === 'true';
    if (isNavigatingBack) {
      sessionStorage.removeItem('journalPostNavigating');
    }

    fetch('/api/knowledge?type=journal-post')
      .then((r) => r.json())
      .then((journalData) => {
        const docs = journalData.docs || [];
        const publishedPosts = docs.filter(
          (post) => post.status === 'published' || post.status === undefined,
        );
        const sortedPosts = publishedPosts.sort((a, b) => {
          const dateA = new Date(a.publish_date || a.created_at || 0);
          const dateB = new Date(b.publish_date || b.created_at || 0);
          return dateB - dateA;
        });
        setPosts(sortedPosts);
        setLoading(false);

        requestAnimationFrame(() => {
          scrollToTop();
          requestAnimationFrame(() => {
            scrollToTop();
          });
        });
        setTimeout(scrollToTop, 100);
        setTimeout(scrollToTop, 200);
      })
      .catch((error) => {
        console.error('Error loading journal posts:', error);
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

  const { derivedCategories, categoryCounts } = useMemo(() => {
    const counts = {};
    posts.forEach((post) => {
      (post.categories || []).forEach((cat) => {
        const slug = String(cat || '')
          .trim()
          .toLowerCase();
        if (!slug || slug === 'devotional') return;
        counts[slug] = (counts[slug] || 0) + 1;
      });
    });
    const derived = Object.entries(counts)
      .filter(([cat]) => cat !== 'devotional')
      .sort((a, b) => b[1] - a[1])
      .map(([cat]) => cat);
    return { derivedCategories: derived, categoryCounts: counts };
  }, [posts]);

  const filteredPosts =
    selectedCategory === 'all'
      ? posts
      : posts.filter((post) =>
          (post.categories || []).some(
            (c) => String(c || '').trim().toLowerCase() === selectedCategory,
          ),
        );

  const totalPages = Math.max(1, Math.ceil(filteredPosts.length / PAGE_SIZE));
  const safePage = Math.min(listPage, totalPages);
  const start = (safePage - 1) * PAGE_SIZE;
  const pageSlice = filteredPosts.slice(start, start + PAGE_SIZE);

  const featuredPost = safePage === 1 && pageSlice.length > 0 ? pageSlice[0] : null;
  const gridPosts =
    safePage === 1 && pageSlice.length > 1
      ? pageSlice.slice(1)
      : safePage === 1
        ? []
        : pageSlice;

  useEffect(() => {
    if (listPage > totalPages) {
      const tp = totalPages;
      setListPage(tp);
      window.history.replaceState({}, '', tp <= 1 ? '/journal' : `/journal?page=${tp}`);
    }
  }, [filteredPosts.length, listPage, totalPages]);

  const goToJournalPage = (n) => {
    const tp = Math.max(1, Math.ceil(filteredPosts.length / PAGE_SIZE));
    const next = Math.max(1, Math.min(n, tp));
    setListPage(next);
    const path = next <= 1 ? '/journal' : `/journal?page=${next}`;
    window.history.pushState({}, '', path);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';

    let dateStr = String(dateString);

    if (dateStr.includes('T')) {
      dateStr = dateStr.split('T')[0];
    }
    if (dateStr.includes(' ')) {
      dateStr = dateStr.split(' ')[0];
    }

    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = dateStr.split('-').map(Number);
      const date = new Date(year, month - 1, day);

      if (isNaN(date.getTime())) {
        return '';
      }

      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    }

    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return '';
    }

    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handlePostClick = (slug) => {
    window.history.pushState({}, '', `/journal/${slug}`);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAF9] py-12 sm:py-16 md:py-20">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-10">
          <div className="max-w-4xl mx-auto">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#DB0812] mx-auto"></div>
              <p className="mt-4 text-[#6B6B6B]">Loading journal posts...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAF9] text-[#1A1A1A]">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-10 py-14 sm:py-20">
        <div className="text-center mb-14 sm:mb-16">
          <h1 className="font-serif text-[clamp(3rem,7vw,5rem)] font-normal leading-[0.95] tracking-[-0.02em] mb-5">
            Journal
          </h1>
          <p className="text-lg sm:text-[18px] font-light text-[#6B6B6B] max-w-[540px] mx-auto leading-relaxed">
            Thoughts, insights, and lessons learned from 33 years of building companies and growing people.
          </p>
        </div>

        <div className="mb-14 sm:mb-16">
          <div className="flex flex-wrap justify-center gap-2.5 sm:gap-3">
            <button
              type="button"
              onClick={() => {
                setSelectedCategory('all');
                setListPage(1);
                window.history.replaceState({}, '', '/journal');
              }}
              className={`px-5 py-2 text-xs font-semibold tracking-[0.06em] uppercase border transition-colors ${
                selectedCategory === 'all'
                  ? 'bg-[#1A1A1A] text-white border-[#1A1A1A]'
                  : 'bg-transparent text-[#6B6B6B] border-[rgba(26,26,26,0.15)] hover:border-[#DB0812] hover:text-[#DB0812]'
              }`}
            >
              All ({posts.length})
            </button>
            {derivedCategories.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => {
                  setSelectedCategory(category);
                  setListPage(1);
                  window.history.replaceState({}, '', '/journal');
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
          </div>
        </div>

        {filteredPosts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-[#6B6B6B]">
              {selectedCategory === 'all'
                ? 'No journal posts yet. Check back soon!'
                : `No posts found in "${toLabel(selectedCategory)}" category.`}
            </p>
          </div>
        ) : (
          <>
            {featuredPost && (
              <article
                className="mb-16 lg:mb-20 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 cursor-pointer items-center"
                onClick={() => handlePostClick(featuredPost.slug)}
              >
                <div className="w-full overflow-hidden bg-[#E1DED8] aspect-[4/3] flex items-center justify-center">
                  {featuredPost.image ? (
                    <OptimizedImage
                      src={featuredPost.image}
                      alt={featuredPost.title}
                      className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                    />
                  ) : (
                    <span className="text-[12px] text-[#A8A9AD] tracking-[0.08em] uppercase">Post image</span>
                  )}
                </div>

                <div className="flex flex-col justify-center">
                  <div className="mb-4">
                    <span className="inline-block px-2.5 py-1 bg-[#1A1A1A] text-white text-[10px] font-semibold uppercase tracking-[0.12em]">
                      Featured
                    </span>
                  </div>
                  <time className="text-[13px] text-[#6B6B6B] mb-3 block">
                    {formatDate(featuredPost.publish_date || featuredPost.created_at)}
                  </time>
                  <h2 className="font-serif text-[clamp(1.75rem,3.5vw,2.75rem)] font-normal text-[#1A1A1A] mb-4 sm:mb-5 leading-tight tracking-[-0.01em] text-balance hover:text-[#DB0812] transition-colors">
                    <a
                      href={`/journal/${featuredPost.slug}`}
                      onClick={(e) => {
                        e.preventDefault();
                        handlePostClick(featuredPost.slug);
                      }}
                      className="text-inherit no-underline"
                    >
                      {featuredPost.title}
                    </a>
                  </h2>
                  <p className="text-base leading-[1.8] text-[#6B6B6B] mb-6 text-pretty line-clamp-4">
                    {featuredPost.summary || featuredPost.body?.substring(0, 200) + '...'}
                  </p>
                  <a
                    href={`/journal/${featuredPost.slug}`}
                    className="text-[15px] font-medium text-[#1A1A1A] hover:text-[#DB0812] transition-colors inline-flex items-center gap-1.5"
                    onClick={(e) => {
                      e.preventDefault();
                      handlePostClick(featuredPost.slug);
                    }}
                  >
                    Read Article →
                  </a>
                </div>
              </article>
            )}

            {gridPosts.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 lg:gap-12">
                {gridPosts.map((post) => (
                  <article
                    key={post.slug}
                    className="cursor-pointer"
                    onClick={() => handlePostClick(post.slug)}
                  >
                    <div className="w-full mb-4 overflow-hidden bg-[#E1DED8] aspect-video flex items-center justify-center">
                      {post.image ? (
                        <OptimizedImage
                          src={post.image}
                          alt={post.title}
                          className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                        />
                      ) : (
                        <span className="text-[12px] text-[#A8A9AD] tracking-[0.08em] uppercase">Post image</span>
                      )}
                    </div>

                    <div>
                      <time className="text-[12px] text-[#6B6B6B] mb-2 block">
                        {formatDate(post.publish_date || post.created_at)}
                      </time>
                      <h3 className="font-serif text-[22px] font-normal text-[#1A1A1A] mb-3 leading-snug tracking-[-0.01em] text-balance hover:text-[#DB0812] transition-colors">
                        <a
                          href={`/journal/${post.slug}`}
                          onClick={(e) => {
                            e.preventDefault();
                            handlePostClick(post.slug);
                          }}
                          className="text-inherit no-underline"
                        >
                          {post.title}
                        </a>
                      </h3>
                      <p className="text-[14px] leading-[1.75] text-[#6B6B6B] mb-4 line-clamp-3 text-pretty">
                        {post.summary || post.body?.substring(0, 150) + '...'}
                      </p>
                      <a
                        href={`/journal/${post.slug}`}
                        className="text-[14px] font-medium text-[#1A1A1A] hover:text-[#DB0812] transition-colors inline-flex items-center"
                        onClick={(e) => {
                          e.preventDefault();
                          handlePostClick(post.slug);
                        }}
                      >
                        Read Article →
                      </a>
                    </div>
                  </article>
                ))}
              </div>
            )}

            {totalPages > 1 && (
              <nav
                className="mt-14 flex flex-col items-center justify-center gap-4 sm:mt-20 sm:flex-row"
                aria-label="Journal pages"
              >
                <button
                  type="button"
                  onClick={() => goToJournalPage(safePage - 1)}
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
                  onClick={() => goToJournalPage(safePage + 1)}
                  disabled={safePage >= totalPages}
                  className="min-h-[44px] min-w-[8rem] border border-[#1A1A1A]/20 px-4 py-2 text-sm font-medium text-[#1A1A1A] transition-colors hover:border-[#DB0812] hover:text-[#DB0812] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </nav>
            )}
          </>
        )}

        <div className="mt-16 sm:mt-20 md:mt-28">
          <JournalSubscription />
        </div>
      </div>
    </div>
  );
}
