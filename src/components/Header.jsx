/**
 * Enhanced Navigation Component
 * Editorial Minimal Design with Dropdown Menus
 * Desktop: Right-aligned with secondary nav stacked above primary
 * Mobile: Side drawer with accordion submenus
 */
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [advisoryDropdownOpen, setAdvisoryDropdownOpen] = useState(false);
  const [meetBartDropdownOpen, setMeetBartDropdownOpen] = useState(false);
  const [cultureScienceDropdownOpen, setCultureScienceDropdownOpen] = useState(false);
  /** Mobile accordion: which section is expanded */
  const [mobileExpanded, setMobileExpanded] = useState(null);
  const [currentPath, setCurrentPath] = useState('');

  useEffect(() => {
    // Get current path for active state
    const path = window.location.pathname;
    setCurrentPath(path);

    // Listen for route changes
    const handleRouteChange = () => {
      setCurrentPath(window.location.pathname);
      setMobileMenuOpen(false);
      setAdvisoryDropdownOpen(false);
      setMeetBartDropdownOpen(false);
      setCultureScienceDropdownOpen(false);
    };

    window.addEventListener('popstate', handleRouteChange);
    window.addEventListener('routechange', handleRouteChange);

    return () => {
      window.removeEventListener('popstate', handleRouteChange);
      window.removeEventListener('routechange', handleRouteChange);
    };
  }, []);

  const handleNavigation = (path) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
    // Note: Scroll handling is now done in App.jsx based on navigation direction
    setMobileMenuOpen(false);
    setAdvisoryDropdownOpen(false);
    setMeetBartDropdownOpen(false);
    setCultureScienceDropdownOpen(false);
    setMobileExpanded(null);
  };

  const isActive = (path) => {
    if (path === '/' && currentPath === '/') return true;
    if (path !== '/' && currentPath.startsWith(path)) return true;
    return false;
  };

  const navLinkClass = (path) => {
    const base =
      "text-sm font-medium tracking-wide transition-all duration-200 whitespace-nowrap";
    const active = isActive(path)
      ? "text-[#1A1A1A] border-b-2 border-[#1A1A1A]"
      : "text-[#6B6B6B] hover:text-[#1A1A1A] hover:bg-[#FAFAF9] px-1.5 py-0.5 rounded-sm";
    return `${base} ${active}`;
  };

  const inactivePrimaryNavClass =
    "text-sm font-medium tracking-wide transition-all duration-200 whitespace-nowrap text-[#6B6B6B] hover:text-[#1A1A1A] hover:bg-[#FAFAF9] px-1.5 py-0.5 rounded-sm";
  const advisoryGroupActive =
    isActive('/advisory') || isActive('/consulting') || isActive('/fractional-roles');
  /** Public marketing page only — not /operators/login or app subroutes */
  const isOperatorsLandingNav = currentPath === '/operators';

  return (
    <>
      <nav className="sticky top-0 z-50 border-b border-[#1A1A1A]/10 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-10 xl:px-14">
          <div className="flex flex-col py-1 sm:py-1">
            {/* Secondary Navigation - Top Row */}
            <div className="hidden md:flex items-center justify-end gap-6 text-[11px] font-normal text-[#6B6B6B] mb-1 border-b border-transparent">
              <a 
                href="/faqs" 
                onClick={(e) => { e.preventDefault(); handleNavigation('/faqs'); }}
                className={`flex items-center gap-1.5 transition-all duration-200 ${isActive('/faqs') ? 'text-[#1A1A1A]' : 'text-[#6B6B6B] hover:text-[#1A1A1A]'}`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="uppercase tracking-wide">FAQs</span>
              </a>
              <a 
                href="/journal" 
                onClick={(e) => { e.preventDefault(); handleNavigation('/journal'); }}
                className={`flex items-center gap-1.5 transition-all duration-200 ${isActive('/journal') ? 'text-[#1A1A1A]' : 'text-[#6B6B6B] hover:text-[#1A1A1A]'}`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <span className="uppercase tracking-wide">Journal</span>
              </a>
              <a 
                href="/books" 
                onClick={(e) => { e.preventDefault(); handleNavigation('/books'); }}
                className={`flex items-center gap-1.5 transition-all duration-200 ${isActive('/books') ? 'text-[#1A1A1A]' : 'text-[#6B6B6B] hover:text-[#1A1A1A]'}`}
              >
                <span className="uppercase tracking-wide">Books</span>
              </a>
              <a 
                href="/contact" 
                onClick={(e) => { e.preventDefault(); handleNavigation('/contact'); }}
                className={`flex items-center gap-1.5 transition-all duration-200 ${isActive('/contact') ? 'text-[#1A1A1A]' : 'text-[#6B6B6B] hover:text-[#1A1A1A]'}`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span className="uppercase tracking-wide">Contact</span>
              </a>
            </div>

            {/* Primary row: logo | centered nav | CTA (desktop); matches reference proportion */}
            <div className="relative flex min-h-[44px] items-center justify-between gap-3 md:min-h-[48px] md:gap-6">
              {/* Logo - Left Side */}
              <a 
                href="/" 
                onClick={(e) => { e.preventDefault(); handleNavigation('/'); }}
                className="relative z-10 flex shrink-0 items-center min-w-0"
              >
                <svg 
                  id="Layer_1" 
                  data-name="Layer 1" 
                  xmlns="http://www.w3.org/2000/svg" 
                  viewBox="0 0 792 148.96"
                  className="h-8 w-auto sm:h-9 md:h-9"
                >
                  <defs>
                    <style>{`.cls-1 { fill: #231f20; }`}</style>
                  </defs>
                  <g>
                    <path className="cls-1" d="M174.38,53.46l23.74,42.02h-11.5l-2.87-5.51h-18.76l-2.87,5.51h-11.27l23.52-42.02ZM168.99,82.31h10.83l-5.43-10.38-5.4,10.38Z"/>
                    <path className="cls-1" d="M234.73,95.49h-11.95l-10.16-15.11h-2.04v15.11h-10.11v-42.06h13.89c10.31,0,16.39,5.87,16.39,13.58,0,5.36-3.01,9.7-8.27,11.89l12.25,16.59ZM210.58,62.25v10.16h3.73c4.24,0,6.18-2.25,6.18-5.05s-1.89-5.11-6.18-5.11h-3.73Z"/>
                    <path className="cls-1" d="M233.97,74.4c0-12.61,9.9-22.05,23.13-22.05,5.82,0,10.21,1.74,12.35,2.86v10.06c-3.32-1.94-7.61-3.78-12.56-3.78-7.45,0-12.51,5.05-12.51,12.91s5.05,13.02,12.51,13.02c5,0,9.24-1.84,12.56-3.78v10.06c-2.2,1.12-6.33,2.91-12.4,2.91-13.38,0-23.07-9.19-23.07-22.21Z"/>
                    <path className="cls-1" d="M274.71,95.49v-42.06h10.21v16.08h15.26v-16.08h10.21v42.06h-10.21v-16.9h-15.26v16.9h-10.21Z"/>
                    <path className="cls-1" d="M316.31,95.49v-42.06h27.57v9.09h-17.41v7.1h14.19v8.88h-14.19v7.91h18.28v9.09h-28.44Z"/>
                    <path className="cls-1" d="M357.51,95.49v-32.98h-10.72v-9.09h31.6v9.09h-10.67v32.98h-10.21Z"/>
                    <path className="cls-1" d="M394.27,95.49v-18.17l-14.86-23.89h11.59l8.53,14.7,8.58-14.7h11.33l-15.21,23.89v18.17h-9.95Z"/>
                    <path className="cls-1" d="M421.94,95.49v-42.06h14.04c10.52,0,16.64,6.33,16.64,14.09s-6.13,14.19-16.64,14.19h-3.83v13.78h-10.21ZM432.1,72.77h3.88c4.54,0,6.38-2.4,6.38-5.26s-1.79-5.16-6.38-5.16h-3.88v10.41Z"/>
                    <path className="cls-1" d="M457.32,95.49v-42.06h27.57v9.09h-17.41v7.1h14.19v8.88h-14.19v7.91h18.28v9.09h-28.44Z"/>
                  </g>
                  <g>
                    <path className="cls-1" d="M510.06,74.45c0-11.91,9.64-21.31,21.5-21.31s21.55,9.39,21.55,21.31-9.64,21.36-21.55,21.36-21.5-9.44-21.5-21.36ZM544.32,74.45c0-8.06-5.59-13.59-12.75-13.59s-12.7,5.54-12.7,13.59,5.59,13.59,12.7,13.59,12.75-5.54,12.75-13.59Z"/>
                    <path className="cls-1" d="M590.5,94.82h-10.28l-11.02-14.88h-2.32v14.88h-8.5v-40.74h12.75c9.69,0,15.47,5.64,15.47,13,0,5.39-3.26,9.79-8.8,11.77l12.71,15.97ZM566.87,61.55v11.47h4.2c4.65,0,6.87-2.57,6.87-5.73s-2.18-5.74-6.87-5.74h-4.2Z"/>
                    <path className="cls-1" d="M593.22,94.82v-40.74h8.55v40.74h-8.55Z"/>
                    <path className="cls-1" d="M607.01,74.45c0-11.91,9.39-21.31,22.64-21.31,6.53,0,10.88,1.68,13.94,3.26v8.75c-4.15-2.47-8.45-4.25-13.94-4.25-8.6,0-13.84,5.49-13.84,13.55s5.39,13.64,13.45,13.64c2.97,0,5.14-.59,7.12-1.43v-6.62h-8.01v-7.12h16.12v18.44c-2.03,1.29-7.27,4.45-15.23,4.45-12.85,0-22.25-9.44-22.25-21.36Z"/>
                    <path className="cls-1" d="M650.57,94.82v-40.74h8.55v40.74h-8.55Z"/>
                    <path className="cls-1" d="M665.55,94.82v-41.23h2.22l24.72,24.87c-.05-3.31-.1-6.43-.1-9.94v-14.44h8.31v41.33h-2.47l-24.42-24.67c.05,3.31.1,6.57.1,9.89v14.19h-8.35Z"/>
                    <path className="cls-1" d="M723.96,53.59l20.49,41.23h-9.54l-2.52-6.03h-17.01l-2.52,6.03h-9.39l20.49-41.23ZM718.45,81.47h10.88l-5.44-12.95-5.44,12.95Z"/>
                    <path className="cls-1" d="M747.17,94.82v-40.74h8.55v33.02h15.18v7.71h-23.73Z"/>
                  </g>
                  <path className="cls-1" d="M46.9,132.71l33.09-49.17,33.09,49.17h25.8l-15.39-22.86c8.61-10.19,13.41-23.13,13.41-36.69,0-31.38-25.53-56.91-56.91-56.91s-56.91,25.53-56.91,56.91c0,13.56,4.80,26.50,13.41,36.69l-15.39,22.86h25.8ZM79.99,37.65c19.58,0,35.51,15.93,35.51,35.51,0,6.32-1.67,12.42-4.76,17.76l-30.75-45.69-30.75,45.69c-3.08-5.33-4.76-11.44-4.76-17.76,0-19.58,15.93-35.51,35.51-35.51Z"/>
                </svg>
              </a>

              {/* Desktop Navigation — centered in bar (reference layout) */}
              <div className="pointer-events-none absolute inset-x-0 top-1/2 hidden -translate-y-1/2 md:flex md:justify-center">
                <div className="pointer-events-auto flex max-w-[calc(100%-18rem)] items-center justify-center gap-2 lg:gap-4 xl:gap-5">
                  {/* Leadership Advisory */}
                  <div
                    className="relative"
                    onMouseEnter={() => setAdvisoryDropdownOpen(true)}
                    onMouseLeave={() => setAdvisoryDropdownOpen(false)}
                  >
                    <button
                      type="button"
                      className={`${
                        advisoryGroupActive ? navLinkClass('/advisory') : inactivePrimaryNavClass
                      } flex items-center gap-0.5`}
                    >
                      Leadership Advisory
                      <svg
                        className={`w-4 h-4 transition-transform duration-200 ${advisoryDropdownOpen ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {advisoryDropdownOpen && (
                      <div className="absolute left-0 top-full z-50 w-56 pt-1">
                        <div className="rounded-sm border border-[#1A1A1A]/10 bg-white py-2 shadow-lg">
                          <a
                            href="/advisory"
                            onClick={(e) => {
                              e.preventDefault();
                              handleNavigation('/advisory');
                            }}
                            className="block px-4 py-2 text-sm text-[#6B6B6B] hover:text-[#1A1A1A] hover:bg-[#FAFAF9]"
                          >
                            Leadership Advisory
                          </a>
                          <a
                            href="/fractional-roles"
                            onClick={(e) => {
                              e.preventDefault();
                              handleNavigation('/fractional-roles');
                            }}
                            className="block px-4 py-2 text-sm text-[#6B6B6B] hover:text-[#1A1A1A] hover:bg-[#FAFAF9]"
                          >
                            Fractional Roles
                          </a>
                          <div className="my-1 border-t border-[#1A1A1A]/10" />
                          <a
                            href="/consulting"
                            onClick={(e) => {
                              e.preventDefault();
                              handleNavigation('/consulting');
                            }}
                            className="block px-4 py-2 text-sm text-[#6B6B6B] hover:text-[#1A1A1A] hover:bg-[#FAFAF9]"
                          >
                            Consulting
                          </a>
                        </div>
                      </div>
                    )}
                  </div>

                  <a
                    href="/operators"
                    onClick={(e) => {
                      e.preventDefault();
                      handleNavigation('/operators');
                    }}
                    className={
                      isOperatorsLandingNav ? navLinkClass('/operators') : inactivePrimaryNavClass
                    }
                  >
                    The Operators
                  </a>

                  {/* Meet Bart */}
                  <div
                    className="relative"
                    onMouseEnter={() => setMeetBartDropdownOpen(true)}
                    onMouseLeave={() => setMeetBartDropdownOpen(false)}
                  >
                    <button
                      type="button"
                      className={`${navLinkClass('/meet-bart')} flex items-center gap-0.5`}
                    >
                      Meet Bart
                      <svg
                        className={`w-4 h-4 transition-transform duration-200 ${meetBartDropdownOpen ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {meetBartDropdownOpen && (
                      <div className="absolute left-0 top-full z-50 w-52 pt-1">
                        <div className="rounded-sm border border-[#1A1A1A]/10 bg-white py-2 shadow-lg">
                          <a
                            href="/meet-bart"
                            onClick={(e) => {
                              e.preventDefault();
                              handleNavigation('/meet-bart');
                            }}
                            className="block px-4 py-2 text-sm text-[#6B6B6B] hover:text-[#1A1A1A] hover:bg-[#FAFAF9]"
                          >
                            Meet Bart
                          </a>
                          <a
                            href="/archy"
                            onClick={(e) => {
                              e.preventDefault();
                              handleNavigation('/archy');
                            }}
                            className="block px-4 py-2 text-sm text-[#6B6B6B] hover:text-[#1A1A1A] hover:bg-[#FAFAF9]"
                          >
                            Meet Archy
                          </a>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Culture Science Dropdown */}
                  <div 
                    className="relative"
                    onMouseEnter={() => setCultureScienceDropdownOpen(true)}
                    onMouseLeave={() => setCultureScienceDropdownOpen(false)}
                  >
                    <button
                      className={`${navLinkClass('/culture-science')} flex items-center gap-0.5`}
                    >
                      Culture Science
                      <svg 
                        className={`w-4 h-4 transition-transform duration-200 ${cultureScienceDropdownOpen ? 'rotate-180' : ''}`}
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {cultureScienceDropdownOpen && (
                      <div className="absolute left-0 top-full z-50 w-64 pt-1 lg:left-1/2 lg:-translate-x-1/2">
                        <div className="animate-in fade-in slide-in-from-top-2 rounded-sm border border-[#1A1A1A]/10 bg-white py-2 shadow-lg duration-200">
                        <a
                          href="/culture-science"
                          onClick={(e) => { e.preventDefault(); handleNavigation('/culture-science'); }}
                          className="block px-4 py-2 text-sm text-[#6B6B6B] hover:text-[#1A1A1A] hover:bg-[#FAFAF9] transition-all duration-200"
                        >
                          Overview
                        </a>
                        <a
                          href="/culture-science/ali"
                          onClick={(e) => { e.preventDefault(); handleNavigation('/culture-science/ali'); }}
                          className="block px-4 py-2 text-sm text-[#6B6B6B] hover:text-[#1A1A1A] hover:bg-[#FAFAF9] transition-all duration-200"
                        >
                          The Archetype Leadership Index (ALI)
                        </a>
                        <div className="border-t border-[#1A1A1A]/10 my-1"></div>
                        <div className="px-4 py-2 text-xs font-medium text-[#6B6B6B] uppercase tracking-wider">
                          Anti-Projects
                        </div>
                        <a
                          href="/culture-science/anti-projects/scoreboard-leadership"
                          onClick={(e) => { e.preventDefault(); handleNavigation('/culture-science/anti-projects/scoreboard-leadership'); }}
                          className="block px-4 py-2 text-sm text-[#6B6B6B] hover:text-[#1A1A1A] hover:bg-[#FAFAF9] transition-all duration-200 pl-8"
                        >
                          Scoreboard Leadership
                        </a>
                        <a
                          href="/culture-science/anti-projects/bad-leader-project"
                          onClick={(e) => { e.preventDefault(); handleNavigation('/culture-science/anti-projects/bad-leader-project'); }}
                          className="block px-4 py-2 text-sm text-[#6B6B6B] hover:text-[#1A1A1A] hover:bg-[#FAFAF9] transition-all duration-200 pl-8"
                        >
                          The Bad Leader Project
                        </a>
                        </div>
                      </div>
                    )}
                  </div>

                </div>
              </div>

              {/* Primary CTA — anchored right */}
              <div className="relative z-10 ml-auto hidden shrink-0 md:block">
                <a
                  href="/engagement-inquiry"
                  onClick={(e) => {
                    e.preventDefault();
                    handleNavigation('/engagement-inquiry');
                  }}
                  className="inline-flex items-center rounded-[3px] bg-ao-red px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow-sm transition-all duration-200 hover:opacity-90 lg:px-5 lg:text-[13px]"
                >
                  Work Together
                </a>
              </div>

              {/* Mobile menu — same row as logo, top right (not full-width centered row) */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center p-2 text-[#1A1A1A] hover:bg-[#FAFAF9] rounded-sm transition-colors relative"
                aria-label="Toggle menu"
                aria-expanded={mobileMenuOpen}
              >
                <span className="sr-only">Toggle menu</span>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span
                    className={`absolute block h-0.5 w-6 bg-current transition-all duration-300 ${
                      mobileMenuOpen ? 'rotate-45 translate-y-0' : '-translate-y-2'
                    }`}
                  />
                  <span
                    className={`absolute block h-0.5 w-6 bg-current transition-all duration-300 ${
                      mobileMenuOpen ? 'opacity-0' : 'opacity-100'
                    }`}
                  />
                  <span
                    className={`absolute block h-0.5 w-6 bg-current transition-all duration-300 ${
                      mobileMenuOpen ? '-rotate-45 translate-y-0' : 'translate-y-2'
                    }`}
                  />
                </div>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile drawer portals to body so position:fixed is viewport-relative (ArchySlideContainer uses transform on an ancestor, which breaks fixed positioning inside it). */}
      {typeof document !== 'undefined' &&
        createPortal(
          <div
            className={`md:hidden fixed inset-0 z-[100] transition-opacity duration-300 ${
              mobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
            }`}
          >
        {/* Backdrop */}
        <div 
          className="absolute inset-0 bg-black/20"
          onClick={() => setMobileMenuOpen(false)}
        />

        {/* Drawer */}
        <div 
          className={`absolute right-0 top-0 h-full w-80 bg-white shadow-2xl transform transition-transform duration-300 ease-out ${
            mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="flex flex-col h-full">
            {/* Drawer Header */}
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-[#1A1A1A]/10">
              <h2 className="text-lg font-semibold text-[#1A1A1A]">Menu</h2>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center p-2 text-[#6B6B6B] hover:text-[#1A1A1A] hover:bg-[#FAFAF9] rounded-sm transition-colors"
                aria-label="Close menu"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Drawer Content - Scrollable */}
            <div className="flex-1 overflow-y-auto py-4">
              <div className="flex flex-col space-y-1">
                {/* Leadership Advisory */}
                <div>
                  <button
                    type="button"
                    onClick={() => setMobileExpanded(mobileExpanded === 'advisory' ? null : 'advisory')}
                    className={`w-full px-6 py-3 text-base font-medium text-left transition-all duration-200 flex items-center justify-between ${
                      advisoryGroupActive
                        ? 'text-[#1A1A1A] bg-[#FAFAF9] border-l-4 border-ao-red'
                        : 'text-[#6B6B6B] hover:text-[#1A1A1A] hover:bg-[#FAFAF9]'
                    }`}
                  >
                    Leadership Advisory
                    <svg className={`w-5 h-5 transition-transform duration-200 ${mobileExpanded === 'advisory' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {mobileExpanded === 'advisory' && (
                    <div className="bg-[#FAFAF9] py-1">
                      <a href="/advisory" onClick={(e) => { e.preventDefault(); handleNavigation('/advisory'); }} className="block min-h-[44px] px-6 py-2 pl-12 text-sm text-[#6B6B6B] hover:text-[#1A1A1A] hover:bg-white">Leadership Advisory</a>
                      <a href="/fractional-roles" onClick={(e) => { e.preventDefault(); handleNavigation('/fractional-roles'); }} className="block min-h-[44px] px-6 py-2 pl-12 text-sm text-[#6B6B6B] hover:text-[#1A1A1A] hover:bg-white">Fractional Roles</a>
                      <div className="mx-6 my-1 border-t border-[#1A1A1A]/10" />
                      <a href="/consulting" onClick={(e) => { e.preventDefault(); handleNavigation('/consulting'); }} className="block min-h-[44px] px-6 py-2 pl-12 text-sm text-[#6B6B6B] hover:text-[#1A1A1A] hover:bg-white">Consulting</a>
                    </div>
                  )}
                </div>

                <a
                  href="/operators"
                  onClick={(e) => {
                    e.preventDefault();
                    handleNavigation('/operators');
                  }}
                  className={`min-h-[44px] flex items-center px-6 py-3 text-base font-medium transition-all duration-200 ${
                    isOperatorsLandingNav
                      ? 'text-[#1A1A1A] bg-[#FAFAF9] border-l-4 border-ao-red'
                      : 'text-[#6B6B6B] hover:text-[#1A1A1A] hover:bg-[#FAFAF9]'
                  }`}
                >
                  The Operators
                </a>

                {/* Meet Bart */}
                <div>
                  <button
                    type="button"
                    onClick={() => setMobileExpanded(mobileExpanded === 'meet-bart' ? null : 'meet-bart')}
                    className={`w-full px-6 py-3 text-base font-medium text-left transition-all duration-200 flex items-center justify-between ${
                      isActive('/meet-bart')
                        ? 'text-[#1A1A1A] bg-[#FAFAF9] border-l-4 border-ao-red'
                        : 'text-[#6B6B6B] hover:text-[#1A1A1A] hover:bg-[#FAFAF9]'
                    }`}
                  >
                    Meet Bart
                    <svg className={`w-5 h-5 transition-transform duration-200 ${mobileExpanded === 'meet-bart' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {mobileExpanded === 'meet-bart' && (
                    <div className="bg-[#FAFAF9] py-1">
                      <a href="/meet-bart" onClick={(e) => { e.preventDefault(); handleNavigation('/meet-bart'); }} className="block min-h-[44px] px-6 py-2 pl-12 text-sm text-[#6B6B6B] hover:text-[#1A1A1A] hover:bg-white">Meet Bart</a>
                      <a href="/archy" onClick={(e) => { e.preventDefault(); handleNavigation('/archy'); }} className="block min-h-[44px] px-6 py-2 pl-12 text-sm text-[#6B6B6B] hover:text-[#1A1A1A] hover:bg-white">Meet Archy</a>
                    </div>
                  )}
                </div>

                <a href="/books" onClick={(e) => { e.preventDefault(); handleNavigation('/books'); }} className={`min-h-[44px] flex items-center px-6 py-3 text-base font-medium transition-all duration-200 ${isActive('/books') ? 'text-[#1A1A1A] bg-[#FAFAF9] border-l-4 border-ao-red' : 'text-[#6B6B6B] hover:text-[#1A1A1A] hover:bg-[#FAFAF9]'}`}>Books</a>

                {/* Culture Science Mobile Accordion */}
                <div>
                  <button
                    type="button"
                    onClick={() => setMobileExpanded(mobileExpanded === 'culture' ? null : 'culture')}
                    className={`min-h-[44px] w-full px-6 py-3 text-base font-medium text-left transition-all duration-200 flex items-center justify-between ${
                      isActive('/culture-science') 
                        ? 'text-[#1A1A1A] bg-[#FAFAF9] border-l-4 border-ao-red' 
                        : 'text-[#6B6B6B] hover:text-[#1A1A1A] hover:bg-[#FAFAF9]'
                    }`}
                  >
                    Culture Science
                    <svg 
                      className={`w-5 h-5 transition-transform duration-200 ${mobileExpanded === 'culture' ? 'rotate-180' : ''}`}
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {mobileExpanded === 'culture' && (
                    <div className="bg-[#FAFAF9] space-y-1 animate-in slide-in-from-top-2 duration-200">
                      <a
                        href="/culture-science"
                        onClick={(e) => { e.preventDefault(); handleNavigation('/culture-science'); }}
                        className="min-h-[44px] flex items-center px-6 py-2 text-sm text-[#6B6B6B] hover:text-[#1A1A1A] hover:bg-white transition-all duration-200 pl-12"
                      >
                        Overview
                      </a>
                      <a
                        href="/culture-science/ali"
                        onClick={(e) => { e.preventDefault(); handleNavigation('/culture-science/ali'); }}
                        className="min-h-[44px] flex items-center px-6 py-2 text-sm text-[#6B6B6B] hover:text-[#1A1A1A] hover:bg-white transition-all duration-200 pl-12"
                      >
                        The Archetype Leadership Index (ALI)
                      </a>
                      <div className="px-6 py-2 text-xs font-medium text-[#6B6B6B] uppercase tracking-wider pl-12">
                        Anti-Projects
                      </div>
                      <a
                        href="/culture-science/anti-projects/scoreboard-leadership"
                        onClick={(e) => { e.preventDefault(); handleNavigation('/culture-science/anti-projects/scoreboard-leadership'); }}
                        className="min-h-[44px] flex items-center px-6 py-2 text-sm text-[#6B6B6B] hover:text-[#1A1A1A] hover:bg-white transition-all duration-200 pl-16"
                      >
                        Scoreboard Leadership
                      </a>
                      <a
                        href="/culture-science/anti-projects/bad-leader-project"
                        onClick={(e) => { e.preventDefault(); handleNavigation('/culture-science/anti-projects/bad-leader-project'); }}
                        className="min-h-[44px] flex items-center px-6 py-2 text-sm text-[#6B6B6B] hover:text-[#1A1A1A] hover:bg-white transition-all duration-200 pl-16"
                      >
                        The Bad Leader Project
                      </a>
                    </div>
                  )}
                </div>

                {/* Work Together CTA Button - Mobile */}
                <a
                  href="/engagement-inquiry"
                  onClick={(e) => { e.preventDefault(); handleNavigation('/engagement-inquiry'); }}
                  className={`min-h-[44px] flex items-center justify-center px-6 py-3 text-base font-medium transition-all duration-200 ${
                    isActive('/engagement-inquiry') 
                      ? 'text-white bg-ao-red' 
                      : 'bg-ao-red text-white hover:opacity-90'
                  } rounded-[3px] mx-6 my-4 text-center`}
                >
                  Work Together
                </a>
              </div>
            </div>

            {/* Drawer Footer - FAQs, Journal and Contact at Bottom */}
            <div className="border-t border-[#1A1A1A]/10 p-4 sm:p-6 space-y-3">
              <a 
                href="/faqs" 
                onClick={(e) => { e.preventDefault(); handleNavigation('/faqs'); }}
                className={`min-h-[44px] flex items-center px-4 py-3 text-base font-medium transition-all duration-200 rounded-sm ${
                  isActive('/faqs') 
                    ? 'text-[#1A1A1A] bg-[#FAFAF9]' 
                    : 'text-[#6B6B6B] hover:text-[#1A1A1A] hover:bg-[#FAFAF9]'
                }`}
              >
                FAQs
              </a>
              <a 
                href="/journal" 
                onClick={(e) => { e.preventDefault(); handleNavigation('/journal'); }}
                className={`min-h-[44px] flex items-center px-4 py-3 text-base font-medium transition-all duration-200 rounded-sm ${
                  isActive('/journal') 
                    ? 'text-[#1A1A1A] bg-[#FAFAF9]' 
                    : 'text-[#6B6B6B] hover:text-[#1A1A1A] hover:bg-[#FAFAF9]'
                }`}
              >
                Journal
              </a>
              <a 
                href="/contact" 
                onClick={(e) => { e.preventDefault(); handleNavigation('/contact'); }}
                className="min-h-[44px] flex items-center justify-center px-4 py-3 bg-[#1A1A1A] text-white font-medium hover:bg-[#1A1A1A]/90 transition-all duration-200 rounded-sm"
              >
                Contact
              </a>
            </div>
          </div>
        </div>
      </div>,
            document.body
          )}
    </>
  );
}
