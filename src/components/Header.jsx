/**
 * Enhanced Navigation Component
 * Editorial Minimal Design with Dropdown Menus
 * Desktop: Right-aligned with secondary nav stacked above primary
 * Mobile: Side drawer with accordion submenus
 */
import React, { useState, useEffect } from 'react';

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [methodsDropdownOpen, setMethodsDropdownOpen] = useState(false);
  const [cultureScienceDropdownOpen, setCultureScienceDropdownOpen] = useState(false);
  const [currentPath, setCurrentPath] = useState('');

  useEffect(() => {
    // Get current path for active state
    const path = window.location.pathname;
    setCurrentPath(path);

    // Listen for route changes
    const handleRouteChange = () => {
      setCurrentPath(window.location.pathname);
      setMobileMenuOpen(false);
      setMethodsDropdownOpen(false);
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
    // Scroll to top when navigating to a new page (but not for hash links)
    if (!path.includes('#')) {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
    setMobileMenuOpen(false);
    setMethodsDropdownOpen(false);
    setCultureScienceDropdownOpen(false);
  };

  const isActive = (path) => {
    if (path === '/' && currentPath === '/') return true;
    if (path !== '/' && currentPath.startsWith(path)) return true;
    return false;
  };

  const navLinkClass = (path) => {
    const base = "text-base font-medium transition-all duration-200";
    const active = isActive(path) 
      ? "text-[#1A1A1A] border-b-2 border-[#1A1A1A]" 
      : "text-[#6B6B6B] hover:text-[#1A1A1A] hover:bg-[#FAFAF9] px-2 py-1 rounded-sm";
    return `${base} ${active}`;
  };

  return (
    <>
      <nav className="sticky top-0 z-50 bg-white border-b border-[#1A1A1A]/10 backdrop-blur-sm bg-white/95">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <a 
              href="/" 
              onClick={(e) => { e.preventDefault(); handleNavigation('/'); }}
              className="flex items-center"
            >
              <svg 
                id="Layer_1" 
                data-name="Layer 1" 
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 792 148.96"
                className="h-10 w-auto"
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

            {/* Desktop Navigation - Right Aligned */}
            <div className="hidden lg:flex items-center">
              <div className="flex flex-col items-end gap-2">
                {/* Secondary Navigation - Stacked Above */}
                <div className="flex items-center gap-4 text-sm">
                  <a 
                    href="/faqs" 
                    onClick={(e) => { e.preventDefault(); handleNavigation('/faqs'); }}
                    className={`flex items-center gap-1.5 transition-all duration-200 ${isActive('/faqs') ? 'text-[#1A1A1A]' : 'text-[#6B6B6B] hover:text-[#1A1A1A]'}`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-xs">FAQs</span>
                  </a>
                  <a 
                    href="/journal" 
                    onClick={(e) => { e.preventDefault(); handleNavigation('/journal'); }}
                    className={`flex items-center gap-1.5 transition-all duration-200 ${isActive('/journal') ? 'text-[#1A1A1A]' : 'text-[#6B6B6B] hover:text-[#1A1A1A]'}`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    <span className="text-xs">Journal</span>
                  </a>
                  <a 
                    href="/contact" 
                    onClick={(e) => { e.preventDefault(); handleNavigation('/contact'); }}
                    className={`flex items-center gap-1.5 transition-all duration-200 ${isActive('/contact') ? 'text-[#1A1A1A]' : 'text-[#6B6B6B] hover:text-[#1A1A1A]'}`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span className="text-xs">Contact</span>
                  </a>
                </div>

                {/* Primary Navigation */}
                <div className="flex items-center gap-6">
                  <a 
                    href="/about" 
                    onClick={(e) => { e.preventDefault(); handleNavigation('/about'); }}
                    className={navLinkClass('/about')}
                  >
                    About
                  </a>
                  
                  <a 
                    href="/philosophy" 
                    onClick={(e) => { e.preventDefault(); handleNavigation('/philosophy'); }}
                    className={navLinkClass('/philosophy')}
                  >
                    Philosophy
                  </a>

                  {/* Methods Dropdown */}
                  <div 
                    className="relative"
                    onMouseEnter={() => setMethodsDropdownOpen(true)}
                    onMouseLeave={() => setMethodsDropdownOpen(false)}
                  >
                    <button
                      className={`${navLinkClass('/methods')} flex items-center gap-1`}
                    >
                      Methods
                      <svg 
                        className={`w-4 h-4 transition-transform duration-200 ${methodsDropdownOpen ? 'rotate-180' : ''}`}
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {methodsDropdownOpen && (
                      <div className="absolute top-full right-0 pt-1 w-56">
                        <div className="bg-white border border-[#1A1A1A]/10 shadow-lg rounded-sm py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                        <a
                          href="/methods"
                          onClick={(e) => { e.preventDefault(); handleNavigation('/methods'); }}
                          className="block px-4 py-2 text-sm text-[#6B6B6B] hover:text-[#1A1A1A] hover:bg-[#FAFAF9] transition-all duration-200"
                        >
                          Overview
                        </a>
                        <a
                          href="/methods/mentorship"
                          onClick={(e) => { e.preventDefault(); handleNavigation('/methods/mentorship'); }}
                          className="block px-4 py-2 text-sm text-[#6B6B6B] hover:text-[#1A1A1A] hover:bg-[#FAFAF9] transition-all duration-200"
                        >
                          Mentorship
                        </a>
                        <a
                          href="/methods/consulting"
                          onClick={(e) => { e.preventDefault(); handleNavigation('/methods/consulting'); }}
                          className="block px-4 py-2 text-sm text-[#6B6B6B] hover:text-[#1A1A1A] hover:bg-[#FAFAF9] transition-all duration-200"
                        >
                          Consulting
                        </a>
                        <a
                          href="/methods/fractional-roles"
                          onClick={(e) => { e.preventDefault(); handleNavigation('/methods/fractional-roles'); }}
                          className="block px-4 py-2 text-sm text-[#6B6B6B] hover:text-[#1A1A1A] hover:bg-[#FAFAF9] transition-all duration-200"
                        >
                          Fractional Roles
                        </a>
                        <a
                          href="/methods/speaking-seminars"
                          onClick={(e) => { e.preventDefault(); handleNavigation('/methods/speaking-seminars'); }}
                          className="block px-4 py-2 text-sm text-[#6B6B6B] hover:text-[#1A1A1A] hover:bg-[#FAFAF9] transition-all duration-200"
                        >
                          Speaking & Seminars
                        </a>
                        <a
                          href="/methods/training-education"
                          onClick={(e) => { e.preventDefault(); handleNavigation('/methods/training-education'); }}
                          className="block px-4 py-2 text-sm text-[#6B6B6B] hover:text-[#1A1A1A] hover:bg-[#FAFAF9] transition-all duration-200"
                        >
                          Training & Education
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
                      className={`${navLinkClass('/culture-science')} flex items-center gap-1`}
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
                      <div className="absolute top-full right-0 pt-1 w-64">
                        <div className="bg-white border border-[#1A1A1A]/10 shadow-lg rounded-sm py-2 animate-in fade-in slide-in-from-top-2 duration-200">
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
                        <div className="border-t border-[#1A1A1A]/10 my-1"></div>
                        <a
                          href="/culture-science/research"
                          onClick={(e) => { e.preventDefault(); handleNavigation('/culture-science/research'); }}
                          className="block px-4 py-2 text-sm text-[#6B6B6B] hover:text-[#1A1A1A] hover:bg-[#FAFAF9] transition-all duration-200"
                        >
                          Research
                        </a>
                        <a
                          href="/culture-science/industry-reports"
                          onClick={(e) => { e.preventDefault(); handleNavigation('/culture-science/industry-reports'); }}
                          className="block px-4 py-2 text-sm text-[#6B6B6B] hover:text-[#1A1A1A] hover:bg-[#FAFAF9] transition-all duration-200"
                        >
                          Industry Reports
                        </a>
                        <a
                          href="/culture-science/ethics"
                          onClick={(e) => { e.preventDefault(); handleNavigation('/culture-science/ethics'); }}
                          className="block px-4 py-2 text-sm text-[#6B6B6B] hover:text-[#1A1A1A] hover:bg-[#FAFAF9] transition-all duration-200"
                        >
                          Ethics
                        </a>
                        </div>
                      </div>
                    )}
                  </div>

                  <a 
                    href="/archy" 
                    onClick={(e) => { e.preventDefault(); handleNavigation('/archy'); }}
                    className={navLinkClass('/archy')}
                  >
                    Meet Archy
                  </a>
                </div>
              </div>
            </div>

            {/* Mobile Menu Button - Animated Hamburger to X */}
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-[#1A1A1A] hover:bg-[#FAFAF9] rounded-sm transition-colors relative w-8 h-8"
              aria-label="Toggle menu"
            >
              <span className="sr-only">Toggle menu</span>
              <div className="absolute inset-0 flex items-center justify-center">
                {/* Hamburger Lines */}
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
      </nav>

      {/* Mobile Side Drawer */}
      <div 
        className={`lg:hidden fixed inset-0 z-50 transition-opacity duration-300 ${
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
            <div className="flex items-center justify-between p-6 border-b border-[#1A1A1A]/10">
              <h2 className="text-lg font-semibold text-[#1A1A1A]">Menu</h2>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 text-[#6B6B6B] hover:text-[#1A1A1A] hover:bg-[#FAFAF9] rounded-sm transition-colors"
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
                <a 
                  href="/about" 
                  onClick={(e) => { e.preventDefault(); handleNavigation('/about'); }}
                  className={`px-6 py-3 text-base font-medium transition-all duration-200 ${
                    isActive('/about') 
                      ? 'text-[#1A1A1A] bg-[#FAFAF9] border-l-4 border-[#C85A3C]' 
                      : 'text-[#6B6B6B] hover:text-[#1A1A1A] hover:bg-[#FAFAF9]'
                  }`}
                >
                  About
                </a>
                
                <a 
                  href="/philosophy" 
                  onClick={(e) => { e.preventDefault(); handleNavigation('/philosophy'); }}
                  className={`px-6 py-3 text-base font-medium transition-all duration-200 ${
                    isActive('/philosophy') 
                      ? 'text-[#1A1A1A] bg-[#FAFAF9] border-l-4 border-[#C85A3C]' 
                      : 'text-[#6B6B6B] hover:text-[#1A1A1A] hover:bg-[#FAFAF9]'
                  }`}
                >
                  Philosophy
                </a>

                {/* Methods Mobile Accordion */}
                <div>
                  <button
                    onClick={() => setMethodsDropdownOpen(!methodsDropdownOpen)}
                    className={`w-full px-6 py-3 text-base font-medium text-left transition-all duration-200 flex items-center justify-between ${
                      isActive('/methods') 
                        ? 'text-[#1A1A1A] bg-[#FAFAF9] border-l-4 border-[#C85A3C]' 
                        : 'text-[#6B6B6B] hover:text-[#1A1A1A] hover:bg-[#FAFAF9]'
                    }`}
                  >
                    Methods
                    <svg 
                      className={`w-5 h-5 transition-transform duration-200 ${methodsDropdownOpen ? 'rotate-180' : ''}`}
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {methodsDropdownOpen && (
                    <div className="bg-[#FAFAF9] space-y-1 animate-in slide-in-from-top-2 duration-200">
                      <a
                        href="/methods"
                        onClick={(e) => { e.preventDefault(); handleNavigation('/methods'); }}
                        className="block px-6 py-2 text-sm text-[#6B6B6B] hover:text-[#1A1A1A] hover:bg-white transition-all duration-200 pl-12"
                      >
                        Overview
                      </a>
                      <a
                        href="/methods/mentorship"
                        onClick={(e) => { e.preventDefault(); handleNavigation('/methods/mentorship'); }}
                        className="block px-6 py-2 text-sm text-[#6B6B6B] hover:text-[#1A1A1A] hover:bg-white transition-all duration-200 pl-12"
                      >
                        Mentorship
                      </a>
                      <a
                        href="/methods/consulting"
                        onClick={(e) => { e.preventDefault(); handleNavigation('/methods/consulting'); }}
                        className="block px-6 py-2 text-sm text-[#6B6B6B] hover:text-[#1A1A1A] hover:bg-white transition-all duration-200 pl-12"
                      >
                        Consulting
                      </a>
                      <a
                        href="/methods/fractional-roles"
                        onClick={(e) => { e.preventDefault(); handleNavigation('/methods/fractional-roles'); }}
                        className="block px-6 py-2 text-sm text-[#6B6B6B] hover:text-[#1A1A1A] hover:bg-white transition-all duration-200 pl-12"
                      >
                        Fractional Roles
                      </a>
                      <a
                        href="/methods/speaking-seminars"
                        onClick={(e) => { e.preventDefault(); handleNavigation('/methods/speaking-seminars'); }}
                        className="block px-6 py-2 text-sm text-[#6B6B6B] hover:text-[#1A1A1A] hover:bg-white transition-all duration-200 pl-12"
                      >
                        Speaking & Seminars
                      </a>
                      <a
                        href="/methods/training-education"
                        onClick={(e) => { e.preventDefault(); handleNavigation('/methods/training-education'); }}
                        className="block px-6 py-2 text-sm text-[#6B6B6B] hover:text-[#1A1A1A] hover:bg-white transition-all duration-200 pl-12"
                      >
                        Training & Education
                      </a>
                    </div>
                  )}
                </div>

                {/* Culture Science Mobile Accordion */}
                <div>
                  <button
                    onClick={() => setCultureScienceDropdownOpen(!cultureScienceDropdownOpen)}
                    className={`w-full px-6 py-3 text-base font-medium text-left transition-all duration-200 flex items-center justify-between ${
                      isActive('/culture-science') 
                        ? 'text-[#1A1A1A] bg-[#FAFAF9] border-l-4 border-[#C85A3C]' 
                        : 'text-[#6B6B6B] hover:text-[#1A1A1A] hover:bg-[#FAFAF9]'
                    }`}
                  >
                    Culture Science
                    <svg 
                      className={`w-5 h-5 transition-transform duration-200 ${cultureScienceDropdownOpen ? 'rotate-180' : ''}`}
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {cultureScienceDropdownOpen && (
                    <div className="bg-[#FAFAF9] space-y-1 animate-in slide-in-from-top-2 duration-200">
                      <a
                        href="/culture-science"
                        onClick={(e) => { e.preventDefault(); handleNavigation('/culture-science'); }}
                        className="block px-6 py-2 text-sm text-[#6B6B6B] hover:text-[#1A1A1A] hover:bg-white transition-all duration-200 pl-12"
                      >
                        Overview
                      </a>
                      <a
                        href="/culture-science/ali"
                        onClick={(e) => { e.preventDefault(); handleNavigation('/culture-science/ali'); }}
                        className="block px-6 py-2 text-sm text-[#6B6B6B] hover:text-[#1A1A1A] hover:bg-white transition-all duration-200 pl-12"
                      >
                        The Archetype Leadership Index (ALI)
                      </a>
                      <div className="px-6 py-2 text-xs font-medium text-[#6B6B6B] uppercase tracking-wider pl-12">
                        Anti-Projects
                      </div>
                      <a
                        href="/culture-science/anti-projects/scoreboard-leadership"
                        onClick={(e) => { e.preventDefault(); handleNavigation('/culture-science/anti-projects/scoreboard-leadership'); }}
                        className="block px-6 py-2 text-sm text-[#6B6B6B] hover:text-[#1A1A1A] hover:bg-white transition-all duration-200 pl-16"
                      >
                        Scoreboard Leadership
                      </a>
                      <a
                        href="/culture-science/anti-projects/bad-leader-project"
                        onClick={(e) => { e.preventDefault(); handleNavigation('/culture-science/anti-projects/bad-leader-project'); }}
                        className="block px-6 py-2 text-sm text-[#6B6B6B] hover:text-[#1A1A1A] hover:bg-white transition-all duration-200 pl-16"
                      >
                        The Bad Leader Project
                      </a>
                      <a
                        href="/culture-science/research"
                        onClick={(e) => { e.preventDefault(); handleNavigation('/culture-science/research'); }}
                        className="block px-6 py-2 text-sm text-[#6B6B6B] hover:text-[#1A1A1A] hover:bg-white transition-all duration-200 pl-12"
                      >
                        Research
                      </a>
                      <a
                        href="/culture-science/industry-reports"
                        onClick={(e) => { e.preventDefault(); handleNavigation('/culture-science/industry-reports'); }}
                        className="block px-6 py-2 text-sm text-[#6B6B6B] hover:text-[#1A1A1A] hover:bg-white transition-all duration-200 pl-12"
                      >
                        Industry Reports
                      </a>
                      <a
                        href="/culture-science/ethics"
                        onClick={(e) => { e.preventDefault(); handleNavigation('/culture-science/ethics'); }}
                        className="block px-6 py-2 text-sm text-[#6B6B6B] hover:text-[#1A1A1A] hover:bg-white transition-all duration-200 pl-12"
                      >
                        Ethics
                      </a>
                    </div>
                  )}
                </div>

                <a 
                  href="/archy" 
                  onClick={(e) => { e.preventDefault(); handleNavigation('/archy'); }}
                  className={`px-6 py-3 text-base font-medium transition-all duration-200 ${
                    isActive('/archy') 
                      ? 'text-[#1A1A1A] bg-[#FAFAF9] border-l-4 border-[#C85A3C]' 
                      : 'text-[#6B6B6B] hover:text-[#1A1A1A] hover:bg-[#FAFAF9]'
                  }`}
                >
                  Meet Archy
                </a>
              </div>
            </div>

            {/* Drawer Footer - FAQs, Journal and Contact at Bottom */}
            <div className="border-t border-[#1A1A1A]/10 p-6 space-y-3">
              <a 
                href="/faqs" 
                onClick={(e) => { e.preventDefault(); handleNavigation('/faqs'); }}
                className={`block px-4 py-3 text-base font-medium transition-all duration-200 rounded-sm ${
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
                className={`block px-4 py-3 text-base font-medium transition-all duration-200 rounded-sm ${
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
                className="block px-4 py-3 bg-[#1A1A1A] text-white font-medium text-center hover:bg-[#1A1A1A]/90 transition-all duration-200 rounded-sm"
              >
                Contact
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
