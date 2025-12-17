/**
 * Voice Guideline:
 * {
 *   "voice_guideline": {
 *     "default": "first-person singular",
 *     "exceptions": ["collaboration", "Archetype philosophy"],
 *     "owner": "Bart Paden"
 *   }
 * }
 */
import React from 'react';
import { Helmet } from 'react-helmet-async';
import SEO from '../../components/SEO';

export default function SpeakingSeminars() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    "name": "Speaking & Seminars",
    "description": "Leadership in a Room — Not a Performance on a Stage"
  };

  return (
    <>
      <SEO pageKey="speaking-seminars" />
      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify(jsonLd)}
        </script>
      </Helmet>
      
      <div className="min-h-screen bg-[#FAFAF9]">
        {/* Hero Section */}
        <section className="w-full bg-white py-24 sm:py-32 md:py-40 lg:py-48">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-5xl mx-auto text-center space-y-8">
              <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl font-bold text-[#1A1A1A] leading-[0.9] tracking-tight">
                Speaking & Seminars
              </h1>
              <p className="text-xl sm:text-2xl md:text-3xl font-light leading-relaxed text-[#1A1A1A]/70">
                Leadership in a Room — Not a Performance on a Stage
              </p>
            </div>
          </div>
        </section>

        {/* Section 1: Opening */}
        <section className="w-full bg-white py-16 sm:py-24 md:py-32">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-4xl mx-auto space-y-6">
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                I'm not a keynote performer. I don't walk into a room to impress anyone.
              </p>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                I speak the same way I lead:
              </p>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                With clarity. With honesty. With lived experience. With a posture of service.
              </p>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                My talks are built around real leadership in real environments — where pressure, people, expectations, relationships, fear, courage, drift, growth, and responsibility all collide. I bring language to the things leaders feel but rarely name. I bring steadiness to the moments that feel foggy. I bring truth in a way people can actually absorb.
              </p>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                And I do it without theatrics, polish, or performance.
              </p>
              <p className="text-lg sm:text-xl leading-relaxed text-[#1A1A1A] italic font-serif">
                Because leadership isn't a show. It's something you live.
              </p>
            </div>
          </div>
        </section>

        {/* Section 2: What These Talks Are Like */}
        <section className="w-full bg-[#FAFAF9] py-16 sm:py-24 md:py-32">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="flex items-center mb-8 sm:mb-10">
                <div className="w-1 h-10 sm:h-12 md:h-14 bg-[#C85A3C] mr-4 sm:mr-6"></div>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#1A1A1A] font-serif tracking-tight leading-tight">
                  What These Talks Are Like
                </h2>
              </div>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                Every room is different — and the way I speak adjusts to the moment.
              </p>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                Some rooms need calm strength. Some need truth spoken plainly. Some need clarity. Some need relief. Some need a recalibration of what leadership even is.
              </p>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                What I deliver is not a pre-written script. It's leadership in real time, shaped by:
              </p>
              <ul className="list-disc space-y-3 pl-6 sm:pl-8">
                <li className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] marker:text-[#C85A3C]">
                  32 years building people, teams, companies, and culture
                </li>
                <li className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] marker:text-[#C85A3C]">
                  Servant leadership lived, not theorized
                </li>
                <li className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] marker:text-[#C85A3C]">
                  Insight from watching how people respond to leadership under pressure
                </li>
                <li className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] marker:text-[#C85A3C]">
                  The research behind Culture Science
                </li>
                <li className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] marker:text-[#C85A3C]">
                  The posture of "I am second" — the foundation of my leadership life
                </li>
              </ul>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                People often say the same thing after a talk:
              </p>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                "It felt like you named what we've been living — and you did it in a way that finally made sense."
              </p>
              <p className="text-lg sm:text-xl leading-relaxed text-[#1A1A1A] italic font-serif">
                That's the goal. Not noise. Not hype. Not motivation. Clarity.
              </p>
            </div>
          </div>
        </section>

        {/* Section 3: Why Organizations Bring Me In */}
        <section className="w-full bg-white py-16 sm:py-24 md:py-32">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="flex items-center mb-8 sm:mb-10">
                <div className="w-1 h-10 sm:h-12 md:h-14 bg-[#C85A3C] mr-4 sm:mr-6"></div>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#1A1A1A] font-serif tracking-tight leading-tight">
                  Why Organizations Bring Me In
                </h2>
              </div>
              <div className="space-y-4">
                <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                  <strong className="text-[#1A1A1A]">They want someone they trust can help.</strong>
                </p>
                <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] pl-4">
                  Not a celebrity speaker. Not a performer. Not someone selling a model. Just someone who has carried real leadership, lived the weight of responsibility, and can help bring clarity into the moment they're facing.
                </p>
              </div>
              <div className="space-y-4">
                <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                  <strong className="text-[#1A1A1A]">They need clarity where there is fog.</strong>
                </p>
                <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] pl-4">
                  Leadership drift, cultural confusion, misalignment, fear, burnout, or simply too much noise.
                </p>
              </div>
              <div className="space-y-4">
                <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                  <strong className="text-[#1A1A1A]">They want to strengthen what's already good.</strong>
                </p>
                <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] pl-4">
                  Leadership teams preparing for growth, new vision, or cultural refinement.
                </p>
              </div>
              <div className="space-y-4">
                <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                  <strong className="text-[#1A1A1A]">They want servant leadership defined in a way that is usable, not theoretical.</strong>
                </p>
                <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] pl-4">
                  People don't need another framework. They need something human, clear, and livable.
                </p>
              </div>
              <div className="space-y-4">
                <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                  <strong className="text-[#1A1A1A]">They're tired of motivational speeches that say nothing.</strong>
                </p>
                <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] pl-4">
                  Your people shouldn't walk away inspired for ten minutes and unchanged on Monday.
                </p>
              </div>
              <div className="space-y-4">
                <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                  <strong className="text-[#1A1A1A]">They want language for what they're experiencing.</strong>
                </p>
                <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] pl-4">
                  Most leaders feel the truth before they can articulate it. My job is to give them the words that bring relief and direction.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 4: What Audiences Take Away */}
        <section className="w-full bg-[#FAFAF9] py-16 sm:py-24 md:py-32">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="flex items-center mb-8 sm:mb-10">
                <div className="w-1 h-10 sm:h-12 md:h-14 bg-[#C85A3C] mr-4 sm:mr-6"></div>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#1A1A1A] font-serif tracking-tight leading-tight">
                  What Audiences Take Away
                </h2>
              </div>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                People leave with:
              </p>
              <ul className="list-disc space-y-3 pl-6 sm:pl-8">
                <li className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] marker:text-[#C85A3C]">
                  A clearer understanding of what servant leadership actually looks like
                </li>
                <li className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] marker:text-[#C85A3C]">
                  Language for dynamics they've sensed but never named
                </li>
                <li className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] marker:text-[#C85A3C]">
                  A realistic framework for leading under pressure
                </li>
                <li className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] marker:text-[#C85A3C]">
                  A deeper understanding of culture as lived behavior, not posters
                </li>
                <li className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] marker:text-[#C85A3C]">
                  A reframed sense of responsibility — not as weight, but as strength
                </li>
                <li className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] marker:text-[#C85A3C]">
                  Practical steps they can take the next morning
                </li>
                <li className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] marker:text-[#C85A3C]">
                  Permission to slow down and lead with intention
                </li>
                <li className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] marker:text-[#C85A3C]">
                  A rediscovery of what healthy leadership feels like
                </li>
              </ul>
              <p className="text-lg sm:text-xl leading-relaxed text-[#1A1A1A] italic font-serif">
                It doesn't matter whether the room is silent or laughing — the goal is always the same: Give people clarity they can act on.
              </p>
            </div>
          </div>
        </section>

        {/* Section 5: Topics I'm Asked to Speak On */}
        <section className="w-full bg-white py-16 sm:py-24 md:py-32">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="flex items-center mb-8 sm:mb-10">
                <div className="w-1 h-10 sm:h-12 md:h-14 bg-[#C85A3C] mr-4 sm:mr-6"></div>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#1A1A1A] font-serif tracking-tight leading-tight">
                  Topics I'm Asked to Speak On
                </h2>
              </div>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                I don't do canned speeches, but most talks fall into themes like:
              </p>
              <ul className="list-disc space-y-3 pl-6 sm:pl-8">
                <li className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] marker:text-[#C85A3C]">
                  Servant leadership in real environments
                </li>
                <li className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] marker:text-[#C85A3C]">
                  Scoreboard Leadership vs. Servant Leadership — the contrast every leader lives
                </li>
                <li className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] marker:text-[#C85A3C]">
                  Clarity as the most underestimated leadership skill
                </li>
                <li className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] marker:text-[#C85A3C]">
                  Cultural drift: how it starts and how leaders correct it
                </li>
                <li className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] marker:text-[#C85A3C]">
                  The Golden Rule as a leadership engine
                </li>
                <li className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] marker:text-[#C85A3C]">
                  "I Am Second" — the strongest posture in leadership
                </li>
                <li className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] marker:text-[#C85A3C]">
                  Creating environments people actually want to belong to
                </li>
                <li className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] marker:text-[#C85A3C]">
                  How pressure shapes behavior — and how leaders reshape pressure
                </li>
                <li className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] marker:text-[#C85A3C]">
                  Leadership sustainability: how to lead without losing yourself
                </li>
                <li className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] marker:text-[#C85A3C]">
                  What teams wish leaders understood but rarely voice
                </li>
                <li className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] marker:text-[#C85A3C]">
                  The human physics of trust, alignment, communication, and expectation
                </li>
              </ul>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                Any of these can expand into seminars, workshops, or full-day intensives.
              </p>
            </div>
          </div>
        </section>

        {/* Section 6: Seminars & Workshops */}
        <section className="w-full bg-[#FAFAF9] py-16 sm:py-24 md:py-32">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="flex items-center mb-8 sm:mb-10">
                <div className="w-1 h-10 sm:h-12 md:h-14 bg-[#C85A3C] mr-4 sm:mr-6"></div>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#1A1A1A] font-serif tracking-tight leading-tight">
                  Seminars & Workshops
                </h2>
              </div>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                Seminars take us deeper than a talk. They allow for:
              </p>
              <ul className="list-disc space-y-3 pl-6 sm:pl-8">
                <li className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] marker:text-[#C85A3C]">
                  Dialogue
                </li>
                <li className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] marker:text-[#C85A3C]">
                  Application
                </li>
                <li className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] marker:text-[#C85A3C]">
                  Interpretation
                </li>
                <li className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] marker:text-[#C85A3C]">
                  Real-time clarity
                </li>
                <li className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] marker:text-[#C85A3C]">
                  Real-time alignment
                </li>
              </ul>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                Workshops are interactive. Teams name what's real. We slow moments down. We build alignment and clarity in the room — not six months later.
              </p>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                And while I have themes I return to, I will shape seminars around what leaders actually need… as long as those needs align with my philosophy, values, and lived experience.
              </p>
              <p className="text-lg sm:text-xl leading-relaxed text-[#1A1A1A] italic font-serif">
                No two teams get the same session. No two rooms get the same moment.
              </p>
            </div>
          </div>
        </section>

        {/* Section 7: Where Speaking Fits Inside Archetype Original */}
        <section className="w-full bg-white py-16 sm:py-24 md:py-32">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="flex items-center mb-8 sm:mb-10">
                <div className="w-1 h-10 sm:h-12 md:h-14 bg-[#C85A3C] mr-4 sm:mr-6"></div>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#1A1A1A] font-serif tracking-tight leading-tight">
                  Where Speaking Fits Inside Archetype Original
                </h2>
              </div>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                Everything inside AO rests on a simple structure:
              </p>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                <strong className="text-[#1A1A1A]">Philosophy → Culture Science → Methods</strong>
              </p>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                The Principle → The Proof → The Practice
              </p>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                When I speak, I'm bringing all three into the room:
              </p>
              <div className="space-y-4">
                <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                  <strong className="text-[#1A1A1A]">The Principle</strong>
                </p>
                <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] pl-4">
                  What servant leadership actually is. Not the slogan version — the lived version.
                </p>
              </div>
              <div className="space-y-4">
                <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                  <strong className="text-[#1A1A1A]">The Proof</strong>
                </p>
                <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] pl-4">
                  What research and experience show about why it works.
                </p>
              </div>
              <div className="space-y-4">
                <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                  <strong className="text-[#1A1A1A]">The Practice</strong>
                </p>
                <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] pl-4">
                  How leaders and teams can act on it the next morning.
                </p>
              </div>
              <p className="text-lg sm:text-xl leading-relaxed text-[#1A1A1A] italic font-serif">
                That's why these talks land. They're not stories on a stage. They're leadership in real time.
              </p>
            </div>
          </div>
        </section>

        {/* Section 8: Formats Available */}
        <section className="w-full bg-[#FAFAF9] py-16 sm:py-24 md:py-32">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="flex items-center mb-8 sm:mb-10">
                <div className="w-1 h-10 sm:h-12 md:h-14 bg-[#C85A3C] mr-4 sm:mr-6"></div>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#1A1A1A] font-serif tracking-tight leading-tight">
                  Formats Available
                </h2>
              </div>
              <ul className="list-disc space-y-3 pl-6 sm:pl-8">
                <li className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] marker:text-[#C85A3C]">
                  30–45 minute keynote
                </li>
                <li className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] marker:text-[#C85A3C]">
                  60–90 minute leadership session
                </li>
                <li className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] marker:text-[#C85A3C]">
                  Half-day seminar
                </li>
                <li className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] marker:text-[#C85A3C]">
                  Full-day seminar
                </li>
                <li className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] marker:text-[#C85A3C]">
                  Team workshop
                </li>
                <li className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] marker:text-[#C85A3C]">
                  Leadership off-site
                </li>
                <li className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] marker:text-[#C85A3C]">
                  Executive roundtable
                </li>
                <li className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] marker:text-[#C85A3C]">
                  Multi-day leadership intensive
                </li>
              </ul>
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                In person or virtual.
              </p>
            </div>
          </div>
        </section>

        {/* Section 9: Who This Is For */}
        <section className="w-full bg-white py-16 sm:py-24 md:py-32">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="flex items-center mb-8 sm:mb-10">
                <div className="w-1 h-10 sm:h-12 md:h-14 bg-[#C85A3C] mr-4 sm:mr-6"></div>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#1A1A1A] font-serif tracking-tight leading-tight">
                  Who This Is For
                </h2>
              </div>
              <ul className="list-disc space-y-3 pl-6 sm:pl-8">
                <li className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] marker:text-[#C85A3C]">
                  Executives
                </li>
                <li className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] marker:text-[#C85A3C]">
                  Leadership teams
                </li>
                <li className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] marker:text-[#C85A3C]">
                  Founders
                </li>
                <li className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] marker:text-[#C85A3C]">
                  Department heads
                </li>
                <li className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] marker:text-[#C85A3C]">
                  Emerging leaders
                </li>
                <li className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] marker:text-[#C85A3C]">
                  Fast-growth companies
                </li>
                <li className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] marker:text-[#C85A3C]">
                  Organizations rebuilding trust or alignment
                </li>
                <li className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] marker:text-[#C85A3C]">
                  Companies preparing for transition
                </li>
                <li className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] marker:text-[#C85A3C]">
                  Off-sites, retreats, conferences, seminars, staff days
                </li>
              </ul>
              <p className="text-lg sm:text-xl leading-relaxed text-[#1A1A1A] italic font-serif">
                The value is consistent across formats: clarity, steadiness, alignment, and leadership that makes people better.
              </p>
            </div>
          </div>
        </section>

        {/* Section 10: Closing CTA */}
        <section className="w-full bg-[#FAFAF9] py-16 sm:py-24 md:py-32">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-3xl mx-auto text-center space-y-6">
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                If your team needs clarity, direction, or a recalibration of what leadership truly is — let's talk.
              </p>
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
      </div>
    </>
  );
}

