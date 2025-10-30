import React, { useState, useEffect } from "react";
import SEO from "./components/SEO";
import Header from "./components/Header";
import Hero from "./components/Hero";
import ChatApp from "./app/ChatApp";
import About from "./components/About";
import PhilosophySection from "./components/PhilosophySection.jsx";
import Methods from "./components/Methods";
import Contact from "./components/Contact";
import Journal from "./pages/Journal";
import AboutPage from "./pages/About";
// import PhilosophyPage from "./pages/Philosophy";
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
      } else if (path === '/about') {
        setCurrentPage('about');
      // } else if (path === '/philosophy') {
      //   setCurrentPage('philosophy');
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
  // if (currentPage === 'philosophy') {
  //   return (
  //     <main className="bg-white text-black">
  //       <Header />
  //       <PhilosophyPage />
  //     </main>
  //   );
  // }

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
        <PhilosophySection />
        <Methods />
        <Contact />
      </main>
    </>
  );
}
