/**
 * Voice Guideline:
 * {
 *   "voice_guideline": {
 *     "default": "first-person singular",
 *     "exceptions": ["collaboration", "Archetype philosophy"],
 *     "owner": "Bart Paden"
 *   }
 * }
 *
 * No dashes in body copy. Bart's rule, enforced by voiceGuardrails on drafts and
 * applied here by hand because static pages do not pass through that gate.
 *
 * The evidence in this page is drawn from a navigation product currently in
 * build, deliberately not named because it has not launched. Every figure and
 * every incident described is real. If the product is named later, the copy
 * works unchanged.
 */
import React from 'react';
import SEO from '../../../components/SEO';
import SchemaJsonLd from '../../../components/SchemaJsonLd';
import { buildServiceSchema } from '../../../lib/schemaBuilders.js';
import AdvisoryPathStrip from '../../../components/AdvisoryPathStrip';

export default function CTO() {
  return (
    <>
      <SEO pageKey="fractional-cto" />
      <SchemaJsonLd
        schema={buildServiceSchema({
          name: 'Fractional CTO',
          serviceType: 'Fractional Chief Technology Officer',
          pageKey: 'fractional-cto',
          path: '/fractional-roles/cto',
        })}
      />

      <div className="min-h-screen bg-[#FAFAF9]">
        {/* Hero */}
        <section className="w-full bg-white py-16 sm:py-20 md:py-24 lg:py-20">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-5xl mx-auto text-center space-y-8">
              <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl font-bold text-[#1A1A1A] leading-[0.9] tracking-tight">
                Fractional Chief Technology Officer
              </h1>
              <p className="text-xl sm:text-2xl md:text-3xl font-light leading-relaxed text-[#1A1A1A]/70 max-w-4xl mx-auto">
                Most companies that need a CTO do not need someone to write the code. They need someone to make the
                decisions that get made before anyone writes code, and to know which of those decisions cannot be undone
                later.
              </p>
            </div>
          </div>
        </section>

        {/* Section 1: What the seat actually is */}
        <section className="w-full bg-white py-16 sm:py-24 md:py-32">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-4xl mx-auto space-y-6">
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                I have spent thirty-three years in and around software. For the last four of those I have been learning
                something specific and fairly new: how to lead the building of real applications with AI doing most of
                the typing. Not experimenting with it. Shipping with it, on a product where being wrong has consequences
                that are not measured in support tickets.
              </p>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                Let me be direct about something most people in this seat will not say plainly. I am not an engineer.
                I have never claimed to be one. What I have done for three decades is lead the people who are, decide
                what gets built and in what order, and carry responsibility for whether the thing works when it reaches
                a customer. That is the job. Writing the code was never the job.
              </p>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                What has changed is how much of the building a small number of people can now do, and where the real
                risk sits once that is true. Both of those are leadership questions, not engineering questions, and
                answering them badly is expensive in ways that do not show up for months.
              </p>
            </div>
          </div>
        </section>

        {/* Section 2: Decisions before code */}
        <section className="w-full bg-[#FAFAF9] py-16 sm:py-24 md:py-32">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-4xl mx-auto space-y-6">
              <p className="mb-2 font-sans text-[10px] uppercase tracking-[0.2em] text-[#DB0812]">
                What this looks like in practice
              </p>
              <h2 className="font-serif text-3xl sm:text-4xl font-normal leading-[1.15] text-[#1A1A1A]">
                The decisions that are cheap now and expensive later.
              </h2>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                I am currently the CTO for a navigation product heading toward launch. It is a useful example because
                the stakes are physical. If the software is wrong, a boat runs aground. That removes the comfortable
                ambiguity most software projects operate inside, and it makes the real shape of this role visible.
              </p>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                <span className="font-semibold">The mapping decision.</span> The obvious hosted vendor is free at our
                scale for online use. Offline maps bill separately, and offline is not optional on a lake with dead
                cell coverage. That same vendor runs between $1,270 and $4,195 a month depending on how many people
                use it. Self hosting the same capability on open tooling costs five to ten dollars a month plus about
                two weeks of pipeline work. That is roughly fifty thousand dollars a year, and the decision only costs
                two weeks if it is made before anyone writes map code. Six months in, it is a rewrite.
              </p>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                <span className="font-semibold">The insurance gap.</span> Technology errors and omissions policies
                exclude bodily injury. General liability policies exclude professional services. A software defect that
                puts a boat on a rock falls in the space between those two exclusions, where nothing covers it. There is
                also case law treating navigation charts as products under strict liability, which means a disclaimer
                binds the subscriber who agreed to it and not the passenger who got hurt. Found before launch, that is a
                conversation with a specialty broker and a policy endorsement. Found after, it is the company.
              </p>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                <span className="font-semibold">The platform gate.</span> An app store policy on precise location
                tightens weeks before our launch window. Clearing it requires a written declaration, a demonstration
                video, and a manual review that takes two to three weeks and can block publication outright. The fix is
                submitting to an internal track four months early, when a rejection costs nothing. Discovering that
                requirement in the launch month is the single likeliest way the date gets missed.
              </p>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                <span className="font-semibold">The licensing trap.</span> Seeding a database from an open dataset with
                a share alike license, then writing your own commercial fields onto those same records, can make the
                whole thing a derivative database subject to that license. Caught at the schema level it costs nothing.
                Caught later it means unwinding the data model of a shipped product.
              </p>
              <p className="text-xl sm:text-2xl leading-relaxed text-[#1A1A1A] italic font-serif pt-2">
                None of those four are coding problems. All four are decided before the first line of code, and three of
                them would never surface in a technical interview.
              </p>
            </div>
          </div>
        </section>

        {/* Section 3: Where AI changes the math */}
        <section className="w-full bg-white py-16 sm:py-24 md:py-32">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-4xl mx-auto space-y-6">
              <p className="mb-2 font-sans text-[10px] uppercase tracking-[0.2em] text-[#DB0812]">
                Building with AI
              </p>
              <h2 className="font-serif text-3xl sm:text-4xl font-normal leading-[1.15] text-[#1A1A1A]">
                Code generation stopped being the bottleneck. Verification became it.
              </h2>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                A working prototype of that navigation product took hours, not a quarter. That is genuinely new, and it
                changes what a small team can attempt. It also moves the constraint somewhere most people are not
                looking. When producing code is fast, the limiting factor becomes proving the code is right, and proof
                comes in two forms that are priced very differently.
              </p>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                Automated testing is now cheap, because the same tools that write the code will write the tests. Real
                world validation is not cheap and never will be. On this product it means hours on the water in good
                weather, and there are only so many of those in a year. A team can build and validate in parallel. One
                person cannot. Knowing which of your constraints is actually binding, and it is rarely the one everybody
                is discussing, is most of what this job is.
              </p>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                I will also tell you where AI is weakest, because you should hear it from the person you are hiring
                rather than discover it later. The first time we ran a new test suite it produced five failures. All
                five were bugs in the tests. Zero were bugs in the code. AI written tests encode the assumptions of the
                thing that wrote them, which means they confirm what it already believed. The most serious design flaw
                we found that month was one number being asked to do two different jobs, and no unit test would ever
                have caught it. It took a person on a boat with a sonar unit noticing that the chart disagreed with the
                water.
              </p>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                That same test harness paid for itself the day it was written, and the defect it found is worth
                describing because of what it threatened. A safety warning was being calculated from the wrong set of
                map cells. It reported two feet of clearance on a route whose actual minimum was nine. Both readings
                erred toward caution, so nobody was ever in danger. The damage was subtler than that. Routes were being
                flagged for hazards they never came near, and a warning that fires when nothing is wrong is how a person
                learns to ignore warnings. That is a leadership failure wearing a technical costume, and it is the kind
                of thing I am in the room to catch.
              </p>
            </div>
          </div>
        </section>

        {/* Section 4: Scope, dates, and the bus factor */}
        <section className="w-full bg-[#FAFAF9] py-16 sm:py-24 md:py-32">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-4xl mx-auto space-y-6">
              <p className="mb-2 font-sans text-[10px] uppercase tracking-[0.2em] text-[#DB0812]">
                Dates and scope
              </p>
              <h2 className="font-serif text-3xl sm:text-4xl font-normal leading-[1.15] text-[#1A1A1A]">
                A date is only defensible if every unknown has a fallback.
              </h2>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                Software dates slip because teams protect scope and negotiate the calendar. I do the opposite. Scope is
                the lever, the date is the commitment, and every remaining unknown gets a fallback in advance that costs
                revenue or features rather than costing the date. When a partner or an investor asks whether the launch
                is real, that structure is the answer. Not confidence. Structure.
              </p>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                The same discipline applies to what happens when you are gone. A small AI assisted team concentrates
                enormous knowledge in very few heads, and that is a real risk, not a talking point. It gets managed the
                same way anything else does: architecture written down, a data pipeline anyone can reproduce from raw
                source, and a second person with their hands on the code before launch rather than after an emergency.
              </p>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                I am also comfortable telling you when the answer is to hire someone rather than to keep me. A
                fractional CTO who cannot say that is selling a retainer, not judgment.
              </p>
            </div>
          </div>
        </section>

        {/* Section 5: Where it fits */}
        <section className="w-full bg-white py-16 sm:py-24 md:py-32">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-4xl mx-auto space-y-6">
              <p className="mb-2 font-sans text-[10px] uppercase tracking-[0.2em] text-[#DB0812]">Where it fits</p>
              <h2 className="font-serif text-3xl sm:text-4xl font-normal leading-[1.15] text-[#1A1A1A]">
                This role earns its place in a specific set of situations.
              </h2>
              <ul className="list-none space-y-0 pt-2">
                {[
                  'You are about to start building something and the early decisions have not been made by anyone qualified to make them.',
                  'You have developers, or an agency, or an AI toolchain producing work, and nobody in the company can independently judge whether it is any good.',
                  'A build is underway and the date has started moving, and you need someone who will fix scope instead of renegotiating the calendar.',
                  'You are evaluating what a small team plus AI can realistically do before you commit to a hiring plan or a raise.',
                  'You need technical decisions defensible to a board, a partner, or an insurer, in language they can actually act on.',
                  'You are carrying real world risk in software, where a defect reaches a person rather than a dashboard.',
                ].map((item) => (
                  <li
                    key={item}
                    className="relative border-b border-[#E5E1DB] py-3.5 pl-6 text-base leading-[1.7] text-[#1A1A1A] last:border-b-0"
                  >
                    <span className="absolute left-0 font-bold text-[#DB0812]">·</span>
                    {item}
                  </li>
                ))}
              </ul>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] pt-2">
                Where it does not fit: deep platform engineering, a rescue that needs hands on a keyboard tomorrow
                morning, or an organization that wants a title in the org chart without giving that title any decision
                authority. In those cases you need a different person, and I would rather tell you that in the first
                conversation than in the fourth month.
              </p>
            </div>
          </div>
        </section>

        {/* Section 6: The outcome */}
        <section className="w-full bg-[#FAFAF9] py-16 sm:py-24 md:py-32">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-4xl mx-auto space-y-6">
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                The outcome of this role is not a technology roadmap in a slide deck. It is a build where the expensive
                decisions were made early and on purpose, where the date is real because the scope is fixed, where the
                risks that live outside the code have already been found, and where the people doing the work know what
                they are building and why it is sequenced the way it is.
              </p>
              <p className="text-xl sm:text-2xl leading-relaxed text-[#1A1A1A] italic font-serif">
                Technology decisions are leadership decisions. They get made by someone whether or not that person is
                qualified, and they get made early whether or not anyone notices.
              </p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="w-full bg-white py-16 sm:py-24 md:py-32">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-3xl mx-auto text-center">
              <div className="mt-12">
                <a
                  href="/contact"
                  className="inline-block px-10 py-5 bg-[#1A1A1A] text-white font-medium text-base hover:bg-[#1A1A1A]/90 transition-colors rounded-sm"
                >
                  Start a Conversation
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Related links */}
        <section className="w-full bg-[#FAFAF9] py-16 sm:py-24 md:py-32 border-t border-[#1A1A1A]/10">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-4xl mx-auto">
              <p className="text-sm text-[#6B6B6B] mb-4">Explore other offerings:</p>
              <div className="flex flex-wrap gap-4 sm:gap-6">
                <a
                  href="/fractional-roles/cco"
                  className="text-sm text-[#1A1A1A] hover:text-[#DB0812] transition-colors"
                  onClick={(e) => {
                    e.preventDefault();
                    window.history.pushState({}, '', '/fractional-roles/cco');
                    window.dispatchEvent(new PopStateEvent('popstate'));
                  }}
                >
                  Fractional CCO
                </a>
                <span className="text-sm text-[#6B6B6B]">→</span>
                <a
                  href="/consulting"
                  className="text-sm text-[#1A1A1A] hover:text-[#DB0812] transition-colors"
                  onClick={(e) => {
                    e.preventDefault();
                    window.history.pushState({}, '', '/consulting');
                    window.dispatchEvent(new PopStateEvent('popstate'));
                  }}
                >
                  Consulting
                </a>
                <span className="text-sm text-[#6B6B6B]">→</span>
                <a
                  href="/fractional-roles"
                  className="text-sm text-[#1A1A1A] hover:text-[#DB0812] transition-colors"
                  onClick={(e) => {
                    e.preventDefault();
                    window.history.pushState({}, '', '/fractional-roles');
                    window.dispatchEvent(new PopStateEvent('popstate'));
                  }}
                >
                  ← Back to Fractional Roles
                </a>
              </div>
            </div>
          </div>
        </section>

        <AdvisoryPathStrip />
      </div>
    </>
  );
}
