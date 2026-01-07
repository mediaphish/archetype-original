/**
 * Privacy Policy Page
 */
import React from 'react';
import SEO from '../components/SEO';

// Update this date whenever the Privacy Policy is modified
const LAST_UPDATED = 'January 31, 2026';

export default function PrivacyPolicy() {
  return (
    <>
      <SEO pageKey="privacy-policy" />
      <div className="min-h-screen bg-white">
        {/* Hero Section */}
        <section className="bg-white py-12 sm:py-16 md:py-20 lg:py-20">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-4xl mx-auto">
              <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl font-bold leading-[0.9] tracking-tight text-[#1A1A1A] mb-4 sm:mb-6 break-words">
                Privacy Policy
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
                  Archetype Original ("we," "us," or "our") respects your privacy and is committed to protecting it. This Privacy Policy explains how we collect, use, and safeguard information when you interact with archetypeoriginal.com and related services, including the Archetype Leadership Index (ALI).
                </p>

                <div>
                  <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#1A1A1A] mb-4 sm:mb-6">
                    Information We Collect
                  </h2>
                  
                  <div className="space-y-6">
                    <div>
                      <h3 className="font-bold text-xl sm:text-2xl text-[#1A1A1A] mb-3">
                        1. Information You Provide Directly
                      </h3>
                      <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] mb-3">
                        You may voluntarily provide information such as:
                      </p>
                      <ul className="list-disc space-y-2 ml-6 text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                        <li>Name</li>
                        <li>Email address</li>
                        <li>Company information</li>
                        <li>Billing details (processed via Stripe)</li>
                        <li>Information submitted through forms, surveys, or direct contact</li>
                      </ul>
                    </div>

                    <div>
                      <h3 className="font-bold text-xl sm:text-2xl text-[#1A1A1A] mb-3">
                        2. Automatically Collected Information
                      </h3>
                      <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] mb-3">
                        When you use our site or services, we may collect:
                      </p>
                      <ul className="list-disc space-y-2 ml-6 text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                        <li>IP address</li>
                        <li>Browser type</li>
                        <li>Device information</li>
                        <li>Pages visited and time spent</li>
                        <li>Referring URLs</li>
                      </ul>
                      <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] mt-3">
                        This information is collected via cookies and standard analytics tools.
                      </p>
                    </div>

                    <div>
                      <h3 className="font-bold text-xl sm:text-2xl text-[#1A1A1A] mb-3">
                        3. ALI Survey Data
                      </h3>
                      <ul className="list-disc space-y-2 ml-6 text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                        <li>ALI surveys are designed to be anonymous at the individual level.</li>
                        <li>Individual survey responses are not visible to client administrators.</li>
                        <li>Results are aggregated and reported only at the team or organizational level.</li>
                        <li>Archetype Original does not attempt to identify individual respondents.</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div>
                  <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#1A1A1A] mb-4 sm:mb-6">
                    How We Use Information
                  </h2>
                  <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] mb-3">
                    We use collected information to:
                  </p>
                  <ul className="list-disc space-y-2 ml-6 text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                    <li>Provide and operate our services</li>
                    <li>Deliver ALI surveys and reports</li>
                    <li>Process payments via Stripe</li>
                    <li>Communicate with account holders</li>
                    <li>Improve platform performance and insights</li>
                    <li>Conduct aggregate research and benchmarking (non-identifiable)</li>
                  </ul>
                  <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] mt-4">
                    We do not sell personal data.
                  </p>
                </div>

                <div>
                  <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#1A1A1A] mb-4 sm:mb-6">
                    Payments
                  </h2>
                  <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                    Payments are processed securely by Stripe. We do not store full payment card details on our servers. Stripe's use of your data is governed by their own Privacy Policy.
                  </p>
                </div>

                <div>
                  <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#1A1A1A] mb-4 sm:mb-6">
                    Data Retention & Deletion
                  </h2>
                  <ul className="list-disc space-y-2 ml-6 text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                    <li>Survey data is retained in aggregate form to support longitudinal analysis.</li>
                    <li>Individual survey submissions may be deleted only under defined system rules (see Terms).</li>
                    <li>Certain records may be tombstoned (logically deleted but preserved for audit integrity).</li>
                  </ul>
                </div>

                <div>
                  <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#1A1A1A] mb-4 sm:mb-6">
                    Super Admin Access
                  </h2>
                  <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] mb-3">
                    Authorized Archetype Original Super Admins may access company-level aggregate data only for:
                  </p>
                  <ul className="list-disc space-y-2 ml-6 text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                    <li>System health</li>
                    <li>Research and benchmarking</li>
                    <li>Customer support</li>
                    <li>Product improvement</li>
                  </ul>
                  <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] mt-3">
                    Super Admins cannot access individual survey responses.
                  </p>
                </div>

                <div>
                  <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#1A1A1A] mb-4 sm:mb-6">
                    Cookies & Analytics
                  </h2>
                  <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                    We use cookies and third-party analytics (e.g., Google Analytics). You may control cookies through your browser settings.
                  </p>
                </div>

                <div>
                  <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#1A1A1A] mb-4 sm:mb-6">
                    Your Rights
                  </h2>
                  <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                    Depending on your jurisdiction, you may request access to or deletion of your personal account data. Aggregate and anonymized data may not be deletable where it would compromise system integrity.
                  </p>
                </div>

                <div>
                  <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#1A1A1A] mb-4 sm:mb-6">
                    Changes
                  </h2>
                  <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                    We may update this policy periodically. Updates will be posted with a revised date.
                  </p>
                </div>

                <div>
                  <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#1A1A1A] mb-4 sm:mb-6">
                    Contact Us
                  </h2>
                  <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                    If you have questions about this Privacy Policy, contact us at:
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

