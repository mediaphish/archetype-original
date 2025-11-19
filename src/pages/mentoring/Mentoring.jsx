/**
 * Mentoring Index Page
 * 
 * Purpose: Main mentoring page with service cards
 * Content: Placeholder text - Bart will fill in real content
 */
import React from 'react';
import SEO from '../../components/SEO';

export default function Mentoring() {
  const services = [
    {
      title: "1-on-1 Mentoring",
      description: "Description placeholder for 1-on-1 mentoring service.",
      href: "/mentoring/1-1"
    },
    {
      title: "Team Culture",
      description: "Description placeholder for team culture consulting.",
      href: "/mentoring/team-culture"
    },
    {
      title: "Workshops",
      description: "Description placeholder for workshops.",
      href: "/mentoring/workshops"
    },
    {
      title: "Speaking",
      description: "Description placeholder for speaking engagements.",
      href: "/mentoring/speaking"
    },
    {
      title: "Testimonials",
      description: "Description placeholder for testimonials.",
      href: "/mentoring/testimonials"
    }
  ];

  return (
    <>
      <SEO pageKey="mentoring" />
      <div className="min-h-screen bg-warm-offWhite py-12 pt-28">
        <div className="container">
          {/* Hero Section */}
          <section className="mb-16 text-center">
            <h1 className="h1 mb-6">Mentoring</h1>
            <p className="p text-lg max-w-3xl mx-auto">
              Heading placeholder text here.
            </p>
          </section>

          {/* Service Cards Grid */}
          <section>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {services.map((service, index) => (
                <div
                  key={index}
                  className="bg-warm-offWhiteAlt border border-warm-border rounded-xl p-8 hover:shadow-lg transition-shadow"
                >
                  <h2 className="h3 mb-4">{service.title}</h2>
                  <p className="p mb-6">{service.description}</p>
                  <a
                    href={service.href}
                    className="btn-cta inline-block"
                    aria-label={`Learn more about ${service.title}`}
                  >
                    Learn More
                  </a>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

