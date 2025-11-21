/**
 * Industry Reports Page
 * Editorial Minimal Design - Flat, no gradients/shadows
 */
import React from 'react';
import SEO from '../../components/SEO';

export default function IndustryReports() {
  // Placeholder report cards
  const reports = [
    { title: "Report 1", description: "Description placeholder" },
    { title: "Report 2", description: "Description placeholder" },
    { title: "Report 3", description: "Description placeholder" }
  ];

  return (
    <>
      <SEO pageKey="industry-reports" />
      <div className="min-h-screen bg-[#FAFAF9] py-16 sm:py-24 md:py-32 lg:py-40">
        <div className="container mx-auto px-4 sm:px-6 md:px-12">
          <div className="max-w-7xl mx-auto">
            <section className="mb-16 sm:mb-20 md:mb-24">
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#1A1A1A] mb-6 sm:mb-8 font-serif tracking-tight text-balance">
                Industry Reports
              </h1>
              <p className="text-base sm:text-lg leading-relaxed text-[#6B6B6B] text-pretty">
                Heading placeholder text here.
              </p>
            </section>

            <section>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-12">
                {reports.map((report, index) => (
                  <div
                    key={index}
                    className="bg-white border border-[#1A1A1A]/10 p-8 sm:p-10"
                  >
                    <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#1A1A1A] mb-4 sm:mb-6 font-serif tracking-tight">
                      {report.title}
                    </h2>
                    <p className="text-base sm:text-lg leading-relaxed text-[#6B6B6B] text-pretty">
                      {report.description}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
