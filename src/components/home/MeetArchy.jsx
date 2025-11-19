/**
 * Meet Archy Section
 * 
 * Purpose: Introduce Archy with 2-column layout
 * Content: Placeholder text - Bart will fill in real content
 * 
 * NOTE: ChatApp/Archy component should be integrated here (inside this section or behind CTA/modal)
 * 
 * Props:
 * - archyIllustration: Image component or div for Archy
 * - heading: Section heading
 * - bodyTextPrimary: Main body text
 * - bodyTextSecondary: Additional body text
 * - ctaLabel, ctaHref: CTA button to /archy or /archy/ask
 * - chatApp: Optional ChatApp component to embed
 */
import React from 'react';

export default function MeetArchy({
  archyIllustration = null,
  heading = "Meet Archy",
  bodyTextPrimary = "Body text here",
  bodyTextSecondary = "Additional body text here",
  ctaLabel = "Learn More About Archy",
  ctaHref = "/archy",
  chatApp = null
}) {
  return (
    <section className="section bg-warm-offWhite">
      <div className="container">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          {/* Left: Archy Illustration */}
          <div>
            {archyIllustration || (
              <div className="w-full aspect-square bg-warm-border rounded-lg flex items-center justify-center">
                <span className="text-warm-gray">Archy Illustration Placeholder</span>
              </div>
            )}
          </div>

          {/* Right: Text Content */}
          <div>
            <h2 className="h2 mb-6">{heading}</h2>
            <p className="p mb-6">{bodyTextPrimary}</p>
            {bodyTextSecondary && (
              <p className="p mb-8">{bodyTextSecondary}</p>
            )}
            <a
              href={ctaHref}
              className="btn-cta inline-block mb-6"
              aria-label={ctaLabel}
            >
              {ctaLabel}
            </a>
            
            {/* ChatApp integration - embed here or behind modal */}
            {chatApp && (
              <div className="mt-8">
                {chatApp}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

