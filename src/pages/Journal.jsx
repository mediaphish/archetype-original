import React, { useState, useEffect } from 'react';

export default function Journal() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    // Load journal posts from the knowledge corpus
    const loadJournalPosts = async () => {
      try {
        const response = await fetch('/api/knowledge?type=journal-post');
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Journal API response:', data); // Debug log
        
        if (data.docs && Array.isArray(data.docs)) {
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
          
          console.log('Loaded journal posts:', sortedPosts.length); // Debug log
        } else {
          console.warn('No journal posts found in API response');
          setPosts([]);
          setCategories(['all']);
        }
      } catch (error) {
        console.error('Error loading journal posts:', error);
        // Fallback: try to load from static knowledge.json
        try {
          const fallbackResponse = await fetch('/knowledge.json');
          const fallbackData = await fallbackResponse.json();
          const journalPosts = fallbackData.docs.filter(doc => doc.type === 'journal-post');
          setPosts(journalPosts);
          setCategories(['all', ...new Set(journalPosts.flatMap(post => post.categories || []))]);
          console.log('Loaded journal posts from fallback:', journalPosts.length);
        } catch (fallbackError) {
          console.error('Fallback loading also failed:', fallbackError);
          setPosts([]);
          setCategories(['all']);
        }
      } finally {
        setLoading(false);
      }
    };

    loadJournalPosts();
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
                ? `No journal posts found. (Total posts: ${posts.length})`
                : `No posts found in "${selectedCategory}" category. (Total posts: ${posts.length})`
              }
            </p>
            {posts.length === 0 && (
              <div className="mt-4 text-sm text-gray-500">
                <p>Debug info: Check browser console for API response details.</p>
                <p>If you see this message, the API call may have failed.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            {filteredPosts.map((post) => (
              <article key={post.slug} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                {post.image && (
                  <div className="w-full flex justify-center">
                    <img 
                      src={post.image} 
                      alt={post.title}
                      className="max-w-sm h-auto object-contain"
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
                    <a 
                      href={`/journal/${post.slug}`}
                      className="hover:text-blue-600 transition-colors"
                    >
                      {post.title}
                    </a>
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
                    
                    <a 
                      href={`/journal/${post.slug}`}
                      className="text-blue-600 hover:text-blue-800 font-medium"
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
