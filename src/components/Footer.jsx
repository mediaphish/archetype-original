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
    <footer className="border-t border-white/10 bg-ao-dark py-12 sm:py-16 text-ao-bone">
      <div className="container mx-auto px-4 sm:px-6 md:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-12">
            {/* About & Philosophy */}
            <div>
              <h3 className="mb-4 font-sans text-[10px] font-bold uppercase tracking-[0.14em] text-ao-brown">
                About
              </h3>
              <ul className="space-y-2">
                <li>
                  <a
                    href="/meet-bart"
                    onClick={(e) => handleLinkClick(e, '/meet-bart')}
                    className="min-h-[44px] flex items-center py-2 text-sm text-[#a89e97] transition-colors hover:text-ao-bone sm:text-base"
                  >
                    About Bart
                  </a>
                </li>
                <li>
                  <a
                    href="/philosophy"
                    onClick={(e) => handleLinkClick(e, '/philosophy')}
                    className="min-h-[44px] flex items-center py-2 text-sm text-[#a89e97] transition-colors hover:text-ao-bone sm:text-base"
                  >
                    Philosophy
                  </a>
                </li>
                <li>
                  <a
                    href="/books"
                    onClick={(e) => handleLinkClick(e, '/books')}
                    className="min-h-[44px] flex items-center py-2 text-sm text-[#a89e97] transition-colors hover:text-ao-bone sm:text-base"
                  >
                    Books
                  </a>
                </li>
              </ul>
            </div>

            {/* Methods */}
            <div>
              <h3 className="mb-4 font-sans text-[10px] font-bold uppercase tracking-[0.14em] text-ao-brown">
                Methods
              </h3>
              <ul className="space-y-2">
                <li>
                  <a
                    href="/methods"
                    onClick={(e) => handleLinkClick(e, '/methods')}
                    className="min-h-[44px] flex items-center py-2 text-sm text-[#a89e97] transition-colors hover:text-ao-bone sm:text-base"
                  >
                    How I Work
                  </a>
                </li>
                <li>
                  <a
                    href="/methods/mentorship"
                    onClick={(e) => handleLinkClick(e, '/methods/mentorship')}
                    className="min-h-[44px] flex items-center py-2 text-sm text-[#a89e97] transition-colors hover:text-ao-bone sm:text-base"
                  >
                    Mentorship
                  </a>
                </li>
                <li>
                  <a
                    href="/methods/consulting"
                    onClick={(e) => handleLinkClick(e, '/methods/consulting')}
                    className="min-h-[44px] flex items-center py-2 text-sm text-[#a89e97] transition-colors hover:text-ao-bone sm:text-base"
                  >
                    Consulting
                  </a>
                </li>
                <li>
                  <a
                    href="/methods/fractional-roles"
                    onClick={(e) => handleLinkClick(e, '/methods/fractional-roles')}
                    className="min-h-[44px] flex items-center py-2 text-sm text-[#a89e97] transition-colors hover:text-ao-bone sm:text-base"
                  >
                    Fractional Roles
                  </a>
                </li>
                <li>
                  <a
                    href="/methods/speaking-seminars"
                    onClick={(e) => handleLinkClick(e, '/methods/speaking-seminars')}
                    className="min-h-[44px] flex items-center py-2 text-sm text-[#a89e97] transition-colors hover:text-ao-bone sm:text-base"
                  >
                    Speaking & Seminars
                  </a>
                </li>
                <li>
                  <a
                    href="/methods/training-education"
                    onClick={(e) => handleLinkClick(e, '/methods/training-education')}
                    className="min-h-[44px] flex items-center py-2 text-sm text-[#a89e97] transition-colors hover:text-ao-bone sm:text-base"
                  >
                    Training & Education
                  </a>
                </li>
                <li>
                  <a
                    href="/advisory"
                    onClick={(e) => handleLinkClick(e, '/advisory')}
                    className="min-h-[44px] flex items-center py-2 text-sm text-[#a89e97] transition-colors hover:text-ao-bone sm:text-base"
                  >
                    Leadership Advisory
                  </a>
                </li>
                <li>
                  <a
                    href="/the-room"
                    onClick={(e) => handleLinkClick(e, '/the-room')}
                    className="min-h-[44px] flex items-center py-2 text-sm text-[#a89e97] transition-colors hover:text-ao-bone sm:text-base"
                  >
                    The Room (book)
                  </a>
                </li>
              </ul>
            </div>

            {/* Culture Science */}
            <div>
              <h3 className="mb-4 font-sans text-[10px] font-bold uppercase tracking-[0.14em] text-ao-brown">
                Culture Science
              </h3>
              <ul className="space-y-2">
                <li>
                  <a
                    href="/culture-science"
                    onClick={(e) => handleLinkClick(e, '/culture-science')}
                    className="min-h-[44px] flex items-center py-2 text-sm text-[#a89e97] transition-colors hover:text-ao-bone sm:text-base"
                  >
                    Culture Science
                  </a>
                </li>
                <li>
                  <a
                    href="/culture-science/ali"
                    onClick={(e) => handleLinkClick(e, '/culture-science/ali')}
                    className="min-h-[44px] flex items-center py-2 text-sm text-[#a89e97] transition-colors hover:text-ao-bone sm:text-base"
                  >
                    ALI
                  </a>
                </li>
                <li>
                  <a
                    href="/culture-science/anti-projects/scoreboard-leadership"
                    onClick={(e) => handleLinkClick(e, '/culture-science/anti-projects/scoreboard-leadership')}
                    className="min-h-[44px] flex items-center py-2 text-sm text-[#a89e97] transition-colors hover:text-ao-bone sm:text-base"
                  >
                    Scoreboard Leadership
                  </a>
                </li>
                <li>
                  <a
                    href="/culture-science/anti-projects/bad-leader-project"
                    onClick={(e) => handleLinkClick(e, '/culture-science/anti-projects/bad-leader-project')}
                    className="min-h-[44px] flex items-center py-2 text-sm text-[#a89e97] transition-colors hover:text-ao-bone sm:text-base"
                  >
                    Bad Leader Project
                  </a>
                </li>
              </ul>
            </div>

            {/* Connect */}
            <div>
              <h3 className="mb-4 font-sans text-[10px] font-bold uppercase tracking-[0.14em] text-ao-brown">
                Connect
              </h3>
              <ul className="space-y-2">
                <li>
                  <a
                    href="/contact"
                    onClick={(e) => handleLinkClick(e, '/contact')}
                    className="min-h-[44px] flex items-center py-2 text-sm text-[#a89e97] transition-colors hover:text-ao-bone sm:text-base"
                  >
                    Contact
                  </a>
                </li>
                <li>
                  <a
                    href="/journal"
                    onClick={(e) => handleLinkClick(e, '/journal')}
                    className="min-h-[44px] flex items-center py-2 text-sm text-[#a89e97] transition-colors hover:text-ao-bone sm:text-base"
                  >
                    Journal
                  </a>
                </li>
                <li>
                  <a
                    href="/archy"
                    onClick={(e) => handleLinkClick(e, '/archy')}
                    className="min-h-[44px] flex items-center py-2 text-sm text-[#a89e97] transition-colors hover:text-ao-bone sm:text-base"
                  >
                    Meet Archy
                  </a>
                </li>
                <li>
                  <a
                    href="/engagement-inquiry"
                    onClick={(e) => handleLinkClick(e, '/engagement-inquiry')}
                    className="min-h-[44px] flex items-center py-2 text-sm text-[#a89e97] transition-colors hover:text-ao-bone sm:text-base"
                  >
                    Work Together
                  </a>
                </li>
                <li>
                  <a
                    href="/operators"
                    onClick={(e) => handleLinkClick(e, '/operators')}
                    className="min-h-[44px] flex items-center py-2 text-sm text-[#a89e97] transition-colors hover:text-ao-bone sm:text-base"
                  >
                    The Operators
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Social Links */}
          <div className="mt-12 border-t border-white/10 pt-8">
            <div className="flex justify-center items-center gap-4 mb-6">
              <a
                href="https://www.facebook.com/archetypeoriginal"
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded p-2 text-ao-brown/80 transition-colors hover:text-ao-bone"
                aria-label="Follow us on Facebook"
                title="Follow us on Facebook"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </a>
              <a
                href="https://www.instagram.com/archetypeoriginal"
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded p-2 text-ao-brown/80 transition-colors hover:text-ao-bone"
                aria-label="Follow us on Instagram"
                title="Follow us on Instagram"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>
              <a
                href="https://www.linkedin.com/company/archetypeoriginal"
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded p-2 text-ao-brown/80 transition-colors hover:text-ao-bone"
                aria-label="Follow us on LinkedIn"
                title="Follow us on LinkedIn"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Legal Links */}
          <div className="border-t border-white/10 pt-6">
            <div className="flex flex-col sm:flex-row justify-center items-center gap-4 sm:gap-6 mb-6">
              <a
                href="/privacy-policy"
                onClick={(e) => handleLinkClick(e, '/privacy-policy')}
                className="text-xs text-ao-brown transition-colors hover:text-ao-bone sm:text-sm"
              >
                Privacy Policy
              </a>
              <span className="hidden text-ao-brown sm:inline">•</span>
              <a
                href="/terms-and-conditions"
                onClick={(e) => handleLinkClick(e, '/terms-and-conditions')}
                className="text-xs text-ao-brown transition-colors hover:text-ao-bone sm:text-sm"
              >
                Terms and Conditions
              </a>
            </div>
            <p className="text-center text-sm text-ao-brown">
              © {new Date().getFullYear()} Archetype Original. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

