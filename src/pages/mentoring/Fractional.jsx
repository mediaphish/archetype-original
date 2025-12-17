/**
 * Fractional Leadership Page
 * 
 * Purpose: Detail page for fractional leadership service
 * Content: Placeholder text - Bart will fill in real content
 * 
 * NOTE: This should eventually include content from "What I Do" fractional section
 */
import React from 'react';
import SEO from '../../components/SEO';

export default function Fractional() {
  return (
    <>
      <SEO pageKey="fractional" />
      <div className="min-h-screen bg-white">
        {/* Hero Section */}
        <section className="bg-white py-24 sm:py-32 md:py-40 lg:py-48">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-5xl mx-auto text-center space-y-8">
              <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl font-bold leading-[0.9] tracking-tight text-[#1A1A1A]">
                Fractional Leadership
              </h1>
            </div>
          </div>
        </section>

        {/* Content Section */}
        <section className="bg-[#FAFAF9] py-16 sm:py-24 md:py-32">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-4xl mx-auto">
            
            <section className="mb-12">
              <p className="p mb-6">
                Hero placeholder text here.
              </p>
            </section>

            <section className="mb-12">
              <h2 className="h2 mb-6">Section Heading</h2>
              <p className="p mb-6">
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

