/**
 * Pillar Card Component
 * 
 * Purpose: Reusable card for "What I'm Building" pillars
 * 
 * Props:
 * - title: Card title
 * - description: Card description
 * - primaryCtaLabel, primaryCtaHref: Primary CTA
 * - optionalSecondaryLinkLabel, optionalSecondaryLinkHref: Optional secondary link
 * - optionalIcon: Optional icon/illustration
 */
import React from 'react';

export default function PillarCard({
  title,
  description,
  primaryCtaLabel,
  primaryCtaHref,
  optionalSecondaryLinkLabel = null,
  optionalSecondaryLinkHref = null,
  optionalIcon = null
}) {
  return (
    <div className="bg-warm-offWhiteAlt border border-warm-border rounded-xl p-8 hover:shadow-lg transition-shadow">
      {optionalIcon && (
        <div className="mb-6">
          {optionalIcon}
        </div>
      )}
      <h3 className="h3 mb-4">{title}</h3>
      <p className="p mb-6">{description}</p>
      <div className="flex flex-col gap-3">
        <a
          href={primaryCtaHref}
          className="btn-cta text-center"
          aria-label={primaryCtaLabel}
        >
          {primaryCtaLabel}
        </a>
        {optionalSecondaryLinkLabel && optionalSecondaryLinkHref && (
          <a
            href={optionalSecondaryLinkHref}
            className="text-terracotta hover:text-terracotta-dark text-sm font-medium text-center"
            aria-label={optionalSecondaryLinkLabel}
          >
            {optionalSecondaryLinkLabel} →
          </a>
        )}
      </div>
    </div>
  );
}

