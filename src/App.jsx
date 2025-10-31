import React, { useState, useEffect } from "react";
import SEO from "./components/SEO";
import Header from "./components/Header";
import Hero from "./components/Hero";
import ChatApp from "./app/ChatApp";
import Contact from "./components/Contact";
import ValueStatement from "./components/ValueStatement";
import QuickPaths from "./components/QuickPaths";
import AboutTeaser from "./components/AboutTeaser";
import PhilosophyTeaser from "./components/PhilosophyTeaser";
import MethodsTeaser from "./components/MethodsTeaser";
import ProofBoxPsychology from "./components/ProofBoxPsychology";
import JournalHighlights from "./components/JournalHighlights";
import ClosingConfidence from "./components/ClosingConfidence";
import Journal from "./pages/Journal";
import JournalPost from "./pages/JournalPost";
import AboutPage from "./pages/About";
import PhilosophyPage from "./pages/Philosophy";
import MethodsPage from "./pages/Methods";
import WhatWeDoPage from "./pages/WhatWeDo";

export default function App() {
  const [currentPage, setCurrentPage] = useState('home');

  useEffect(() => {
    // Handle routing
    const handleRoute = () => {
      const path = window.location.pathname;
      if (path === '/journal') {
        setCurrentPage('journal');
      } else if (path.startsWith('/journal/')) {
        setCurrentPage('journal-post');
      } else if (path === '/about') {
        setCurrentPage('about');
      } else if (path === '/philosophy') {
        setCurrentPage('philosophy');
      } else if (path === '/methods') {
        setCurrentPage('methods');
      } else if (path === '/what-we-do') {
        setCurrentPage('what-we-do');
      } else {
        setCurrentPage('home');
      }
    };

    // Listen for route changes
    window.addEventListener('popstate', handleRoute);
    handleRoute(); // Check initial route

    return () => window.removeEventListener('popstate', handleRoute);
  }, []);

  // Render About page
  if (currentPage === 'about') {
    return (
      <main className="bg-warm-offWhite text-warm-charcoal">
        <Header />
        <AboutPage />
      </main>
    );
  }

  // Render Philosophy page
  if (currentPage === 'philosophy') {
    return (
      <main className="bg-warm-offWhite text-warm-charcoal">
        <Header />
        <PhilosophyPage />
      </main>
    );
  }

  // Render Methods page
  if (currentPage === 'methods') {
    return (
      <main className="bg-warm-offWhite text-warm-charcoal">
        <Header />
        <MethodsPage />
      </main>
    );
  }

  // Render What We Do page
  if (currentPage === 'what-we-do') {
    return (
      <main className="bg-warm-offWhite text-warm-charcoal">
        <Header />
        <WhatWeDoPage />
      </main>
    );
  }

  // Render Journal post page
  if (currentPage === 'journal-post') {
    return (
      <main className="bg-warm-offWhite text-warm-charcoal">
        <Header />
        <JournalPost />
      </main>
    );
  }

  // Render Journal page
  if (currentPage === 'journal') {
    return (
      <main className="bg-warm-offWhite text-warm-charcoal">
        <Header />
        <Journal />
      </main>
    );
  }

  // Render Home page
  return (
    <>
      <SEO pageKey="default" />
      <main className="bg-warm-offWhite text-warm-charcoal">
        <Header />
        <Hero />
        <ChatApp />
        {/* Hero CTA Section */}
        <section className="py-8 md:py-12 bg-warm-offWhite">
          <div className="container">
            <div className="text-center">
              <a
                href="/what-we-do"
                className="btn-cta"
                aria-label="Explore our services"
              >
                Explore Services
              </a>
            </div>
          </div>
        </section>
        <QuickPaths />
        <AboutTeaser />
        <ValueStatement />
        <PhilosophyTeaser />
        <MethodsTeaser />
        <ProofBoxPsychology />
        <JournalHighlights />
        <ClosingConfidence />
        <Contact />
      </main>
    </>
  );
}
