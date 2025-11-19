/**
 * Archy Index Page
 * 
 * Purpose: Main Archy landing page
 * Content: Placeholder text - Bart will fill in real content
 * 
 * NOTE: Do NOT alter Archy's engine logic - only presentational structure
 */
import React from 'react';
import SEO from '../../components/SEO';

export default function Archy() {
  return (
    <>
      <SEO pageKey="archy" />
      <div className="min-h-screen bg-warm-offWhite py-12 pt-28">
        <div className="container">
          {/* Hero Section */}
          <section className="mb-16 text-center">
            <h1 className="h1 mb-6">Archy</h1>
            <p className="p text-lg max-w-3xl mx-auto">
              Hero placeholder text here.
            </p>
          </section>

          {/* Who Archy Is */}
          <section className="mb-16">
            <h2 className="h2 mb-6">Who Archy Is</h2>
            <p className="p mb-6">
              Who Archy is placeholder text here.
            </p>
          </section>

          {/* What He Helps With */}
          <section className="mb-16">
            <h2 className="h2 mb-6">What He Helps With</h2>
            <p className="p mb-6">
              What Archy helps with placeholder text here.
            </p>
          </section>

          {/* How It Works Preview */}
          <section className="mb-16">
            <h2 className="h2 mb-6">How It Works</h2>
            <p className="p mb-6">
              How it works preview placeholder text here.
            </p>
            <a
              href="/archy/how-it-works"
              className="btn-cta inline-block mb-4"
              aria-label="Learn more about how Archy works"
            >
              Learn More
            </a>
            <a
              href="/archy/corpus"
              className="btn inline-block ml-4"
              aria-label="Learn about Archy's corpus"
            >
              How Archy Learns
            </a>
          </section>

          {/* CTA to /archy/ask */}
          <section className="text-center">
            <a
              href="/archy/ask"
              className="btn-cta"
              aria-label="Ask Archy a question"
            >
              Ask Archy
            </a>
          </section>
        </div>
      </div>
    </>
  );
}

