/**
 * Speaking Page
 * 
 * Purpose: Detail page for speaking engagements
 * Content: Placeholder text - Bart will fill in real content
 * 
 * NOTE: This should eventually include content from "What I Do" speaking section
 */
import React from 'react';
import SEO from '../../components/SEO';

export default function Speaking() {
  return (
    <>
      <SEO pageKey="speaking" />
      <div className="min-h-screen bg-warm-offWhite py-12 pt-28">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <h1 className="h1 mb-8">Speaking</h1>
            
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
      </div>
    </>
  );
}
