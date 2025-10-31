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
                {(() => {
                  // Clean the body - remove title if it appears at the start
                  let bodyText = post.body.trim();
                  // Remove title if it appears as a heading at the start
                  const titleRegex = new RegExp(`^#+\\s*${post.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\n`, 'i');
                  if (titleRegex.test(bodyText)) {
                    bodyText = bodyText.replace(titleRegex, '');
                  }
                  // Also check if first line is just the title (without #)
                  const firstLine = bodyText.split('\n')[0].trim();
                  if (firstLine === post.title) {
                    bodyText = bodyText.replace(new RegExp(`^${post.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\n?`, 'i'), '');
                  }

                  // Parse markdown into blocks
                  const lines = bodyText.split('\n');
                  const blocks = [];
                  let currentParagraph = [];
                  let currentList = [];
                  let inBlockquote = false;
                  let inList = false;

                  const flushParagraph = () => {
                    if (currentParagraph.length > 0) {
                      const text = currentParagraph.join(' ').trim();
                      if (text) {
                        blocks.push({ type: 'paragraph', content: text });
                      }
                      currentParagraph = [];
                    }
                  };

                  const flushBlockquote = () => {
                    if (inBlockquote && currentParagraph.length > 0) {
                      const text = currentParagraph.join(' ').trim();
                      if (text) {
                        blocks.push({ type: 'blockquote', content: text });
                      }
                      currentParagraph = [];
                      inBlockquote = false;
                    }
                  };

                  const flushList = () => {
                    if (currentList.length > 0) {
                      blocks.push({ type: 'ul', items: [...currentList] });
                      currentList = [];
                    }
                  };

                  for (let i = 0; i < lines.length; i++) {
                    const line = lines[i].trim();
                    
                    // Empty line
                    if (!line) {
                      flushParagraph();
                      flushBlockquote();
                      flushList();
                      inList = false;
                      continue;
                    }

                    // Heading
                    if (line.startsWith('# ')) {
                      flushParagraph();
                      flushBlockquote();
                      flushList();
                      blocks.push({ type: 'h1', content: line.substring(2).trim() });
                      continue;
                    } else if (line.startsWith('## ')) {
                      flushParagraph();
                      flushBlockquote();
                      flushList();
                      blocks.push({ type: 'h2', content: line.substring(3).trim() });
                      continue;
                    } else if (line.startsWith('### ')) {
                      flushParagraph();
                      flushBlockquote();
                      flushList();
                      blocks.push({ type: 'h3', content: line.substring(4).trim() });
                      continue;
                    }

                    // Blockquote
                    if (line.startsWith('> ')) {
                      flushParagraph();
                      flushList();
                      if (!inBlockquote) {
                        flushBlockquote();
                        inBlockquote = true;
                      }
                      currentParagraph.push(line.substring(2).trim());
                      continue;
                    } else if (inBlockquote) {
                      flushBlockquote();
                    }

                    // Horizontal rule
                    if (line === '---' || line === '***') {
                      flushParagraph();
                      flushBlockquote();
                      flushList();
                      blocks.push({ type: 'hr' });
                      continue;
                    }

                    // Image markdown: ![alt](path)
                    const imageMatch = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
                    if (imageMatch) {
                      flushParagraph();
                      flushBlockquote();
                      flushList();
                      const [, alt, imagePath] = imageMatch;
                      // Convert relative paths to absolute
                      const fullImagePath = imagePath.startsWith('../images/') 
                        ? imagePath.replace('../images/', '/images/')
                        : imagePath.startsWith('images/')
                        ? `/${imagePath}`
                        : imagePath;
                      blocks.push({ type: 'image', alt, src: fullImagePath });
                      continue;
                    }

                    // List item
                    if (line.match(/^[-*]\s+/)) {
                      flushParagraph();
                      flushBlockquote();
                      if (!inList) {
                        flushList();
                        inList = true;
                      }
                      const content = line.replace(/^[-*]\s+/, '');
                      currentList.push(content);
                      continue;
                    } else if (line.match(/^\d+\.\s+/)) {
                      flushParagraph();
                      flushBlockquote();
                      if (!inList) {
                        flushList();
                        inList = true;
                      }
                      const content = line.replace(/^\d+\.\s+/, '');
                      currentList.push(content);
                      continue;
                    } else if (inList) {
                      flushList();
                      inList = false;
                    }

                    // Regular paragraph
                    currentParagraph.push(line);
                  }

                  flushParagraph();
                  flushBlockquote();
                  flushList();

                  // Render blocks
                  return blocks.map((block, index) => {
                    switch (block.type) {
                      case 'h1':
                        return <h1 key={index} className="h1 mb-4 mt-8">{block.content}</h1>;
                      case 'h2':
                        return <h2 key={index} className="h2 mb-3 mt-6">{block.content}</h2>;
                      case 'h3':
                        return <h3 key={index} className="h3 mb-2 mt-4">{block.content}</h3>;
                      case 'blockquote':
                        return (
                          <blockquote key={index} className="border-l-4 border-amber pl-6 py-4 my-6 bg-warm-offWhiteAlt rounded-r-lg">
                            <p className="text-xl md:text-2xl font-semibold text-amber italic" style={{ lineHeight: '1.6' }}>
                              "{block.content}"
                            </p>
                          </blockquote>
                        );
                      case 'hr':
                        return <hr key={index} className="my-8 border-warm-border" />;
                      case 'image':
                        return (
                          <div key={index} className="my-8 flex justify-center">
                            <img 
                              src={block.src} 
                              alt={block.alt || post.title}
                              className="max-w-2xl w-full h-auto object-contain"
                            />
                          </div>
                        );
                      case 'ul':
                        return (
                          <ul key={index} className="list-disc ml-6 mb-6 space-y-2">
                            {block.items.map((item, itemIndex) => (
                              <li key={itemIndex} className="p" style={{ lineHeight: '1.6' }}>
                                {item}
                              </li>
                            ))}
                          </ul>
                        );
                      case 'paragraph':
                        // Skip if paragraph matches the title
                        if (block.content === post.title) {
                          return null;
                        }
                        return (
                          <p key={index} className="p mb-6" style={{ lineHeight: '1.6' }}>
                            {block.content}
                          </p>
                        );
                      default:
                        return null;
                    }
                  }).filter(Boolean);
                })()}
              </div>

              {/* Tags - only show if they exist and filter out generic ones */}
              {post.tags && post.tags.filter(tag => 
                tag.toLowerCase() !== 'journal' && 
                tag.toLowerCase() !== 'blog'
              ).length > 0 && (
                <div className="mt-8 pt-8 border-t border-warm-border">
                  <div className="flex flex-wrap gap-2">
                    {post.tags
                      .filter(tag => tag.toLowerCase() !== 'journal' && tag.toLowerCase() !== 'blog')
                      .map(tag => (
                        <span key={tag} className="px-3 py-1 bg-amber/20 text-amber-dark text-sm rounded-full">
                          {tag}
                        </span>
                      ))}
                  </div>
                </div>
              )}

              {/* Categories - only show if they exist and filter out generic ones */}
              {post.categories && post.categories.filter(category => 
                category.toLowerCase() !== 'general' &&
                category.toLowerCase() !== 'journal' &&
                category.toLowerCase() !== 'blog'
              ).length > 0 && (
                <div className="mt-4">
                  <div className="flex flex-wrap gap-2">
                    {post.categories
                      .filter(category => 
                        category.toLowerCase() !== 'general' &&
                        category.toLowerCase() !== 'journal' &&
                        category.toLowerCase() !== 'blog'
                      )
                      .map(category => (
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

