/**
 * Culture Science Index Page
 * Editorial Minimal Design - Flat, no gradients/shadows
 */
import React from 'react';
import SEO from '../../components/SEO';

export default function CultureScience() {
  return (
    <>
      <SEO pageKey="culture-science" />
      <div className="min-h-screen bg-[#FAFAF9] py-16 sm:py-24 md:py-32 lg:py-40">
        <div className="container mx-auto px-4 sm:px-6 md:px-12">
          <div className="max-w-7xl mx-auto">
            {/* Hero Section */}
            <section className="mb-16 sm:mb-20 md:mb-24 text-center">
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#1A1A1A] mb-6 sm:mb-8 font-serif tracking-tight text-balance">
                Culture Science
              </h1>
              <p className="text-base sm:text-lg leading-relaxed text-[#6B6B6B] max-w-3xl mx-auto text-pretty">
                Heading placeholder text here.
              </p>
            </section>

            {/* Overview Section */}
            <section className="mb-16 sm:mb-20 md:mb-24">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#1A1A1A] mb-6 sm:mb-8 font-serif tracking-tight">
                Overview
              </h2>
              <p className="text-base sm:text-lg leading-relaxed text-[#6B6B6B] text-pretty">
                Overview placeholder text here.
              </p>
            </section>

            {/* ALI Highlight Card */}
            <section className="mb-16 sm:mb-20 md:mb-24">
              <div className="bg-white border-l-[6px] border-[#C85A3C] border border-[#1A1A1A]/10 p-8 sm:p-10 md:p-12">
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#1A1A1A] mb-4 sm:mb-6 font-serif tracking-tight">
                  ALI Pilot Program
                </h2>
                <p className="text-base sm:text-lg leading-relaxed text-[#6B6B6B] mb-6 sm:mb-8 text-pretty">
                  ALI highlight card placeholder text here.
                </p>
                <a
                  href="/culture-science/ali"
                  className="inline-block bg-[#1A1A1A] text-white px-8 sm:px-10 py-4 sm:py-5 font-medium text-sm sm:text-base hover:bg-[#1A1A1A]/90 transition-colors"
                  aria-label="Learn more about ALI"
                >
                  Learn More About ALI
                </a>
              </div>
            </section>

            {/* Cards Grid */}
            <section className="mb-16 sm:mb-20 md:mb-24">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
                {/* Diagnostics & Metrics */}
                <div className="bg-white border border-[#1A1A1A]/10 p-8 sm:p-10">
                  <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#1A1A1A] mb-4 sm:mb-6 font-serif tracking-tight">
                    Diagnostics & Metrics
                  </h3>
                  <p className="text-base sm:text-lg leading-relaxed text-[#6B6B6B] mb-6 sm:mb-8 text-pretty">
                    Diagnostics placeholder text here.
                  </p>
                  <a
                    href="/culture-science"
                    className="text-[#1A1A1A] hover:underline font-medium text-base sm:text-lg"
                  >
                    Learn More →
                  </a>
                </div>

                {/* Industry Reports */}
                <div className="bg-white border border-[#1A1A1A]/10 p-8 sm:p-10">
                  <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#1A1A1A] mb-4 sm:mb-6 font-serif tracking-tight">
                    Industry Reports
                  </h3>
                  <p className="text-base sm:text-lg leading-relaxed text-[#6B6B6B] mb-6 sm:mb-8 text-pretty">
                    Industry reports placeholder text here.
                  </p>
                  <a
                    href="/culture-science/industry-reports"
                    className="text-[#1A1A1A] hover:underline font-medium text-base sm:text-lg"
                  >
                    View Reports →
                  </a>
                </div>

                {/* Research */}
                <div className="bg-white border border-[#1A1A1A]/10 p-8 sm:p-10">
                  <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#1A1A1A] mb-4 sm:mb-6 font-serif tracking-tight">
                    Research
                  </h3>
                  <p className="text-base sm:text-lg leading-relaxed text-[#6B6B6B] mb-6 sm:mb-8 text-pretty">
                    Research placeholder text here.
                  </p>
                  <a
                    href="/culture-science/research"
                    className="text-[#1A1A1A] hover:underline font-medium text-base sm:text-lg"
                  >
                    View Research →
                  </a>
                </div>

                {/* Anti-Projects */}
                <div className="bg-white border border-[#1A1A1A]/10 p-8 sm:p-10">
                  <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#1A1A1A] mb-4 sm:mb-6 font-serif tracking-tight">
                    Anti-Projects
                  </h3>
                  <p className="text-base sm:text-lg leading-relaxed text-[#6B6B6B] mb-6 sm:mb-8 text-pretty">
                    Anti-projects placeholder text here.
                  </p>
                  <a
                    href="/culture-science/anti-projects"
                    className="text-[#1A1A1A] hover:underline font-medium text-base sm:text-lg"
                  >
                    Explore Anti-Projects →
                  </a>
                </div>

                {/* Ethics & Confidentiality */}
                <div className="bg-white border border-[#1A1A1A]/10 p-8 sm:p-10">
                  <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#1A1A1A] mb-4 sm:mb-6 font-serif tracking-tight">
                    Ethics & Confidentiality
                  </h3>
                  <p className="text-base sm:text-lg leading-relaxed text-[#6B6B6B] mb-6 sm:mb-8 text-pretty">
                    Ethics placeholder text here.
                  </p>
                  <a
                    href="/culture-science/ethics"
                    className="text-[#1A1A1A] hover:underline font-medium text-base sm:text-lg"
                  >
                    Learn More →
                  </a>
                </div>
              </div>
            </section>

            {/* Optional Archy Researcher Mode Illustration Slot */}
            <section className="text-center">
              <div className="w-full max-w-md mx-auto aspect-square bg-[#6B6B6B]/10 flex items-center justify-center">
                <span className="text-[#6B6B6B] text-sm">Archy Researcher Mode Illustration Placeholder</span>
              </div>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
