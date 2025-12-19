/**
 * Terms and Conditions Page
 */
import React from 'react';
import SEO from '../components/SEO';

// Update this date whenever the Terms and Conditions are modified
const LAST_UPDATED = 'December 18, 2024';

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
                  Welcome to archetypeoriginal.com. By accessing or using this website, you agree to the following Terms and Conditions. If you do not agree, please do not use the site.
                </p>

                <div>
                  <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#1A1A1A] mb-4 sm:mb-6">
                    Use of the Website
                  </h2>
                  <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                    This website is provided for informational and educational purposes only. You agree to use the site lawfully and in a manner that does not infringe on the rights of others.
                  </p>
                </div>

                <div>
                  <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#1A1A1A] mb-4 sm:mb-6">
                    Intellectual Property
                  </h2>
                  <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] mb-4">
                    All content on this site—including text, graphics, logos, original frameworks, and written material—is the property of Archetype Original unless otherwise stated.
                  </p>
                  
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-bold text-xl sm:text-2xl text-[#1A1A1A] mb-3">
                        You may:
                      </h3>
                      <ul className="list-disc space-y-2 ml-6 text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                        <li>View and share content for personal, non-commercial use</li>
                      </ul>
                    </div>

                    <div>
                      <h3 className="font-bold text-xl sm:text-2xl text-[#1A1A1A] mb-3">
                        You may not:
                      </h3>
                      <ul className="list-disc space-y-2 ml-6 text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                        <li>Copy, reproduce, distribute, or modify content for commercial purposes without written permission</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div>
                  <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#1A1A1A] mb-4 sm:mb-6">
                    No Professional Advice
                  </h2>
                  <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                    Content provided on this site is not legal, financial, medical, or professional advice. Any actions you take based on information from this site are taken at your own risk.
                  </p>
                </div>

                <div>
                  <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#1A1A1A] mb-4 sm:mb-6">
                    Limitation of Liability
                  </h2>
                  <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                    Archetype Original is not liable for any damages arising from the use or inability to use this website, including but not limited to indirect or consequential damages.
                  </p>
                </div>

                <div>
                  <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#1A1A1A] mb-4 sm:mb-6">
                    Third-Party Services
                  </h2>
                  <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                    The site may reference or link to third-party tools, platforms, or services. We are not responsible for their availability, content, or policies.
                  </p>
                </div>

                <div>
                  <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#1A1A1A] mb-4 sm:mb-6">
                    Modifications
                  </h2>
                  <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                    We reserve the right to modify or discontinue the website or its content at any time without notice.
                  </p>
                </div>

                <div>
                  <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#1A1A1A] mb-4 sm:mb-6">
                    Governing Law
                  </h2>
                  <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                    These Terms and Conditions are governed by the laws of the State of Missouri, United States, without regard to conflict-of-law principles.
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

