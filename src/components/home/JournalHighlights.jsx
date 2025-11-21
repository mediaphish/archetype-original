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
      <section className="py-16 sm:py-20 md:py-32 lg:py-40 bg-white">
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
    <section className="py-16 sm:py-20 md:py-32 lg:py-40 bg-white">
      <div className="container mx-auto px-4 sm:px-6 md:px-12">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-[48px] sm:text-[64px] md:text-[72px] lg:text-[96px] font-bold text-[#1A1A1A] mb-6 sm:mb-8 md:mb-12 font-serif tracking-tight text-balance mb-16 sm:mb-20 md:mb-24">
            Journal
          </h2>

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
                  <h3 className="text-[32px] sm:text-[42px] md:text-[48px] lg:text-[64px] font-bold text-[#1A1A1A] mb-4 sm:mb-6 font-serif tracking-tight text-balance">
                    {featuredPost.title}
                  </h3>
                  <p className="text-base md:text-lg lg:text-xl leading-relaxed text-[#6B6B6B] text-pretty">
                    {featuredPost.summary || featuredPost.body?.substring(0, 200) + '...'}
                  </p>
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
                      <h3 className="text-[24px] sm:text-[32px] md:text-[40px] lg:text-[48px] font-bold text-[#1A1A1A] mb-3 sm:mb-4 font-serif tracking-tight text-balance">
                        {post.title}
                      </h3>
                      <p className="text-base md:text-lg leading-relaxed text-[#6B6B6B] line-clamp-3 text-pretty">
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
                  className="inline-block text-[#1A1A1A] font-medium text-base md:text-lg hover:underline"
                >
                  View All Journal Entries →
                </a>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
