import React from "react";

export default function AboutTeaser() {
  return (
    <section className="section bg-warm-offWhite">
      <div className="container">
        <h2 className="h2 mb-6">About Bart</h2>
        <div className="max-w-3xl">
          <p className="p">
            I didn't set out to be a leader. Leadership found me the day I gave up part of my income so a young designer could have health insurance. Since then I've built teams, defended people when it mattered, led through collapse and rebuilds, and learned that influence starts with responsibility. I work with executives and founders, but I'm just as committed to emerging leaders and students. Strength and humility can live in the same sentence—that's the kind of leader I help build.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4">
            <a 
              href="/about" 
              className="inline-flex items-center text-amber hover:text-amber-dark font-medium focus:outline-none focus:ring-2 focus:ring-amber rounded"
            >
              Read the full story →
            </a>
            <a
              href="#contact"
              className="btn-cta text-center"
            >
              Work With Me
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

