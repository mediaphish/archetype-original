/**
 * Industry Insights Page
 * Editorial Minimal Design - Flat, no gradients/shadows
 */
import React from 'react';
import SEO from '../../components/SEO';

export default function IndustryReports() {
  return (
    <>
      <SEO pageKey="industry-reports" />
      <div className="min-h-screen bg-white">
        {/* Hero Section */}
        <section className="bg-white py-24 sm:py-32 md:py-40 lg:py-48">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-5xl mx-auto text-center space-y-8">
              <div className="inline-block mb-6">
                <div className="px-3 py-1 border border-[#1A1A1A]/10">
                  <span className="text-xs font-medium tracking-wider text-[#C85A3C] uppercase">Coming Soon</span>
                </div>
              </div>
              
              <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl font-bold text-[#1A1A1A] leading-[0.9] tracking-tight">
                Industry Insights
              </h1>
            </div>
          </div>
        </section>

        {/* Content Section */}
        <section className="bg-[#FAFAF9] py-16 sm:py-24 md:py-32">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-4xl mx-auto text-center">
            
            <div className="space-y-6 sm:space-y-8 text-base sm:text-lg leading-relaxed text-[#6B6B6B] mb-8 sm:mb-10">
              <p className="text-pretty">
                Industry insights and benchmarking data are coming soon. As we gather data from ALI pilot participants, we'll share aggregated insights about leadership culture across industries, company sizes, and regions.
              </p>
              
              <p className="text-pretty">
                Want to be part of building this? Join the ALI pilot and help shape what Industry Insights becomes.
              </p>
            </div>
            
            <a
              href="/culture-science/ali"
              onClick={(e) => {
                e.preventDefault();
                window.history.pushState({}, '', '/culture-science/ali');
                window.dispatchEvent(new PopStateEvent('popstate'));
              }}
              className="inline-block bg-[#1A1A1A] text-white px-8 sm:px-10 py-4 sm:py-5 font-medium text-sm sm:text-base hover:bg-[#1A1A1A]/90 transition-colors"
            >
              Join the ALI Pilot
            </a>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
