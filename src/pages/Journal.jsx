import React, { useState, useEffect } from 'react';

export default function Journal() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [categories, setCategories] = useState([]);

  useEffect(() => {
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
        
        // Extract unique categories
        const allCategories = [...new Set(
          sortedPosts.flatMap(post => post.categories || [])
        )];
        setCategories(['all', ...allCategories]);
        
        setLoading(false);
      })
      .catch(error => {
        console.error('Error loading journal posts:', error);
        setLoading(false);
      });
  }, []);

  const filteredPosts = selectedCategory === 'all' 
    ? posts 
    : posts.filter(post => post.categories && post.categories.includes(selectedCategory));

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAF9] py-16 sm:py-24 md:py-32 lg:py-40">
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
    <div className="min-h-screen bg-[#FAFAF9] py-16 sm:py-24 md:py-32 lg:py-40">
      <div className="container mx-auto px-4 sm:px-6 md:px-12">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12 sm:mb-16 md:mb-20">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#1A1A1A] mb-4 sm:mb-6 font-serif tracking-tight text-balance">
              Journal
            </h1>
            <p className="text-base sm:text-lg leading-relaxed text-[#6B6B6B] max-w-2xl mx-auto text-pretty">
              Thoughts, insights, and lessons learned from 32+ years of building companies and growing people.
            </p>
          </div>

          {/* Category Filter */}
          {categories.length > 1 && (
            <div className="mb-8 sm:mb-12">
              <div className="flex flex-wrap justify-center gap-2">
                {categories.map(category => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-4 py-2 text-sm font-medium transition-colors ${
                      selectedCategory === category
                        ? 'bg-[#1A1A1A] text-white'
                        : 'bg-white text-[#1A1A1A] border border-[#1A1A1A]/10 hover:bg-[#FAFAF9]'
                    }`}
                  >
                    {category === 'all' ? 'All Posts' : category}
                  </button>
                ))}
              </div>
            </div>
          )}

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
            <div className="space-y-8 sm:space-y-12">
              {filteredPosts.map((post) => (
                <article key={post.slug} className="bg-white border border-[#1A1A1A]/10">
                  {post.image && (
                    <div className="w-full flex justify-center items-center py-6 bg-[#FAFAF9]">
                      <img 
                        src={post.image} 
                        alt={post.title}
                        className="max-w-xs h-auto object-contain"
                      />
                    </div>
                  )}
                  <div className="p-6 sm:p-8">
                    <div className="flex items-center justify-between mb-4">
                      <time className="text-sm text-[#6B6B6B]">
                        {formatDate(post.publish_date)}
                      </time>
                      {post.original_source && (
                        <span className="px-2 py-1 bg-[#FAFAF9] text-[#6B6B6B] text-xs">
                          Originally from {post.original_source}
                        </span>
                      )}
                    </div>
                    
                    <h2 className="text-2xl sm:text-3xl font-bold text-[#1A1A1A] mb-3 sm:mb-4 font-serif tracking-tight">
                      <a 
                        href={`/journal/${post.slug}`}
                        className="hover:underline"
                        onClick={(e) => {
                          e.preventDefault();
                          window.history.pushState({}, '', `/journal/${post.slug}`);
                          window.dispatchEvent(new PopStateEvent('popstate'));
                        }}
                      >
                        {post.title}
                      </a>
                    </h2>
                    
                    <p className="text-base sm:text-lg leading-relaxed text-[#6B6B6B] mb-4 sm:mb-6 line-clamp-3 text-pretty">
                      {post.summary}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex flex-wrap gap-2">
                        {post.tags && post.tags.slice(0, 3).map(tag => (
                          <span key={tag} className="px-2 py-1 bg-[#FAFAF9] text-[#6B6B6B] text-xs">
                            {tag}
                          </span>
                        ))}
                      </div>
                      
                      <a 
                        href={`/journal/${post.slug}`}
                        className="text-[#1A1A1A] hover:underline font-medium text-base sm:text-lg"
                        onClick={(e) => {
                          e.preventDefault();
                          window.history.pushState({}, '', `/journal/${post.slug}`);
                          window.dispatchEvent(new PopStateEvent('popstate'));
                        }}
                      >
                        Read more →
                      </a>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
