/**
 * Pillar Card Component
 * 
 * v0 Design: Modern card with shadow, hover effects, orange icons
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
    <div className="card-modern">
      {/* Icon */}
      {optionalIcon && (
        <div className="mb-6">
          <div className="w-12 h-12 text-archy-orange">
            {optionalIcon}
          </div>
        </div>
      )}
      
      {/* Title */}
      <h3 className="text-2xl font-bold text-charcoal mb-4">
        {title}
      </h3>
      
      {/* Description */}
      <p className="text-lg text-warm-grey leading-relaxed mb-6">
        {description}
      </p>
      
      {/* CTAs */}
      <div className="flex flex-col gap-3">
        <a
          href={primaryCtaHref}
          className="btn-primary text-center"
          aria-label={primaryCtaLabel}
        >
          {primaryCtaLabel}
        </a>
        {optionalSecondaryLinkLabel && optionalSecondaryLinkHref && (
          <a
            href={optionalSecondaryLinkHref}
            className="text-archy-orange hover:text-archy-orange-dark text-sm font-medium text-center transition-colors"
            aria-label={optionalSecondaryLinkLabel}
          >
            {optionalSecondaryLinkLabel} →
          </a>
        )}
      </div>
    </div>
  );
}
