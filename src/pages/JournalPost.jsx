import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import SEO from '../components/SEO';
import DevotionalPost from './DevotionalPost';

export default function JournalPost() {
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDevotional, setIsDevotional] = useState(false);

  useEffect(() => {
    // Disable browser scroll restoration for this page
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
    
    // Extract slug from URL
    const path = window.location.pathname;
    const slug = path.replace('/journal/', '').replace(/\/$/, '');
    
    if (!slug) {
      setError('Post not found');
      setLoading(false);
      return;
    }

    // Try to load as journal post first, then as devotional
    Promise.all([
      fetch('/api/knowledge?type=journal-post').then(r => r.json()),
      fetch('/api/knowledge?type=devotional').then(r => r.json())
    ])
      .then(([journalData, devotionalData]) => {
        // Check journal posts first
        let foundPost = journalData.docs.find(p => p.slug === slug);
        let devotional = false;
        
        // If not found, check devotionals
        if (!foundPost) {
          foundPost = devotionalData.docs.find(p => p.slug === slug);
          devotional = !!foundPost;
        }
        
        if (!foundPost) {
          setError('Post not found');
        } else {
          setPost(foundPost);
          setIsDevotional(devotional);
        }
        setLoading(false);
      })
      .catch(error => {
        console.error('Error loading post:', error);
        setError('Failed to load post');
        setLoading(false);
      });
    
    // Cleanup: restore scroll restoration when component unmounts
    return () => {
      if ('scrollRestoration' in window.history) {
        window.history.scrollRestoration = 'auto';
      }
    };
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return '';
    // Handle YYYY-MM-DD format explicitly
    let date;
    if (typeof dateString === 'string' && dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
      // Parse YYYY-MM-DD as UTC to avoid timezone issues
      const [year, month, day] = dateString.split('-').map(Number);
      date = new Date(Date.UTC(year, month - 1, day));
    } else {
      date = new Date(dateString);
    }
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return '';
    }
    
    return date.toLocaleDateString('en-US', {
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

  // If it's a devotional, render DevotionalPost component
  if (!loading && post && isDevotional) {
    return <DevotionalPost />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAF9] py-12 sm:py-16 md:py-20 lg:py-20">
        <div className="container mx-auto px-4 sm:px-6 md:px-12">
          <div className="max-w-4xl mx-auto">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C85A3C] mx-auto"></div>
              <p className="mt-4 text-[#6B6B6B]">Loading post...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-[#FAFAF9] py-12 sm:py-16 md:py-20 lg:py-20">
        <div className="container mx-auto px-4 sm:px-6 md:px-12">
          <div className="max-w-4xl mx-auto">
            <div className="text-center py-12">
              <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl font-bold text-[#1A1A1A] mb-4 sm:mb-6 leading-[0.9] tracking-tight">
                Post Not Found
              </h1>
                    <p className="text-base sm:text-lg leading-normal text-[#6B6B6B] mb-3 sm:mb-4 text-pretty">
                {error || 'The post you\'re looking for doesn\'t exist.'}
              </p>
              <a 
                href="/journal" 
                className="text-[#1A1A1A] hover:underline font-medium text-base sm:text-lg"
              >
                ← Back to Journal
              </a>
            </div>
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
      
      <div className="min-h-screen bg-[#FAFAF9] py-12 sm:py-16 md:py-20 lg:py-20">
        <div className="container mx-auto px-4 sm:px-6 md:px-12">
          <div className="max-w-4xl mx-auto">
            {/* Back button */}
            <div className="mb-8 sm:mb-12">
              <a 
                href="/journal" 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  // Prevent any scroll restoration
                  if ('scrollRestoration' in window.history) {
                    window.history.scrollRestoration = 'manual';
                  }
                  // Immediately scroll to top
                  window.scrollTo({ top: 0, behavior: 'instant' });
                  // Navigate using pushState (not history.back to avoid scroll restoration)
                  window.history.pushState({ scrollToTop: true }, '', '/journal');
                  window.dispatchEvent(new PopStateEvent('popstate'));
                  // Ensure scroll stays at top after navigation completes
                  setTimeout(() => {
                    window.scrollTo({ top: 0, behavior: 'instant' });
                    if ('scrollRestoration' in window.history) {
                      window.history.scrollRestoration = 'auto';
                    }
                  }, 100);
                }}
                className="inline-flex items-center text-[#6B6B6B] hover:text-[#1A1A1A] transition-colors text-base sm:text-lg"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Journal
              </a>
            </div>

            {/* Post Content */}
            <article className="bg-white border border-[#1A1A1A]/10">
              <div className="p-6 sm:p-8 md:p-10">
                <div className="flex items-center justify-between mb-6 sm:mb-8">
                  <time className="text-sm text-[#6B6B6B]">
                    {formatDate(post.publish_date || post.created_at)}
                  </time>
                  <div className="flex items-center gap-1">
                    {/* Social Sharing - Ultra Minimal, Inline with Date */}
                    {post && (
                      <>
                        <button
                          onClick={() => handleSocialShare('twitter')}
                          className="p-1 text-[#6B6B6B]/40 hover:text-[#6B6B6B] transition-colors"
                          aria-label="Share on Twitter"
                          title="Share on Twitter"
                        >
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                          </svg>
                        </button>

                        <button
                          onClick={() => handleSocialShare('linkedin')}
                          className="p-1 text-[#6B6B6B]/40 hover:text-[#6B6B6B] transition-colors"
                          aria-label="Share on LinkedIn"
                          title="Share on LinkedIn"
                        >
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                          </svg>
                        </button>

                        <button
                          onClick={handleCopyLink}
                          className="p-1 text-[#6B6B6B]/40 hover:text-[#6B6B6B] transition-colors"
                          aria-label="Copy link"
                          title={linkCopied ? 'Link copied!' : 'Copy link'}
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </button>
                      </>
                    )}
                    {post.original_source && (
                      <span className="ml-2 px-2 py-1 bg-[#FAFAF9] text-[#6B6B6B] text-xs">
                        Originally from {post.original_source}
                      </span>
                    )}
                  </div>
                </div>

                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-[#1A1A1A] mb-6 sm:mb-8 font-serif tracking-tight text-balance">
                  {(() => {
                    // If title is "Untitled Journal Post", try to extract from frontmatter in body
                    if (post.title === 'Untitled Journal Post' && post.body) {
                      const titleMatch = post.body.match(/title:\s*"([^"]+)"/);
                      if (titleMatch) {
                        return titleMatch[1];
                      }
                    }
                    return post.title;
                  })()}
                </h1>

              {post.summary && (() => {
                // Filter out RTF code from summary
                let summaryText = post.summary;
                summaryText = summaryText.replace(/\{\\rtf[^}]*\}/gi, '');
                summaryText = summaryText.replace(/\\[a-z]+\d*\s*/gi, '');
                summaryText = summaryText.replace(/\{[^}]*\}/g, '');
                summaryText = summaryText.replace(/\s+/g, ' ').trim();
                
                return summaryText ? (
                  <div className="mb-8 sm:mb-10 p-4 sm:p-6 bg-[#FAFAF9] border-l-[6px] border-[#C85A3C]">
                    <p className="text-base sm:text-lg font-semibold text-[#1A1A1A] leading-normal">
                      {summaryText}
                    </p>
                  </div>
                ) : null;
              })()}

              {/* Post image - show at top if exists */}
              {post.image && (
                <div className="mb-8 sm:mb-10 w-full flex justify-center items-center py-6 bg-[#FAFAF9]">
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
                  // Clean the body - remove RTF code first, then remove title and duplicate image if they appear
                  let bodyText = post.body.trim();
                  
                  // Step 1: Remove entire RTF header block (everything from {\rtf to the first real content)
                  // This handles the case where the entire file is RTF-encoded
                  bodyText = bodyText.replace(/\{\\rtf[^}]*\}/gi, '');
                  
                  // Step 2: Remove RTF control sequences comprehensively
                  // Remove all RTF control words (patterns like \rtf1, \ansi, etc.)
                  bodyText = bodyText.replace(/\\[a-z]+\d*\s*/gi, '');
                  
                  // Step 3: Remove RTF tables and formatting blocks
                  bodyText = bodyText.replace(/\\fonttbl[^}]*\}\s*/gi, '');
                  bodyText = bodyText.replace(/\\colortbl[^}]*\}\s*/gi, '');
                  bodyText = bodyText.replace(/\\\*\\expandedcolortbl[^}]*\}\s*/gi, '');
                  bodyText = bodyText.replace(/\{[^}]*\}/g, '');
                  
                  // Step 4: Fix RTF escape sequences to proper characters
                  bodyText = bodyText.replace(/\\'92/g, "'"); // RTF right single quote (apostrophe)
                  bodyText = bodyText.replace(/\\'97/g, "—"); // RTF em dash
                  bodyText = bodyText.replace(/\\'85/g, "…"); // RTF ellipsis
                  bodyText = bodyText.replace(/\\'/g, "'"); // RTF apostrophe (generic)
                  
                  // Step 5: Convert RTF line breaks to newlines
                  bodyText = bodyText.replace(/\\par\s*/gi, '\n');
                  bodyText = bodyText.replace(/\\\s*\n\s*/g, '\n');
                  
                  // Step 6: Remove frontmatter blocks (handle both normal and RTF-escaped versions)
                  // Normal frontmatter: --- ... --- (with proper newlines)
                  bodyText = bodyText.replace(/^---\s*\n[\s\S]*?\n---\s*\n?/gm, '');
                  // Frontmatter without proper newlines (single line or escaped)
                  bodyText = bodyText.replace(/^---[\s\S]*?^---\s*/gm, '');
                  // RTF-escaped frontmatter: ---\ ... ---\
                  bodyText = bodyText.replace(/---\\[\s\S]*?---\\/g, '');
                  // Also handle frontmatter that might have escaped newlines or be on single lines
                  bodyText = bodyText.replace(/---[\\\s]*title:[\s\S]*?---[\\\s]*/gi, '');
                  // Remove any remaining frontmatter-like content at the start
                  bodyText = bodyText.replace(/^---.*?---/s, '');
                  
                  // Step 7: Remove any remaining standalone backslashes (but preserve markdown)
                  // Only remove backslashes that aren't part of markdown syntax
                  bodyText = bodyText.replace(/\\(?![!*_`\[\]()#-])/g, '');
                  
                  // Step 8: Clean up whitespace while preserving paragraph structure
                  bodyText = bodyText.replace(/[ \t]+/g, ' '); // Collapse spaces/tabs to single space
                  bodyText = bodyText.replace(/\n{3,}/g, '\n\n'); // Max 2 consecutive newlines
                  bodyText = bodyText.trim();
                  
                  // Step 9: If body still looks like it starts with frontmatter, extract and remove it
                  const frontmatterMatch = bodyText.match(/^---\s*\n([\s\S]*?)\n---\s*\n/);
                  if (frontmatterMatch) {
                    bodyText = bodyText.replace(/^---\s*\n[\s\S]*?\n---\s*\n/, '');
                  }
                  
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

                  // Helper function to process inline markdown (bold, italic, links)
                  // Uses a simple recursive approach to handle nested markdown
                  const processInlineMarkdown = (text) => {
                    if (!text || typeof text !== 'string') return text;
                    
                    // Simple regex-based replacement approach
                    // Process links first (they can contain other markdown)
                    let processed = text;
                    const parts = [];
                    let lastIndex = 0;
                    let keyCounter = 0;
                    
                    // Find all markdown patterns with their positions
                    const patterns = [];
                    
                    // Find links [text](url)
                    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
                    let linkMatch;
                    while ((linkMatch = linkRegex.exec(text)) !== null) {
                      patterns.push({
                        type: 'link',
                        start: linkMatch.index,
                        end: linkMatch.index + linkMatch[0].length,
                        text: linkMatch[1],
                        url: linkMatch[2]
                      });
                    }
                    
                    // Find bold **text** or __text__
                    const boldRegex = /(\*\*|__)(.+?)\1/g;
                    let boldMatch;
                    while ((boldMatch = boldRegex.exec(text)) !== null) {
                      // Skip if this bold is inside a link
                      const isInsideLink = patterns.some(p => p.type === 'link' && boldMatch.index > p.start && boldMatch.index < p.end);
                      if (!isInsideLink) {
                        patterns.push({
                          type: 'bold',
                          start: boldMatch.index,
                          end: boldMatch.index + boldMatch[0].length,
                          content: boldMatch[2]
                        });
                      }
                    }
                    
                    // Find italic *text* or _text_ (but not **text** or __text__)
                    const italicRegex = /(?<!\*)\*(?!\*)([^*\n]+?)(?<!\*)\*(?!\*)|(?<!_)_(?!_)([^_\n]+?)(?<!_)_(?!_)/g;
                    let italicMatch;
                    while ((italicMatch = italicRegex.exec(text)) !== null) {
                      // Skip if this italic is inside a link or bold
                      const isInsideOther = patterns.some(p => italicMatch.index > p.start && italicMatch.index < p.end);
                      if (!isInsideOther) {
                        patterns.push({
                          type: 'italic',
                          start: italicMatch.index,
                          end: italicMatch.index + italicMatch[0].length,
                          content: italicMatch[1] || italicMatch[2]
                        });
                      }
                    }
                    
                    // Sort patterns by start position
                    patterns.sort((a, b) => a.start - b.start);
                    
                    // Remove overlapping patterns (keep the first one)
                    const nonOverlapping = [];
                    for (let i = 0; i < patterns.length; i++) {
                      const current = patterns[i];
                      const overlaps = nonOverlapping.some(p => 
                        (current.start >= p.start && current.start < p.end) ||
                        (current.end > p.start && current.end <= p.end) ||
                        (current.start <= p.start && current.end >= p.end)
                      );
                      if (!overlaps) {
                        nonOverlapping.push(current);
                      }
                    }
                    
                    // Build React elements from non-overlapping patterns
                    const result = [];
                    let currentIndex = 0;
                    
                    nonOverlapping.forEach((pattern, idx) => {
                      // Add text before this pattern
                      if (pattern.start > currentIndex) {
                        const beforeText = text.substring(currentIndex, pattern.start);
                        if (beforeText) {
                          result.push(beforeText);
                        }
                      }
                      
                      // Add the pattern as a React element
                      if (pattern.type === 'link') {
                        result.push(
                          <a key={`link-${keyCounter++}`} href={pattern.url} className="text-[#C85A3C] hover:text-[#B54A32] underline" target="_blank" rel="noopener noreferrer">
                            {pattern.text}
                          </a>
                        );
                      } else if (pattern.type === 'bold') {
                        result.push(<strong key={`bold-${keyCounter++}`}>{pattern.content}</strong>);
                      } else if (pattern.type === 'italic') {
                        result.push(<em key={`italic-${keyCounter++}`}>{pattern.content}</em>);
                      }
                      
                      currentIndex = pattern.end;
                    });
                    
                    // Add remaining text
                    if (currentIndex < text.length) {
                      const remainingText = text.substring(currentIndex);
                      if (remainingText) {
                        result.push(remainingText);
                      }
                    }
                    
                    // Return single element if only one, array if multiple, or original text if none
                    if (result.length === 0) {
                      return text;
                    } else if (result.length === 1) {
                      return result[0];
                    } else {
                      return result;
                    }
                  };

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
                        return (
                          <div key={index} className="flex items-center mb-4 sm:mb-6 mt-8">
                            <div className="w-1 h-10 sm:h-12 md:h-14 bg-[#C85A3C] mr-4 sm:mr-6"></div>
                            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-[#1A1A1A] font-serif tracking-tight">{h1Content}</h1>
                          </div>
                        );
                      case 'h2':
                        return (
                          <div key={index} className="flex items-center mb-3 sm:mb-4 mt-6">
                            <div className="w-1 h-8 sm:h-10 md:h-12 bg-[#C85A3C] mr-4 sm:mr-6"></div>
                            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#1A1A1A] font-serif tracking-tight">{block.content}</h2>
                          </div>
                        );
                      case 'h3':
                        return <h3 key={index} className="text-xl sm:text-2xl md:text-3xl font-bold text-[#1A1A1A] mb-2 sm:mb-3 mt-4 font-serif tracking-tight">{block.content}</h3>;
                      case 'blockquote':
                        return (
                          <blockquote key={index} className="border-l-[6px] border-[#C85A3C] pl-6 sm:pl-8 py-4 my-6 sm:my-8 bg-[#FAFAF9]">
                            <p className="text-xl sm:text-2xl md:text-3xl italic text-[#1A1A1A] leading-tight font-serif">
                              "{block.content}"
                            </p>
                          </blockquote>
                        );
                      case 'hr':
                        return <hr key={index} className="my-8 sm:my-10 border-[#1A1A1A]/10" />;
                      case 'image':
                        return (
                          <div key={index} className="my-8 sm:my-10 flex justify-center py-6 bg-[#FAFAF9]">
                            <img 
                              src={block.src} 
                              alt={block.alt || post.title}
                              className="max-w-2xl w-full h-auto object-contain"
                            />
                          </div>
                        );
                      case 'ul':
                        return (
                          <ul key={index} className="list-disc mb-3 sm:mb-4 space-y-3 pl-6 sm:pl-8 marker:text-[#C85A3C]">
                            {block.items.map((item, itemIndex) => {
                              const processedItem = processInlineMarkdown(item);
                              return (
                                <li key={itemIndex} className="text-base sm:text-lg leading-normal text-[#1A1A1A] marker:text-[#C85A3C]">
                                  {processedItem}
                                </li>
                              );
                            })}
                          </ul>
                        );
                      case 'paragraph':
                        // Skip if paragraph matches the title (case-insensitive)
                        let paraContent = block.content.trim();
                        if (!paraContent) {
                          return null;
                        }
                        
                        const paraNormalized = normalizeForComparison(paraContent);
                        
                        // Skip if paragraph matches title
                        if (paraNormalized === titleNormalizedForParsing) {
                          return null;
                        }
                        
                        const processedContent = processInlineMarkdown(paraContent);
                        
                        return (
                          <p key={index} className="text-base sm:text-lg leading-normal text-[#1A1A1A] mb-3 sm:mb-4 text-pretty">
                            {processedContent}
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
                <div className="mt-8 sm:mt-10 pt-8 border-t border-[#1A1A1A]/10">
                  <div className="flex flex-wrap gap-2">
                    {post.tags
                      .filter(tag => tag.toLowerCase() !== 'journal' && tag.toLowerCase() !== 'blog')
                      .map(tag => (
                        <span key={tag} className="px-3 py-1 bg-[#FAFAF9] text-[#6B6B6B] text-sm">
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
                        <span key={category} className="px-3 py-1 bg-[#FAFAF9] text-[#6B6B6B] text-sm">
                          {category}
                        </span>
                      ))}
                  </div>
                </div>
              )}

              {/* Related Reading Section */}
              <div className="mt-12 sm:mt-16 pt-8 sm:pt-12 border-t border-[#1A1A1A]/10">
                <h3 className="text-xl sm:text-2xl font-bold text-[#1A1A1A] mb-6 sm:mb-8 font-serif">
                  Related Reading
                </h3>
                
                <div className="space-y-6">
                  {/* Related Pages based on categories */}
                  {post.categories && (
                    <div>
                      <h4 className="text-base sm:text-lg font-semibold text-[#1A1A1A] mb-3 sm:mb-4">
                        Explore More
                      </h4>
                      <ul className="space-y-2">
                        {post.categories.some(cat => ['servant-leadership', 'leadership', 'philosophy'].includes(cat.toLowerCase())) && (
                          <li>
                            <a 
                              href="/philosophy" 
                              onClick={(e) => { e.preventDefault(); window.history.pushState({}, '', '/philosophy'); window.dispatchEvent(new PopStateEvent('popstate')); window.scrollTo({ top: 0, behavior: 'instant' }); }}
                              className="text-[#C85A3C] hover:text-[#B54A32] underline text-base sm:text-lg"
                            >
                              Philosophy — The foundation of servant leadership
                            </a>
                          </li>
                        )}
                        {post.categories.some(cat => ['servant-leadership', 'leadership', 'mentorship', 'consulting'].includes(cat.toLowerCase())) && (
                          <li>
                            <a 
                              href="/methods" 
                              onClick={(e) => { e.preventDefault(); window.history.pushState({}, '', '/methods'); window.dispatchEvent(new PopStateEvent('popstate')); window.scrollTo({ top: 0, behavior: 'instant' }); }}
                              className="text-[#C85A3C] hover:text-[#B54A32] underline text-base sm:text-lg"
                            >
                              Methods — How I work with leaders and teams
                            </a>
                          </li>
                        )}
                        {post.categories.some(cat => ['servant-leadership', 'leadership', 'golden-rule', 'posture'].includes(cat.toLowerCase())) && (
                          <li>
                            <a 
                              href="/about" 
                              onClick={(e) => { e.preventDefault(); window.history.pushState({}, '', '/about'); window.dispatchEvent(new PopStateEvent('popstate')); window.scrollTo({ top: 0, behavior: 'instant' }); }}
                              className="text-[#C85A3C] hover:text-[#B54A32] underline text-base sm:text-lg"
                            >
                              About — The posture that shapes my leadership
                            </a>
                          </li>
                        )}
                        {post.categories.some(cat => ['scoreboard-leadership', 'anti-project', 'bad-leader', 'culture'].includes(cat.toLowerCase())) && (
                          <li>
                            <a 
                              href="/culture-science/anti-projects/scoreboard-leadership" 
                              onClick={(e) => { e.preventDefault(); window.history.pushState({}, '', '/culture-science/anti-projects/scoreboard-leadership'); window.dispatchEvent(new PopStateEvent('popstate')); window.scrollTo({ top: 0, behavior: 'instant' }); }}
                              className="text-[#C85A3C] hover:text-[#B54A32] underline text-base sm:text-lg"
                            >
                              Scoreboard Leadership — The diagnostic lens
                            </a>
                          </li>
                        )}
                      </ul>
                    </div>
                  )}

                  {/* Related Journal Posts */}
                  {post.related && post.related.length > 0 && (
                    <div>
                      <h4 className="text-base sm:text-lg font-semibold text-[#1A1A1A] mb-3 sm:mb-4">
                        Related Journal Posts
                      </h4>
                      <ul className="space-y-2">
                        {post.related.map((relatedSlug, index) => (
                          <li key={index}>
                            <a 
                              href={`/journal/${relatedSlug}`}
                              onClick={(e) => { e.preventDefault(); window.history.pushState({}, '', `/journal/${relatedSlug}`); window.dispatchEvent(new PopStateEvent('popstate')); window.scrollTo({ top: 0, behavior: 'instant' }); }}
                              className="text-[#C85A3C] hover:text-[#B54A32] underline text-base sm:text-lg"
                            >
                              {relatedSlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </article>
        </div>
      </div>
      </div>
    </>
  );
}

