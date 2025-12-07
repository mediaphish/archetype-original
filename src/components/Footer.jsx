/**
 * Footer Component
 * Editorial Minimal Design - Site-wide navigation and links
 */
import React from 'react';

export default function Footer() {
  const handleLinkClick = (e, href) => {
    e.preventDefault();
    window.history.pushState({}, '', href);
    window.dispatchEvent(new PopStateEvent('popstate'));
    // Scroll to top when navigating to a new page (but not for hash links)
    if (!href.includes('#')) {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  };

  return (
    <footer className="bg-[#FAFAF9] border-t border-[#1A1A1A]/10 py-12 sm:py-16">
      <div className="container mx-auto px-4 sm:px-6 md:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-12">
            {/* About & Philosophy */}
            <div>
              <h3 className="font-serif font-bold text-lg sm:text-xl text-[#1A1A1A] mb-4">
                About
              </h3>
              <ul className="space-y-2">
                <li>
                  <a
                    href="/about"
                    onClick={(e) => handleLinkClick(e, '/about')}
                    className="text-sm sm:text-base text-[#6B6B6B] hover:text-[#1A1A1A] transition-colors"
                  >
                    About Bart
                  </a>
                </li>
                <li>
                  <a
                    href="/philosophy"
                    onClick={(e) => handleLinkClick(e, '/philosophy')}
                    className="text-sm sm:text-base text-[#6B6B6B] hover:text-[#1A1A1A] transition-colors"
                  >
                    Philosophy
                  </a>
                </li>
              </ul>
            </div>

            {/* Methods */}
            <div>
              <h3 className="font-serif font-bold text-lg sm:text-xl text-[#1A1A1A] mb-4">
                Methods
              </h3>
              <ul className="space-y-2">
                <li>
                  <a
                    href="/methods"
                    onClick={(e) => handleLinkClick(e, '/methods')}
                    className="text-sm sm:text-base text-[#6B6B6B] hover:text-[#1A1A1A] transition-colors"
                  >
                    How I Work
                  </a>
                </li>
                <li>
                  <a
                    href="/methods/mentorship"
                    onClick={(e) => handleLinkClick(e, '/methods/mentorship')}
                    className="text-sm sm:text-base text-[#6B6B6B] hover:text-[#1A1A1A] transition-colors"
                  >
                    Mentorship
                  </a>
                </li>
                <li>
                  <a
                    href="/methods/consulting"
                    onClick={(e) => handleLinkClick(e, '/methods/consulting')}
                    className="text-sm sm:text-base text-[#6B6B6B] hover:text-[#1A1A1A] transition-colors"
                  >
                    Consulting
                  </a>
                </li>
                <li>
                  <a
                    href="/methods/fractional-roles"
                    onClick={(e) => handleLinkClick(e, '/methods/fractional-roles')}
                    className="text-sm sm:text-base text-[#6B6B6B] hover:text-[#1A1A1A] transition-colors"
                  >
                    Fractional Roles
                  </a>
                </li>
                <li>
                  <a
                    href="/methods/speaking-seminars"
                    onClick={(e) => handleLinkClick(e, '/methods/speaking-seminars')}
                    className="text-sm sm:text-base text-[#6B6B6B] hover:text-[#1A1A1A] transition-colors"
                  >
                    Speaking & Seminars
                  </a>
                </li>
                <li>
                  <a
                    href="/methods/training-education"
                    onClick={(e) => handleLinkClick(e, '/methods/training-education')}
                    className="text-sm sm:text-base text-[#6B6B6B] hover:text-[#1A1A1A] transition-colors"
                  >
                    Training & Education
                  </a>
                </li>
              </ul>
            </div>

            {/* Culture Science */}
            <div>
              <h3 className="font-serif font-bold text-lg sm:text-xl text-[#1A1A1A] mb-4">
                Culture Science
              </h3>
              <ul className="space-y-2">
                <li>
                  <a
                    href="/culture-science"
                    onClick={(e) => handleLinkClick(e, '/culture-science')}
                    className="text-sm sm:text-base text-[#6B6B6B] hover:text-[#1A1A1A] transition-colors"
                  >
                    Culture Science
                  </a>
                </li>
                <li>
                  <a
                    href="/culture-science/ali"
                    onClick={(e) => handleLinkClick(e, '/culture-science/ali')}
                    className="text-sm sm:text-base text-[#6B6B6B] hover:text-[#1A1A1A] transition-colors"
                  >
                    ALI
                  </a>
                </li>
                <li>
                  <a
                    href="/culture-science/anti-projects/scoreboard-leadership"
                    onClick={(e) => handleLinkClick(e, '/culture-science/anti-projects/scoreboard-leadership')}
                    className="text-sm sm:text-base text-[#6B6B6B] hover:text-[#1A1A1A] transition-colors"
                  >
                    Scoreboard Leadership
                  </a>
                </li>
                <li>
                  <a
                    href="/culture-science/anti-projects/bad-leader-project"
                    onClick={(e) => handleLinkClick(e, '/culture-science/anti-projects/bad-leader-project')}
                    className="text-sm sm:text-base text-[#6B6B6B] hover:text-[#1A1A1A] transition-colors"
                  >
                    Bad Leader Project
                  </a>
                </li>
              </ul>
            </div>

            {/* Connect */}
            <div>
              <h3 className="font-serif font-bold text-lg sm:text-xl text-[#1A1A1A] mb-4">
                Connect
              </h3>
              <ul className="space-y-2">
                <li>
                  <a
                    href="/contact"
                    onClick={(e) => handleLinkClick(e, '/contact')}
                    className="text-sm sm:text-base text-[#6B6B6B] hover:text-[#1A1A1A] transition-colors"
                  >
                    Contact
                  </a>
                </li>
                <li>
                  <a
                    href="/journal"
                    onClick={(e) => handleLinkClick(e, '/journal')}
                    className="text-sm sm:text-base text-[#6B6B6B] hover:text-[#1A1A1A] transition-colors"
                  >
                    Journal
                  </a>
                </li>
                <li>
                  <a
                    href="/archy"
                    onClick={(e) => handleLinkClick(e, '/archy')}
                    className="text-sm sm:text-base text-[#6B6B6B] hover:text-[#1A1A1A] transition-colors"
                  >
                    Meet Archy
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Copyright */}
          <div className="mt-12 pt-8 border-t border-[#1A1A1A]/10 text-center">
            <p className="text-sm text-[#6B6B6B]">
              © {new Date().getFullYear()} Archetype Original. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

