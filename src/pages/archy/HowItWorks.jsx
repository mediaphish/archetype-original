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
      <div className="min-h-screen bg-warm-offWhite py-12 pt-28">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <h1 className="h1 mb-8">How Archy Works</h1>
            
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
      </div>
    </>
  );
}

