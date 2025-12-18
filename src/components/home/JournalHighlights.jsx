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
          <div className="max-w-7xl mx-auto">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C85A3C] mx-auto"></div>
            </div>
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
          <h2 className="font-serif text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-[#1A1A1A] mb-6 sm:mb-8 leading-[0.9] break-words">
            Latest From The Journal
          </h2>
          
          <p className="text-lg sm:text-xl md:text-2xl leading-relaxed text-[#1A1A1A]/70 mb-12 sm:mb-16">
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
                  className="mb-16 sm:mb-20 md:mb-24 group cursor-pointer"
                  onClick={() => handlePostClick(featuredPost.slug)}
                >
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-10 md:gap-12 items-center">
                    {/* Left: Image */}
                    <div className="bg-[#FAFAF9]">
                      {featuredPost.image ? (
                        <img 
                          src={featuredPost.image} 
                          alt={featuredPost.title}
                          className="w-full h-auto group-hover:opacity-90 transition-opacity"
                        />
                      ) : (
                        <div className="w-full aspect-video bg-[#FAFAF9]"></div>
                      )}
                    </div>
                    
                    {/* Right: Content */}
                    <div>
                      <div className="mb-4">
                        <span className="inline-block px-3 py-1 bg-[#C85A3C]/10 text-xs font-medium tracking-wider text-[#C85A3C] uppercase">
                          Featured
                        </span>
                      </div>
                      <time className="text-xs sm:text-sm text-[#1A1A1A]/40 mb-4 sm:mb-6 block">
                        {formatDate(featuredPost.publish_date || featuredPost.created_at)}
                      </time>
                      <h3 className="font-serif text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-[#1A1A1A] mb-4 sm:mb-6 md:mb-8 group-hover:text-[#1A1A1A]/60 transition-colors leading-tight break-words">
                        {featuredPost.title}
                      </h3>
                      <p className="text-lg sm:text-xl leading-relaxed text-[#1A1A1A]/70 mb-8">
                        {(() => {
                          // Filter out RTF code from summary or body
                          let text = featuredPost.summary || featuredPost.body || '';
                          // Remove RTF code patterns
                          text = text.replace(/\{\\rtf[^}]*\}/gi, '');
                          text = text.replace(/\\[a-z]+\d*\s*/gi, '');
                          text = text.replace(/\{[^}]*\}/g, '');
                          // Clean up extra whitespace
                          text = text.replace(/\s+/g, ' ').trim();
                          // Get first 200 chars
                          return text.length > 200 ? text.substring(0, 200) + '...' : text;
                        })()}
                      </p>
                      <a 
                        href={`/journal/${featuredPost.slug}`}
                        onClick={(e) => {
                          e.preventDefault();
                          handlePostClick(featuredPost.slug);
                        }}
                        className="inline-flex items-center font-medium text-[#1A1A1A] hover:text-[#C85A3C] transition-colors"
                      >
                        Read Article →
                      </a>
                    </div>
                  </div>
                </article>
              )}

              {/* Other Articles Grid */}
              {otherPosts.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 sm:gap-14 md:gap-16 mb-16 sm:mb-20 md:mb-24">
                  {otherPosts.map((post) => (
                    <article 
                      key={post.slug} 
                      className="group cursor-pointer"
                      onClick={() => handlePostClick(post.slug)}
                    >
                      {post.image && (
                        <div className="mb-6 sm:mb-8 bg-[#FAFAF9]">
                          <img 
                            src={post.image} 
                            alt={post.title}
                            className="w-full h-auto group-hover:opacity-90 transition-opacity"
                          />
                        </div>
                      )}
                      <div className="border-t-2 border-[#1A1A1A] pt-6 sm:pt-8">
                        <time className="text-xs sm:text-sm text-[#1A1A1A]/40 mb-4 block">
                          {formatDate(post.publish_date || post.created_at)}
                        </time>
                        <h3 className="font-serif text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-[#1A1A1A] mb-4 sm:mb-6 md:mb-8 group-hover:text-[#1A1A1A]/60 transition-colors leading-tight break-words">
                          {post.title}
                        </h3>
                        <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]/70">
                          {(() => {
                            // Filter out RTF code from summary or body
                            let text = post.summary || post.body || '';
                            // Remove RTF code patterns
                            text = text.replace(/\{\\rtf[^}]*\}/gi, '');
                            text = text.replace(/\\[a-z]+\d*\s*/gi, '');
                            text = text.replace(/\{[^}]*\}/g, '');
                            // Clean up extra whitespace
                            text = text.replace(/\s+/g, ' ').trim();
                            // Get first 150 chars
                            return text.length > 150 ? text.substring(0, 150) + '...' : text;
                          })()}
                        </p>
                      </div>
                    </article>
                  ))}
                </div>
              )}

              {/* View All CTA */}
              <div className="text-center mt-16 sm:mt-20 md:mt-24">
                <a 
                  href="/journal"
                  onClick={(e) => {
                    e.preventDefault();
                    window.history.pushState({}, '', '/journal');
                    window.dispatchEvent(new PopStateEvent('popstate'));
                  }}
                  className="inline-block bg-[#1A1A1A] text-white px-10 sm:px-12 py-5 sm:py-6 font-medium text-base hover:bg-[#C85A3C] transition-colors border-2 border-[#1A1A1A] hover:border-[#C85A3C]"
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
