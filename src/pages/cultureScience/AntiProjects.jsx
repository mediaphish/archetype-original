/**
 * Anti-Projects Index Page
 * 
 * Purpose: Listing page for anti-projects
 * Content: Placeholder text - Bart will fill in real content
 */
import React from 'react';
import SEO from '../../components/SEO';

export default function AntiProjects() {
  const projects = [
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
    <>
      <SEO pageKey="anti-projects" />
      <div className="min-h-screen bg-warm-offWhite py-12 pt-28">
        <div className="container">
          <section className="mb-16 text-center">
            <h1 className="h1 mb-6">Anti-Projects</h1>
            <p className="p text-lg max-w-3xl mx-auto">
              Intro placeholder text here.
            </p>
          </section>

          <section>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {projects.map((project, index) => (
                <div
                  key={index}
                  className="bg-warm-offWhiteAlt border border-warm-border rounded-xl p-8 hover:shadow-lg transition-shadow"
                >
                  <h2 className="h3 mb-4">{project.title}</h2>
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
          </section>
        </div>
      </div>
    </>
  );
}

