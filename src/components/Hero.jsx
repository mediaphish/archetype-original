import React from "react";

export default function Hero() {
  return (
    <header className="section">
      <div className="container text-center">
        <div className="badge mx-auto">Playbooks · Workshops · Speaking</div>
        <h1 className="h1 mt-6">Archetype Original</h1>
        <p className="p mt-4 max-w-2xl mx-auto">
          Build leaders worth following. Servant-led systems for clarity, culture, and compounding performance.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <a href="#playbooks" className="btn btn-primary">See Playbooks</a>
          <a href="#contact" className="btn">Book Bart</a>
        </div>
      </div>
    </header>
  );
}
