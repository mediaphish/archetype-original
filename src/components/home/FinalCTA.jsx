/**
 * Final CTA Section
 * Editorial Minimal Design
 */
import React from 'react';

export default function FinalCTA() {
  return (
    <section className="py-16 sm:py-24 md:py-32 bg-white">
      <div className="container mx-auto px-4 sm:px-6 md:px-12">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="mb-6">
            <span className="text-xs bg-[#C85A3C]/10 text-[#C85A3C] px-4 py-2 rounded-full inline-block">
              Limited Spots Available
            </span>
          </div>
          
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#1A1A1A] mb-6 sm:mb-8 font-serif tracking-tight">
            If You're Ready to Lead Differently
          </h2>
          
          <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] mb-8 sm:mb-10 max-w-3xl mx-auto">
            Whether you're navigating transition, rebuilding culture, or just trying to make sense of the weight you're carrying — I'm here to help. Let's start a conversation about what you're facing and where you want to go.
          </p>
          
          <div className="flex flex-col items-center gap-4">
            <a
              href="/contact"
              onClick={(e) => {
                e.preventDefault();
                window.history.pushState({}, '', '/contact');
                window.dispatchEvent(new PopStateEvent('popstate'));
              }}
              className="bg-[#1A1A1A] text-white px-12 py-5 font-medium text-base rounded-md hover:bg-[#1A1A1A]/90 transition-colors"
            >
              Start a Conversation
            </a>
            <a
              href="/methods"
              onClick={(e) => {
                e.preventDefault();
                window.history.pushState({}, '', '/methods');
                window.dispatchEvent(new PopStateEvent('popstate'));
              }}
              className="text-sm text-[#6B6B6B] hover:underline"
            >
              Or explore what I offer
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
