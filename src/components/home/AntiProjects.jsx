/**
 * Anti-Projects Section
 * 
 * v0 Design: Two-column grid with modern cards
 */
import React from 'react';

export default function AntiProjects({
  heading = "Anti-Projects",
  introText = "Intro text here"
}) {
  const antiProjects = [
    {
      title: "Scoreboard Leadership",
      description: "Description placeholder for Scoreboard Leadership anti-project.",
      href: "/culture-science/scoreboard-leadership"
    },
    {
      title: "Bad Leader Project",
      description: "Description placeholder for Bad Leader Project anti-project.",
      href: "/culture-science/bad-leader-project"
    }
  ];

  return (
    <section className="py-20 md:py-32 bg-light-grey">
      <div className="container max-w-7xl mx-auto px-4">
        <div className="text-center mb-12 md:mb-20">
          <h2 className="text-4xl font-bold text-charcoal mb-6">
            {heading}
          </h2>
          <p className="text-lg text-warm-grey leading-relaxed max-w-3xl mx-auto">
            {introText}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
          {antiProjects.map((project, index) => (
            <div
              key={index}
              className="card-modern"
            >
              <h3 className="text-2xl font-bold text-charcoal mb-4">
                {project.title}
              </h3>
              <p className="text-lg text-warm-grey leading-relaxed mb-6">
                {project.description}
              </p>
              <a
                href={project.href}
                className="btn-primary inline-block"
                aria-label={`Learn more about ${project.title}`}
              >
                Learn More
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
