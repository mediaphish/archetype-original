/**
 * How Archy Works Page
 * 
 * Purpose: Step-by-step explanation of Archy interaction flow
 * Content: Placeholder text - Bart will fill in real content
 * 
 * NOTE: Do NOT alter Archy's engine logic - only presentational structure
 */
import React from 'react';
import SEO from '../../components/SEO';

export default function HowItWorks() {
  return (
    <>
      <SEO pageKey="archy-how-it-works" />
      <div className="min-h-screen bg-white">
        {/* Hero Section */}
        <section className="bg-white py-16 sm:py-20 md:py-24 lg:py-20">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-5xl mx-auto text-center space-y-8">
              <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl font-bold leading-[0.9] tracking-tight text-[#1A1A1A]">
                How Archy Works
              </h1>
            </div>
          </div>
        </section>

        {/* Content Section */}
        <section className="bg-[#FAFAF9] py-16 sm:py-24 md:py-32">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-4xl mx-auto">
            
            <section className="mb-12">
              <h2 className="h2 mb-6">Step 1</h2>
              <p className="p mb-6">
                Step 1 placeholder text here.
              </p>
            </section>

            <section className="mb-12">
              <h2 className="h2 mb-6">Step 2</h2>
              <p className="p mb-6">
                Step 2 placeholder text here.
              </p>
            </section>

            <section className="mb-12">
              <h2 className="h2 mb-6">Step 3</h2>
              <p className="p mb-6">
                Step 3 placeholder text here.
              </p>
            </section>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

