/**
 * Faith Landing Page
 * 
 * Shows intro content, current day's devotional (or most recent), previous devotionals, and subscription form.
 */
import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import SEO from '../components/SEO';
import Header from '../components/Header';
import JournalSubscription from '../components/JournalSubscription';
import FloatingArchyButton from '../components/FloatingArchyButton';
import Footer from '../components/Footer';
import DevotionalPost from './DevotionalPost';

export default function Faith() {
  const [devotionals, setDevotionals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDevotional, setCurrentDevotional] = useState(null);
  const [previousDevotionals, setPreviousDevotionals] = useState([]);

  useEffect(() => {
    // Always scroll to top when page loads
    window.scrollTo({ top: 0, behavior: 'instant' });

    // Load devotionals from the knowledge corpus
    fetch('/api/knowledge?type=devotional')
      .then(r => r.json())
      .then(data => {
        const allDevotionals = data.docs || [];
        
        // Filter to only published devotionals
        const publishedDevotionals = allDevotionals.filter(devotional => 
          devotional.status === 'published' || devotional.status === undefined
        );
        
        // Sort by publish_date, newest first
        const sortedDevotionals = publishedDevotionals.sort((a, b) => {
          const dateA = new Date(a.publish_date || a.date || 0);
          const dateB = new Date(b.publish_date || b.date || 0);
          return dateB - dateA;
        });
        
        setDevotionals(sortedDevotionals);
        
        // Find today's devotional or most recent one
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // All devotionals are already filtered to published, so use sortedDevotionals directly
        // Find today's devotional
        const todaysDevotional = sortedDevotionals.find(d => {
          if (!d.publish_date) return false;
          const publishDate = new Date(d.publish_date);
          publishDate.setHours(0, 0, 0, 0);
          return publishDate.getTime() === today.getTime();
        });
        
        // If no devotional for today, use the most recent one
        const current = todaysDevotional || sortedDevotionals[0] || null;
        
        // Previous devotionals are all others (excluding current)
        const previous = sortedDevotionals.filter(d => 
          !current || d.slug !== current.slug
        );
        setCurrentDevotional(current);
        setPreviousDevotionals(previous);
        
        setLoading(false);
      })
      .catch(error => {
        console.error('Error loading devotionals:', error);
        setLoading(false);
      });
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return '';
    let date;
    if (typeof dateString === 'string' && dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = dateString.split('-').map(Number);
      date = new Date(Date.UTC(year, month - 1, day));
    } else {
      date = new Date(dateString);
    }
    
    if (isNaN(date.getTime())) {
      return '';
    }
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <>
      <SEO pageKey="default" />
      <Helmet>
        <title>Servant Leadership Devotional | Archetype Original</title>
        <meta name="description" content="Daily devotionals for servant leaders seeking renewal, perspective, and purpose in leadership." />
      </Helmet>

      <div className="min-h-screen bg-white">
        {/* Header */}
        <Header />

        {/* Hero Section */}
        <section className="bg-gradient-to-b from-[#FFF8F0] via-white to-white py-12 sm:py-16 md:py-20">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-4xl mx-auto">
              <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl font-bold text-[#1A1A1A] mb-8 leading-tight text-center">
                Servant Leadership Devotional
              </h1>
              
              {/* Intro Content */}
              <div className="max-w-3xl mx-auto space-y-6 mb-12">
                <p className="text-lg sm:text-xl leading-relaxed text-[#1A1A1A]">
                  This devotional is built on a simple, demanding idea:
                </p>
                
                <p className="text-xl sm:text-2xl font-semibold leading-relaxed text-[#1A1A1A]">
                  Lead others the way you would want to be led.
                </p>
                
                <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                  Often called the Golden Rule, this principle sits at the foundation of Servant Leadership. These daily reflections connect Scripture to the real pressures of leadership—power, responsibility, trust, restraint, and care for people.
                </p>
                
                <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                  The goal is not inspiration for inspiration's sake, but formation. Each entry invites leaders to slow down, examine their assumptions, and renew how they think about influence and responsibility.
                </p>
                
                <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                  👉 To understand the leadership framework behind this devotional, read{' '}
                  <a 
                    href="/journal/golden-rule-leadership-strategy"
                    onClick={(e) => {
                      e.preventDefault();
                      window.history.pushState({}, '', '/journal/golden-rule-leadership-strategy');
                      window.dispatchEvent(new PopStateEvent('popstate'));
                      window.scrollTo({ top: 0, behavior: 'instant' });
                    }}
                    className="text-[#C85A3C] hover:text-[#B54A32] underline font-medium"
                  >
                    The Golden Rule Has Always Been a Leadership Strategy
                  </a>
                  .
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Current Day's Devotional */}
        {loading ? (
          <section className="py-12 sm:py-16 md:py-20">
            <div className="container mx-auto px-4 sm:px-6 md:px-12">
              <div className="max-w-4xl mx-auto text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C85A3C] mx-auto"></div>
                <p className="mt-4 text-[#6B6B6B]">Loading devotionals...</p>
              </div>
            </div>
          </section>
        ) : currentDevotional ? (
          <section className="py-12 sm:py-16 md:py-20 bg-[#FAFAF9]">
            <div className="container mx-auto px-4 sm:px-6 md:px-12">
              <div className="max-w-4xl mx-auto">
                <div className="mb-8">
                  <p className="text-sm sm:text-base uppercase tracking-wider font-semibold text-[#C85A3C] mb-2">
                    Today's Devotional
                  </p>
                  <p className="text-sm text-[#6B6B6B]">
                    {formatDate(currentDevotional.publish_date || currentDevotional.date)}
                  </p>
                </div>
                <div className="bg-white border border-[#1A1A1A]/10">
                  <DevotionalPost post={currentDevotional} />
                </div>
              </div>
            </div>
          </section>
        ) : (
          <section className="py-12 sm:py-16 md:py-20">
            <div className="container mx-auto px-4 sm:px-6 md:px-12">
              <div className="max-w-4xl mx-auto text-center">
                <p className="text-[#6B6B6B]">No devotionals available yet. Check back soon!</p>
              </div>
            </div>
          </section>
        )}

        {/* Previous Devotionals */}
        {previousDevotionals.length > 0 && (
          <section className="py-12 sm:py-16 md:py-20">
            <div className="container mx-auto px-4 sm:px-6 md:px-12">
              <div className="max-w-4xl mx-auto">
                <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-[#1A1A1A] mb-8">
                  Previous Devotionals
                </h2>
                <div className="space-y-6">
                  {previousDevotionals.map((devotional) => (
                    <article 
                      key={devotional.slug}
                      className="border border-[#1A1A1A]/10 bg-white p-6 sm:p-8 hover:shadow-lg transition-shadow cursor-pointer"
                      onClick={() => {
                        window.history.pushState({}, '', `/journal/${devotional.slug}`);
                        window.dispatchEvent(new PopStateEvent('popstate'));
                        window.scrollTo({ top: 0, behavior: 'instant' });
                      }}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <time className="text-sm text-[#6B6B6B]">
                          {formatDate(devotional.publish_date || devotional.date)}
                        </time>
                        <span className="text-xs uppercase tracking-wider font-semibold text-[#C85A3C]">
                          Devotional
                        </span>
                      </div>
                      <h3 className="text-2xl sm:text-3xl font-bold text-[#1A1A1A] mb-3 font-serif tracking-tight">
                        {devotional.title}
                      </h3>
                      {devotional.scripture_reference && (
                        <p className="text-base text-[#6B6B6B] mb-3">
                          <strong>Scripture:</strong> {devotional.scripture_reference}
                        </p>
                      )}
                      {devotional.summary && (
                        <p className="text-base leading-relaxed text-[#1A1A1A] text-pretty">
                          {devotional.summary}
                        </p>
                      )}
                      <div className="mt-4">
                        <a 
                          href={`/journal/${devotional.slug}`}
                          onClick={(e) => {
                            e.preventDefault();
                            window.history.pushState({}, '', `/journal/${devotional.slug}`);
                            window.dispatchEvent(new PopStateEvent('popstate'));
                            window.scrollTo({ top: 0, behavior: 'instant' });
                          }}
                          className="text-[#C85A3C] hover:text-[#B54A32] underline font-medium text-base"
                        >
                          Read Full Devotional →
                        </a>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Subscription Form */}
        <section className="py-12 sm:py-16 md:py-20 bg-[#FAFAF9]">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-4xl mx-auto">
              <JournalSubscription />
            </div>
          </div>
        </section>
      </div>
      <Footer />
      <FloatingArchyButton />
    </>
  );
}
