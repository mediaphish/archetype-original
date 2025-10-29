import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

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
        // Sort by publish date, newest first
        const sortedPosts = data.docs.sort((a, b) => 
          new Date(b.publish_date) - new Date(a.publish_date)
        );
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
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading journal posts...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Journal</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
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
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
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
            <p className="text-gray-600">
              {selectedCategory === 'all' 
                ? 'No journal posts yet. Check back soon!'
                : `No posts found in "${selectedCategory}" category.`
              }
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {filteredPosts.map((post) => (
              <article key={post.slug} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                {post.image && (
                  <div className="aspect-w-16 aspect-h-9">
                    <img 
                      src={post.image} 
                      alt={post.title}
                      className="w-full h-48 object-cover"
                    />
                  </div>
                )}
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <time className="text-sm text-gray-600">
                      {formatDate(post.publish_date)}
                    </time>
                    {post.original_source && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                        Originally from {post.original_source}
                      </span>
                    )}
                  </div>
                  
                  <h2 className="text-2xl font-bold text-gray-900 mb-3">
                    <Link 
                      to={`/journal/${post.slug}`}
                      className="hover:text-blue-600 transition-colors"
                    >
                      {post.title}
                    </Link>
                  </h2>
                  
                  <p className="text-gray-700 mb-4 line-clamp-3">
                    {post.summary}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex flex-wrap gap-2">
                      {post.tags && post.tags.slice(0, 3).map(tag => (
                        <span key={tag} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                    
                    <Link 
                      to={`/journal/${post.slug}`}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Read more →
                    </Link>
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
