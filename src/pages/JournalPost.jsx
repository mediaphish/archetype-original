import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import SEO from '../components/SEO';
import seoConfig from '../config/seo.json';
import { OptimizedImage } from '../components/OptimizedImage';
import DevotionalPost from './DevotionalPost';
import JournalSubscription from '../components/JournalSubscription';
import ShareLinks from '../components/ShareLinks';
import JournalAdvisoryCTA from '../components/JournalAdvisoryCTA';
import JournalMarkdownBody from '../components/JournalMarkdownBody';

export default function JournalPost() {
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDevotional, setIsDevotional] = useState(false);
  /** All journal posts for resolving related slugs to real titles */
  const [allJournalPosts, setAllJournalPosts] = useState([]);

  useEffect(() => {
    // Ensure scroll restoration is disabled for journal pages
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
    
    // Always scroll to top when this component mounts (including on back navigation)
    // Use multiple attempts to ensure it sticks, even with browser scroll restoration
    const scrollToTop = () => window.scrollTo(0, 0);
    
    // Immediate scroll (synchronous)
    scrollToTop();
    
    // Multiple delayed attempts to catch any late scroll restoration
    requestAnimationFrame(() => {
      scrollToTop();
      requestAnimationFrame(() => {
        scrollToTop();
      });
    });
    
    // Additional delayed attempts - more aggressive
    const timers = [0, 10, 50, 100, 200, 300, 500].map(delay => 
      setTimeout(scrollToTop, delay)
    );
    
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
        setAllJournalPosts(journalData.docs || []);

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
        } else if (foundPost.podcast_slug) {
          window.history.replaceState({}, '', `/podcast/${foundPost.podcast_slug}`);
          window.dispatchEvent(new PopStateEvent('popstate'));
        } else {
          setPost(foundPost);
          setIsDevotional(devotional);
        }
        setLoading(false);
        
        // Ensure scroll stays at top after content loads - multiple attempts
        requestAnimationFrame(() => {
          scrollToTop();
          requestAnimationFrame(() => {
            scrollToTop();
          });
        });
        setTimeout(scrollToTop, 100);
        setTimeout(scrollToTop, 200);
      })
      .catch(error => {
        console.error('Error loading post:', error);
        setError('Failed to load post');
        setLoading(false);
      });
    
    return () => {
      timers.forEach(clearTimeout);
    };
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return '';
    
    // Extract YYYY-MM-DD from any date format (handles ISO strings, YYYY-MM-DD, etc.)
    let dateStr = String(dateString);
    
    // Extract just the date part (YYYY-MM-DD) from ISO strings like "2026-01-22T00:00:00.000Z"
    if (dateStr.includes('T')) {
      dateStr = dateStr.split('T')[0];
    }
    // Remove any time portion if present
    if (dateStr.includes(' ')) {
      dateStr = dateStr.split(' ')[0];
    }
    
    // Parse YYYY-MM-DD as local date (not UTC) to avoid timezone shifts
    // This ensures "2026-01-22" displays as January 22, 2026, not January 21
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = dateStr.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return '';
      }
      
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
    
    // Fallback for other formats
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return '';
    }
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
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
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#DB0812] mx-auto"></div>
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

  const siteUrl = seoConfig.default.siteUrl.replace(/\/$/, '');
  const canonicalUrl = `${siteUrl}/journal/${post.slug}`;
  const ogImage = post.image ? `${siteUrl}${post.image.startsWith('/') ? post.image : '/' + post.image}` : `${siteUrl}/og-default.jpg`;

  return (
    <>
      <SEO pageKey="journal" />
      <Helmet>
        <title>{post.title} | Journal | Archetype Original</title>
        <meta name="description" content={post.summary || post.title} />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:title" content={`${post.title} | Journal | Archetype Original`} />
        <meta property="og:description" content={post.summary || post.title} />
        <meta property="og:image" content={ogImage} />
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
                  // Save current path to sessionStorage to mark we're navigating away
                  sessionStorage.setItem('journalPostNavigating', 'true');
                  // Immediately scroll to top
                  window.scrollTo({ top: 0, behavior: 'instant' });
                  // Navigate using pushState
                  window.history.pushState({ scrollToTop: true }, '', '/journal');
                  window.dispatchEvent(new PopStateEvent('popstate'));
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
                  <div className="flex items-center gap-2 flex-wrap">
                    <ShareLinks
                      url={canonicalUrl}
                      title={post.title}
                      description={post.summary || ''}
                    />
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
                  <div className="mb-8 sm:mb-10 p-4 sm:p-6 bg-[#FAFAF9] border-l-[6px] border-[#DB0812]">
                    <p className="text-base sm:text-lg font-semibold text-[#1A1A1A] leading-normal">
                      {summaryText}
                    </p>
                  </div>
                ) : null;
              })()}

              {/* Post image - show at top if exists */}
              {post.image && (
                <div className="mb-8 sm:mb-10 w-full flex justify-center items-center py-6 bg-[#FAFAF9]">
                  <OptimizedImage
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
                <JournalMarkdownBody post={post} />
              </div>


              {post.takeaways && Array.isArray(post.takeaways) && post.takeaways.length > 0 && (
                <div className="mt-12 sm:mt-16 border-l-2 border-[#DB0812] pl-6 sm:pl-8">
                  <h3 className="text-sm font-semibold uppercase tracking-widest text-[#DB0812] mb-4">
                    Key Takeaways
                  </h3>
                  <ul className="space-y-3 list-none pl-0">
                    {post.takeaways.map((item, i) => (
                      <li key={i} className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                        {typeof item === 'string' ? item : String(item)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

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
                        {post.categories.some(cat => ['servant-leadership', 'leadership', 'mentorship', 'consulting'].includes(cat.toLowerCase())) && (
                          <li>
                            <a 
                              href="/advisory" 
                              onClick={(e) => { e.preventDefault(); window.history.pushState({}, '', '/advisory'); window.dispatchEvent(new PopStateEvent('popstate')); window.scrollTo({ top: 0, behavior: 'instant' }); }}
                              className="text-[#DB0812] hover:text-[#b30610] underline text-base sm:text-lg"
                            >
                              Advisory — How I work with leaders and teams
                            </a>
                          </li>
                        )}
                        {post.categories.some(cat => ['servant-leadership', 'leadership', 'golden-rule', 'posture', 'philosophy'].includes(cat.toLowerCase())) && (
                          <li>
                            <a 
                              href="/meet-bart" 
                              onClick={(e) => { e.preventDefault(); window.history.pushState({}, '', '/meet-bart'); window.dispatchEvent(new PopStateEvent('popstate')); window.scrollTo({ top: 0, behavior: 'instant' }); }}
                              className="text-[#DB0812] hover:text-[#b30610] underline text-base sm:text-lg"
                            >
                              Meet Bart: the story, posture, and how the work shows up
                            </a>
                          </li>
                        )}
                        {post.categories.some(cat => ['scoreboard-leadership', 'anti-project', 'bad-leader', 'culture'].includes(cat.toLowerCase())) && (
                          <li>
                            <a 
                              href="/culture-science/anti-projects/scoreboard-leadership" 
                              onClick={(e) => { e.preventDefault(); window.history.pushState({}, '', '/culture-science/anti-projects/scoreboard-leadership'); window.dispatchEvent(new PopStateEvent('popstate')); window.scrollTo({ top: 0, behavior: 'instant' }); }}
                              className="text-[#DB0812] hover:text-[#b30610] underline text-base sm:text-lg"
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
                        {post.related.map((relatedSlug, index) => {
                          const relatedPost = allJournalPosts.find((p) => p.slug === relatedSlug);
                          const displayTitle = relatedPost
                            ? relatedPost.title
                            : relatedSlug.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
                          return (
                          <li key={index}>
                            <a 
                              href={`/journal/${relatedSlug}`}
                              onClick={(e) => { e.preventDefault(); window.history.pushState({}, '', `/journal/${relatedSlug}`); window.dispatchEvent(new PopStateEvent('popstate')); window.scrollTo({ top: 0, behavior: 'instant' }); }}
                              className="text-[#DB0812] hover:text-[#b30610] underline text-base sm:text-lg"
                            >
                              {displayTitle}
                            </a>
                          </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-12 sm:mt-16">
                <JournalAdvisoryCTA />
              </div>

              {/* Subscription Form */}
              <div className="mt-12 sm:mt-16 pt-8 sm:pt-12 border-t border-[#1A1A1A]/10">
                <JournalSubscription />
              </div>
            </div>
          </article>
        </div>
      </div>
      </div>
    </>
  );
}

