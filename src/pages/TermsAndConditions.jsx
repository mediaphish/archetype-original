/**
 * Terms and Conditions Page
 */
import React from 'react';
import SEO from '../components/SEO';

// Update this date whenever the Terms and Conditions are modified
const LAST_UPDATED = 'January 31, 2026';

export default function TermsAndConditions() {
  return (
    <>
      <SEO pageKey="terms-and-conditions" />
      <div className="min-h-screen bg-white">
        {/* Hero Section */}
        <section className="bg-white py-12 sm:py-16 md:py-20 lg:py-20">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-4xl mx-auto">
              <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl font-bold leading-[0.9] tracking-tight text-[#1A1A1A] mb-4 sm:mb-6 break-words">
                Terms and Conditions
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
                  By accessing or using archetypeoriginal.com or any related services (including ALI), you agree to these Terms.
                </p>

                <div>
                  <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#1A1A1A] mb-4 sm:mb-6">
                    Use of Services
                  </h2>
                  <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                    Archetype Original provides educational tools and leadership diagnostics. You agree to use the services lawfully and without abuse, manipulation, or interference.
                  </p>
                </div>

                <div>
                  <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#1A1A1A] mb-4 sm:mb-6">
                    ALI Pilot Program
                  </h2>
                  <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] mb-3">
                    During the ALI Pilot:
                  </p>
                  <ul className="list-disc space-y-2 ml-6 text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                    <li>Access is provided free for one year</li>
                    <li>Features may evolve</li>
                    <li>No guarantees are made regarding outcomes or insights</li>
                    <li>We reserve the right to modify or end the pilot at any time.</li>
                  </ul>
                </div>

                <div>
                  <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#1A1A1A] mb-4 sm:mb-6">
                    Payments
                  </h2>
                  <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                    Paid subscriptions (when applicable) are processed through Stripe. By submitting payment details, you authorize recurring charges per your selected plan.
                  </p>
                </div>

                <div>
                  <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#1A1A1A] mb-4 sm:mb-6">
                    Acceptable Use
                  </h2>
                  <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] mb-3">
                    You may not:
                  </p>
                  <ul className="list-disc space-y-2 ml-6 text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                    <li>Manipulate survey participation</li>
                    <li>Seed false responses</li>
                    <li>Attempt to deanonymize respondents</li>
                    <li>Misrepresent organizational participation</li>
                  </ul>
                  <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] mt-3">
                    Violation may result in account termination and data deletion.
                  </p>
                </div>

                <div>
                  <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#1A1A1A] mb-4 sm:mb-6">
                    Data Integrity & Deletion
                  </h2>
                  <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] mb-3">
                    Data may be deleted only, not edited.
                  </p>
                  <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] mb-3">
                    Deletions are permitted only when:
                  </p>
                  <ul className="list-disc space-y-2 ml-6 text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                    <li>Data is fraudulent, abusive, or corrupted</li>
                    <li>A legal requirement applies</li>
                    <li>A system integrity issue exists</li>
                  </ul>
                  <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] mt-3">
                    Some data may be tombstoned rather than fully erased.
                  </p>
                </div>

                <div>
                  <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#1A1A1A] mb-4 sm:mb-6">
                    Intellectual Property
                  </h2>
                  <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                    All content, frameworks, scoring models, and visualizations are the intellectual property of Archetype Original.
                  </p>
                </div>

                <div>
                  <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#1A1A1A] mb-4 sm:mb-6">
                    No Professional Advice
                  </h2>
                  <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                    Content and insights are informational only and do not constitute legal, medical, financial, or HR advice.
                  </p>
                </div>

                <div>
                  <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#1A1A1A] mb-4 sm:mb-6">
                    Limitation of Liability
                  </h2>
                  <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                    Archetype Original is not liable for indirect or consequential damages arising from use of the service.
                  </p>
                </div>

                <div>
                  <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#1A1A1A] mb-4 sm:mb-6">
                    Governing Law
                  </h2>
                  <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                    These Terms are governed by the laws of the State of Missouri.
                  </p>
                </div>

                <div>
                  <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#1A1A1A] mb-4 sm:mb-6">
                    Contact Information
                  </h2>
                  <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                    For questions regarding these Terms and Conditions, contact us at:
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

