/**
 * Culture Science Research Page
 * Editorial Minimal Design - Flat, no gradients/shadows
 */
import React from 'react';
import SEO from '../../components/SEO';

export default function Research() {
  return (
    <>
      <SEO pageKey="culture-science-research" />
      <div className="min-h-screen bg-white">
        {/* Hero Section */}
        <section className="bg-white py-24 sm:py-32 md:py-40 lg:py-48">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-5xl mx-auto text-center space-y-8">
              <h1 className="font-serif text-7xl sm:text-8xl md:text-9xl font-bold text-[#1A1A1A] leading-[0.9] tracking-tight">
                Research
              </h1>
            </div>
          </div>
        </section>

        {/* Content Section */}
        <section className="bg-[#FAFAF9] py-16 sm:py-24 md:py-32">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-4xl mx-auto">
            
            <section className="mb-12 sm:mb-16">
              <p className="text-base sm:text-lg leading-relaxed text-[#6B6B6B] text-pretty">
                Hero placeholder text here.
              </p>
            </section>

            <section className="mb-12 sm:mb-16">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#1A1A1A] mb-6 sm:mb-8 font-serif tracking-tight">
                Section Heading
              </h2>
              <p className="text-base sm:text-lg leading-relaxed text-[#6B6B6B] text-pretty">
                Body text placeholder here.
              </p>
            </section>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
