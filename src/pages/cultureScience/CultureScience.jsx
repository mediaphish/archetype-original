/**
 * Culture Science Index Page
 * 
 * Purpose: Main Culture Science landing page
 * Content: Placeholder text - Bart will fill in real content
 */
import React from 'react';
import SEO from '../../components/SEO';

export default function CultureScience() {
  return (
    <>
      <SEO pageKey="culture-science" />
      <div className="min-h-screen bg-warm-offWhite py-12 pt-28">
        <div className="container">
          {/* Hero Section */}
          <section className="mb-16 text-center">
            <h1 className="h1 mb-6">Culture Science</h1>
            <p className="p text-lg max-w-3xl mx-auto">
              Heading placeholder text here.
            </p>
          </section>

          {/* Overview Section */}
          <section className="mb-16">
            <h2 className="h2 mb-6">Overview</h2>
            <p className="p mb-6">
              Overview placeholder text here.
            </p>
          </section>

          {/* ALI Highlight Card */}
          <section className="mb-16">
            <div className="bg-warm-offWhiteAlt border-2 border-terracotta rounded-xl p-8">
              <h2 className="h2 mb-4">ALI Pilot Program</h2>
              <p className="p mb-6">
                ALI highlight card placeholder text here.
              </p>
              <a
                href="/culture-science/ali"
                className="btn-cta inline-block"
                aria-label="Learn more about ALI"
              >
                Learn More About ALI
              </a>
            </div>
          </section>

          {/* Cards Grid */}
          <section className="mb-16">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Diagnostics & Metrics */}
              <div className="bg-warm-offWhiteAlt border border-warm-border rounded-xl p-8">
                <h3 className="h3 mb-4">Diagnostics & Metrics</h3>
                <p className="p mb-6">
                  Diagnostics placeholder text here.
                </p>
                <a
                  href="/culture-science"
                  className="text-terracotta hover:text-terracotta-dark font-medium"
                >
                  Learn More →
                </a>
              </div>

              {/* Industry Reports */}
              <div className="bg-warm-offWhiteAlt border border-warm-border rounded-xl p-8">
                <h3 className="h3 mb-4">Industry Reports</h3>
                <p className="p mb-6">
                  Industry reports placeholder text here.
                </p>
                <a
                  href="/culture-science/industry-reports"
                  className="text-terracotta hover:text-terracotta-dark font-medium"
                >
                  View Reports →
                </a>
              </div>

              {/* Research */}
              <div className="bg-warm-offWhiteAlt border border-warm-border rounded-xl p-8">
                <h3 className="h3 mb-4">Research</h3>
                <p className="p mb-6">
                  Research placeholder text here.
                </p>
                <a
                  href="/culture-science/research"
                  className="text-terracotta hover:text-terracotta-dark font-medium"
                >
                  View Research →
                </a>
              </div>

              {/* Anti-Projects */}
              <div className="bg-warm-offWhiteAlt border border-warm-border rounded-xl p-8">
                <h3 className="h3 mb-4">Anti-Projects</h3>
                <p className="p mb-6">
                  Anti-projects placeholder text here.
                </p>
                <a
                  href="/culture-science/anti-projects"
                  className="text-terracotta hover:text-terracotta-dark font-medium"
                >
                  Explore Anti-Projects →
                </a>
              </div>

              {/* Ethics & Confidentiality */}
              <div className="bg-warm-offWhiteAlt border border-warm-border rounded-xl p-8">
                <h3 className="h3 mb-4">Ethics & Confidentiality</h3>
                <p className="p mb-6">
                  Ethics placeholder text here.
                </p>
                <a
                  href="/culture-science/ethics"
                  className="text-terracotta hover:text-terracotta-dark font-medium"
                >
                  Learn More →
                </a>
              </div>
            </div>
          </section>

          {/* Optional Archy Researcher Mode Illustration Slot */}
          <section className="text-center">
            <div className="w-full max-w-md mx-auto aspect-square bg-warm-border rounded-lg flex items-center justify-center">
              <span className="text-warm-gray">Archy Researcher Mode Illustration Placeholder</span>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

