/**
 * Privacy Policy Page
 */
import React from 'react';
import SEO from '../components/SEO';

// Update this date whenever the Privacy Policy is modified
const LAST_UPDATED = 'December 18, 2024';

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
                  Archetype Original ("we," "us," or "our") respects your privacy and is committed to protecting it through this Privacy Policy. This policy explains how we collect, use, and safeguard information when you visit archetypeoriginal.com.
                </p>

                <div>
                  <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#1A1A1A] mb-4 sm:mb-6">
                    Information We Collect
                  </h2>
                  <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] mb-4">
                    We may collect the following types of information:
                  </p>

                  <div className="space-y-6">
                    <div>
                      <h3 className="font-bold text-xl sm:text-2xl text-[#1A1A1A] mb-3">
                        1. Personal Information You Provide
                      </h3>
                      <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] mb-3">
                        You may voluntarily provide personal information such as:
                      </p>
                      <ul className="list-disc space-y-2 ml-6 text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                        <li>Name</li>
                        <li>Email address</li>
                        <li>Any information you submit through forms, subscriptions, or direct contact</li>
                      </ul>
                      <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] mt-3">
                        We collect this information only when you choose to provide it.
                      </p>
                    </div>

                    <div>
                      <h3 className="font-bold text-xl sm:text-2xl text-[#1A1A1A] mb-3">
                        2. Automatically Collected Information
                      </h3>
                      <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] mb-3">
                        When you visit the site, we may automatically collect:
                      </p>
                      <ul className="list-disc space-y-2 ml-6 text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                        <li>IP address</li>
                        <li>Browser type</li>
                        <li>Device information</li>
                        <li>Pages visited and time spent on the site</li>
                      </ul>
                      <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] mt-3">
                        This data is collected through standard analytics tools and cookies.
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#1A1A1A] mb-4 sm:mb-6">
                    How We Use Your Information
                  </h2>
                  <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] mb-3">
                    We use collected information to:
                  </p>
                  <ul className="list-disc space-y-2 ml-6 text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                    <li>Provide and maintain the website</li>
                    <li>Send newsletters or updates if you subscribe</li>
                    <li>Respond to inquiries</li>
                    <li>Improve content, tools, and user experience</li>
                    <li>Monitor site performance and usage trends</li>
                  </ul>
                  <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] mt-4">
                    We do not sell, rent, or trade your personal information.
                  </p>
                </div>

                <div>
                  <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#1A1A1A] mb-4 sm:mb-6">
                    Cookies and Analytics
                  </h2>
                  <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                    We may use cookies and third-party analytics services (such as Google Analytics) to understand how visitors use the site. You can control cookies through your browser settings.
                  </p>
                </div>

                <div>
                  <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#1A1A1A] mb-4 sm:mb-6">
                    Email Communications
                  </h2>
                  <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                    If you subscribe to our email list, you may receive updates, insights, or resources related to leadership and Archetype Original. You may unsubscribe at any time using the link provided in our emails.
                  </p>
                </div>

                <div>
                  <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#1A1A1A] mb-4 sm:mb-6">
                    Data Security
                  </h2>
                  <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                    We take reasonable measures to protect your information. However, no method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.
                  </p>
                </div>

                <div>
                  <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#1A1A1A] mb-4 sm:mb-6">
                    Third-Party Links
                  </h2>
                  <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                    This website may contain links to third-party websites. We are not responsible for the privacy practices or content of those sites.
                  </p>
                </div>

                <div>
                  <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#1A1A1A] mb-4 sm:mb-6">
                    Your Rights
                  </h2>
                  <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                    Depending on your location, you may have rights regarding your personal information, including the right to access or request deletion of your data. You may contact us to make such requests.
                  </p>
                </div>

                <div>
                  <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#1A1A1A] mb-4 sm:mb-6">
                    Changes to This Policy
                  </h2>
                  <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                    We may update this Privacy Policy from time to time. Updates will be posted on this page with a revised "Last updated" date.
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

