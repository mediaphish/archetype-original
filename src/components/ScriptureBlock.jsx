/**
 * Scripture Block Component
 * 
 * Fetches and displays ESV scripture text from the API, with a link to esv.org
 */
import React, { useState, useEffect } from 'react';
import { buildEsvUrl } from '../utils/esvUrl';

export default function ScriptureBlock({ reference }) {
  const [scripture, setScripture] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!reference) {
      setLoading(false);
      return;
    }

    // Fetch scripture from our API endpoint
    const fetchScripture = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(`/api/esv/passage?reference=${encodeURIComponent(reference)}`);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch scripture');
        }
        
        const data = await response.json();
        setScripture(data);
      } catch (err) {
        console.error('Error fetching scripture:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchScripture();
  }, [reference]);

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
        
        {loading && (
          <p className="text-[#6B6B6B] text-sm sm:text-base italic">
            Loading scripture...
          </p>
        )}
        
        {error && (
          <div className="mb-4">
            <p className="text-[#C85A3C] text-sm sm:text-base mb-2">
              Unable to load scripture text: {error}
            </p>
            {esvUrl && (
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
            )}
          </div>
        )}
        
        {scripture && !error && (
          <>
            <div className="prose prose-lg max-w-none mb-6">
              <div 
                className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] whitespace-pre-wrap"
                dangerouslySetInnerHTML={{ 
                  __html: scripture.text
                    .replace(/\n\n/g, '</p><p class="mb-4">')
                    .replace(/^/, '<p class="mb-4">')
                    .replace(/$/, '</p>')
                }}
              />
            </div>
            
            {esvUrl && (
              <a
                href={esvUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-[#C85A3C] hover:text-[#A0452E] font-medium text-base sm:text-lg transition-colors underline"
              >
                Read on ESV.org
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
            )}
          </>
        )}
      </div>
    </div>
  );
}

