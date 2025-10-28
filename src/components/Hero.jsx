import React from "react";

export default function Hero() {
  return (
    <header className="py-4">
      <div className="container mx-auto px-4 text-center">
        <div className="flex justify-center">
          <a href="/" className="group relative overflow-hidden rounded-lg transition-all duration-300 hover:scale-105">
            <div className="flex items-center space-x-4">
              {/* Icon */}
              <svg className="h-16 w-auto" viewBox="0 0 440.3 480.05" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <style>
                    {`.cls-1 { fill: #231f20; }`}
                  </style>
                </defs>
                <path className="cls-1" d="M382.77,349.91c32.17-38.09,50.13-86.46,50.13-137.17C432.89,95.44,337.46,0,220.15,0S7.41,95.44,7.41,212.74c0,50.71,17.95,99.07,50.13,137.17L0,435.38l66.37,44.67,153.78-228.46,153.78,228.46,66.37-44.67-57.53-85.47ZM105.18,279.12c-11.52-19.94-17.78-42.75-17.78-66.38,0-73.19,59.55-132.74,132.74-132.74s132.74,59.55,132.74,132.74c0,23.62-6.25,46.44-17.78,66.38l-114.97-170.8-114.97,170.8Z"/>
              </svg>
              
              {/* Text with Capitana font */}
              <div className="flex flex-col">
                <span className="text-4xl font-black text-gray-900" style={{ fontFamily: 'Capitana, sans-serif', fontWeight: 800 }}>
                  ARCHETYPE
                </span>
                <span className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Capitana, sans-serif', fontWeight: 700 }}>
                  ORIGINAL
                </span>
              </div>
            </div>
            {/* Gradient wave overlay */}
            <div className="absolute inset-0 gradient-wave opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          </a>
        </div>
      </div>
    </header>
  );
}
