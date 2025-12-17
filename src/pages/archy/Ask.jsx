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
      <div className="min-h-screen bg-white">
        {/* Hero Section */}
        <section className="bg-white py-24 sm:py-32 md:py-40 lg:py-48">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-5xl mx-auto text-center space-y-8">
              <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl font-bold leading-[0.9] tracking-tight text-[#1A1A1A]">
                Ask Archy
              </h1>
              <p className="text-xl sm:text-2xl md:text-3xl leading-relaxed text-[#1A1A1A]/70 font-light">
                Hero placeholder text here.
              </p>
            </div>
          </div>
        </section>

        {/* ChatApp Section */}
        <section className="bg-[#FAFAF9] py-16 sm:py-24 md:py-32">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">

          {/* ChatApp Wrapper - Do NOT modify ChatApp logic */}
          <div className="max-w-4xl mx-auto">
            <ChatApp />
          </div>
          </div>
        </section>
      </div>
    </>
  );
}

