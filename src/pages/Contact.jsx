/**
 * Contact Page
 * 
 * Purpose: Standalone contact page with form
 * Content: Reuses existing Contact component or creates standalone version
 */
import React from 'react';
import SEO from '../components/SEO';
import Contact from '../components/Contact';

export default function ContactPage() {
  return (
    <>
      <SEO pageKey="contact" />
      <div className="min-h-screen bg-warm-offWhite py-12 pt-28">
        <div className="container">
          <div className="max-w-3xl mx-auto">
            <h1 className="h1 mb-8 text-center">Contact</h1>
            <Contact />
          </div>
        </div>
      </div>
    </>
  );
}

