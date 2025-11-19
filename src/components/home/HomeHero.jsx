/**
 * Homepage Hero Section (HomeHero)
 * 
 * Purpose: Full-width "Bart + Mission" hero for homepage only
 * Content: Placeholder text - Bart will fill in real content
 * 
 * NOTE: This is separate from src/components/Hero.jsx which is the logo header
 * 
 * Props:
 * - heading: Main headline
 * - subheading: Supporting text
 * - primaryCtaLabel, primaryCtaHref: Main CTA button
 * - secondaryCtaLabel, secondaryCtaHref: Secondary CTA button
 * - leftImage: Bart image slot (component or img element)
 * - optionalRightIllustration: Archy cameo (optional)
 */
import React from 'react';

export default function HomeHero({
  heading = "Heading",
  subheading = "Body text here",
  primaryCtaLabel = "Primary CTA",
  primaryCtaHref = "#",
  secondaryCtaLabel = "Secondary CTA",
  secondaryCtaHref = "#",
  leftImage = null,
  optionalRightIllustration = null
}) {
  return (
    <section className="section bg-warm-offWhite">
      <div className="container">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left: Bart Image */}
          <div className="order-2 lg:order-1">
            {leftImage || (
              <div className="w-full aspect-square bg-warm-border rounded-lg flex items-center justify-center">
                <span className="text-warm-gray">Bart Image Placeholder</span>
              </div>
            )}
          </div>

          {/* Right: Text Content */}
          <div className="order-1 lg:order-2">
            <h1 className="h1 mb-6">{heading}</h1>
            <p className="p text-lg mb-8">{subheading}</p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <a
                href={primaryCtaHref}
                className="btn-cta text-center"
                aria-label={primaryCtaLabel}
              >
                {primaryCtaLabel}
              </a>
              <a
                href={secondaryCtaHref}
                className="btn text-center"
                aria-label={secondaryCtaLabel}
              >
                {secondaryCtaLabel}
              </a>
            </div>

            {/* Optional Archy Illustration */}
            {optionalRightIllustration && (
              <div className="mt-8">
                {optionalRightIllustration}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

