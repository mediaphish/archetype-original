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
      <div className="min-h-screen bg-warm-offWhite py-12">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber mx-auto"></div>
            <p className="mt-4 text-warm-gray">Loading journal posts...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-warm-offWhite py-12">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="h1 mb-4">Journal</h1>
          <p className="p max-w-2xl mx-auto">
            Thoughts, insights, and lessons learned from 32+ years of building companies and growing people.
          </p>
        </div>

        {/* Category Filter */}
        {categories.length > 1 && (
          <div className="mb-8">
            <div className="flex flex-wrap justify-center gap-2">
              {categories.map(category => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    selectedCategory === category
                      ? 'bg-amber text-white'
                      : 'bg-warm-offWhite text-warm-charcoal border border-warm-border hover:bg-warm-border'
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
            <p className="text-warm-gray">
              {selectedCategory === 'all' 
                ? 'No journal posts yet. Check back soon!'
                : `No posts found in "${selectedCategory}" category.`
              }
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {filteredPosts.map((post) => (
              <article key={post.slug} className="bg-warm-offWhite rounded-lg shadow-sm border border-warm-border overflow-hidden">
                {post.image && (
                  <div className="w-full flex justify-center items-center py-6 bg-warm-offWhiteAlt">
                    <img 
                      src={post.image} 
                      alt={post.title}
                      className="max-w-xs h-auto object-contain"
                    />
                  </div>
                )}
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <time className="text-sm text-warm-gray">
                      {formatDate(post.publish_date)}
                    </time>
                    {post.original_source && (
                      <span className="px-2 py-1 bg-warm-border text-warm-gray text-xs rounded">
                        Originally from {post.original_source}
                      </span>
                    )}
                  </div>
                  
                  <h2 className="h2 mb-3">
                    <a 
                      href={`/journal/${post.slug}`}
                      className="hover:text-amber transition-colors"
                      onClick={(e) => {
                        e.preventDefault();
                        window.history.pushState({}, '', `/journal/${post.slug}`);
                        window.dispatchEvent(new PopStateEvent('popstate'));
                      }}
                    >
                      {post.title}
                    </a>
                  </h2>
                  
                  <p className="p mb-4 line-clamp-3">
                    {post.summary}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex flex-wrap gap-2">
                      {post.tags && post.tags.slice(0, 3).map(tag => (
                        <span key={tag} className="px-2 py-1 bg-amber/20 text-amber-dark text-xs rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                    
                    <a 
                      href={`/journal/${post.slug}`}
                      className="text-amber hover:text-amber-dark font-medium"
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
  );
}
