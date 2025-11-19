/**
 * What I'm Building Section
 * 
 * Purpose: Showcase 3 pillars of work
 * Content: Placeholder text - Bart will fill in real content
 * 
 * Props:
 * - heading: Section heading
 * - introText: Section intro text
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
      optionalSecondaryLinkHref: "/journal"
    }
  ];

  return (
    <section className="section bg-warm-offWhite">
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="h2 mb-6">{heading}</h2>
          <p className="p text-lg max-w-3xl mx-auto">{introText}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
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

