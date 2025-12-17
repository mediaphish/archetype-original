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
      <div className="min-h-screen bg-white">
        {/* Hero Section */}
        <section className="bg-white py-24 sm:py-32 md:py-40 lg:py-48">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-5xl mx-auto text-center space-y-8">
              <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl font-bold leading-[0.9] tracking-tight text-[#1A1A1A]">
                Archy
              </h1>
              <p className="text-xl sm:text-2xl md:text-3xl leading-relaxed text-[#1A1A1A]/70 font-light">
                Hero placeholder text here.
              </p>
            </div>
          </div>
        </section>

        {/* Content Sections */}
        <section className="bg-[#FAFAF9] py-16 sm:py-24 md:py-32">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-4xl mx-auto">

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
        </section>
      </div>
    </>
  );
}

