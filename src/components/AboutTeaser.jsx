import React from "react";

export default function AboutTeaser() {
  return (
    <section className="section bg-white">
      <div className="container">
        <h2 className="sr-only">About Bart</h2>
        <div className="max-w-3xl">
          <p className="p text-lg leading-relaxed">
            I didn't set out to be a leader. Leadership found me the day I gave up part of my income so a young designer could have health insurance. Since then I've built teams, defended people when it mattered, led through collapse and rebuilds, and learned that influence starts with responsibility. I work with executives and founders, but I'm just as committed to emerging leaders and students. Strength and humility can live in the same sentence—that's the kind of leader I help build.
          </p>
          <div className="mt-6">
            <a 
              href="/about" 
              className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
            >
              Read the full story →
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

