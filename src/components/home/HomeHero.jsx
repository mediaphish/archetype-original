/**
 * Homepage Hero Section (HomeHero)
 * 
 * v0 Design: Two-column layout with gradient background, Archy hero image
 */
import React from 'react';

export default function HomeHero({
  heading = "Leadership That Actually Lasts",
  subheading = "Human-first servant leadership for small and mid-sized businesses. Real culture change, not corporate theater.",
  primaryCtaLabel = "Work With Me",
  primaryCtaHref = "#",
  secondaryCtaLabel = "Meet Archy",
  secondaryCtaHref = "/archy",
  leftImage = null,
  optionalRightIllustration = null
}) {
  return (
    <section className="py-20 md:py-32 bg-gradient-to-br from-orange-50 to-cream-100">
      <div className="container max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 items-center">
          {/* Left: Text Content (60%) */}
          <div className="lg:col-span-3 space-y-6">
            {/* Badge */}
            <div className="inline-block bg-cream-100 rounded-full px-4 py-2 text-sm font-medium text-charcoal">
              32+ Years Building Leaders
            </div>
            
            {/* Main Headline */}
            <h1 className="text-5xl md:text-6xl font-bold text-charcoal leading-tight">
              {heading}
            </h1>
            
            {/* Subheading */}
            <p className="text-lg text-warm-grey leading-relaxed max-w-2xl">
              {subheading}
            </p>
            
            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <a
                href={primaryCtaHref}
                className="btn-primary text-center"
                aria-label={primaryCtaLabel}
              >
                {primaryCtaLabel}
              </a>
              <a
                href={secondaryCtaHref}
                className="btn-secondary text-center"
                aria-label={secondaryCtaLabel}
              >
                {secondaryCtaLabel} →
              </a>
            </div>
          </div>

          {/* Right: Archy Hero Image (40%) */}
          <div className="lg:col-span-2 order-first lg:order-last">
            {optionalRightIllustration || (
              <div className="relative">
                <img
                  src="/images/archy-hero.png"
                  alt="Archy - Your AI Leadership Guide"
                  className="w-full h-auto rounded-2xl shadow-lg"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
                <div className="w-full aspect-square bg-cream-100 rounded-2xl shadow-lg flex items-center justify-center hidden">
                  <span className="text-warm-grey">Archy Hero Image</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
