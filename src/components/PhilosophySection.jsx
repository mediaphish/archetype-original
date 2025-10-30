import React from "react";

export default function PhilosophySection() {
  return (
    <section className="section bg-white">
      <div className="container">
        <h2 className="h2">Philosophy</h2>
        <div className="max-w-3xl">
          <p className="p mt-2 font-semibold text-lg">
            Leadership isn't about control—it's about stewardship.
          </p>
          
          <p className="p mt-4">
            At Archetype Original, we believe the health of a team reflects the health of its leader. Culture is built through consistent standards, not slogans.
          </p>
          
          <p className="p mt-4">
            Real leadership is relational: it protects people, clarifies direction, and creates space for others to grow.
          </p>
          
          <p className="p mt-4">
            We reject quick-fix leadership trends that chase numbers over people.
          </p>
          
          <p className="p mt-4">
            <a className="underline" href="https://scoreboardleadership.com">Scoreboard Leadership</a> is only one example of that mindset—leaders competing with their own teams, measuring worth in wins instead of character.
          </p>
          
          <p className="p mt-4">
            The alternative is simple but difficult: serve first, communicate clearly, and take responsibility for the wake you leave behind.
          </p>
          
          <p className="p mt-4">
            When leaders embrace that kind of stewardship, organizations stop surviving chaos and start producing trust, excellence, and long-term impact.
          </p>
          
          <div className="mt-6">
            <a 
              href="/philosophy" 
              className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium"
            >
              Explore our philosophy →
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
