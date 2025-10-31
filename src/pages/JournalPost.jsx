import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import SEO from '../components/SEO';

export default function JournalPost() {
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Extract slug from URL
    const path = window.location.pathname;
    const slug = path.replace('/journal/', '').replace(/\/$/, '');
    
    if (!slug) {
      setError('Post not found');
      setLoading(false);
      return;
    }

    // Load journal posts from the knowledge corpus
    fetch('/api/knowledge?type=journal-post')
      .then(response => response.json())
      .then(data => {
        // Find the post with matching slug
        const foundPost = data.docs.find(p => p.slug === slug);
        
        if (!foundPost) {
          setError('Post not found');
        } else {
          setPost(foundPost);
        }
        setLoading(false);
      })
      .catch(error => {
        console.error('Error loading journal post:', error);
        setError('Failed to load post');
        setLoading(false);
      });
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
      <div className="min-h-screen bg-warm-offWhite py-12">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber mx-auto"></div>
            <p className="mt-4 text-warm-gray">Loading post...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-warm-offWhite py-12">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center py-12">
            <h1 className="h1 mb-4">Post Not Found</h1>
            <p className="p mb-8">{error || 'The post you\'re looking for doesn\'t exist.'}</p>
            <a 
              href="/journal" 
              className="text-amber hover:text-amber-dark font-medium"
            >
              ← Back to Journal
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <SEO pageKey="journal" />
      <Helmet>
        <title>{post.title} | Journal | Archetype Original</title>
        <meta name="description" content={post.summary || post.title} />
      </Helmet>
      
      <div className="min-h-screen bg-warm-offWhite py-12 pt-20">
        <div className="max-w-4xl mx-auto px-4">
          {/* Back button */}
          <div className="mb-8">
            <a 
              href="/journal" 
              className="inline-flex items-center text-warm-gray hover:text-amber transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-amber rounded px-2 py-1"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Journal
            </a>
          </div>

          {/* Post Content */}
          <article className="bg-warm-offWhite rounded-lg shadow-sm border border-warm-border overflow-hidden">
            {post.image && (
              <div className="w-full flex justify-center items-center py-6 bg-warm-offWhiteAlt">
                <img 
                  src={post.image} 
                  alt={post.title}
                  className="max-w-2xl w-full h-auto object-contain"
                />
              </div>
            )}
            
            <div className="p-6 md:p-8">
              <div className="flex items-center justify-between mb-6">
                <time className="text-sm text-warm-gray">
                  {formatDate(post.publish_date || post.created_at)}
                </time>
                {post.original_source && (
                  <span className="px-2 py-1 bg-warm-border text-warm-gray text-xs rounded">
                    Originally from {post.original_source}
                  </span>
                )}
              </div>

              <h1 className="h1 mb-6">{post.title}</h1>

              {post.summary && (
                <div className="mb-8 p-4 bg-warm-offWhiteAlt border-l-4 border-amber rounded-r-lg">
                  <p className="p font-semibold text-warm-charcoal" style={{ lineHeight: '1.6' }}>
                    {post.summary}
                  </p>
                </div>
              )}

              {/* Post Body */}
              <div 
                className="prose prose-lg max-w-none"
                style={{ lineHeight: '1.6' }}
              >
                {post.body.split('\n').map((paragraph, index) => {
                  if (!paragraph.trim()) {
                    return <br key={index} />;
                  }
                  // Check if it's a heading
                  if (paragraph.startsWith('# ')) {
                    return <h1 key={index} className="h1 mb-4 mt-6">{paragraph.substring(2)}</h1>;
                  } else if (paragraph.startsWith('## ')) {
                    return <h2 key={index} className="h2 mb-3 mt-6">{paragraph.substring(3)}</h2>;
                  } else if (paragraph.startsWith('### ')) {
                    return <h3 key={index} className="h3 mb-2 mt-4">{paragraph.substring(4)}</h3>;
                  } else if (paragraph.startsWith('- ') || paragraph.startsWith('* ')) {
                    return <li key={index} className="p ml-4" style={{ lineHeight: '1.6' }}>{paragraph.substring(2)}</li>;
                  }
                  return (
                    <p key={index} className="p mb-6" style={{ lineHeight: '1.6' }}>
                      {paragraph}
                    </p>
                  );
                })}
              </div>

              {/* Tags */}
              {post.tags && post.tags.length > 0 && (
                <div className="mt-8 pt-8 border-t border-warm-border">
                  <div className="flex flex-wrap gap-2">
                    {post.tags.map(tag => (
                      <span key={tag} className="px-3 py-1 bg-amber/20 text-amber-dark text-sm rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Categories */}
              {post.categories && post.categories.length > 0 && (
                <div className="mt-4">
                  <div className="flex flex-wrap gap-2">
                    {post.categories.map(category => (
                      <span key={category} className="px-3 py-1 bg-warm-border text-warm-gray text-sm rounded-full">
                        {category}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </article>
        </div>
      </div>
    </>
  );
}

