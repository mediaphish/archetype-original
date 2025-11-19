/**
 * Anti-Projects Section
 * 
 * Purpose: Showcase anti-projects (Scoreboard Leadership, Bad Leader Project)
 * Content: Placeholder text - Bart will fill in real content
 * 
 * Props:
 * - heading: Section heading
 * - introText: Section intro text
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
    <section className="section bg-warm-offWhiteAlt">
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="h2 mb-6">{heading}</h2>
          <p className="p text-lg max-w-3xl mx-auto">{introText}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {antiProjects.map((project, index) => (
            <div
              key={index}
              className="bg-warm-offWhite border border-warm-border rounded-xl p-8 hover:shadow-lg transition-shadow"
            >
              <h3 className="h3 mb-4">{project.title}</h3>
              <p className="p mb-6">{project.description}</p>
              <a
                href={project.href}
                className="btn-cta inline-block"
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

