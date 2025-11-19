/**
 * Ask Archy Page
 * 
 * Purpose: Front door into Archy interaction
 * Content: Wraps existing ChatApp component
 * 
 * NOTE: Do NOT change the engine logic - only present an appropriate hero + wrapper
 */
import React from 'react';
import SEO from '../../components/SEO';
import ChatApp from '../../app/ChatApp';

export default function Ask() {
  return (
    <>
      <SEO pageKey="archy-ask" />
      <div className="min-h-screen bg-warm-offWhite py-12 pt-28">
        <div className="container">
          {/* Hero Section */}
          <section className="mb-12 text-center">
            <h1 className="h1 mb-6">Ask Archy</h1>
            <p className="p text-lg max-w-3xl mx-auto">
              Hero placeholder text here.
            </p>
          </section>

          {/* ChatApp Wrapper - Do NOT modify ChatApp logic */}
          <section>
            <ChatApp />
          </section>
        </div>
      </div>
    </>
  );
}

