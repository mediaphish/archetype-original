import React from "react";
import SEO from "../components/SEO";

export default function ALI() {
  return (
    <>
      <SEO pageKey="ali" />
      <div className="min-h-screen" style={{ backgroundColor: "#F8F7F3" }}>
        {/* Hero Section */}
        <section className="py-20 md:py-32" style={{ backgroundColor: "#E8E2D0" }}>
          <div className="container max-w-4xl mx-auto px-6">
            <div className="space-y-6">
              <ContentGoesHere placeholder="~75 words of hero text" />
              <a
                href="/culture-science/ali/apply"
                className="inline-block px-8 py-4 rounded-lg font-semibold text-white transition-all duration-300"
                style={{ backgroundColor: "#6A1B1A" }}
                onMouseEnter={(e) => e.target.style.backgroundColor = "#7A2B2A"}
                onMouseLeave={(e) => e.target.style.backgroundColor = "#6A1B1A"}
              >
                Join the ALI Pilot
              </a>
            </div>
          </div>
        </section>

        {/* What Is ALI? */}
        <section className="py-20 md:py-32">
          <div className="container max-w-7xl mx-auto px-6">
            <div className="grid md:grid-cols-2 gap-12 items-start">
              <div className="space-y-8">
                <h2 className="text-4xl md:text-5xl font-bold" style={{ color: "#1D1F21" }}>
                  What Is ALI?
                </h2>
                <div className="space-y-6 text-lg leading-relaxed" style={{ color: "#1D1F21" }}>
                  <ContentGoesHere placeholder="~1,000 words total" />
                  
                  <div className="mt-12 space-y-8">
                    <div>
                      <h3 className="text-2xl font-semibold mb-4" style={{ color: "#2B3A67" }}>
                        Why ALI Exists
                      </h3>
                      <ContentGoesHere placeholder="Subsection content" />
                    </div>
                    
                    <div>
                      <h3 className="text-2xl font-semibold mb-4" style={{ color: "#2B3A67" }}>
                        Behavior + Intent Model
                      </h3>
                      <ContentGoesHere placeholder="Subsection content" />
                    </div>
                    
                    <div>
                      <h3 className="text-2xl font-semibold mb-4" style={{ color: "#2B3A67" }}>
                        Why Servant Leadership Is Measurable
                      </h3>
                      <ContentGoesHere placeholder="Subsection content" />
                    </div>
                    
                    <div>
                      <h3 className="text-2xl font-semibold mb-4" style={{ color: "#2B3A67" }}>
                        The Problem It Solves for SMBs
                      </h3>
                      <ContentGoesHere placeholder="Subsection content" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex justify-center items-start">
                <div className="w-full max-w-md h-96 rounded-lg border-2 border-dashed flex items-center justify-center" style={{ borderColor: "#2B3A67", backgroundColor: "#F8F7F3" }}>
                  <p className="text-sm" style={{ color: "#78716C" }}>Supporting Graphic Placeholder</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How ALI Works */}
        <section className="py-20 md:py-32" style={{ backgroundColor: "#E8E2D0" }}>
          <div className="container max-w-6xl mx-auto px-6">
            <h2 className="text-4xl md:text-5xl font-bold mb-12 text-center" style={{ color: "#1D1F21" }}>
              How ALI Works
            </h2>
            
            <div className="grid md:grid-cols-2 gap-12 mb-12">
              <div className="space-y-6">
                <h3 className="text-2xl font-semibold" style={{ color: "#2B3A67" }}>
                  10-Question Model
                </h3>
                <ContentGoesHere placeholder="Explanation of 10-question model" />
              </div>
              
              <div className="space-y-6">
                <h3 className="text-2xl font-semibold" style={{ color: "#2B3A67" }}>
                  Quarterly Rhythm
                </h3>
                <ContentGoesHere placeholder="4 waves per year explanation" />
              </div>
            </div>
            
            <div className="mb-12">
              <h3 className="text-2xl font-semibold mb-4" style={{ color: "#2B3A67" }}>
                Anchor Questions for Longitudinal Tracking
              </h3>
              <ContentGoesHere placeholder="Anchor questions explanation" />
            </div>
            
            <div className="mb-12">
              <h3 className="text-2xl font-semibold mb-4" style={{ color: "#2B3A67" }}>
                Anonymous + Suppression Rule
              </h3>
              <div className="bg-white rounded-lg p-6 border-2" style={{ borderColor: "#2B3A67" }}>
                <ContentGoesHere placeholder="UI placeholder for anonymous + suppression rule" />
              </div>
            </div>
            
            <div className="flex justify-center">
              <div className="w-full max-w-2xl h-96 rounded-lg border-2 border-dashed flex items-center justify-center" style={{ borderColor: "#2B3A67", backgroundColor: "#F8F7F3" }}>
                <p className="text-sm" style={{ color: "#78716C" }}>Infographic Placeholder (600px)</p>
              </div>
            </div>
          </div>
        </section>

        {/* How ALI Helps Your Business */}
        <section className="py-20 md:py-32">
          <div className="container max-w-7xl mx-auto px-6">
            <h2 className="text-4xl md:text-5xl font-bold mb-16 text-center" style={{ color: "#1D1F21" }}>
              How ALI Helps Your Business
            </h2>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {['Clarity', 'Trust', 'Performance', 'Bench Strength', 'Culture'].map((benefit, idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-xl p-8 border-2 shadow-lg"
                  style={{ borderColor: "#E8E2D0" }}
                >
                  <div className="w-12 h-12 rounded-lg mb-4 flex items-center justify-center" style={{ backgroundColor: "#2B3A67" }}>
                    <span className="text-white text-2xl">📊</span>
                  </div>
                  <h3 className="text-xl font-semibold mb-3" style={{ color: "#1D1F21" }}>
                    {benefit}
                  </h3>
                  <ContentGoesHere placeholder={`${benefit} benefit paragraph`} />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pilot Program Details */}
        <section className="py-20 md:py-32" style={{ backgroundColor: "#E8E2D0" }}>
          <div className="container max-w-6xl mx-auto px-6">
            <h2 className="text-4xl md:text-5xl font-bold mb-12 text-center" style={{ color: "#1D1F21" }}>
              Pilot Program Details
            </h2>
            
            <div className="mb-12">
              <div className="w-full h-64 rounded-lg border-2 border-dashed flex items-center justify-center mb-8" style={{ borderColor: "#2B3A67", backgroundColor: "#F8F7F3" }}>
                <p className="text-sm" style={{ color: "#78716C" }}>Timeline Graphic Placeholder</p>
              </div>
            </div>
            
            <div className="grid md:grid-cols-2 gap-12 mb-12">
              <div>
                <h3 className="text-2xl font-semibold mb-6" style={{ color: "#2B3A67" }}>
                  Deliverables
                </h3>
                <ul className="space-y-3">
                  <ContentGoesHere placeholder="List of deliverables" />
                </ul>
              </div>
              
              <div>
                <h3 className="text-2xl font-semibold mb-6" style={{ color: "#2B3A67" }}>
                  Benefits
                </h3>
                <div className="grid gap-4">
                  <ContentGoesHere placeholder="Benefits grid" />
                </div>
              </div>
            </div>
            
            <div className="text-center">
              <a
                href="/culture-science/ali/apply"
                className="inline-block px-8 py-4 rounded-lg font-semibold text-white transition-all duration-300"
                style={{ backgroundColor: "#6A1B1A" }}
                onMouseEnter={(e) => e.target.style.backgroundColor = "#7A2B2A"}
                onMouseLeave={(e) => e.target.style.backgroundColor = "#6A1B1A"}
              >
                Join the ALI Pilot
              </a>
            </div>
          </div>
        </section>

        {/* Privacy & Data Protection */}
        <section className="py-20 md:py-32">
          <div className="container max-w-4xl mx-auto px-6">
            <h2 className="text-4xl md:text-5xl font-bold mb-12 text-center" style={{ color: "#1D1F21" }}>
              Your Privacy Matters
            </h2>
            
            <div className="space-y-6 text-lg leading-relaxed mb-8" style={{ color: "#1D1F21" }}>
              <p>
                I've built the Archetype Leadership Index on a foundation of trust and anonymity. Here's exactly how I protect your team's privacy:
              </p>
              
              <div>
                <h3 className="text-2xl font-semibold mb-4" style={{ color: "#2B3A67" }}>
                  Anonymous by Design
                </h3>
                <p>
                  Every assessment is completely anonymous. I don't collect names, email addresses, or any identifying information from team members completing the survey. You won't see individual responses, and neither will I.
                </p>
              </div>
              
              <div>
                <h3 className="text-2xl font-semibold mb-4" style={{ color: "#2B3A67" }}>
                  The &lt;5 Rule
                </h3>
                <p>
                  If fewer than 5 people from your organization complete the assessment, I won't share any results. This ensures that even in small teams, no one can reverse-engineer who said what.
                </p>
              </div>
              
              <div>
                <h3 className="text-2xl font-semibold mb-4" style={{ color: "#2B3A67" }}>
                  What I Collect
                </h3>
                <p>
                  <strong>From you (the administrator):</strong> Contact information and basic company details to manage the pilot program.
                </p>
                <p>
                  <strong>From your team:</strong> Anonymous responses to 10 leadership assessment questions.
                </p>
              </div>
              
              <div>
                <h3 className="text-2xl font-semibold mb-4" style={{ color: "#2B3A67" }}>
                  What I Do With the Data
                </h3>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Compile aggregate insights for pilot participants</li>
                  <li>Improve the assessment tool based on patterns and feedback</li>
                  <li>Contribute to broader research on servant leadership practices</li>
                  <li>Create educational content to help leaders grow</li>
                </ul>
              </div>
              
              <div>
                <h3 className="text-2xl font-semibold mb-4" style={{ color: "#2B3A67" }}>
                  What I Don't Do
                </h3>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Sell or share your data with third parties</li>
                  <li>Track individual team members</li>
                  <li>Use responses for marketing or solicitation</li>
                  <li>Share company-specific data publicly without permission</li>
                </ul>
              </div>
              
              <p>
                Your team's honest feedback is the cornerstone of meaningful leadership growth. I'm committed to protecting that honesty with rigorous privacy practices.
              </p>
              
              <p>
                Questions about privacy? Email me directly at <a href="mailto:bart@archetypeoriginal.com" className="underline" style={{ color: "#6A1B1A" }}>bart@archetypeoriginal.com</a>.
              </p>
            </div>
            
            <div className="bg-white rounded-xl p-8 border-2 mb-8" style={{ borderColor: "#6A1B1A" }}>
              <h3 className="text-xl font-semibold mb-4" style={{ color: "#6A1B1A" }}>
                No Raw Data / No Names
              </h3>
              <p>
                All data is aggregated and anonymized. Individual responses are never shared, and company-specific data is only shared with permission.
              </p>
            </div>
            
            <div className="bg-white rounded-xl p-6 border-2" style={{ borderColor: "#2B3A67" }}>
              <p className="text-sm font-medium mb-3" style={{ color: "#2B3A67" }}>
                Suppression Note
              </p>
              <p className="text-sm">
                  If fewer than 5 team members respond, I won't share any results to protect individual privacy. This ensures complete anonymity even in small teams.
                </p>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-20 md:py-32" style={{ backgroundColor: "#E8E2D0" }}>
          <div className="container max-w-4xl mx-auto px-6">
            <h2 className="text-4xl md:text-5xl font-bold mb-12 text-center" style={{ color: "#1D1F21" }}>
              Frequently Asked Questions
            </h2>
            
            <div className="space-y-4">
              {Array.from({ length: 10 }).map((_, idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-lg border-2 p-6"
                  style={{ borderColor: "#E8E2D0" }}
                >
                  <h3 className="text-lg font-semibold mb-2" style={{ color: "#1D1F21" }}>
                    Question {idx + 1}
                  </h3>
                  <ContentGoesHere placeholder="FAQ answer placeholder" />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-20 md:py-32">
          <div className="container max-w-3xl mx-auto px-6 text-center">
            <div className="space-y-8 mb-8">
              <ContentGoesHere placeholder="~150 words final CTA content" />
            </div>
            <a
              href="/ali/apply"
              className="inline-block px-8 py-4 rounded-lg font-semibold text-white transition-all duration-300"
              style={{ backgroundColor: "#6A1B1A" }}
              onMouseEnter={(e) => e.target.style.backgroundColor = "#7A2B2A"}
              onMouseLeave={(e) => e.target.style.backgroundColor = "#6A1B1A"}
            >
              Apply to Join the Pilot
            </a>
          </div>
        </section>
      </div>
    </>
  );
}

// Placeholder component for content blocks
function ContentGoesHere({ placeholder }) {
  return (
    <div className="p-4 border-2 border-dashed rounded-lg" style={{ borderColor: "#CBD5E1", backgroundColor: "#F8F7F3" }}>
      <p className="text-sm italic" style={{ color: "#94A3B8" }}>
        {placeholder}
      </p>
    </div>
  );
}

