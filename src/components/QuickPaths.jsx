import React from "react";

export default function QuickPaths() {
  const paths = [
    {
      title: "Mentorship",
      description: "One-to-one guidance for executives, founders, and emerging leaders. Find your voice, make clean decisions, and lead without burning out.",
      link: "/what-we-do#mentorship"
    },
    {
      title: "Consulting",
      description: "Practical help for culture, org design, communication rhythms, and go-to-market alignment. Strategy that people can actually live with.",
      link: "/what-we-do#consulting"
    },
    {
      title: "Speaking & Workshops",
      description: "Keynotes, classroom talks, and team workshops that translate principles into practice—leadership, culture, team health, product & ops literacy.",
      link: "/what-we-do#speaking"
    },
    {
      title: "Fractional Leadership",
      description: "Temporary executive coverage to stabilize and scale—clear lanes, steady cadence, and a smooth handoff when you're strong again.",
      link: "/what-we-do#fractional"
    }
  ];

  return (
    <section className="section bg-gray-50">
      <div className="container">
        <h2 className="h2 mb-8">What We Do</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {paths.map((path) => (
            <a
              key={path.link}
              href={path.link}
              className="block p-6 bg-warm-offWhite border border-warm-border rounded-lg hover:shadow-lg transition-shadow focus:outline-none focus:ring-2 focus:ring-amber hover:border-amber/30"
            >
              <h3 className="h3 mb-3">{path.title}</h3>
              <p className="p mb-4">{path.description}</p>
              <span className="text-amber hover:text-amber-dark font-medium text-sm">
                Learn more →
              </span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

