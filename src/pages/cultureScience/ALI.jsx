import React from "react";
import SEO from "../../components/SEO";

export default function ALI() {
  return (
    <>
      <SEO pageKey="ali" />
      <div className="min-h-screen bg-[#FAFAF9]">
        {/* Hero Section */}
        <section className="py-16 sm:py-24 md:py-32 lg:py-40 bg-white">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-4xl mx-auto">
              <div className="space-y-6 sm:space-y-8">
                <ContentGoesHere placeholder="~75 words of hero text" />
                <a
                  href="/culture-science/ali/apply"
                  className="inline-block bg-[#1A1A1A] text-white px-8 sm:px-10 py-4 sm:py-5 font-medium text-sm sm:text-base hover:bg-[#1A1A1A]/90 transition-colors"
                >
                  Join the ALI Pilot
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* What Is ALI? */}
        <section className="py-16 sm:py-24 md:py-32 lg:py-40 bg-[#FAFAF9]">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-7xl mx-auto">
              <div className="grid md:grid-cols-2 gap-12 items-start">
                <div className="space-y-8">
                  <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#1A1A1A] font-serif tracking-tight">
                    What Is ALI?
                  </h2>
                  <div className="space-y-6 text-base sm:text-lg leading-relaxed text-[#6B6B6B]">
                    <ContentGoesHere placeholder="~1,000 words total" />
                    
                    <div className="mt-12 space-y-8">
                      <div>
                        <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#1A1A1A] mb-4 sm:mb-6 font-serif tracking-tight">
                          Why ALI Exists
                        </h3>
                        <ContentGoesHere placeholder="Subsection content" />
                      </div>
                      
                      <div>
                        <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#1A1A1A] mb-4 sm:mb-6 font-serif tracking-tight">
                          Behavior + Intent Model
                        </h3>
                        <ContentGoesHere placeholder="Subsection content" />
                      </div>
                      
                      <div>
                        <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#1A1A1A] mb-4 sm:mb-6 font-serif tracking-tight">
                          Why Servant Leadership Is Measurable
                        </h3>
                        <ContentGoesHere placeholder="Subsection content" />
                      </div>
                      
                      <div>
                        <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#1A1A1A] mb-4 sm:mb-6 font-serif tracking-tight">
                          The Problem It Solves for SMBs
                        </h3>
                        <ContentGoesHere placeholder="Subsection content" />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex justify-center items-start">
                  <div className="w-full max-w-md h-96 border-2 border-dashed border-[#1A1A1A]/20 bg-[#FAFAF9] flex items-center justify-center">
                    <p className="text-sm text-[#6B6B6B]">Supporting Graphic Placeholder</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How ALI Works */}
        <section className="py-16 sm:py-24 md:py-32 lg:py-40 bg-white">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-6xl mx-auto">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-12 sm:mb-16 text-center text-[#1A1A1A] font-serif tracking-tight text-balance">
                How ALI Works
              </h2>
              
              <div className="grid md:grid-cols-2 gap-12 mb-12">
                <div className="space-y-6">
                  <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#1A1A1A] font-serif tracking-tight">
                    10-Question Model
                  </h3>
                  <ContentGoesHere placeholder="Explanation of 10-question model" />
                </div>
                
                <div className="space-y-6">
                  <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#1A1A1A] font-serif tracking-tight">
                    Quarterly Rhythm
                  </h3>
                  <ContentGoesHere placeholder="4 waves per year explanation" />
                </div>
              </div>
              
              <div className="mb-12">
                <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 sm:mb-6 text-[#1A1A1A] font-serif tracking-tight">
                  Anchor Questions for Longitudinal Tracking
                </h3>
                <ContentGoesHere placeholder="Anchor questions explanation" />
              </div>
              
              <div className="mb-12">
                <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 sm:mb-6 text-[#1A1A1A] font-serif tracking-tight">
                  Anonymous + Suppression Rule
                </h3>
                <div className="bg-white border-l-[6px] border-[#C85A3C] border border-[#1A1A1A]/10 p-6 sm:p-8">
                  <ContentGoesHere placeholder="UI placeholder for anonymous + suppression rule" />
                </div>
              </div>
              
              <div className="flex justify-center">
                <div className="w-full max-w-2xl h-96 border-2 border-dashed border-[#1A1A1A]/20 bg-[#FAFAF9] flex items-center justify-center">
                  <p className="text-sm text-[#6B6B6B]">Infographic Placeholder (600px)</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How ALI Helps Your Business */}
        <section className="py-16 sm:py-24 md:py-32 lg:py-40 bg-[#FAFAF9]">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-7xl mx-auto">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-12 sm:mb-16 text-center text-[#1A1A1A] font-serif tracking-tight text-balance">
                How ALI Helps Your Business
              </h2>
              
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-12">
                {['Clarity', 'Trust', 'Performance', 'Bench Strength', 'Culture'].map((benefit, idx) => (
                  <div
                    key={idx}
                    className="bg-white border border-[#1A1A1A]/10 p-8 sm:p-10"
                  >
                    <div className="w-12 h-12 mb-4 flex items-center justify-center bg-[#1A1A1A]">
                      <span className="text-white text-2xl">📊</span>
                    </div>
                    <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#1A1A1A] mb-3 sm:mb-4 font-serif tracking-tight">
                      {benefit}
                    </h3>
                    <ContentGoesHere placeholder={`${benefit} benefit paragraph`} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Pilot Program Details */}
        <section className="py-16 sm:py-24 md:py-32 lg:py-40 bg-white">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-6xl mx-auto">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-12 sm:mb-16 text-center text-[#1A1A1A] font-serif tracking-tight text-balance">
                Pilot Program Details
              </h2>
              
              <div className="mb-12">
                <div className="w-full h-64 border-2 border-dashed border-[#1A1A1A]/20 bg-[#FAFAF9] flex items-center justify-center mb-8">
                  <p className="text-sm text-[#6B6B6B]">Timeline Graphic Placeholder</p>
                </div>
              </div>
              
              <div className="grid md:grid-cols-2 gap-12 mb-12">
                <div>
                  <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6 text-[#1A1A1A] font-serif tracking-tight">
                    Deliverables
                  </h3>
                  <ul className="space-y-3">
                    <ContentGoesHere placeholder="List of deliverables" />
                  </ul>
                </div>
                
                <div>
                  <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6 text-[#1A1A1A] font-serif tracking-tight">
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
                  className="inline-block bg-[#1A1A1A] text-white px-8 sm:px-10 py-4 sm:py-5 font-medium text-sm sm:text-base hover:bg-[#1A1A1A]/90 transition-colors"
                >
                  Join the ALI Pilot
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Privacy & Data Protection */}
        <section className="py-16 sm:py-24 md:py-32 lg:py-40 bg-[#FAFAF9]">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-12 sm:mb-16 text-center text-[#1A1A1A] font-serif tracking-tight text-balance">
                Your Privacy Matters
              </h2>
              
              <div className="space-y-6 sm:space-y-8 text-base sm:text-lg leading-relaxed mb-8 text-[#6B6B6B]">
                <p>
                  I've built the Archetype Leadership Index on a foundation of trust and anonymity. Here's exactly how I protect your team's privacy:
                </p>
                
                <div>
                  <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 sm:mb-6 text-[#1A1A1A] font-serif tracking-tight">
                    Anonymous by Design
                  </h3>
                  <p>
                    Every assessment is completely anonymous. I don't collect names, email addresses, or any identifying information from team members completing the survey. You won't see individual responses, and neither will I.
                  </p>
                </div>
                
                <div>
                  <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 sm:mb-6 text-[#1A1A1A] font-serif tracking-tight">
                    The &lt;5 Rule
                  </h3>
                  <p>
                    If fewer than 5 people from your organization complete the assessment, I won't share any results. This ensures that even in small teams, no one can reverse-engineer who said what.
                  </p>
                </div>
                
                <div>
                  <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 sm:mb-6 text-[#1A1A1A] font-serif tracking-tight">
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
                  <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 sm:mb-6 text-[#1A1A1A] font-serif tracking-tight">
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
                  <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 sm:mb-6 text-[#1A1A1A] font-serif tracking-tight">
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
                  Questions about privacy? Email me directly at <a href="mailto:bart@archetypeoriginal.com" className="underline text-[#C85A3C]">bart@archetypeoriginal.com</a>.
                </p>
              </div>
              
              <div className="bg-white border-l-[6px] border-[#C85A3C] border border-[#1A1A1A]/10 p-8 mb-8">
                <h3 className="text-xl sm:text-2xl font-bold mb-4 text-[#1A1A1A] font-serif">
                  No Raw Data / No Names
                </h3>
                <p className="text-base sm:text-lg leading-relaxed text-[#6B6B6B]">
                  All data is aggregated and anonymized. Individual responses are never shared, and company-specific data is only shared with permission.
                </p>
              </div>
              
              <div className="bg-white border-l-[6px] border-[#C85A3C] border border-[#1A1A1A]/10 p-6 sm:p-8">
                <p className="text-sm sm:text-base font-medium mb-3 text-[#1A1A1A]">
                  Suppression Note
                </p>
                <p className="text-sm sm:text-base leading-relaxed text-[#6B6B6B]">
                  If fewer than 5 team members respond, I won't share any results to protect individual privacy. This ensures complete anonymity even in small teams.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-16 sm:py-24 md:py-32 lg:py-40 bg-white">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-12 sm:mb-16 text-center text-[#1A1A1A] font-serif tracking-tight text-balance">
                Frequently Asked Questions
              </h2>
              
              <div className="space-y-4 sm:space-y-6">
                {Array.from({ length: 10 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="bg-white border border-[#1A1A1A]/10 p-6 sm:p-8"
                  >
                    <h3 className="text-lg sm:text-xl font-semibold mb-2 sm:mb-3 text-[#1A1A1A]">
                      Question {idx + 1}
                    </h3>
                    <ContentGoesHere placeholder="FAQ answer placeholder" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-16 sm:py-24 md:py-32 lg:py-40 bg-[#FAFAF9]">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-3xl mx-auto text-center">
              <div className="space-y-8 mb-8 sm:mb-10">
                <ContentGoesHere placeholder="~150 words final CTA content" />
              </div>
              <a
                href="/culture-science/ali/apply"
                className="inline-block bg-[#1A1A1A] text-white px-8 sm:px-10 py-4 sm:py-5 font-medium text-sm sm:text-base hover:bg-[#1A1A1A]/90 transition-colors"
              >
                Apply to Join the Pilot
              </a>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

// Placeholder component for content blocks
function ContentGoesHere({ placeholder }) {
  return (
    <div className="p-4 border-2 border-dashed border-[#1A1A1A]/20 bg-[#FAFAF9]">
      <p className="text-sm italic text-[#6B6B6B]">
        {placeholder}
      </p>
    </div>
  );
}
