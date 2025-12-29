/**
 * ESV URL Builder
 * 
 * Converts scripture references to esv.org URLs
 * 
 * Examples:
 * "2 Corinthians 5:16-17" -> "https://www.esv.org/2+Corinthians+5/#16"
 * "John 3:16" -> "https://www.esv.org/John+3/#16"
 * "Psalm 23" -> "https://www.esv.org/Psalm+23/"
 */

export function buildEsvUrl(reference) {
  if (!reference) return null;

  // Base URL
  const baseUrl = 'https://www.esv.org/';

  // Parse the reference
  // Pattern: Book Chapter:Verse-Verse or Book Chapter
  // Examples: "2 Corinthians 5:16-17", "John 3:16", "Psalm 23"
  
  // Remove common abbreviations and normalize
  let normalized = reference.trim();
  
  // Handle verse ranges (e.g., "16-17" or "16–17" with en-dash)
  const verseMatch = normalized.match(/:(\d+)[\s\-–—]+(\d+)$/);
  const singleVerseMatch = normalized.match(/:(\d+)$/);
  
  let verse = null;
  let verseEnd = null;
  
  if (verseMatch) {
    // Range: "5:16-17"
    verse = verseMatch[1];
    verseEnd = verseMatch[2];
    normalized = normalized.substring(0, verseMatch.index);
  } else if (singleVerseMatch) {
    // Single verse: "5:16"
    verse = singleVerseMatch[1];
    normalized = normalized.substring(0, singleVerseMatch.index);
  }
  
  // Now normalized should be like "2 Corinthians 5" or "John 3"
  // Split into book and chapter
  const parts = normalized.trim().split(/\s+/);
  
  // Find where the chapter number starts (last numeric part)
  let chapterIndex = -1;
  for (let i = parts.length - 1; i >= 0; i--) {
    if (/^\d+$/.test(parts[i])) {
      chapterIndex = i;
      break;
    }
  }
  
  if (chapterIndex === -1) {
    // No chapter found, treat entire thing as book
    const book = parts.join('+');
    return `${baseUrl}${book}/`;
  }
  
  // Split into book and chapter
  const book = parts.slice(0, chapterIndex).join('+');
  const chapter = parts[chapterIndex];
  
  // Build URL - ESV.org doesn't support direct verse linking via hash
  // Link to the chapter; users can scroll to find the verse
  const url = `${baseUrl}${book}+${chapter}/`;
  
  return url;
}

/**
 * Test function to verify URL building
 * (Can be removed in production)
 */
export function testEsvUrls() {
  const testCases = [
    '2 Corinthians 5:16-17',
    '2 Corinthians 5:16–17', // en-dash
    'John 3:16',
    'Psalm 23',
    '1 John 4:7-8',
    'Revelation 21:1-4'
  ];
  
  return testCases.map(ref => ({
    reference: ref,
    url: buildEsvUrl(ref)
  }));
}

