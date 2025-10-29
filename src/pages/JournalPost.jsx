import React, { useState, useEffect } from 'react';

export default function JournalPost() {
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadPost = async () => {
      try {
        // Get the slug from the URL
        const path = window.location.pathname;
        const slug = path.replace('/journal/', '');
        
        if (!slug) {
          setError('Post not found');
          setLoading(false);
          return;
        }

        // Try API first
        try {
          const response = await fetch(`/api/knowledge?type=journal-post&q=${slug}`);
          if (response.ok) {
            const data = await response.json();
            const foundPost = data.docs.find(doc => doc.slug === slug);
            if (foundPost) {
              setPost(foundPost);
              setLoading(false);
              return;
            }
          }
        } catch (apiError) {
          console.log('API failed, trying fallback');
        }

        // Fallback to static knowledge.json
        const fallbackResponse = await fetch('/knowledge.json');
        const fallbackData = await fallbackResponse.json();
        const foundPost = fallbackData.docs.find(doc => doc.type === 'journal-post' && doc.slug === slug);
        
        if (foundPost) {
          setPost(foundPost);
        } else {
          setError('Post not found');
        }
      } catch (error) {
        console.error('Error loading journal post:', error);
        setError('Failed to load post');
      } finally {
        setLoading(false);
      }
    };

    loadPost();
  }, []);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 pt-20">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading post...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 pt-20">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Post Not Found</h1>
            <p className="text-xl text-gray-600 mb-8">
              The journal post you're looking for doesn't exist or has been moved.
            </p>
            <a 
              href="/journal" 
              className="inline-block bg-gray-900 text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition-colors"
            >
              ← Back to Journal
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 pt-20">
      <div className="max-w-4xl mx-auto px-4">
        {/* Back button */}
        <div className="mb-8">
          <a 
            href="/journal" 
            className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Journal
          </a>
        </div>

        {/* Post content */}
        <article className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {post.image && (
            <div className="w-full flex justify-center p-6">
              <img 
                src={post.image} 
                alt={post.title}
                className="max-w-sm h-auto object-contain"
              />
            </div>
          )}
          
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <time className="text-sm text-gray-600">
                {formatDate(post.publish_date)}
              </time>
              {post.source?.original_source && (
                <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                  Originally from {post.source.original_source}
                </span>
              )}
            </div>
            
            <h1 className="text-4xl font-bold text-gray-900 mb-6">
              {post.title}
            </h1>
            
            {post.summary && (
              <p className="text-xl text-gray-700 mb-8 leading-relaxed">
                {post.summary}
              </p>
            )}
            
            <div className="prose prose-lg max-w-none">
              <div dangerouslySetInnerHTML={{ 
                __html: post.body.replace(/\n/g, '<br />') 
              }} />
            </div>
            
            {post.tags && post.tags.length > 0 && (
              <div className="mt-8 pt-6 border-t border-gray-200">
                <div className="flex flex-wrap gap-2">
                  {post.tags.map(tag => (
                    <span key={tag} className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </article>
      </div>
    </div>
  );
}
