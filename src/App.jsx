import React from "react";
import Header from "./components/Header.jsx";
import Hero from "./components/Hero.jsx";
import ChatApp from "./app/ChatApp.jsx";
import About from "./components/About.jsx";
import Contact from "./components/Contact.jsx";

export default function App() {
  return (
    <main className="bg-white text-black">
      <Header />
      <Hero />
      <ChatApp />
      
      {/* About Bart Section */}
      <section id="about" className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl font-bold text-black mb-8">About Bart</h2>
            <div className="prose prose-lg max-w-none text-black">
              <p className="text-xl leading-relaxed mb-6">
                Bart Paden is a lifelong builder — designer turned entrepreneur, founder turned mentor. 
                He's spent more than 32 years creating companies, growing people, and learning what makes both endure.
              </p>
              <p className="text-lg leading-relaxed">
                His journey spans startups, software, fitness, and leadership teams that learned to thrive under pressure. 
                Today he channels that experience into Archetype Original, helping others build what lasts — businesses, 
                teams, and lives with structure and soul.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Philosophy Section */}
      <section id="philosophy" className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl font-bold text-black mb-8">Philosophy</h2>
            <div className="grid md:grid-cols-2 gap-8 text-left">
              <div className="space-y-6">
                <div>
                  <h3 className="text-2xl font-semibold text-black mb-3">Clarity Beats Chaos</h3>
                  <p className="text-lg text-gray-700">People can't follow what they can't see. Clear direction creates momentum.</p>
                </div>
                <div>
                  <h3 className="text-2xl font-semibold text-black mb-3">Protect the Culture</h3>
                  <p className="text-lg text-gray-700">Values before convenience. Culture is what happens when you're not looking.</p>
                </div>
                <div>
                  <h3 className="text-2xl font-semibold text-black mb-3">Build Trust Daily</h3>
                  <p className="text-lg text-gray-700">It's math, not magic. Small promises kept compound into lasting relationships.</p>
                </div>
              </div>
              <div className="space-y-6">
                <div>
                  <h3 className="text-2xl font-semibold text-black mb-3">Empower Over Control</h3>
                  <p className="text-lg text-gray-700">Ownership outlasts oversight. Give people the space to own their work.</p>
                </div>
                <div>
                  <h3 className="text-2xl font-semibold text-black mb-3">Serve the Standard</h3>
                  <p className="text-lg text-gray-700">People rise to what you model. Leadership is lived, not lectured.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Methods Section */}
      <section id="methods" className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl font-bold text-black mb-8">Methods</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-white p-8 rounded-lg border-2 border-black">
                <h3 className="text-2xl font-semibold text-black mb-4">Business Consulting</h3>
                <p className="text-lg text-gray-700 mb-4">
                  Structure, alignment, and systems that hold when things get hard. 
                  We clarify direction, rebuild communication, and realign teams around shared goals.
                </p>
              </div>
              <div className="bg-white p-8 rounded-lg border-2 border-black">
                <h3 className="text-2xl font-semibold text-black mb-4">Leadership Mentorship</h3>
                <p className="text-lg text-gray-700 mb-4">
                  Building clarity, confidence, and the habits that make leadership sustainable. 
                  No jargon. No theory. Just the logic of how leadership actually works.
                </p>
              </div>
              <div className="bg-white p-8 rounded-lg border-2 border-black">
                <h3 className="text-2xl font-semibold text-black mb-4">Clarity Sessions</h3>
                <p className="text-lg text-gray-700 mb-4">
                  Rediscovering purpose, rebuilding confidence, and making better decisions 
                  after big transitions. Sometimes growth isn't about fixing a company.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Journal Section */}
      <section id="journal" className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl font-bold text-black mb-8">Journal</h2>
            <p className="text-xl text-gray-700 mb-8">
              Insights, stories, and lessons from three decades of building companies and growing people.
            </p>
            <div className="bg-gray-100 p-8 rounded-lg border-2 border-gray-300">
              <p className="text-lg text-gray-600">
                Journal content coming soon. For now, connect with Bart directly through the chat above 
                or schedule a conversation to explore your specific challenges.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl font-bold text-black mb-8">Contact</h2>
            <div className="bg-white p-8 rounded-lg border-2 border-black">
              <p className="text-xl text-black mb-6">
                Ready to build something that lasts? Let's start a conversation.
              </p>
              <div className="space-y-4">
                <a 
                  href="https://calendly.com/bartpaden" 
                  target="_blank" 
                  rel="noreferrer"
                  className="inline-block bg-black text-white px-8 py-4 text-lg hover:bg-gray-800 transition-colors rounded-lg"
                >
                  Schedule a Call
                </a>
                <p className="text-gray-600">
                  Or use the chat above to explore your challenges and see if we're a good fit.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="py-8 border-t border-black bg-white">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <p className="text-sm text-black">© 2025 Bart Paden · Archetype Original LLC</p>
          <nav className="text-sm flex items-center gap-4">
            <a className="underline text-black hover:text-gray-600" href="https://scoreboardleadership.com" rel="noreferrer">Scoreboard Leadership</a>
            <a className="underline text-black hover:text-gray-600" href="#contact">Contact</a>
          </nav>
        </div>
      </footer>
    </main>
  );
}
