import React, { useState, useEffect } from 'react';

export default function JournalHighlights() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load most recent journal posts
    fetch('/api/knowledge?type=journal-post')
      .then(response => response.json())
      .then(data => {
        // Filter to only published posts, sort by date, get most recent for featured + 2 more
        const publishedPosts = data.docs.filter(post => 
          post.status === 'published' || post.status === undefined
        );
        const sortedPosts = publishedPosts.sort((a, b) => {
          const dateA = new Date(a.publish_date || a.created_at || 0);
          const dateB = new Date(b.publish_date || b.created_at || 0);
          return dateB - dateA;
        });
        setPosts(sortedPosts.slice(0, 3)); // Get 3 most recent (first is featured)
        setLoading(false);
      })
      .catch(error => {
        console.error('Error loading journal posts:', error);
        setLoading(false);
      });
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
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
      <section className="py-16 sm:py-24 md:py-32 lg:py-40 bg-white">
        <div className="container mx-auto px-4 sm:px-6 md:px-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C85A3C] mx-auto"></div>
          </div>
        </div>
      </section>
    );
  }

  const featuredPost = posts[0];
  const otherPosts = posts.slice(1);

  return (
    <section className="py-16 sm:py-24 md:py-32 lg:py-40 bg-white">
      <div className="container mx-auto px-4 sm:px-6 md:px-12">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#1A1A1A] mb-4 sm:mb-6 font-serif tracking-tight text-balance mb-8 sm:mb-10 md:mb-12">
            Latest From The Journal
          </h2>
          
          <p className="text-base sm:text-lg leading-relaxed text-[#6B6B6B] mb-12 sm:mb-16 md:mb-20 text-pretty">
            Long-form pieces, frameworks, research-backed insights, and real stories from my own leadership journey.
          </p>

          {posts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-[#6B6B6B]">No journal posts available yet.</p>
            </div>
          ) : (
            <>
              {/* Featured Article */}
              {featuredPost && (
                <article 
                  className="mb-16 sm:mb-20 md:mb-24 cursor-pointer"
                  onClick={() => handlePostClick(featuredPost.slug)}
                >
                  <div className="mb-4">
                    <span className="inline-block px-3 py-1 bg-[#1A1A1A] text-white text-xs font-medium uppercase tracking-wide">
                      Featured
                    </span>
                  </div>
                  {featuredPost.image && (
                    <div className="w-full mb-6 sm:mb-8">
                      <img 
                        src={featuredPost.image} 
                        alt={featuredPost.title}
                        className="w-full h-auto"
                        style={{ aspectRatio: 'auto' }}
                      />
                    </div>
                  )}
                  <div className="mb-3">
                    <time className="text-sm text-[#6B6B6B]">
                      {formatDate(featuredPost.publish_date || featuredPost.created_at)}
                    </time>
                  </div>
                  <h3 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-[#1A1A1A] mb-4 sm:mb-6 font-serif tracking-tight text-balance">
                    {featuredPost.title}
                  </h3>
                  <p className="text-base sm:text-lg leading-relaxed text-[#6B6B6B] mb-4 sm:mb-6 text-pretty">
                    {featuredPost.summary || featuredPost.body?.substring(0, 200) + '...'}
                  </p>
                  <a 
                    href={`/journal/${featuredPost.slug}`}
                    onClick={(e) => {
                      e.preventDefault();
                      handlePostClick(featuredPost.slug);
                    }}
                    className="text-[#1A1A1A] font-medium text-base sm:text-lg hover:underline"
                  >
                    Read Article →
                  </a>
                </article>
              )}

              {/* Other Articles Grid */}
              {otherPosts.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 mb-12 sm:mb-16 md:mb-20">
                  {otherPosts.map((post) => (
                    <article 
                      key={post.slug} 
                      className="cursor-pointer"
                      onClick={() => handlePostClick(post.slug)}
                    >
                      {post.image && (
                        <div className="w-full mb-4">
                          <img 
                            src={post.image} 
                            alt={post.title}
                            className="w-full h-auto opacity-100 hover:opacity-90 transition-opacity"
                            style={{ aspectRatio: 'auto' }}
                          />
                        </div>
                      )}
                      <div className="mb-2">
                        <time className="text-sm text-[#6B6B6B]">
                          {formatDate(post.publish_date || post.created_at)}
                        </time>
                      </div>
                      <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#1A1A1A] mb-3 sm:mb-4 font-serif tracking-tight text-balance">
                        {post.title}
                      </h3>
                      <p className="text-base sm:text-lg leading-relaxed text-[#6B6B6B] line-clamp-3 text-pretty">
                        {post.summary || post.body?.substring(0, 150) + '...'}
                      </p>
                    </article>
                  ))}
                </div>
              )}

              {/* Link to Journal */}
              <div className="text-center">
                <a 
                  href="/journal"
                  onClick={(e) => {
                    e.preventDefault();
                    window.history.pushState({}, '', '/journal');
                    window.dispatchEvent(new PopStateEvent('popstate'));
                  }}
                  className="inline-block bg-[#1A1A1A] text-white px-8 sm:px-10 py-4 sm:py-5 font-medium text-sm sm:text-base hover:bg-[#1A1A1A]/90 transition-colors"
                >
                  View all Journal Entries
                </a>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
