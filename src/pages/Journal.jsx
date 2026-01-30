import React, { useState, useEffect } from 'react';
import JournalSubscription from '../components/JournalSubscription';
import { OptimizedImage } from '../components/OptimizedImage';

export default function Journal() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Map actual categories to display categories (comprehensive mapping)
  const categoryMapping = {
    'leadership': [
      'leadership-development', 
      'leadership-principles', 
      'servant-leadership', 
      'power-control', 
      'accountability', 
      'trust',
      'case-studies' // Leadership case studies
    ],
    'culture': [
      'culture', 
      'culture-values', 
      'team-building', 
      'collaboration', 
      'communication', 
      'systems'
    ],
    'growth': [
      'leadership-development', 
      'personal-reflection', 
      'innovation', 
      'balance', 
      'boundaries',
      'fear' // Growth through facing fear
    ],
    'philosophy': [
      'servant-leadership', 
      'purpose', 
      'legacy', 
      'neuroscience', 
      'empathy', 
      'data-research'
    ],
    'devotional': [
      'devotional'
    ]
  };

  useEffect(() => {
    // Ensure scroll restoration is disabled for journal pages
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
    
    // Always scroll to top when Journal page loads (including on back navigation)
    // Use multiple attempts to ensure it sticks, even with browser scroll restoration
    const scrollToTop = () => window.scrollTo(0, 0);
    
    // Immediate scroll (synchronous)
    scrollToTop();
    
    // Multiple delayed attempts to catch any late scroll restoration
    requestAnimationFrame(() => {
      scrollToTop();
      requestAnimationFrame(() => {
        scrollToTop();
      });
    });
    
    // Additional delayed attempts - more aggressive
    const timers = [0, 10, 50, 100, 200, 300, 500].map(delay => 
      setTimeout(scrollToTop, delay)
    );
    
    // Check if we're navigating back from a journal post
    const isNavigatingBack = sessionStorage.getItem('journalPostNavigating') === 'true';
    if (isNavigatingBack) {
      // Clear the flag
      sessionStorage.removeItem('journalPostNavigating');
    }
    
    // Load both journal posts and devotionals from the knowledge corpus
    Promise.all([
      fetch('/api/knowledge?type=journal-post').then(r => r.json()),
      fetch('/api/knowledge?type=devotional').then(r => r.json())
    ])
      .then(([journalData, devotionalData]) => {
        // Get today's date in YYYY-MM-DD format using local timezone (not UTC)
        // This prevents timezone shifts that cause dates to be off by a day
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const todayStr = `${year}-${month}-${day}`; // "2026-01-21" in local timezone
        
        // Filter devotionals to only include those with publish_date <= today
        const publishedDevotionals = (devotionalData.docs || []).filter(devotional => {
          if (devotional.status !== 'published' && devotional.status !== undefined) {
            return false;
          }
          if (!devotional.publish_date) {
            return false;
          }
          // Extract date string (YYYY-MM-DD) for accurate comparison
          const publishDateStr = String(devotional.publish_date).split('T')[0].split(' ')[0];
          return publishDateStr <= todayStr;
        });
        
        // Combine both types - include only published devotionals
        const allPosts = [
          ...journalData.docs,
          ...publishedDevotionals
        ];
        
        // Filter to only published posts, then sort by publish date, newest first
        const publishedPosts = allPosts.filter(post => 
          post.status === 'published' || post.status === undefined
        );
        const sortedPosts = publishedPosts.sort((a, b) => {
          const dateA = new Date(a.publish_date || a.created_at || 0);
          const dateB = new Date(b.publish_date || b.created_at || 0);
          return dateB - dateA;
        });
        setPosts(sortedPosts);
        setLoading(false);
        
        // Ensure scroll stays at top after content loads - multiple attempts
        requestAnimationFrame(() => {
          scrollToTop();
          requestAnimationFrame(() => {
            scrollToTop();
          });
        });
        setTimeout(scrollToTop, 100);
        setTimeout(scrollToTop, 200);
      })
      .catch(error => {
        console.error('Error loading journal posts:', error);
        setLoading(false);
      });
    
    return () => {
      timers.forEach(clearTimeout);
    };
  }, []);

  const filteredPosts = selectedCategory === 'all' 
    ? posts.filter(post => post.type !== 'devotional') // Exclude devotionals from "all" view
    : selectedCategory === 'devotional'
    ? posts.filter(post => post.type === 'devotional') // Show only devotionals
    : posts.filter(post => {
        // For other categories, exclude devotionals and filter by category
        if (post.type === 'devotional') return false;
        const postCategories = post.categories || [];
        const mappedCategories = categoryMapping[selectedCategory] || [];
        return postCategories.some(cat => mappedCategories.includes(cat));
      });

  const featuredPost = filteredPosts[0];
  const remainingPosts = filteredPosts.slice(1);

  const formatDate = (dateString) => {
    if (!dateString) return '';
    
    // Extract YYYY-MM-DD from any date format (handles ISO strings, YYYY-MM-DD, etc.)
    let dateStr = String(dateString);
    
    // Extract just the date part (YYYY-MM-DD) from ISO strings like "2026-01-22T00:00:00.000Z"
    if (dateStr.includes('T')) {
      dateStr = dateStr.split('T')[0];
    }
    // Remove any time portion if present
    if (dateStr.includes(' ')) {
      dateStr = dateStr.split(' ')[0];
    }
    
    // Parse YYYY-MM-DD as local date (not UTC) to avoid timezone shifts
    // This ensures "2026-01-22" displays as January 22, 2026, not January 21
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = dateStr.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return '';
      }
      
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
    
    // Fallback for other formats
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return '';
    }
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handlePostClick = (slug) => {
    window.history.pushState({}, '', `/journal/${slug}`);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAF9] py-12 sm:py-16 md:py-20 lg:py-20">
        <div className="container mx-auto px-4 sm:px-6 md:px-12">
          <div className="max-w-4xl mx-auto">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C85A3C] mx-auto"></div>
              <p className="mt-4 text-[#6B6B6B]">Loading journal posts...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAF9] py-12 sm:py-16 md:py-20 lg:py-20">
      <div className="container mx-auto px-4 sm:px-6 md:px-12">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12 sm:mb-16 md:mb-20">
            <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl font-bold text-[#1A1A1A] mb-4 sm:mb-6 leading-[0.9] tracking-tight">
              Journal
            </h1>
            <p className="text-xl sm:text-2xl md:text-3xl leading-relaxed text-[#1A1A1A]/70 max-w-2xl mx-auto font-light">
              Thoughts, insights, and lessons learned from 32+ years of building companies and growing people.
            </p>
          </div>

          {/* Category Filters */}
          <div className="mb-12 sm:mb-16 lg:mb-20">
            <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
              {['all', 'leadership', 'culture', 'growth', 'philosophy', 'devotional'].map(category => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-6 py-2.5 text-sm font-medium border transition-all duration-200 ${
                    selectedCategory === category
                      ? 'bg-[#1A1A1A] text-white border-[#1A1A1A]'
                      : 'bg-transparent text-[#1A1A1A] border-[#1A1A1A]/10 hover:border-[#C85A3C] hover:text-[#C85A3C] hover:bg-[#FAFAF9]'
                  }`}
                >
                  {category === 'all' ? 'All' : category.charAt(0).toUpperCase() + category.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Posts */}
          {filteredPosts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-[#6B6B6B]">
                {selectedCategory === 'all' 
                  ? 'No journal posts yet. Check back soon!'
                  : `No posts found in "${selectedCategory}" category.`
                }
              </p>
            </div>
          ) : (
            <>
              {/* Featured Article */}
              {featuredPost && (
                <article 
                  className="mb-16 lg:mb-20 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 cursor-pointer"
                  onClick={() => handlePostClick(featuredPost.slug)}
                >
                  {/* Image */}
                  {featuredPost.image && (
                    <div className="w-full overflow-hidden">
                      <OptimizedImage
                        src={featuredPost.image}
                        alt={featuredPost.title}
                        className="w-full h-auto object-cover transition-transform duration-300 hover:scale-105"
                      />
                    </div>
                  )}
                  
                  {/* Content */}
                  <div className="flex flex-col justify-center">
                    <div className="mb-4">
                      <span className="inline-block px-3 py-1 bg-[#1A1A1A] text-white text-xs font-medium uppercase tracking-wide">
                        Featured
                      </span>
                    </div>
                    <time className="text-sm text-[#1A1A1A]/60 mb-3 block">
                      {formatDate(featuredPost.publish_date || featuredPost.created_at)}
                    </time>
                    <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#1A1A1A] mb-4 sm:mb-6 font-serif tracking-tight text-balance hover:text-[#C85A3C] transition-colors">
                      <a 
                        href={`/journal/${featuredPost.slug}`}
                        onClick={(e) => {
                          e.preventDefault();
                          handlePostClick(featuredPost.slug);
                        }}
                      >
                        {featuredPost.title}
                      </a>
                    </h2>
                    <p className="text-base sm:text-lg leading-relaxed text-[#6B6B6B] mb-6 text-pretty line-clamp-4">
                      {featuredPost.summary || featuredPost.body?.substring(0, 200) + '...'}
                    </p>
                    <a 
                      href={`/journal/${featuredPost.slug}`}
                      className="text-[#1A1A1A] font-medium text-base sm:text-lg hover:text-[#C85A3C] transition-colors inline-flex items-center"
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

              {/* Remaining Articles Grid */}
              {remainingPosts.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-12">
                  {remainingPosts.map((post) => (
                    <article 
                      key={post.slug} 
                      className="cursor-pointer"
                      onClick={() => handlePostClick(post.slug)}
                    >
                      {/* Image */}
                      {post.image && (
                        <div className="w-full mb-4 overflow-hidden">
                          <OptimizedImage
                            src={post.image}
                            alt={post.title}
                            className="w-full h-auto object-cover transition-transform duration-300 hover:scale-105"
                          />
                        </div>
                      )}
                      
                      {/* Content */}
                      <div>
                        <time className="text-sm text-[#1A1A1A]/60 mb-2 block">
                          {formatDate(post.publish_date || post.created_at)}
                        </time>
                        <h3 className="text-2xl sm:text-3xl font-bold text-[#1A1A1A] mb-3 sm:mb-4 font-serif tracking-tight text-balance hover:text-[#C85A3C] transition-colors">
                          <a 
                            href={`/journal/${post.slug}`}
                            onClick={(e) => {
                              e.preventDefault();
                              handlePostClick(post.slug);
                            }}
                          >
                            {post.title}
                          </a>
                        </h3>
                        <p className="text-base sm:text-lg leading-relaxed text-[#6B6B6B] mb-4 line-clamp-3 text-pretty">
                          {post.summary || post.body?.substring(0, 150) + '...'}
                        </p>
                        <a 
                          href={`/journal/${post.slug}`}
                          className="text-[#1A1A1A] font-medium text-base sm:text-lg hover:text-[#C85A3C] transition-colors inline-flex items-center"
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
            </>
          )}

          {/* Email Subscription Section */}
          <div className="mt-16 sm:mt-20 md:mt-24 lg:mt-32">
            <JournalSubscription />
          </div>
        </div>
      </div>
    </div>
  );
}
