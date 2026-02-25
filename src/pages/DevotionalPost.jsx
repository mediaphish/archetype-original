/**
 * Devotional Post Component
 * 
 * Displays individual devotional posts with:
 * - Scripture reference (linked to ESV.org)
 * - Reflection
 * - Practical Application
 * - Takeaways
 * - Closing Thought
 * - Subscription form
 * - ESV copyright
 */
import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import SEO from '../components/SEO';
import ScriptureBlock from '../components/ScriptureBlock';
import ESVCopyright from '../components/ESVCopyright';
import JournalSubscription from '../components/JournalSubscription';
import ShareLinks from '../components/ShareLinks';

export default function DevotionalPost({ post: postProp = null }) {
  const [post, setPost] = useState(postProp);
  const [loading, setLoading] = useState(!postProp);
  const [error, setError] = useState(null);

  useEffect(() => {
    // If post is provided as prop, use it directly
    if (postProp) {
      setPost(postProp);
      setLoading(false);
      return;
    }

    // Otherwise, load from URL
    // Extract slug from URL
    const path = window.location.pathname;
    const slug = path.replace('/journal/', '').replace('/devotional/', '').replace(/\/$/, '');
    
    if (!slug) {
      setError('Post not found');
      setLoading(false);
      return;
    }

    // Load devotionals from the knowledge corpus
    fetch('/api/knowledge?type=devotional')
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
        console.error('Error loading devotional post:', error);
        setError('Failed to load post');
        setLoading(false);
      });
  }, [postProp]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-[#6B6B6B]">Loading...</p>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-[#C85A3C] text-lg mb-4">{error || 'Post not found'}</p>
          <a href="/journal" className="text-[#C85A3C] hover:underline">
            Return to Journal
          </a>
        </div>
      </div>
    );
  }

  // Parse the markdown body into sections
  const parseDevotionalSections = (body) => {
    const sections = {
      monthOverview: null,  // First-of-month intro (e.g. ### March Overview); appears before Scripture
      scripture: null,
      reflection: null,
      practicalApplication: null,
      takeaways: null,
      closingThought: null
    };

    // Find sections by heading
    let currentSection = null;
    let currentContent = [];

    body.split('\n').forEach(line => {
      // Month overview: ### March Overview (or ### April Overview, etc.) — only on first day of month
      if (line.match(/^###\s+.+Overview\s*$/)) {
        if (currentSection) {
          sections[currentSection] = currentContent.join('\n').trim();
        }
        currentSection = 'monthOverview';
        currentContent = [];
      } else if (line.startsWith('## Scripture')) {
        if (currentSection) {
          sections[currentSection] = currentContent.join('\n').trim();
        }
        currentSection = 'scripture';
        currentContent = [];
      } else if (line.startsWith('## Reflection')) {
        if (currentSection) {
          sections[currentSection] = currentContent.join('\n').trim();
        }
        currentSection = 'reflection';
        currentContent = [];
      } else if (line.startsWith('## Practical Application')) {
        if (currentSection) {
          sections[currentSection] = currentContent.join('\n').trim();
        }
        currentSection = 'practicalApplication';
        currentContent = [];
      } else if (line.startsWith('## Takeaways')) {
        if (currentSection) {
          sections[currentSection] = currentContent.join('\n').trim();
        }
        currentSection = 'takeaways';
        currentContent = [];
      } else if (line.startsWith('## Closing Thought')) {
        if (currentSection) {
          sections[currentSection] = currentContent.join('\n').trim();
        }
        currentSection = 'closingThought';
        currentContent = [];
      } else if (line.trim() === '---') {
        // Skip horizontal rules
      } else if (currentSection) {
        currentContent.push(line);
      }
    });

    // Save last section
    if (currentSection) {
      sections[currentSection] = currentContent.join('\n').trim();
    }

    return sections;
  };

  const sections = parseDevotionalSections(post.body || '');

  // Format date (handles YYYY-MM-DD strings correctly without timezone issues)
  const formatDate = (dateString) => {
    if (!dateString) return '';
    
    // Extract YYYY-MM-DD from date string (handles both "2026-01-01" and "2026-01-01T00:00:00.000Z")
    const dateStr = String(dateString).split('T')[0].split(' ')[0];
    
    // If it's a YYYY-MM-DD string, parse it as local date (not UTC) to avoid timezone shifts
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = dateStr.split('-').map(Number);
      // Create date in local timezone, not UTC, so "2026-01-01" displays as January 1, 2026
      const date = new Date(year, month - 1, day);
      const options = { year: 'numeric', month: 'long', day: 'numeric' };
      return date.toLocaleDateString('en-US', options);
    }
    
    // Fallback for other date formats
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  };

  // Process markdown lists and inline formatting
  const processMarkdown = (text) => {
    if (!text) return '';
    
    // Convert **bold** to <strong>
    let html = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    
    // Convert *italic* to <em>
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    
    // Convert markdown lists to HTML
    html = html.replace(/(\n|^)([\-\*\+]\s.*(?:\n\s*[\-\*\+]\s.*)*)+/g, (match) => {
      const items = match.trim().split('\n').map(line => {
        const trimmedLine = line.trim();
        if (trimmedLine.match(/^[\-\*\+]\s/)) {
          return `<li>${trimmedLine.substring(trimmedLine.indexOf(' ') + 1).trim()}</li>`;
        }
        return '';
      }).filter(item => item).join('');
      return `<ul class="list-disc list-inside space-y-2 ml-4 my-4 marker:text-[#C85A3C]">${items}</ul>`;
    });

    // Convert remaining line breaks to paragraphs
    html = html.split('\n\n').map(paragraph => {
      if (paragraph.trim() === '') return '';
      // If it's already a list, don't wrap in p
      if (paragraph.startsWith('<ul')) {
        return paragraph;
      }
      return `<p class="mb-4 text-base sm:text-lg leading-relaxed text-[#1A1A1A]">${paragraph.replace(/\n/g, '<br>')}</p>`;
    }).join('');

    return html;
  };

  // If post is provided as prop, render in compact mode (for inline use)
  const isInline = !!postProp;

  return (
    <>
      {!isInline && (
        <>
          <SEO pageKey="journal-post" />
          <Helmet>
            <title>{post.title} | Archetype Original</title>
            <meta name="description" content={post.summary || post.title} />
          </Helmet>
        </>
      )}

      <div className={isInline ? '' : 'min-h-screen bg-white'}>
        {!isInline && (
          /* Hero Section */
          <section className="bg-gradient-to-b from-[#FFF8F0] via-white to-white py-12 sm:py-16 md:py-20">
            <div className="container mx-auto px-4 sm:px-6 md:px-12">
              <div className="max-w-4xl mx-auto text-center">
                <p className="text-sm sm:text-base uppercase tracking-wider font-semibold text-[#C85A3C] mb-4">
                  SERVANT LEADERSHIP DEVOTIONAL
                </p>
                <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-bold text-[#1A1A1A] mb-4 leading-tight">
                  {post.title}
                </h1>
                <div className="flex items-center justify-center gap-4">
                  {(post.publish_date || post.date) && (
                    <time className="text-base sm:text-lg text-[#6B6B6B]">
                      {formatDate(post.publish_date || post.date)}
                    </time>
                  )}
                  <ShareLinks 
                    url={typeof window !== 'undefined' ? window.location.href : ''}
                    title={post.title}
                    description={post.summary || ''}
                  />
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Content Section */}
        <section className={isInline ? 'py-6 sm:py-8' : 'py-12 sm:py-16 md:py-20'}>
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-4xl mx-auto space-y-12 sm:space-y-16">
              {isInline && (
                <>
                  <div className="text-center mb-8">
                    <div className="flex items-center justify-center gap-4 mb-4">
                      {(post.publish_date || post.date) && (
                        <time className="text-sm text-[#6B6B6B]">
                          {formatDate(post.publish_date || post.date)}
                        </time>
                      )}
                      <ShareLinks 
                        url={typeof window !== 'undefined' ? `${window.location.origin}/journal/${post.slug}` : ''}
                        title={post.title}
                        description={post.summary || ''}
                      />
                    </div>
                    <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-[#1A1A1A] mb-2 leading-tight">
                      {post.title}
                    </h1>
                  </div>
                </>
              )}

              {/* Month Overview (first-of-month only: e.g. ### March Overview) — before Scripture, distinct styling */}
              {sections.monthOverview && (
                <div className="mb-10 sm:mb-12 p-6 sm:p-8 rounded-lg bg-[#FFF8F0] border border-[#E8D5CC]">
                  <div 
                    className="prose prose-lg max-w-none text-[#3D3D3D] font-serif leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: processMarkdown(sections.monthOverview) }}
                  />
                </div>
              )}
              
              {/* Scripture */}
              {post.scripture_reference && (
                <ScriptureBlock reference={post.scripture_reference} />
              )}

              {/* Reflection */}
              {sections.reflection && (
                <div>
                  <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#1A1A1A] mb-6 border-l-4 border-[#C85A3C] pl-4 sm:pl-6">
                    Reflection
                  </h2>
                  <div 
                    className="prose prose-lg max-w-none"
                    dangerouslySetInnerHTML={{ __html: processMarkdown(sections.reflection) }}
                  />
                </div>
              )}

              {/* Practical Application */}
              {sections.practicalApplication && (
                <div>
                  <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#1A1A1A] mb-6 border-l-4 border-[#C85A3C] pl-4 sm:pl-6">
                    Practical Application
                  </h2>
                  <div 
                    className="prose prose-lg max-w-none"
                    dangerouslySetInnerHTML={{ __html: processMarkdown(sections.practicalApplication) }}
                  />
                </div>
              )}

              {/* Takeaways */}
              {sections.takeaways && (
                <div>
                  <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#1A1A1A] mb-6 border-l-4 border-[#C85A3C] pl-4 sm:pl-6">
                    Takeaways
                  </h2>
                  <div 
                    className="prose prose-lg max-w-none"
                    dangerouslySetInnerHTML={{ __html: processMarkdown(sections.takeaways) }}
                  />
                </div>
              )}

              {/* Closing Thought */}
              {sections.closingThought && (
                <div className="bg-[#FAFAF9] border-l-4 border-[#C85A3C] p-6 sm:p-8 md:p-10">
                  <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#1A1A1A] mb-4">
                    Closing Thought
                  </h2>
                  <p className="text-lg sm:text-xl leading-relaxed text-[#1A1A1A] italic">
                    {sections.closingThought}
                  </p>
                </div>
              )}

              {/* ESV Copyright */}
              <ESVCopyright />

              {/* Subscription Form - only show when not inline */}
              {!isInline && (
                <div className="mt-16 sm:mt-20">
                  <JournalSubscription />
                </div>
              )}

            </div>
          </div>
        </section>
      </div>
    </>
  );
}

