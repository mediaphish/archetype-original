/**
 * ALI End User License Agreement (EULA) Page
 */
import React from 'react';
import SEO from '../components/SEO';

// Update this date whenever the EULA is modified
const LAST_UPDATED = 'January 31, 2026';

export default function ALIEULA() {
  return (
    <>
      <SEO pageKey="ali-eula" />
      <div className="min-h-screen bg-white">
        {/* Hero Section */}
        <section className="bg-white py-12 sm:py-16 md:py-20 lg:py-20">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-4xl mx-auto">
              <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl font-bold leading-[0.9] tracking-tight text-[#1A1A1A] mb-4 sm:mb-6 break-words">
                Archetype Leadership Index (ALI) EULA
              </h1>
              <p className="text-sm sm:text-base text-[#6B6B6B]">
                Last updated: {LAST_UPDATED}
              </p>
            </div>
          </div>
        </section>

        {/* Content Section */}
        <section className="bg-[#FAFAF9] py-12 sm:py-16 md:py-20">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-4xl mx-auto prose prose-lg">
              <div className="bg-white border border-[#1A1A1A]/10 rounded-lg p-6 sm:p-8 md:p-10 space-y-6 sm:space-y-8">
                
                <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                  This End User License Agreement governs your use of the Archetype Leadership Index platform.
                </p>

                <div>
                  <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#1A1A1A] mb-4 sm:mb-6">
                    License Grant
                  </h2>
                  <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                    Archetype Original grants you a non-exclusive, non-transferable, revocable license to use ALI for internal organizational assessment purposes only.
                  </p>
                </div>

                <div>
                  <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#1A1A1A] mb-4 sm:mb-6">
                    Data Model Acknowledgment
                  </h2>
                  <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] mb-3">
                    You acknowledge and agree that:
                  </p>
                  <ul className="list-disc space-y-2 ml-6 text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                    <li>ALI operates on anonymous, aggregate survey data</li>
                    <li>Individual responses are not disclosed</li>
                    <li>Scores, insights, and visualizations are interpretive, not factual determinations</li>
                  </ul>
                </div>

                <div>
                  <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#1A1A1A] mb-4 sm:mb-6">
                    Restrictions
                  </h2>
                  <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] mb-3">
                    You may not:
                  </p>
                  <ul className="list-disc space-y-2 ml-6 text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                    <li>Reverse engineer scoring models</li>
                    <li>Attempt respondent identification</li>
                    <li>Export or reuse data outside your organization</li>
                    <li>Use ALI outputs for punitive employment actions</li>
                  </ul>
                </div>

                <div>
                  <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#1A1A1A] mb-4 sm:mb-6">
                    Super Admin Oversight
                  </h2>
                  <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                    System administrators at Archetype Original may access aggregate data to maintain system quality and integrity.
                  </p>
                </div>

                <div>
                  <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#1A1A1A] mb-4 sm:mb-6">
                    Termination
                  </h2>
                  <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                    This license may be terminated if misuse, abuse, or policy violations occur.
                  </p>
                </div>

                <div>
                  <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#1A1A1A] mb-4 sm:mb-6">
                    Disclaimer
                  </h2>
                  <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                    ALI is a diagnostic tool, not a guarantee of outcomes or performance.
                  </p>
                </div>

                <div>
                  <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#1A1A1A] mb-4 sm:mb-6">
                    Acceptance
                  </h2>
                  <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                    You must explicitly accept this EULA during signup to access ALI.
                  </p>
                </div>

                <div>
                  <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#1A1A1A] mb-4 sm:mb-6">
                    Contact
                  </h2>
                  <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                    For questions about this EULA, contact us at:
                  </p>
                  <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] mt-2">
                    <a href="mailto:bart@archetypeoriginal.com" className="text-[#C85A3C] hover:text-[#B54A32] underline">
                      bart@archetypeoriginal.com
                    </a>
                  </p>
                </div>

              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

