import React, { useState, useEffect } from 'react';
import JournalSubscription from '../components/JournalSubscription';

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
    ]
  };

  useEffect(() => {
    // Ensure we're at the top when the Journal page loads
    window.scrollTo({ top: 0, behavior: 'instant' });
    
    // Load journal posts from the knowledge corpus
    fetch('/api/knowledge?type=journal-post')
      .then(response => response.json())
      .then(data => {
        // Filter to only published posts, then sort by publish date, newest first
        const publishedPosts = data.docs.filter(post => 
          post.status === 'published' || post.status === undefined
        );
        const sortedPosts = publishedPosts.sort((a, b) => {
          const dateA = new Date(a.publish_date || a.created_at || 0);
          const dateB = new Date(b.publish_date || b.created_at || 0);
          return dateB - dateA;
        });
        setPosts(sortedPosts);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error loading journal posts:', error);
        setLoading(false);
      });
  }, []);

  const filteredPosts = selectedCategory === 'all' 
    ? posts 
    : posts.filter(post => {
        const postCategories = post.categories || [];
        const mappedCategories = categoryMapping[selectedCategory] || [];
        return postCategories.some(cat => mappedCategories.includes(cat));
      });

  const featuredPost = filteredPosts[0];
  const remainingPosts = filteredPosts.slice(1);

  const formatDate = (dateString) => {
    if (!dateString) return '';
    // Handle YYYY-MM-DD format explicitly
    let date;
    if (typeof dateString === 'string' && dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
      // Parse YYYY-MM-DD as UTC to avoid timezone issues
      const [year, month, day] = dateString.split('-').map(Number);
      date = new Date(Date.UTC(year, month - 1, day));
    } else {
      date = new Date(dateString);
    }
    
    // Check if date is valid
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
              {['all', 'leadership', 'culture', 'growth', 'philosophy'].map(category => (
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
                      <img 
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
                          <img 
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
