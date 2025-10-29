// src/components/Header.jsx
import React, { useState, useEffect } from 'react';

export default function Header() {
  const [isVisible, setIsVisible] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      setIsVisible(scrollTop > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 transition-transform duration-300 ${isVisible ? 'translate-y-0' : '-translate-y-full'}`}>
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo - Responsive */}
          <div className="flex-shrink-0">
            <a href="/" className="hover:opacity-80 transition-opacity">
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
            <a href="#about" className="text-black hover:text-gray-600 transition-colors text-sm">About</a>
            <a href="#philosophy" className="text-black hover:text-gray-600 transition-colors text-sm">Philosophy</a>
            <a href="#methods" className="text-black hover:text-gray-600 transition-colors text-sm">Methods</a>
            <a href="/journal" className="text-black hover:text-gray-600 transition-colors text-sm">Journal</a>
            <a href="#contact" className="text-black hover:text-gray-600 transition-colors text-sm">Contact</a>
          </nav>

          {/* Mobile Menu Button */}
          <button
            onClick={toggleMobileMenu}
            className="md:hidden p-2 rounded-md text-black hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-500"
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
          <div className="md:hidden mt-4 pb-4 border-t border-gray-200">
            <nav className="flex flex-col space-y-3 pt-4">
              <a href="#about" className="text-black hover:text-gray-600 transition-colors text-sm py-2" onClick={() => setIsMobileMenuOpen(false)}>About</a>
              <a href="#philosophy" className="text-black hover:text-gray-600 transition-colors text-sm py-2" onClick={() => setIsMobileMenuOpen(false)}>Philosophy</a>
              <a href="#methods" className="text-black hover:text-gray-600 transition-colors text-sm py-2" onClick={() => setIsMobileMenuOpen(false)}>Methods</a>
              <a href="/journal" className="text-black hover:text-gray-600 transition-colors text-sm py-2" onClick={() => setIsMobileMenuOpen(false)}>Journal</a>
              <a href="#contact" className="text-black hover:text-gray-600 transition-colors text-sm py-2" onClick={() => setIsMobileMenuOpen(false)}>Contact</a>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
