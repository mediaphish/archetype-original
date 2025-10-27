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
      <div id="about">
        <About />
      </div>
      <div id="philosophy">
        <About />
      </div>
      <div id="methods">
        <About />
      </div>
      <div id="journal">
        <About />
      </div>
      <div id="contact">
        <Contact />
      </div>
      <footer className="py-8 border-t border-black">
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
