/**
 * Meet Archy Section
 * 
 * v0 Design: Two-column with chat preview box, Archy avatar
 */
import React from 'react';

export default function MeetArchy({
  archyIllustration = null,
  heading = "Meet Archy",
  bodyTextPrimary = "Archy is your personal guide to servant leadership. Ask questions, explore frameworks, and get practical advice grounded in 32+ years of real-world experience.",
  bodyTextSecondary = "Think of Archy as your wise mentor who's always available—no scheduling, no small talk, just honest guidance when you need it.",
  ctaLabel = "Start a Conversation",
  ctaHref = "/archy/ask",
  chatApp = null
}) {
  return (
    <section className="py-20 md:py-32 bg-light-grey">
      <div className="container max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          {/* Left: Text Content */}
          <div className="space-y-6">
            {/* Badge */}
            <div className="inline-block bg-cream-100 rounded-full px-4 py-2 text-sm font-medium text-charcoal uppercase tracking-wide">
              Your AI Guide
            </div>
            
            {/* Heading */}
            <h2 className="text-4xl font-bold text-charcoal">
              {heading}
            </h2>
            
            {/* Body Text */}
            <p className="text-lg text-warm-grey leading-relaxed">
              {bodyTextPrimary}
            </p>
            {bodyTextSecondary && (
              <p className="text-lg text-warm-grey leading-relaxed">
                {bodyTextSecondary}
              </p>
            )}
            
            {/* CTA */}
            <a
              href={ctaHref}
              className="btn-primary inline-block mt-4"
              aria-label={ctaLabel}
            >
              {ctaLabel}
            </a>
          </div>

          {/* Right: Chat Preview Box */}
          <div className="relative">
            <div className="bg-white rounded-2xl shadow-lg p-6 space-y-4">
              {/* Archy Avatar & Name */}
              <div className="flex items-center gap-3 mb-4">
                <img
                  src="/images/archy-avatar.png"
                  alt="Archy"
                  className="w-16 h-16 rounded-full"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
                <span className="text-lg font-semibold text-charcoal">Archy</span>
              </div>
              
              {/* Chat Quote with Border */}
              <div className="border-l-4 border-archy-orange pl-4 py-2">
                <p className="text-charcoal leading-relaxed italic">
                  "Leadership isn't about control—it's about creating space for others to grow. What's one thing holding your team back right now?"
                </p>
              </div>
              
              {/* Separator */}
              <div className="border-t border-gray-200 my-4"></div>
              
              {/* Input Field */}
              <div className="bg-light-grey rounded-lg px-4 py-3">
                <input
                  type="text"
                  placeholder="Ask Archy anything..."
                  className="w-full bg-transparent text-warm-grey placeholder-warm-grey focus:outline-none"
                  readOnly
                />
              </div>
            </div>
            
            {/* Optional ChatApp Integration */}
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
