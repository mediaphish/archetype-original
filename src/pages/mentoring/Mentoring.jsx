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
      <div className="min-h-screen bg-white">
        {/* Hero Section */}
        <section className="bg-white py-24 sm:py-32 md:py-40 lg:py-48">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-5xl mx-auto text-center space-y-8">
              <h1 className="font-serif text-7xl sm:text-8xl md:text-9xl font-bold leading-[0.9] tracking-tight text-[#1A1A1A]">
                Mentoring
              </h1>
              <p className="text-xl sm:text-2xl md:text-3xl leading-relaxed text-[#1A1A1A]/70 font-light">
                Heading placeholder text here.
              </p>
            </div>
          </div>
        </section>

        {/* Content Section */}
        <section className="bg-[#FAFAF9] py-16 sm:py-24 md:py-32">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">

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
        </section>
      </div>
    </>
  );
}

