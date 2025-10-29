import React, { useState, useEffect } from "react";
import Header from "./components/Header.jsx";
import Hero from "./components/Hero.jsx";
import ChatApp from "./app/ChatApp.jsx";
import About from "./components/About.jsx";
import Contact from "./components/Contact.jsx";
import Journal from "./pages/Journal.jsx";
import JournalPost from "./pages/JournalPost.jsx";

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

  // Render Home page
  return (
    <main className="bg-white text-black">
      <Header />
      <Hero />
      <ChatApp />
      <About />
      <Contact />
    </main>
  );
}
