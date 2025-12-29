/**
 * Faith Landing Page
 * 
 * Features the current day's devotional at the top in full,
 * with previous days below for reference.
 * This page is NOT connected to the main navigation.
 */
import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import SEO from '../components/SEO';
import ScriptureBlock from '../components/ScriptureBlock';
import ESVCopyright from '../components/ESVCopyright';
import JournalSubscription from '../components/JournalSubscription';

export default function Faith() {
  const [devotionals, setDevotionals] = useState([]);
  const [currentDevotional, setCurrentDevotional] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load all published devotionals
    fetch('/api/knowledge?type=devotional')
      .then(response => response.json())
      .then(data => {
        const allDevotionals = data.docs || [];
        
        // Sort by date (newest first)
        const sorted = allDevotionals.sort((a, b) => {
          const dateA = new Date(a.date || a.publish_date || 0);
          const dateB = new Date(b.date || b.publish_date || 0);
          return dateB - dateA;
        });

        // Find today's devotional (or most recent if today's doesn't exist)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const todayDevotional = sorted.find(d => {
          const devotionalDate = new Date(d.date || d.publish_date);
          devotionalDate.setHours(0, 0, 0, 0);
          return devotionalDate.getTime() === today.getTime();
        });

        // Use today's devotional or the most recent one
        const current = todayDevotional || sorted[0] || null;
        const previous = sorted.filter(d => d.slug !== current?.slug);

        setCurrentDevotional(current);
        setDevotionals(previous);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error loading devotionals:', error);
        setLoading(false);
      });
  }, []);

  // Parse devotional sections
  const parseDevotionalSections = (body) => {
    const sections = {
      scripture: null,
      reflection: null,
      practicalApplication: null,
      takeaways: null,
      closingThought: null
    };

    let currentSection = null;
    let currentContent = [];

    body.split('\n').forEach(line => {
      if (line.startsWith('## Scripture')) {
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

    if (currentSection) {
      sections[currentSection] = currentContent.join('\n').trim();
    }

    return sections;
  };

  // Process markdown
  const processMarkdown = (text) => {
    if (!text) return '';
    
    let html = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    
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

    html = html.split('\n\n').map(paragraph => {
      if (paragraph.trim() === '') return '';
      if (paragraph.startsWith('<ul')) {
        return paragraph;
      }
      return `<p class="mb-4 text-base sm:text-lg leading-relaxed text-[#1A1A1A]">${paragraph.replace(/\n/g, '<br>')}</p>`;
    }).join('');

    return html;
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-[#6B6B6B]">Loading...</p>
      </div>
    );
  }

  return (
    <>
      <SEO pageKey="default" />
      <Helmet>
        <title>Servant Leadership Devotional | Archetype Original</title>
        <meta name="description" content="Daily devotionals for servant leaders seeking renewal, perspective, and purpose in leadership." />
      </Helmet>

      <div className="min-h-screen bg-white">
        {/* Hero Section */}
        <section className="bg-gradient-to-b from-[#FFF8F0] via-white to-white py-12 sm:py-16 md:py-20">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-4xl mx-auto text-center">
              <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl font-bold text-[#1A1A1A] mb-4 leading-tight">
                Servant Leadership Devotional
              </h1>
              <p className="text-lg sm:text-xl text-[#6B6B6B] max-w-2xl mx-auto">
                Daily reflections on leadership, renewal, and purpose
              </p>
            </div>
          </div>
        </section>

        {/* Current Day's Devotional */}
        {currentDevotional && (
          <section className="py-12 sm:py-16 md:py-20 border-b border-[#1A1A1A]/10">
            <div className="container mx-auto px-4 sm:px-6 md:px-12">
              <div className="max-w-4xl mx-auto space-y-12 sm:space-y-16">
                <div className="text-center mb-8">
                  <p className="text-sm sm:text-base uppercase tracking-wider font-semibold text-[#C85A3C] mb-2">
                    TODAY'S DEVOTIONAL
                  </p>
                  <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-[#1A1A1A] mb-2">
                    {currentDevotional.title}
                  </h2>
                  {currentDevotional.date && (
                    <p className="text-base sm:text-lg text-[#6B6B6B]">
                      {formatDate(currentDevotional.date)}
                    </p>
                  )}
                </div>

                {(() => {
                  const sections = parseDevotionalSections(currentDevotional.body || '');
                  return (
                    <>
                      {/* Scripture */}
                      {currentDevotional.scripture_reference && (
                        <ScriptureBlock reference={currentDevotional.scripture_reference} />
                      )}

                      {/* Reflection */}
                      {sections.reflection && (
                        <div>
                          <h3 className="font-serif text-2xl sm:text-3xl font-bold text-[#1A1A1A] mb-6 border-l-4 border-[#C85A3C] pl-4 sm:pl-6">
                            Reflection
                          </h3>
                          <div 
                            className="prose prose-lg max-w-none"
                            dangerouslySetInnerHTML={{ __html: processMarkdown(sections.reflection) }}
                          />
                        </div>
                      )}

                      {/* Practical Application */}
                      {sections.practicalApplication && (
                        <div>
                          <h3 className="font-serif text-2xl sm:text-3xl font-bold text-[#1A1A1A] mb-6 border-l-4 border-[#C85A3C] pl-4 sm:pl-6">
                            Practical Application
                          </h3>
                          <div 
                            className="prose prose-lg max-w-none"
                            dangerouslySetInnerHTML={{ __html: processMarkdown(sections.practicalApplication) }}
                          />
                        </div>
                      )}

                      {/* Takeaways */}
                      {sections.takeaways && (
                        <div>
                          <h3 className="font-serif text-2xl sm:text-3xl font-bold text-[#1A1A1A] mb-6 border-l-4 border-[#C85A3C] pl-4 sm:pl-6">
                            Takeaways
                          </h3>
                          <div 
                            className="prose prose-lg max-w-none"
                            dangerouslySetInnerHTML={{ __html: processMarkdown(sections.takeaways) }}
                          />
                        </div>
                      )}

                      {/* Closing Thought */}
                      {sections.closingThought && (
                        <div className="bg-[#FAFAF9] border-l-4 border-[#C85A3C] p-6 sm:p-8 md:p-10">
                          <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#1A1A1A] mb-4">
                            Closing Thought
                          </h3>
                          <p className="text-lg sm:text-xl leading-relaxed text-[#1A1A1A] italic">
                            {sections.closingThought}
                          </p>
                        </div>
                      )}

                      <ESVCopyright />
                    </>
                  );
                })()}
              </div>
            </div>
          </section>
        )}

        {/* Previous Days */}
        {devotionals.length > 0 && (
          <section className="py-12 sm:py-16 md:py-20 bg-[#FAFAF9]">
            <div className="container mx-auto px-4 sm:px-6 md:px-12">
              <div className="max-w-4xl mx-auto">
                <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#1A1A1A] mb-8 text-center">
                  Previous Days
                </h2>
                <div className="space-y-6">
                  {devotionals.map((devotional) => (
                    <div 
                      key={devotional.slug}
                      className="bg-white border border-[#1A1A1A]/10 p-6 sm:p-8 rounded-lg hover:shadow-lg transition-shadow"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                          <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#1A1A1A] mb-2">
                            {devotional.title}
                          </h3>
                          {devotional.date && (
                            <p className="text-sm sm:text-base text-[#6B6B6B] mb-2">
                              {formatDate(devotional.date)}
                            </p>
                          )}
                          {devotional.scripture_reference && (
                            <p className="text-sm sm:text-base text-[#C85A3C] font-medium">
                              {devotional.scripture_reference}
                            </p>
                          )}
                        </div>
                        <a
                          href={`/journal/${devotional.slug}`}
                          onClick={(e) => {
                            e.preventDefault();
                            window.history.pushState({}, '', `/journal/${devotional.slug}`);
                            window.dispatchEvent(new PopStateEvent('popstate'));
                          }}
                          className="inline-flex items-center gap-2 text-[#C85A3C] hover:text-[#A0452E] font-medium text-sm sm:text-base transition-colors whitespace-nowrap"
                        >
                          Read Full Devotional
                          <svg 
                            className="w-4 h-4" 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                          >
                            <path 
                              strokeLinecap="round" 
                              strokeLinejoin="round" 
                              strokeWidth={2} 
                              d="M9 5l7 7-7 7" 
                            />
                          </svg>
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Subscription Form */}
        <section className="py-12 sm:py-16 md:py-20">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-4xl mx-auto">
              <JournalSubscription />
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

