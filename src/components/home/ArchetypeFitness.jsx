/**
 * Archetype Fitness Section
 * 
 * v0 Design: Two-column layout with gradient accent
 */
import React from 'react';

export default function ArchetypeFitness({
  heading = "Archetype Fitness",
  paragraph = "Body text here",
  imageSlot = null,
  buttonLabel = "Learn More",
  buttonHref = "#"
}) {
  return (
    <section className="py-20 md:py-32 bg-gradient-to-br from-orange-50 to-cream-100">
      <div className="container max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          {/* Left: Text Content */}
          <div className="space-y-6">
            <h2 className="text-4xl font-bold text-charcoal">
              {heading}
            </h2>
            <p className="text-lg text-warm-grey leading-relaxed">
              {paragraph}
            </p>
            <a
              href={buttonHref}
              className="btn-primary inline-block mt-4"
              aria-label={buttonLabel}
            >
              {buttonLabel}
            </a>
          </div>

          {/* Right: Image */}
          <div>
            {imageSlot || (
              <div className="w-full aspect-square bg-cream-100 rounded-2xl shadow-lg flex items-center justify-center">
                <span className="text-warm-grey">Gym/Culture Image Placeholder</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
