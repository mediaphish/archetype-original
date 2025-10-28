// src/components/Header.jsx
import React, { useState, useEffect } from 'react';

export default function Header() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      setIsVisible(scrollTop > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 bg-white border-b border-black transition-transform duration-300 ${isVisible ? 'translate-y-0' : '-translate-y-full'}`}>
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo - Icon Only */}
          <div className="flex-shrink-0">
            <a href="/" className="hover:opacity-80 transition-opacity">
              <svg className="h-8 w-auto" viewBox="0 0 440.3 480.05" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <style>
                    {`.cls-1 { fill: #231f20; }`}
                  </style>
                </defs>
                <path className="cls-1" d="M382.77,349.91c32.17-38.09,50.13-86.46,50.13-137.17C432.89,95.44,337.46,0,220.15,0S7.41,95.44,7.41,212.74c0,50.71,17.95,99.07,50.13,137.17L0,435.38l66.37,44.67,153.78-228.46,153.78,228.46,66.37-44.67-57.53-85.47ZM105.18,279.12c-11.52-19.94-17.78-42.75-17.78-66.38,0-73.19,59.55-132.74,132.74-132.74s132.74,59.55,132.74,132.74c0,23.62-6.25,46.44-17.78,66.38l-114.97-170.8-114.97,170.8Z"/>
              </svg>
            </a>
          </div>

          {/* Navigation - floated right */}
          <nav className="flex items-center space-x-6">
            <a href="#about" className="text-black hover:text-gray-600 transition-colors text-sm">About</a>
            <a href="#philosophy" className="text-black hover:text-gray-600 transition-colors text-sm">Philosophy</a>
            <a href="#methods" className="text-black hover:text-gray-600 transition-colors text-sm">Methods</a>
            <a href="#journal" className="text-black hover:text-gray-600 transition-colors text-sm">Journal</a>
            <a href="#contact" className="text-black hover:text-gray-600 transition-colors text-sm">Contact</a>
          </nav>
        </div>
      </div>
    </header>
  );
}
