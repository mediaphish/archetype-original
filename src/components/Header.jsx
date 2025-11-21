/**
 * Enhanced Navigation Component
 * v0 Design - EXACT IMPLEMENTATION
 */
import React, { useState } from 'react';

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavigation = (path) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
    setMobileMenuOpen(false);
  };

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-[#1A1A1A]/10">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <a href="/" className="flex items-center">
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

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-6 lg:gap-8">
            <a href="/#mentoring" className="text-base font-medium text-[#6B6B6B] hover:text-[#1A1A1A] transition-colors">
              Mentoring
            </a>
            <a href="/#culture-science" className="text-base font-medium text-[#6B6B6B] hover:text-[#1A1A1A] transition-colors">
              Culture Science
            </a>
            <a href="/journal" className="text-base font-medium text-[#6B6B6B] hover:text-[#1A1A1A] transition-colors">
              Journal
            </a>
            <a 
              href="/philosophy" 
              onClick={(e) => { e.preventDefault(); handleNavigation('/philosophy'); }}
              className="text-base font-medium text-[#6B6B6B] hover:text-[#1A1A1A] transition-colors"
            >
              Philosophy
            </a>
            <a 
              href="/methods" 
              onClick={(e) => { e.preventDefault(); handleNavigation('/methods'); }}
              className="text-base font-medium text-[#6B6B6B] hover:text-[#1A1A1A] transition-colors"
            >
              Methods
            </a>
            <a 
              href="/about" 
              onClick={(e) => { e.preventDefault(); handleNavigation('/about'); }}
              className="text-base font-medium text-[#6B6B6B] hover:text-[#1A1A1A] transition-colors"
            >
              About
            </a>
            <a href="/#archy" className="text-base font-medium text-[#6B6B6B] hover:text-[#1A1A1A] transition-colors">
              Meet Archy
            </a>
            <a href="/contact" className="px-8 py-3 bg-[#1A1A1A] text-white font-medium hover:bg-[#1A1A1A]/90 transition-colors">
              Contact
            </a>
          </div>

          {/* Mobile Menu Button */}
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-[#2B2D2F] hover:bg-gray-100 rounded-lg transition-colors"
          >
            {mobileMenuOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-200">
            <div className="flex flex-col space-y-4">
              <a href="/#mentoring" className="text-base font-medium text-[#6B6B6B] hover:text-[#1A1A1A] transition-colors" onClick={() => setMobileMenuOpen(false)}>
                Mentoring
              </a>
              <a href="/#culture-science" className="text-base font-medium text-[#6B6B6B] hover:text-[#1A1A1A] transition-colors" onClick={() => setMobileMenuOpen(false)}>
                Culture Science
              </a>
              <a href="/journal" className="text-base font-medium text-[#6B6B6B] hover:text-[#1A1A1A] transition-colors" onClick={() => setMobileMenuOpen(false)}>
                Journal
              </a>
              <a 
                href="/philosophy" 
                onClick={(e) => { e.preventDefault(); handleNavigation('/philosophy'); }}
                className="text-base font-medium text-[#6B6B6B] hover:text-[#1A1A1A] transition-colors"
              >
                Philosophy
              </a>
              <a 
                href="/methods" 
                onClick={(e) => { e.preventDefault(); handleNavigation('/methods'); }}
                className="text-base font-medium text-[#6B6B6B] hover:text-[#1A1A1A] transition-colors"
              >
                Methods
              </a>
              <a 
                href="/about" 
                onClick={(e) => { e.preventDefault(); handleNavigation('/about'); }}
                className="text-base font-medium text-[#6B6B6B] hover:text-[#1A1A1A] transition-colors"
              >
                About
              </a>
              <a href="/#archy" className="text-base font-medium text-[#6B6B6B] hover:text-[#1A1A1A] transition-colors" onClick={() => setMobileMenuOpen(false)}>
                Meet Archy
              </a>
              <a href="/contact" className="px-8 py-3 bg-[#1A1A1A] text-white font-medium hover:bg-[#1A1A1A]/90 transition-colors text-center min-h-[44px] flex items-center justify-center" onClick={() => setMobileMenuOpen(false)}>
                Contact
              </a>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
