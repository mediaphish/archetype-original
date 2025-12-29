/**
 * Scripture Block Component
 * 
 * Displays ESV scripture reference as a clickable link to esv.org
 * Links to the appropriate chapter/verse on ESV.org
 */
import React from 'react';
import { buildEsvUrl } from '../utils/esvUrl';

export default function ScriptureBlock({ reference }) {
  if (!reference) {
    return null;
  }

  const esvUrl = buildEsvUrl(reference);

  return (
    <div className="my-8 sm:my-10">
      <div className="bg-[#FAFAF9] border-l-4 border-[#C85A3C] p-6 sm:p-8 md:p-10">
        <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#1A1A1A] mb-4">
          {reference}
        </h3>
        {esvUrl ? (
          <a
            href={esvUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-[#C85A3C] hover:text-[#A0452E] font-medium text-base sm:text-lg transition-colors underline"
          >
            Read {reference} on ESV.org
            <svg 
              className="w-4 h-4" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" 
              />
            </svg>
          </a>
        ) : (
          <p className="text-[#6B6B6B] text-sm sm:text-base italic">
            Unable to generate link
          </p>
        )}
      </div>
    </div>
  );
}

