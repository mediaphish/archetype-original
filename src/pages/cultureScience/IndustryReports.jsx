/**
 * Industry Reports Page
 * 
 * Purpose: Listing page for industry reports
 * Content: Placeholder text - Bart will fill in real content
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
      <div className="min-h-screen bg-warm-offWhite py-12 pt-28">
        <div className="container">
          <section className="mb-16">
            <h1 className="h1 mb-6">Industry Reports</h1>
            <p className="p text-lg mb-8">
              Heading placeholder text here.
            </p>
          </section>

          <section>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {reports.map((report, index) => (
                <div
                  key={index}
                  className="bg-warm-offWhiteAlt border border-warm-border rounded-xl p-8"
                >
                  <h2 className="h3 mb-4">{report.title}</h2>
                  <p className="p">{report.description}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

