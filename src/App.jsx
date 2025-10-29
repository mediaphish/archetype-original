import React, { useState, useEffect } from "react";
import Header from "./components/Header.jsx";
import Hero from "./components/Hero.jsx";
import ChatApp from "./app/ChatApp.jsx";
import About from "./components/About.jsx";
import Contact from "./components/Contact.jsx";
import WhatWeDo from "./components/WhatWeDo.jsx";
import Journal from "./pages/Journal.jsx";
import JournalPost from "./pages/JournalPost.jsx";
import MentoringConsulting from "./pages/MentoringConsulting.jsx";
import SpeakingWorkshops from "./pages/SpeakingWorkshops.jsx";
import FractionalLeadership from "./pages/FractionalLeadership.jsx";

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
      } else if (path === '/mentoring-consulting') {
        setCurrentPage('mentoring-consulting');
      } else if (path === '/speaking-workshops') {
        setCurrentPage('speaking-workshops');
      } else if (path === '/fractional-leadership') {
        setCurrentPage('fractional-leadership');
      } else {
        setCurrentPage('home');
      }
    };

    // Listen for route changes
    window.addEventListener('popstate', handleRoute);
    handleRoute(); // Check initial route

    return () => window.removeEventListener('popstate', handleRoute);
  }, []);

  // Render Journal post page
  if (currentPage === 'journal-post') {
    return (
      <main className="bg-white text-black">
        <Header />
        <JournalPost />
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

  // Render Mentoring & Consulting page
  if (currentPage === 'mentoring-consulting') {
    return (
      <main className="bg-white text-black">
        <Header />
        <MentoringConsulting />
      </main>
    );
  }

  // Render Speaking & Workshops page
  if (currentPage === 'speaking-workshops') {
    return (
      <main className="bg-white text-black">
        <Header />
        <SpeakingWorkshops />
      </main>
    );
  }

  // Render Fractional Leadership page
  if (currentPage === 'fractional-leadership') {
    return (
      <main className="bg-white text-black">
        <Header />
        <FractionalLeadership />
      </main>
    );
  }

  // Render Home page
  return (
    <main className="bg-white text-black">
      <Header />
      <Hero />
      <ChatApp />
      <About />
      <WhatWeDo />
      <Contact />
    </main>
  );
}
