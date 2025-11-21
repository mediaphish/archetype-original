/**
 * Ethics & Confidentiality Page
 * Editorial Minimal Design - Flat, no gradients/shadows
 */
import React from 'react';
import SEO from '../../components/SEO';

export default function Ethics() {
  return (
    <>
      <SEO pageKey="ethics" />
      <div className="min-h-screen bg-[#FAFAF9] py-16 sm:py-24 md:py-32 lg:py-40">
        <div className="container mx-auto px-4 sm:px-6 md:px-12">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#1A1A1A] mb-8 sm:mb-10 md:mb-12 font-serif tracking-tight text-balance">
              Ethics & Confidentiality
            </h1>
            
            <div className="space-y-6 sm:space-y-8 text-base sm:text-lg leading-relaxed text-[#6B6B6B] mb-8 sm:mb-10 text-pretty">
              <p>
                How we handle your data, protect your privacy, and maintain the trust that makes Culture Science possible.
              </p>
            </div>

            <section className="mb-12 sm:mb-16">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#1A1A1A] mb-6 sm:mb-8 font-serif tracking-tight">
                Complete Anonymity
              </h2>
              <p className="text-base sm:text-lg leading-relaxed text-[#6B6B6B] text-pretty">
                Every assessment is completely anonymous. We don't collect names, email addresses, or any identifying information from team members completing surveys. You won't see individual responses, and neither will we.
              </p>
            </section>

            <section className="mb-12 sm:mb-16">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#1A1A1A] mb-6 sm:mb-8 font-serif tracking-tight">
                Aggregated Data Only
              </h2>
              <p className="text-base sm:text-lg leading-relaxed text-[#6B6B6B] text-pretty">
                All data is aggregated and anonymized. Individual responses are never shared. Company-specific data is only shared with permission, and only in aggregate form.
              </p>
            </section>

            <section className="mb-12 sm:mb-16">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#1A1A1A] mb-6 sm:mb-8 font-serif tracking-tight">
                No Selling, No Sharing
              </h2>
              <p className="text-base sm:text-lg leading-relaxed text-[#6B6B6B] text-pretty">
                We don't sell your data. We don't share it with third parties. We don't use it for marketing or solicitation. Your team's honest feedback is the cornerstone of meaningful leadership growth, and we're committed to protecting that honesty.
              </p>
            </section>

            <section className="mb-12 sm:mb-16">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#1A1A1A] mb-6 sm:mb-8 font-serif tracking-tight">
                Secure Storage
              </h2>
              <p className="text-base sm:text-lg leading-relaxed text-[#6B6B6B] text-pretty">
                All data is stored securely using industry-standard encryption. Access is limited to authorized personnel only, and all access is logged and monitored.
              </p>
            </section>

            <section className="mb-12 sm:mb-16">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#1A1A1A] mb-6 sm:mb-8 font-serif tracking-tight">
                Built on Trust
              </h2>
              <p className="text-base sm:text-lg leading-relaxed text-[#6B6B6B] text-pretty">
                Culture Science exists because leaders and teams trust us with their honest feedback. That trust is non-negotiable. We're committed to maintaining the highest standards of privacy, security, and ethical data handling.
              </p>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
