/**
 * Bad Leader Project Anti-Project Page
 * Editorial Minimal Design - Ethical Research Platform
 */
import React from 'react';
import SEO from '../../components/SEO';

export default function BadLeaderProject() {
  const handleLinkClick = (e, href) => {
    e.preventDefault();
    window.history.pushState({}, '', href);
    window.dispatchEvent(new PopStateEvent('popstate'));
    // Scroll to top when navigating to a new page
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  return (
    <>
      <SEO pageKey="bad-leader-project" />
      <div className="min-h-screen bg-white">
        {/* SECTION 1: HERO */}
        <section className="bg-white py-16 sm:py-20 md:py-24 lg:py-20">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-5xl mx-auto text-center space-y-8">
              {/* Badge */}
              <div className="mb-6">
                <span className="inline-block px-4 py-2 border border-[#1A1A1A]/10 text-xs font-medium tracking-wider text-[#6B6B6B] uppercase">
                  Anti-Project
                </span>
              </div>
              
              {/* Title */}
              <h1 className="font-serif font-bold text-5xl sm:text-6xl md:text-7xl text-[#1A1A1A] leading-[0.9] tracking-tight">
                The Bad Leader Project
              </h1>
              
              {/* Subtitle */}
              <p className="text-xl sm:text-2xl md:text-3xl text-[#1A1A1A]/70 font-light leading-relaxed">
                A heat-map of dysfunctional leadership across industries and regions.
              </p>
            </div>
          </div>
        </section>

        {/* SECTION 2: INTRODUCTION */}
        <section className="bg-[#FAFAF9] py-16 sm:py-32">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-4xl mx-auto space-y-8">
              {/* Content */}
              <div className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] space-y-6">
                <p>
                  Most people know what healthy leadership feels like. They also know when something is wrong — even if they can't say it out loud.
                </p>
                <p>
                  <strong>The Bad Leader Project exists to make those unspoken realities visible.</strong>
                </p>
                <p>
                  It's an anonymous submission platform where employees, team members, and people under leadership can safely describe the behaviors they're experiencing: manipulation, inconsistency, ego-protection, pressure without clarity, silence when courage is required, or any of the quiet patterns that erode trust.
                </p>
                <p>
                  We're not collecting stories for entertainment. We're collecting stories for awareness — and for change.
                </p>
                <p>
                  Every submission is sanitized using AI: names stripped, industries generalized, identifiers removed, and narrative details adjusted just enough to protect the storyteller while preserving the truth of the experience.
                </p>
                <p>
                  These anonymized stories are then published in an open, searchable library — a public window into the real behaviors people are actually living under.
                </p>
                <p>
                  <strong>No one will ever know who any story is about. But everyone will recognize the patterns.</strong>
                </p>
                <p>
                  Because these patterns exist everywhere.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 3: WHAT THIS PROJECT IS — AND ISN'T */}
        <section className="bg-white py-16 sm:py-32">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-4xl mx-auto space-y-8">
              {/* Section Header with Orange Border */}
              <div className="flex items-start gap-4 sm:gap-6">
                <div className="w-1 h-12 sm:h-16 bg-[#C85A3C] flex-shrink-0 mt-2"></div>
                <h2 className="font-serif font-bold text-3xl sm:text-4xl md:text-5xl text-[#1A1A1A] tracking-tight">
                  What This Project Is — and Isn't
                </h2>
              </div>
              
              {/* Content */}
              <div className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] space-y-6">
                <p>
                  This isn't a call-out board. It's not scandal. It's not revenge.
                </p>
                <p>
                  <strong>It's clarity.</strong>
                </p>
                <p>
                  This project gives people a safe way to name what unhealthy leaders are doing without risking their job, their reputation, or their relationships.
                </p>
                <p>
                  Bad leadership thrives in silence. Silence protects dysfunction. Patterns stay hidden until they've already done damage.
                </p>
                <p>
                  <strong>The Bad Leader Project breaks that silence — responsibly, ethically, and with protection built in.</strong>
                </p>
                <p>
                  We're not here to expose people. We're here to expose behaviors.
                </p>
                <p>
                  Once you can see a behavior, you can diagnose the pattern. Once you can diagnose the pattern, you can correct it.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 4: WHAT GETS PUBLISHED — AND WHAT STAYS INTERNAL */}
        <section className="bg-[#FAFAF9] py-16 sm:py-32">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-4xl mx-auto space-y-8">
              {/* Section Header with Orange Border */}
              <div className="flex items-start gap-4 sm:gap-6">
                <div className="w-1 h-12 sm:h-16 bg-[#C85A3C] flex-shrink-0 mt-2"></div>
                <h2 className="font-serif font-bold text-3xl sm:text-4xl md:text-5xl text-[#1A1A1A] tracking-tight">
                  What Gets Published — and What Stays Internal
                </h2>
              </div>
              
              {/* Content */}
              <div className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] space-y-6">
                <p>
                  The public can read the stories — but only the ones that meet strict safety and clarity standards.
                </p>
                <p>
                  Every submission follows a rigorous process:
                </p>
                <ul className="list-disc pl-6 sm:pl-8 space-y-2 marker:text-[#C85A3C]">
                  <li>Analyzed</li>
                  <li>Sanitized</li>
                  <li>De-identified</li>
                  <li>Evaluated</li>
                  <li>Pattern-coded</li>
                  <li>Published only if safe, useful, and ethically appropriate</li>
                </ul>
                <p>
                  <strong>Some stories will never appear in the public archive.</strong>
                </p>
                <p>
                  If a story is:
                </p>
                <ul className="list-disc pl-6 sm:pl-8 space-y-2 marker:text-[#C85A3C]">
                  <li>extreme</li>
                  <li>sensationalized</li>
                  <li>unverifiable</li>
                  <li>rooted in retaliation</li>
                  <li>or carries details that cannot be safely abstracted</li>
                </ul>
                <p>
                  …it is still analyzed for research, but not shown publicly.
                </p>
                <p>
                  The public library exists to reveal patterns, not to escalate harm.
                </p>
                <p>
                  This protects:
                </p>
                <ul className="list-disc pl-6 sm:pl-8 space-y-2 marker:text-[#C85A3C]">
                  <li>the storyteller</li>
                  <li>the people referenced</li>
                  <li>the integrity of the research</li>
                  <li>and the long-term purpose of the project</li>
                </ul>
                <p>
                  The internal research engine can use all stories. The public library only contains stories that bring clarity without collateral damage.
                </p>
                <p>
                  <strong>This balance protects people without weakening the truth they're trying to name.</strong>
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 5: WHY THESE STORIES ARE PUBLIC */}
        <section className="bg-white py-16 sm:py-32">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-4xl mx-auto space-y-8">
              {/* Section Header with Orange Border */}
              <div className="flex items-start gap-4 sm:gap-6">
                <div className="w-1 h-12 sm:h-16 bg-[#C85A3C] flex-shrink-0 mt-2"></div>
                <h2 className="font-serif font-bold text-3xl sm:text-4xl md:text-5xl text-[#1A1A1A] tracking-tight">
                  Why These Stories Are Public
                </h2>
              </div>
              
              {/* Content */}
              <div className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] space-y-6">
                <p>
                  Because leaders need to see themselves clearly — in the wins and in the failures.
                </p>
                <p>
                  Anonymized stories help people recognize:
                </p>
                <ul className="list-disc pl-6 sm:pl-8 space-y-2 marker:text-[#C85A3C]">
                  <li>"We're living this exact pattern…"</li>
                  <li>"This explains the tension our team feels…"</li>
                  <li>"This looks like the behavior we've been afraid to name…"</li>
                  <li>"This helps us understand the drift we couldn't articulate…"</li>
                </ul>
                <p>
                  Public visibility creates shared understanding:
                </p>
                <ul className="list-disc pl-6 sm:pl-8 space-y-2 marker:text-[#C85A3C]">
                  <li>Staff finally have language for what they've been feeling.</li>
                  <li>Leaders gain mirrors they never had.</li>
                  <li>Organizations see culture risk before collapse.</li>
                  <li>Teams realize they're not alone — the pattern is bigger than them.</li>
                </ul>
                <p>
                  <strong>These stories are a global map of leadership drift — not personal attacks.</strong>
                </p>
                <p>
                  They reveal what must change if healthy culture is going to survive.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 6: HOW WE USE THE DATA */}
        <section className="bg-[#FAFAF9] py-16 sm:py-32">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-4xl mx-auto space-y-8">
              {/* Section Header with Orange Border */}
              <div className="flex items-start gap-4 sm:gap-6">
                <div className="w-1 h-12 sm:h-16 bg-[#C85A3C] flex-shrink-0 mt-2"></div>
                <h2 className="font-serif font-bold text-3xl sm:text-4xl md:text-5xl text-[#1A1A1A] tracking-tight">
                  How We Use the Data
                </h2>
              </div>
              
              {/* Content */}
              <div className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] space-y-6">
                <p>
                  Every anonymized story feeds the research engine inside Archetype Original:
                </p>
                <ul className="list-disc pl-6 sm:pl-8 space-y-2 marker:text-[#C85A3C]">
                  <li>Culture Science analyzes behavioral and cultural patterns</li>
                  <li>ALI (Archetype Leadership Index) draws on the data to shape diagnostics</li>
                  <li>Workshops and seminars integrate the findings</li>
                  <li>Consulting engagements use patterns to fast-track clarity</li>
                  <li>Servant leadership frameworks are refined with real-world evidence</li>
                </ul>
                <p>
                  <strong>This is where lived experience and research meet — not in theory, but in truth.</strong>
                </p>
                <p>
                  The Bad Leader Project gives us the raw material. Culture Science turns it into understanding. ALI will eventually turn understanding into measurement.
                </p>
                <p>
                  All of it is designed to help leaders see the cost of unhealthy leadership in real time — and choose a better path.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 7: WHERE WE ARE NOW — AND WHAT'S COMING NEXT */}
        <section className="bg-white py-16 sm:py-32">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-4xl mx-auto space-y-8">
              {/* Section Header with Orange Border */}
              <div className="flex items-start gap-4 sm:gap-6">
                <div className="w-1 h-12 sm:h-16 bg-[#C85A3C] flex-shrink-0 mt-2"></div>
                <h2 className="font-serif font-bold text-3xl sm:text-4xl md:text-5xl text-[#1A1A1A] tracking-tight">
                  Where We Are Now — and What's Coming Next
                </h2>
              </div>
              
              {/* Content */}
              <div className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] space-y-6">
                <p>
                  The Bad Leader Project is currently in development. The submission engine, anonymization model, and public story library are being built throughout Q1 2026.
                </p>
                <p>
                  This work takes time because it requires:
                </p>
                <ul className="list-disc pl-6 sm:pl-8 space-y-2 marker:text-[#C85A3C]">
                  <li>safe and ethical anonymization</li>
                  <li>clear patterns that protect people while revealing truth</li>
                  <li>research frameworks that turn stories into usable insight</li>
                  <li>an interface that honors the weight of what people share</li>
                </ul>
                <p>
                  We're not launching a content dump. We're building a responsible system.
                </p>
                <p>
                  <strong>Development will roll out in phases:</strong>
                </p>
                <div className="pl-4 space-y-4">
                  <div>
                    <p>
                      <strong>Phase 1 — Submission Engine (Q1 2026)</strong>
                    </p>
                    <p>
                      Anonymous stories submitted with automatic redaction and pre-processing.
                    </p>
                  </div>
                  <div>
                    <p>
                      <strong>Phase 2 — Anonymization + Pattern Coding (Q1–Q2 2026)</strong>
                    </p>
                    <p>
                      Names removed, details abstracted, industries generalized, behavioral patterns identified.
                    </p>
                  </div>
                  <div>
                    <p>
                      <strong>Phase 3 — Public Story Library (Q2 2026)</strong>
                    </p>
                    <p>
                      A searchable archive of safe, anonymized stories — designed to help people recognize real patterns without exposing real people.
                    </p>
                  </div>
                  <div>
                    <p>
                      <strong>Phase 4 — Culture Science Integration (Q2–Q3 2026)</strong>
                    </p>
                    <p>
                      Stories begin informing the broader Archetype research engine and ALI.
                    </p>
                  </div>
                  <div>
                    <p>
                      <strong>Phase 5 — Workshops + Reports (Q4 2026)</strong>
                    </p>
                    <p>
                      Insights translated into practical guidance for leaders, teams, and organizations.
                    </p>
                  </div>
                </div>
                <p>
                  If you want to be notified as each phase goes live, you can join the update list below.
                </p>
                <p>
                  Your information will never be shared, sold, or used for anything else.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 8: SUBMIT A STORY — 100% ANONYMOUS */}
        <section className="bg-[#FAFAF9] py-16 sm:py-32">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-4xl mx-auto space-y-8">
              {/* Section Header with Orange Border */}
              <div className="flex items-start gap-4 sm:gap-6">
                <div className="w-1 h-12 sm:h-16 bg-[#C85A3C] flex-shrink-0 mt-2"></div>
                <h2 className="font-serif font-bold text-3xl sm:text-4xl md:text-5xl text-[#1A1A1A] tracking-tight">
                  Submit a Story — 100% Anonymous
                </h2>
              </div>
              
              {/* Content */}
              <div className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] space-y-6">
                <p>
                  Your story will be:
                </p>
                <ul className="list-disc pl-6 sm:pl-8 space-y-2 marker:text-[#C85A3C]">
                  <li>Sanitized</li>
                  <li>De-identified</li>
                  <li>Pattern-coded</li>
                  <li>Abstracted into safe language</li>
                  <li>Added to the public library if appropriate</li>
                  <li>Always included in research</li>
                </ul>
                <p>
                  <strong>No names. No companies. No identifying details. Ever.</strong>
                </p>
                <p>
                  We protect the storyteller. We expose the pattern.
                </p>
                <p className="pt-4 text-[#6B6B6B] italic">
                  Submission form coming Q1 2026
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 9: WHERE THIS FITS INSIDE ARCHETYPE ORIGINAL */}
        <section className="bg-white py-16 sm:py-32">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-4xl mx-auto space-y-8">
              {/* Section Header with Orange Border */}
              <div className="flex items-start gap-4 sm:gap-6">
                <div className="w-1 h-12 sm:h-16 bg-[#C85A3C] flex-shrink-0 mt-2"></div>
                <h2 className="font-serif font-bold text-3xl sm:text-4xl md:text-5xl text-[#1A1A1A] tracking-tight">
                  Where This Fits Inside Archetype Original
                </h2>
              </div>
              
              {/* Content */}
              <div className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] space-y-6">
                <p>
                  The Bad Leader Project is one of AO's two anti-projects:
                </p>
                <ul className="list-disc pl-6 sm:pl-8 space-y-2 marker:text-[#C85A3C]">
                  <li><strong>Scoreboard Leadership</strong> — diagnosing the behavior patterns that corrode culture</li>
                  <li><strong>The Bad Leader Project</strong> — gathering real-world evidence of those behaviors</li>
                </ul>
                <p>
                  <strong>Together, they make a truth unmistakable:</strong>
                </p>
                <p>
                  You cannot be a Scoreboard Leader and follow the Golden Rule at the same time.
                </p>
                <p>
                  Scoreboard Leadership uses people. Servant leadership serves people.
                </p>
                <p>
                  One extracts. The other builds.
                </p>
                <p>
                  One fractures trust. The other restores it.
                </p>
                <p>
                  These stories make that contrast visible — not conceptually, but experientially.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 10: IF YOU'RE READY TO BUILD THE OPPOSITE (CTA) */}
        <section className="bg-[#FAFAF9] py-16 sm:py-32">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-4xl mx-auto space-y-8">
              {/* Section Header with Orange Border */}
              <div className="flex items-start gap-4 sm:gap-6">
                <div className="w-1 h-12 sm:h-16 bg-[#C85A3C] flex-shrink-0 mt-2"></div>
                <h2 className="font-serif font-bold text-3xl sm:text-4xl md:text-5xl text-[#1A1A1A] tracking-tight">
                  If You're Ready to Build the Opposite
                </h2>
              </div>
              
              {/* Content */}
              <div className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] space-y-6">
                <p>
                  If your team is feeling the impact of unhealthy leadership — or you want help building a culture people actually want to belong to — Archetype Original exists for that work.
                </p>
              </div>
              
              {/* CTA Button */}
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <a
                  href="/contact"
                  onClick={(e) => handleLinkClick(e, '/contact')}
                  className="bg-[#1A1A1A] text-white px-8 sm:px-10 py-4 sm:py-5 font-medium text-sm sm:text-base hover:bg-[#1A1A1A]/90 transition-colors text-center"
                >
                  Start a Conversation
                </a>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
