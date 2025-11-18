import React from "react";

export default function Hero() {
  const handleStartWithArchy = (e) => {
    e.preventDefault();
    // Scroll to chat or open chat interface
    const chatElement = document.querySelector('.chat-container') || document.querySelector('[data-chat-app]');
    if (chatElement) {
      chatElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Focus chat input if it exists
      setTimeout(() => {
        const chatInput = document.querySelector('input[type="text"], textarea');
        if (chatInput) chatInput.focus();
      }, 500);
    }
  };

  return (
    <section className="py-12 md:py-20 bg-warm-offWhite">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center gap-12 md:gap-12" style={{ gap: '3rem' }}>
          {/* Archy Image - Left side on desktop, top on mobile */}
          <div className="w-full md:w-2/5 flex justify-center md:justify-start">
            <img
              src="/images/archy-hero.png"
              alt="Archy"
              className="w-full max-w-sm md:max-w-md object-contain"
              onError={(e) => {
                // Fallback if image doesn't exist yet
                e.target.style.display = 'none';
              }}
            />
          </div>

          {/* Hero Text - Right side on desktop, below on mobile */}
          <div className="w-full md:w-3/5 text-center md:text-left">
            <h1 className="h1 mb-6">
              Building Leaders Who Build Others
            </h1>
            <p className="text-xl md:text-2xl text-warm-gray mb-8 leading-relaxed">
              Leadership that lasts doesn't happen by accident. It's built intentionally, one decision at a time.
            </p>

            {/* Dual CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 mb-4 justify-center md:justify-start">
              <button
                onClick={handleStartWithArchy}
                className="btn-cta"
              >
                Start with Archy
              </button>
              <a
                href="/what-i-do"
                className="btn-cta bg-transparent border-2 border-terracotta text-terracotta hover:bg-terracotta hover:text-white"
              >
                Explore My Work
              </a>
            </div>

            {/* 32+ years line */}
            <p className="text-sm text-warm-gray mt-4">
              32+ years building leaders who build others
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
