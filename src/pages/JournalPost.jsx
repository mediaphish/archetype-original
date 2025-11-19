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

  const [linkCopied, setLinkCopied] = useState(false);
  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
  const shareMessage = `Hey, I thought you would like this post I found on Archetype Original. ${currentUrl}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareMessage);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleSocialShare = (platform) => {
    if (!post) return;
    
    const encodedUrl = encodeURIComponent(currentUrl);
    const encodedTitle = encodeURIComponent(post.title);
    const encodedText = encodeURIComponent(`Hey, I thought you would like this post I found on Archetype Original. ${post.title}`);
    
    let shareUrl = '';
    switch (platform) {
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`;
        break;
      case 'linkedin':
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
        break;
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
        break;
      default:
        return;
    }
    
    window.open(shareUrl, '_blank', 'width=600,height=400');
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
      
      <div className="min-h-screen bg-warm-offWhite py-12 pt-28">
        <div className="max-w-4xl mx-auto px-4">
          {/* Back button */}
          <div className="mb-8 mt-8">
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

              {/* Social Sharing */}
              {post && (
              <div className="mb-8 pb-6 border-b border-warm-border">
                <div className="flex flex-wrap items-center gap-4">
                  <span className="text-sm text-warm-gray font-medium">Share:</span>
                  
                  {/* Twitter */}
                  <button
                    onClick={() => handleSocialShare('twitter')}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1DA1F2] text-white hover:bg-[#1a8cd8] transition-colors text-sm font-medium"
                    aria-label="Share on Twitter"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                    </svg>
                    Twitter
                  </button>

                  {/* LinkedIn */}
                  <button
                    onClick={() => handleSocialShare('linkedin')}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0077b5] text-white hover:bg-[#006399] transition-colors text-sm font-medium"
                    aria-label="Share on LinkedIn"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                    </svg>
                    LinkedIn
                  </button>

                  {/* Facebook */}
                  <button
                    onClick={() => handleSocialShare('facebook')}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1877F2] text-white hover:bg-[#166fe5] transition-colors text-sm font-medium"
                    aria-label="Share on Facebook"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                    Facebook
                  </button>

                  {/* Copy Link */}
                  <button
                    onClick={handleCopyLink}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-warm-border text-warm-charcoal hover:border-terracotta hover:text-terracotta transition-colors text-sm font-medium"
                    aria-label="Copy link"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    {linkCopied ? 'Copied!' : 'Copy Link'}
                  </button>
                </div>
              </div>
              )}

              {post.summary && (
                <div className="mb-8 p-4 bg-warm-offWhiteAlt border-l-4 border-amber rounded-r-lg">
                  <p className="p font-semibold text-warm-charcoal" style={{ lineHeight: '1.6' }}>
                    {post.summary}
                  </p>
                </div>
              )}

              {/* Post image - show at top if exists */}
              {post.image && (
                <div className="mb-8 w-full flex justify-center items-center py-6 bg-warm-offWhiteAlt">
                  <img 
                    src={post.image} 
                    alt={post.title}
                    className="max-w-2xl w-full h-auto object-contain"
                  />
                </div>
              )}

              {/* Post Body */}
              <div 
                className="prose prose-lg max-w-none"
                style={{ lineHeight: '1.6' }}
              >
                {(() => {
                  // Clean the body - remove title and duplicate image if they appear
                  let bodyText = post.body.trim();
                  
                  // Helper function to normalize strings for comparison
                  // Removes all punctuation, normalizes whitespace, converts to lowercase
                  const normalizeForComparison = (str) => {
                    return str
                      .toLowerCase()
                      .trim()
                      .replace(/['"'"''""]/g, "'") // Normalize all quote types to standard apostrophe
                      .replace(/[^\w\s]/g, '') // Remove all punctuation
                      .replace(/\s+/g, ' ') // Normalize whitespace
                      .trim();
                  };
                  
                  const titleNormalized = normalizeForComparison(post.title);
                  
                  // Split into lines for line-by-line processing
                  const lines = bodyText.split('\n');
                  const filteredLines = [];
                  
                  for (let i = 0; i < lines.length; i++) {
                    const originalLine = lines[i];
                    const trimmedLine = originalLine.trim();
                    
                    // Skip empty lines (preserve them for paragraph structure)
                    if (!trimmedLine) {
                      filteredLines.push(originalLine);
                      continue;
                    }
                    
                    // Check if this line is a heading that matches the title
                    const headingMatch = trimmedLine.match(/^(#+)\s*(.+)$/);
                    if (headingMatch) {
                      const headingContent = headingMatch[2].trim();
                      const headingNormalized = normalizeForComparison(headingContent);
                      
                      // Skip if heading matches title (normalized comparison)
                      if (headingNormalized === titleNormalized) {
                        continue; // Skip this heading line
                      }
                    }
                    
                    // Check if this is a standalone line that matches the title
                    const lineNormalized = normalizeForComparison(trimmedLine);
                    if (lineNormalized === titleNormalized) {
                      continue; // Skip this line
                    }
                    
                    // Keep the line
                    filteredLines.push(originalLine);
                  }
                  
                  bodyText = filteredLines.join('\n');
                  
                  // Clean up any triple+ newlines, but keep double newlines (paragraph breaks)
                  bodyText = bodyText.replace(/\n{4,}/g, '\n\n\n').trim();
                  
                  // Remove image markdown if it matches the post.image metadata
                  if (post.image) {
                    const imageSlug = post.image.replace(/^\/images\//, '').replace(/\.(jpg|jpeg|png|webp)$/i, '');
                    const imagePattern = new RegExp(`^!\\[([^\\]]*)\\]\\([^\\)]*${imageSlug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^\\)]*\\)\\s*\\n?`, 'im');
                    bodyText = bodyText.replace(imagePattern, '');
                  }

                  // Parse markdown into blocks
                  const markdownLines = bodyText.split('\n');
                  const blocks = [];
                  let currentParagraph = [];
                  let currentList = [];
                  let inBlockquote = false;
                  let inList = false;
                  
                  // Reuse the same normalization function for consistency
                  const titleNormalizedForParsing = normalizeForComparison(post.title);

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

                  for (let i = 0; i < markdownLines.length; i++) {
                    const originalLine = markdownLines[i];
                    const line = originalLine.trim();
                    
                    // Empty line - this creates paragraph breaks
                    if (!line) {
                      flushParagraph();
                      flushBlockquote();
                      flushList();
                      inList = false;
                      continue;
                    }

                    // Heading - check for any heading level
                    if (line.match(/^#+\s+/)) {
                      flushParagraph();
                      flushBlockquote();
                      flushList();
                      const headingContent = line.replace(/^#+\s+/, '').trim();
                      
                      // Use the same normalization for comparison
                      const headingNormalized = normalizeForComparison(headingContent);
                      
                      // Skip if heading matches title
                      if (headingNormalized === titleNormalizedForParsing) {
                        continue;
                      }
                      
                      // Determine heading level
                      const levelMatch = line.match(/^(#+)/);
                      const level = levelMatch ? levelMatch[1].length : 1;
                      
                      if (level === 1) {
                        blocks.push({ type: 'h1', content: headingContent });
                      } else if (level === 2) {
                        blocks.push({ type: 'h2', content: headingContent });
                      } else {
                        blocks.push({ type: 'h3', content: headingContent });
                      }
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
                      
                      // Skip if this image matches the post.image from metadata (avoid duplication)
                      // Normalize both paths for comparison - extract just the filename/slug
                      const extractSlug = (path) => {
                        return path.split('/').pop().replace(/\.(jpg|jpeg|png|webp)$/i, '').toLowerCase();
                      };
                      const bodyImageSlug = extractSlug(fullImagePath);
                      const postImageSlug = post.image ? extractSlug(post.image) : '';
                      if (bodyImageSlug === postImageSlug && postImageSlug) {
                        continue; // Skip this image, it's already shown at top
                      }
                      
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

                    // Regular paragraph - skip if it's just the title
                    const lineNormalized = normalizeForComparison(line);
                    
                    // Skip if line matches title
                    if (lineNormalized === titleNormalizedForParsing) {
                      continue; // Skip title lines
                    }
                    // Use original line to preserve spacing
                    currentParagraph.push(originalLine.trim());
                  }

                  flushParagraph();
                  flushBlockquote();
                  flushList();

                  // Render blocks
                  return blocks.map((block, index) => {
                    switch (block.type) {
                      case 'h1':
                        // Skip if heading matches the title (already shown at top)
                        const h1Content = block.content.trim();
                        const h1Normalized = normalizeForComparison(h1Content);
                        
                        // Skip if heading matches title
                        if (h1Normalized === titleNormalizedForParsing) {
                          return null;
                        }
                        return <h1 key={index} className="h1 mb-4 mt-8">{h1Content}</h1>;
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
                          <div key={index} className="my-8 flex justify-center py-6 bg-warm-offWhiteAlt">
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
                        // Skip if paragraph matches the title (case-insensitive)
                        const paraContent = block.content.trim();
                        if (!paraContent) {
                          return null;
                        }
                        
                        const paraNormalized = normalizeForComparison(paraContent);
                        
                        // Skip if paragraph matches title
                        if (paraNormalized === titleNormalizedForParsing) {
                          return null;
                        }
                        
                        return (
                          <p key={index} className="p mb-6" style={{ lineHeight: '1.6' }}>
                            {paraContent}
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

