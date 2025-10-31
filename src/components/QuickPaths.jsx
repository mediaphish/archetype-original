import React from "react";

export default function QuickPaths() {
  const paths = [
    {
      title: "Mentorship",
      description: "One-to-one guidance for executives, founders, and emerging leaders. Find your voice, make clean decisions, and lead without burning out.",
      link: "/what-we-do#mentorship",
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      )
    },
    {
      title: "Consulting",
      description: "Practical help for culture, org design, communication rhythms, and go-to-market alignment. Strategy that people can actually live with.",
      link: "/what-we-do#consulting",
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      )
    },
    {
      title: "Speaking & Workshops",
      description: "Keynotes, classroom talks, and team workshops that translate principles into practice—leadership, culture, team health, product & ops literacy.",
      link: "/what-we-do#speaking",
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      )
    },
    {
      title: "Fractional Leadership",
      description: "Temporary executive coverage to stabilize and scale—clear lanes, steady cadence, and a smooth handoff when you're strong again.",
      link: "/what-we-do#fractional",
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
        </svg>
      )
    }
  ];

  return (
    <section className="section bg-warm-offWhiteAlt">
      <div className="container">
        {/* Section Heading with Amber Accent */}
        <div className="text-center mb-12 md:mb-16">
          <h2 className="h2 mb-4">What I Do</h2>
          <div className="w-24 h-1 bg-amber mx-auto rounded-full"></div>
        </div>
        
        {/* Service Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12">
          {paths.map((path) => (
            <a
              key={path.link}
              href={path.link}
              className="group flex flex-col p-8 bg-warm-offWhite border border-warm-border rounded-lg hover:shadow-xl hover:scale-105 hover:border-amber transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-amber focus:ring-offset-2"
            >
              {/* Icon with Amber Accent */}
              <div className="mb-6 w-12 h-12 rounded-lg bg-amber/10 flex items-center justify-center text-amber group-hover:bg-amber/20 transition-colors">
                {path.icon}
              </div>
              
              {/* Card Content */}
              <div className="flex-grow flex flex-col">
                <h3 className="h3 mb-4 text-warm-charcoal">{path.title}</h3>
                <p className="p mb-6 flex-grow" style={{ lineHeight: '1.6' }}>
                  {path.description}
                </p>
                
                {/* Learn More Link */}
                <div className="mt-auto pt-4 border-t border-warm-border group-hover:border-amber/30 transition-colors">
                  <span className="text-amber font-semibold text-sm group-hover:text-amber-dark transition-colors inline-flex items-center gap-2">
                    Learn more
                    <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </span>
                </div>
              </div>
            </a>
          ))}
        </div>
        
        {/* CTA at end of Services section */}
        <div className="mt-16 text-center">
          <a
            href="/what-we-do"
            className="btn-cta text-lg"
          >
            Ready to Transform Your Leadership?
          </a>
        </div>
      </div>
    </section>
  );
}

