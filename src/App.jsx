import React from "react";
import Hero from "./components/Hero.jsx";
import WhatWeDo from "./components/WhatWeDo.jsx";
import Playbooks from "./components/Playbooks.jsx";
import Speaking from "./components/Speaking.jsx";
import About from "./components/About.jsx";
import Contact from "./components/Contact.jsx";

export default function App() {
  return (
    <main>
      <Hero />
      <WhatWeDo />
      <Playbooks />
      <Speaking />
      <About />
      <Contact />
      <footer className="section border-t">
        <div className="container flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <p className="text-sm text-slate-500">© 2025 Bart Paden · Archetype Original LLC</p>
          <nav className="text-sm flex items-center gap-4">
            <a className="underline" href="https://scoreboardleadership.com" rel="noreferrer">Scoreboard Leadership</a>
            <a className="underline" href="#contact">Contact</a>
          </nav>
        </div>
      </footer>
    </main>
  );
}
