import React from "react";
import SEO from "../../components/SEO";

export default function ALIThanks() {
  return (
    <>
      <SEO pageKey="ali-thanks" />
      <div className="min-h-screen bg-[#FAFAF9] py-16 sm:py-24 md:py-32 lg:py-40">
        <div className="container mx-auto px-4 sm:px-6 md:px-12">
          <div className="max-w-2xl mx-auto">
            <div className="bg-white border border-[#1A1A1A]/10 p-8 sm:p-10 md:p-12 text-center">
              {/* Success Icon */}
              <div className="flex justify-center mb-8">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[#C85A3C] flex items-center justify-center">
                  <svg className="w-10 h-10 sm:w-12 sm:h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>

              {/* Headline */}
              <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl font-bold text-[#1A1A1A] mb-6 sm:mb-8 leading-[0.9] tracking-tight">
                Welcome to the ALI Pilot
              </h1>

              {/* Body Content */}
              <p className="text-base sm:text-lg leading-relaxed text-[#6B6B6B] mb-8 sm:mb-10 text-pretty">
                Thank you for joining us. I'll be in touch within 48 hours to set up our first conversation and get you started.
              </p>

              {/* Return Button */}
              <a
                href="/"
                onClick={(e) => {
                  e.preventDefault();
                  window.history.pushState({}, '', '/');
                  window.dispatchEvent(new PopStateEvent('popstate'));
                }}
                className="inline-block bg-[#1A1A1A] text-white px-8 sm:px-10 py-4 sm:py-5 font-medium text-sm sm:text-base hover:bg-[#1A1A1A]/90 transition-colors"
              >
                Return Home
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
