/**
 * ESV Copyright Footer Component
 * 
 * Displays the required ESV copyright notice at the bottom of devotional pages.
 */
import React from 'react';

export default function ESVCopyright() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-12 sm:mt-16 pt-8 sm:pt-10 border-t border-[#1A1A1A]/10">
      <p className="text-xs text-[#6B6B6B] leading-relaxed max-w-4xl">
        Scripture quotations are from the ESV® Bible (The Holy Bible, English Standard Version®), 
        © 2001 by Crossway, a publishing ministry of Good News Publishers. 
        ESV Text Edition: {currentYear}. 
        The ESV text may not be quoted in any publication made available to the public by a Creative Commons license. 
        The ESV may not be translated in whole or in part into any other language. 
        Used by permission. All rights reserved.
      </p>
    </footer>
  );
}

