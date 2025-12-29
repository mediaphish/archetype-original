/**
 * ESV API Proxy Endpoint
 * 
 * Fetches scripture passages from the ESV API and caches responses.
 * This endpoint acts as a proxy to keep API keys secure and enable caching.
 */

// Simple in-memory cache (24-hour TTL)
const cache = new Map();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

function getCached(reference) {
  const cached = cache.get(reference);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  cache.delete(reference);
  return null;
}

function setCache(reference, data) {
  cache.set(reference, {
    data,
    timestamp: Date.now()
  });
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { reference } = req.query;

  if (!reference) {
    return res.status(400).json({ error: 'Scripture reference is required' });
  }

  // Check cache first
  const cached = getCached(reference);
  if (cached) {
    return res.status(200).json(cached);
  }

  // Check for API key
  if (!process.env.ESV_API_KEY) {
    console.error('ESV_API_KEY not configured');
    return res.status(500).json({ 
      error: 'ESV API not configured',
      reference,
      text: null // Return reference only if API unavailable
    });
  }

  try {
    // Fetch from ESV API
    const esvUrl = new URL('https://api.esv.org/v3/passage/text/');
    esvUrl.searchParams.append('q', reference);
    esvUrl.searchParams.append('include-verse-numbers', 'false');
    esvUrl.searchParams.append('include-footnotes', 'false');
    esvUrl.searchParams.append('include-headings', 'false');
    esvUrl.searchParams.append('include-short-copyright', 'false');

    const response = await fetch(esvUrl.toString(), {
      headers: {
        'Authorization': `Token ${process.env.ESV_API_KEY}`
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ESV API error:', response.status, errorText);
      
      // Return reference only if API fails
      const fallback = {
        reference,
        text: null,
        copyright: null,
        error: 'Unable to fetch scripture text'
      };
      return res.status(200).json(fallback);
    }

    const data = await response.json();
    
    // Extract text from ESV API response
    const text = data.passages && data.passages.length > 0 
      ? data.passages[0].trim()
      : null;

    const result = {
      reference,
      text,
      copyright: 'ESV® Bible (The Holy Bible, English Standard Version®), © 2001 by Crossway, a publishing ministry of Good News Publishers. Used by permission. All rights reserved.'
    };

    // Cache the result
    setCache(reference, result);

    return res.status(200).json(result);

  } catch (error) {
    console.error('Error fetching from ESV API:', error);
    
    // Return reference only if error occurs
    const fallback = {
      reference,
      text: null,
      copyright: null,
      error: 'Unable to fetch scripture text'
    };
    return res.status(200).json(fallback);
  }
}

