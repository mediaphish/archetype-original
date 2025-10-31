// src/components/Header.jsx
import React, { useState, useEffect } from 'react';

export default function Header() {
  const [isVisible, setIsVisible] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Check if current page is a sub-page
  const isSubPage = () => {
    const path = window.location.pathname;
    const subPages = ['/about', '/philosophy', '/methods', '/what-we-do', '/journal'];
    return subPages.some(subPage => path === subPage || path.startsWith(subPage + '/'));
  };

  useEffect(() => {
    // Check initial page state
    const checkInitialState = () => {
      if (isSubPage()) {
        // On sub-pages, always show header
        setIsVisible(true);
      } else {
        // On home page, check scroll position
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        setIsVisible(scrollTop > 50);
      }
    };

    checkInitialState();

    // Scroll handler for home page only
    const handleScroll = () => {
      if (!isSubPage()) {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        setIsVisible(scrollTop > 50);
      }
    };

    // Route change handler
    const handleRouteChange = () => {
      if (isSubPage()) {
        setIsVisible(true);
      } else {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        setIsVisible(scrollTop > 50);
      }
    };

    window.addEventListener('scroll', handleScroll);
    window.addEventListener('popstate', handleRouteChange);
    
    // Also check on pushState changes (client-side navigation)
    const originalPushState = window.history.pushState;
    window.history.pushState = function(...args) {
      originalPushState.apply(window.history, args);
      setTimeout(handleRouteChange, 0);
    };

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('popstate', handleRouteChange);
      window.history.pushState = originalPushState;
    };
  }, []);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 bg-warm-offWhite border-b border-warm-border transition-transform duration-300 ${isVisible ? 'translate-y-0' : '-translate-y-full'}`}>
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo - Responsive */}
          <div className="flex-shrink-0">
            <a href="/" className="hover:opacity-80 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-amber rounded p-1" aria-label="Archetype Original Home">
              <svg className="h-6 w-auto sm:h-8" viewBox="0 0 440.3 480.05" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <style>
                    {`.cls-1 { fill: #231f20; }`}
                  </style>
                </defs>
                <path className="cls-1" d="M382.77,349.91c32.17-38.09,50.13-86.46,50.13-137.17C432.89,95.44,337.46,0,220.15,0S7.41,95.44,7.41,212.74c0,50.71,17.95,99.07,50.13,137.17L0,435.38l66.37,44.67,153.78-228.46,153.78,228.46,66.37-44.67-57.53-85.47ZM105.18,279.12c-11.52-19.94-17.78-42.75-17.78-66.38,0-73.19,59.55-132.74,132.74-132.74s132.74,59.55,132.74,132.74c0,23.62-6.25,46.44-17.78,66.38l-114.97-170.8-114.97,170.8Z"/>
              </svg>
            </a>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            <a href="/about" className="text-warm-charcoal hover:text-amber transition-all duration-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber rounded px-2 py-1">About</a>
            <a href="/what-we-do" className="text-warm-charcoal hover:text-amber transition-all duration-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber rounded px-2 py-1">What We Do</a>
            <a href="/philosophy" className="text-warm-charcoal hover:text-amber transition-all duration-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber rounded px-2 py-1">Philosophy</a>
            <a href="/methods" className="text-warm-charcoal hover:text-amber transition-all duration-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber rounded px-2 py-1">Methods</a>
            <a href="/journal" className="text-warm-charcoal hover:text-amber transition-all duration-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber rounded px-2 py-1">Journal</a>
          </nav>

          {/* Mobile Menu Button */}
          <button
            onClick={toggleMobileMenu}
            className="md:hidden p-2 rounded-md text-warm-charcoal hover:bg-warm-border focus:outline-none focus:ring-2 focus:ring-amber"
            aria-label="Toggle mobile menu"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isMobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Navigation Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden mt-4 pb-4 border-t border-warm-border">
            <nav className="flex flex-col space-y-3 pt-4">
              <a href="/about" className="text-warm-charcoal hover:text-amber transition-all duration-300 text-sm py-3 min-h-[44px] flex items-center focus:outline-none focus:ring-2 focus:ring-amber rounded px-2" onClick={() => setIsMobileMenuOpen(false)}>About</a>
              <a href="/what-we-do" className="text-warm-charcoal hover:text-amber transition-all duration-300 text-sm py-3 min-h-[44px] flex items-center focus:outline-none focus:ring-2 focus:ring-amber rounded px-2" onClick={() => setIsMobileMenuOpen(false)}>What We Do</a>
              <a href="/philosophy" className="text-warm-charcoal hover:text-amber transition-all duration-300 text-sm py-3 min-h-[44px] flex items-center focus:outline-none focus:ring-2 focus:ring-amber rounded px-2" onClick={() => setIsMobileMenuOpen(false)}>Philosophy</a>
              <a href="/methods" className="text-warm-charcoal hover:text-amber transition-all duration-300 text-sm py-3 min-h-[44px] flex items-center focus:outline-none focus:ring-2 focus:ring-amber rounded px-2" onClick={() => setIsMobileMenuOpen(false)}>Methods</a>
              <a href="/journal" className="text-warm-charcoal hover:text-amber transition-all duration-300 text-sm py-3 min-h-[44px] flex items-center focus:outline-none focus:ring-2 focus:ring-amber rounded px-2" onClick={() => setIsMobileMenuOpen(false)}>Journal</a>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
