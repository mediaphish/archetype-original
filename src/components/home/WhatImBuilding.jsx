/**
 * What I'm Building Section
 * v0 Design - EXACT IMPLEMENTATION
 */
import React from 'react';

export default function WhatImBuilding() {
  return (
    <section className="py-32 bg-[#F5F5F5]" style={{backgroundImage: 'linear-gradient(to bottom, white 0%, white 30%, #F5F5F5 100%)'}}>
      <div className="container mx-auto px-6 md:px-12">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-[#2B2D2F] mb-4 font-serif">
            What I'm Building
          </h2>
          <p className="text-xl text-[#6B6B6B] max-w-3xl mx-auto leading-relaxed">
            Three interconnected pillars designed to help leaders build cultures where people actually want to work.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
          {/* Pillar 1: Mentoring */}
          <div className="bg-white rounded-2xl shadow-lg p-8 md:p-10 hover:shadow-xl hover:scale-[1.02] transition-all duration-300 group">
            <div className="w-16 h-16 bg-gradient-to-br from-[#C85A3C] to-[#E67E50] rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            
            <h3 className="text-2xl md:text-3xl font-bold text-[#2B2D2F] mb-4">
              Mentoring & Consulting
            </h3>
            
            <p className="text-lg leading-relaxed text-[#6B6B6B] mb-6">
              1:1 mentoring, team rebuilds, and workshops. Real transformation, not corporate platitudes.
            </p>
            
            <button className="w-full bg-[#C85A3C] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#B54A32] transition-colors duration-200 mb-3">
              Work With Me
            </button>
            
            <a href="/mentoring" className="block text-center text-[#C85A3C] font-medium hover:underline">
              Learn more from Archy →
            </a>
          </div>

          {/* Pillar 2: Culture Science */}
          <div className="bg-white rounded-2xl shadow-lg p-8 md:p-10 hover:shadow-xl hover:scale-[1.02] transition-all duration-300 group">
            <div className="w-16 h-16 bg-gradient-to-br from-[#6B6B6B] to-[#8B8B8B] rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            
            <h3 className="text-2xl md:text-3xl font-bold text-[#2B2D2F] mb-4">
              Culture Science
            </h3>
            
            <p className="text-lg leading-relaxed text-[#6B6B6B] mb-6">
              Evidence-based culture measurement. Know where you actually stand, not where you hope you are.
            </p>
            
            <button className="w-full bg-[#C85A3C] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#B54A32] transition-colors duration-200 mb-3">
              Explore Culture Science
            </button>
            
            <a href="/culture-science" className="block text-center text-[#C85A3C] font-medium hover:underline">
              Learn more from Archy →
            </a>
          </div>

          {/* Pillar 3: Leadership Education */}
          <div className="bg-white rounded-2xl shadow-lg p-8 md:p-10 hover:shadow-xl hover:scale-[1.02] transition-all duration-300 group">
            <div className="w-16 h-16 bg-gradient-to-br from-[#E67E50] to-[#F5A67A] rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            
            <h3 className="text-2xl md:text-3xl font-bold text-[#2B2D2F] mb-4">
              Leadership Education
            </h3>
            
            <p className="text-lg leading-relaxed text-[#6B6B6B] mb-6">
              Journal, playbooks, and resources to develop servant leaders who build others up.
            </p>
            
            <button className="w-full bg-[#C85A3C] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#B54A32] transition-colors duration-200 mb-3">
              Read the Journal
            </button>
            
            <a href="/journal" className="block text-center text-[#C85A3C] font-medium hover:underline">
              View Resources →
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
