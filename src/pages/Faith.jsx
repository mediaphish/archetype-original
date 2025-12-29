/**
 * Faith Landing Page
 * 
 * Shows intro content and subscription form only.
 * Devotionals will appear on their publish dates.
 */
import React from 'react';
import { Helmet } from 'react-helmet-async';
import SEO from '../components/SEO';
import Header from '../components/Header';
import JournalSubscription from '../components/JournalSubscription';

export default function Faith() {
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
