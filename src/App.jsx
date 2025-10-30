import React, { useState, useEffect } from "react";
import SEO from "./components/SEO.jsx";
import Header from "./components/Header.jsx";
import Hero from "./components/Hero.jsx";
import ChatApp from "./app/ChatApp.jsx";
import About from "./components/About.jsx";
import Philosophy from "./components/Philosophy.jsx";
import Methods from "./components/Methods.jsx";
import Contact from "./components/Contact.jsx";
import Journal from "./pages/Journal.jsx";
import AboutPage from "./pages/About.jsx";
import PhilosophyPage from "./pages/Philosophy.jsx";
import MethodsPage from "./pages/Methods.jsx";
import WhatWeDoPage from "./pages/WhatWeDo.jsx";

export default function App() {
  const [currentPage, setCurrentPage] = useState('home');

  useEffect(() => {
    // Handle routing
    const handleRoute = () => {
      const path = window.location.pathname;
      if (path === '/journal') {
        setCurrentPage('journal');
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
      <main className="bg-white text-black">
        <Header />
        <AboutPage />
      </main>
    );
  }

  // Render Philosophy page
  if (currentPage === 'philosophy') {
    return (
      <main className="bg-white text-black">
        <Header />
        <PhilosophyPage />
      </main>
    );
  }

  // Render Methods page
  if (currentPage === 'methods') {
    return (
      <main className="bg-white text-black">
        <Header />
        <MethodsPage />
      </main>
    );
  }

  // Render What We Do page
  if (currentPage === 'what-we-do') {
    return (
      <main className="bg-white text-black">
        <Header />
        <WhatWeDoPage />
      </main>
    );
  }

  // Render Journal page
  if (currentPage === 'journal') {
    return (
      <main className="bg-white text-black">
        <Header />
        <Journal />
      </main>
    );
  }

  // Render Home page
  return (
    <>
      <SEO pageKey="default" />
      <main className="bg-white text-black">
        <Header />
        <Hero />
        <ChatApp />
        <About />
        <Philosophy />
        <Methods />
        <Contact />
      </main>
    </>
  );
}