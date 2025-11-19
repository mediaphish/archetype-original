/**
 * What I'm Building Section
 * 
 * v0 Design: Light grey background, white cards in grid
 */
import React from 'react';
import PillarCard from './PillarCard';

export default function WhatImBuilding({
  heading = "What I'm Building",
  introText = "Intro text here"
}) {
  const pillars = [
    {
      title: "Mentoring & Consulting",
      description: "Description placeholder for Mentoring & Consulting pillar.",
      primaryCtaLabel: "Learn More",
      primaryCtaHref: "/mentoring",
      optionalSecondaryLinkLabel: "View Services",
      optionalSecondaryLinkHref: "/mentoring"
    },
    {
      title: "Culture Science for Small Business",
      description: "Description placeholder for Culture Science pillar.",
      primaryCtaLabel: "Explore Culture Science",
      primaryCtaHref: "/culture-science",
      optionalSecondaryLinkLabel: "Learn About ALI",
      optionalSecondaryLinkHref: "/culture-science/ali"
    },
    {
      title: "Leadership Education (Journal + Playbooks)",
      description: "Description placeholder for Leadership Education pillar.",
      primaryCtaLabel: "Read Journal",
      primaryCtaHref: "/journal",
      optionalSecondaryLinkLabel: "View Playbooks",
      optionalSecondaryLinkHref: "/playbooks"
    }
  ];

  return (
    <section className="py-20 md:py-32 bg-light-grey">
      <div className="container max-w-7xl mx-auto px-4">
        <div className="text-center mb-12 md:mb-20">
          <h2 className="text-4xl font-bold text-charcoal mb-6">
            {heading}
          </h2>
          <p className="text-lg text-warm-grey leading-relaxed max-w-3xl mx-auto">
            {introText}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
          {pillars.map((pillar, index) => (
            <PillarCard
              key={index}
              title={pillar.title}
              description={pillar.description}
              primaryCtaLabel={pillar.primaryCtaLabel}
              primaryCtaHref={pillar.primaryCtaHref}
              optionalSecondaryLinkLabel={pillar.optionalSecondaryLinkLabel}
              optionalSecondaryLinkHref={pillar.optionalSecondaryLinkHref}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
