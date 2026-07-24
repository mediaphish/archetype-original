import React from "react";
import SEO from "../components/SEO";
import { OptimizedImage } from "../components/OptimizedImage";

export default function ALIThanks() {
  return (
    <>
      <SEO pageKey="ali-thanks" />
      <div className="min-h-screen py-16 md:py-24" style={{ backgroundColor: "#F8F7F3" }}>
        <div className="container max-w-2xl mx-auto px-6">
          <div className="bg-white rounded-xl shadow-lg p-8 md:p-12 border-2 text-center" style={{ borderColor: "#E8E2D0" }}>
            {/* Archy Image */}
            <div className="flex justify-center mb-8">
              <OptimizedImage
                src="/images/archy-hero.png"
                alt="Archy"
                className="w-32 h-32 md:w-40 md:h-40 object-contain"
                width={160}
                height={160}
                loading="eager"
                style={{ maxHeight: "150px" }}
              />
            </div>

            {/* Headline */}
            <h1 className="text-4xl md:text-5xl font-bold mb-8" style={{ color: "#1D1F21" }}>
              You're on the List!
            </h1>

            {/* Body Content */}
            <div className="text-left space-y-6 text-lg leading-relaxed mb-8" style={{ color: "#1D1F21" }}>
              <p>
                Thank you for your interest in the Archetype Leadership Index pilot program. I've received your application and will personally review it within the next 3 business days.
              </p>

              <div>
                <h2 className="text-2xl font-semibold mb-4" style={{ color: "#2B3A67" }}>
                  Here's What Happens Next:
                </h2>
                <ol className="space-y-4 list-decimal list-inside">
                  <li>
                    <strong>Application Review:</strong> I'll review your information to ensure the pilot is a good fit for your organization.
                  </li>
                  <li>
                    <strong>Survey Distribution:</strong> If accepted, you'll receive an email with survey links to distribute to your team. These can be shared via email, Slack, or however you typically communicate with your team.
                  </li>
                  <li>
                    <strong>Anonymous Assessment:</strong> Your team members will complete a brief 10-question assessment about leadership in your organization. All responses are completely anonymous—I'll never see individual answers, and neither will you.
                  </li>
                  <li>
                    <strong>Insights & Learning:</strong> Once the pilot is complete, I'll share aggregate insights with all participants. You'll learn how your organization compares to others and gain valuable perspective on your leadership culture.
                  </li>
                </ol>
              </div>

              <div className="bg-white rounded-lg p-6 border-2" style={{ borderColor: "#2B3A67", backgroundColor: "#F8F7F3" }}>
                <h3 className="text-xl font-semibold mb-3" style={{ color: "#2B3A67" }}>
                  A Note on Privacy:
                </h3>
                <p>
                  I take anonymity seriously. If fewer than 5 team members respond, I won't share any results to protect individual privacy. Your team's honest feedback is the foundation of meaningful leadership growth.
                </p>
              </div>

              <p>
                Questions? Reach out anytime at <a href="mailto:bart@archetypeoriginal.com" className="underline" style={{ color: "#6A1B1A" }}>bart@archetypeoriginal.com</a>. I'm here to help you get the most out of this experience.
              </p>

              <p className="text-right font-medium" style={{ color: "#1D1F21" }}>
                — Bart Paden
              </p>
            </div>

            {/* Return Button */}
            <a
              href="/"
              className="inline-block px-8 py-4 rounded-lg font-semibold text-white transition-all duration-300"
              style={{ backgroundColor: "#6A1B1A" }}
              onMouseEnter={(e) => e.target.style.backgroundColor = "#7A2B2A"}
              onMouseLeave={(e) => e.target.style.backgroundColor = "#6A1B1A"}
            >
              Return to Homepage
            </a>
          </div>
        </div>
      </div>
    </>
  );
}

