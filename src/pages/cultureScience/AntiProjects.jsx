/**
 * Anti-Projects Index Page
 * Editorial Minimal Design - Flat, no gradients/shadows
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
      <div className="min-h-screen bg-[#FAFAF9] py-16 sm:py-24 md:py-32 lg:py-40">
        <div className="container mx-auto px-4 sm:px-6 md:px-12">
          <div className="max-w-7xl mx-auto">
            <section className="mb-16 sm:mb-20 md:mb-24 text-center">
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#1A1A1A] mb-6 sm:mb-8 font-serif tracking-tight text-balance">
                Anti-Projects
              </h1>
              <p className="text-base sm:text-lg leading-relaxed text-[#6B6B6B] max-w-3xl mx-auto text-pretty">
                Intro placeholder text here.
              </p>
            </section>

            <section>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 max-w-4xl mx-auto">
                {projects.map((project, index) => (
                  <div
                    key={index}
                    className="bg-white border-l-[6px] border-[#C85A3C] border border-[#1A1A1A]/10 p-8 sm:p-10"
                  >
                    <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#1A1A1A] mb-4 sm:mb-6 font-serif tracking-tight">
                      {project.title}
                    </h2>
                    <p className="text-base sm:text-lg leading-relaxed text-[#6B6B6B] mb-6 sm:mb-8 text-pretty">
                      {project.description}
                    </p>
                    <a
                      href={project.href}
                      onClick={(e) => {
                        e.preventDefault();
                        window.history.pushState({}, '', project.href);
                        window.dispatchEvent(new PopStateEvent('popstate'));
                      }}
                      className="inline-block bg-[#1A1A1A] text-white px-8 sm:px-10 py-4 sm:py-5 font-medium text-sm sm:text-base hover:bg-[#1A1A1A]/90 transition-colors"
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
      </div>
    </>
  );
}
