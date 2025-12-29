/**
 * Scripture Block Component
 * 
 * Displays ESV scripture text with reference.
 * Fetches scripture from ESV API on mount.
 */
import React, { useState, useEffect } from 'react';

export default function ScriptureBlock({ reference }) {
  const [scripture, setScripture] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!reference) {
      setLoading(false);
      return;
    }

    const fetchScripture = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/esv/passage?reference=${encodeURIComponent(reference)}`);
        const data = await response.json();

        if (data.error && !data.text) {
          setError(data.error);
        } else {
          setScripture(data);
        }
      } catch (err) {
        console.error('Error fetching scripture:', err);
        setError('Unable to load scripture');
      } finally {
        setLoading(false);
      }
    };

    fetchScripture();
  }, [reference]);

  if (!reference) {
    return null;
  }

  return (
    <div className="my-8 sm:my-10">
      <div className="bg-[#FAFAF9] border-l-4 border-[#C85A3C] p-6 sm:p-8 md:p-10">
        {loading ? (
          <div className="text-center py-4">
            <p className="text-[#6B6B6B] text-base sm:text-lg">Loading scripture...</p>
          </div>
        ) : error ? (
          <div>
            <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#1A1A1A] mb-2">
              {reference}
            </h3>
            <p className="text-[#6B6B6B] text-sm sm:text-base italic">
              {error}
            </p>
          </div>
        ) : scripture && scripture.text ? (
          <>
            <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#1A1A1A] mb-4">
              {scripture.reference}
            </h3>
            <div className="prose prose-lg max-w-none">
              <p className="text-base sm:text-lg leading-relaxed text-[#1A1A1A] whitespace-pre-line">
                {scripture.text}
              </p>
            </div>
          </>
        ) : (
          <div>
            <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#1A1A1A] mb-2">
              {reference}
            </h3>
            <p className="text-[#6B6B6B] text-sm sm:text-base italic">
              Scripture text unavailable
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

