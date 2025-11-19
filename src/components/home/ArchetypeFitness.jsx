/**
 * Archetype Fitness Section
 * 
 * Purpose: Showcase Archetype Fitness story
 * Content: Placeholder text - Bart will fill in real content
 * 
 * Props:
 * - heading: Section heading
 * - paragraph: Body text
 * - imageSlot: Image component for gym/culture
 * - buttonLabel: CTA button label
 * - buttonHref: CTA button link (placeholder for now)
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
    <section className="section bg-warm-offWhite">
      <div className="container">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          {/* Left: Text Content */}
          <div>
            <h2 className="h2 mb-6">{heading}</h2>
            <p className="p mb-8">{paragraph}</p>
            <a
              href={buttonHref}
              className="btn-cta inline-block"
              aria-label={buttonLabel}
            >
              {buttonLabel}
            </a>
          </div>

          {/* Right: Image */}
          <div>
            {imageSlot || (
              <div className="w-full aspect-square bg-warm-border rounded-lg flex items-center justify-center">
                <span className="text-warm-gray">Gym/Culture Image Placeholder</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

