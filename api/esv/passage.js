/**
 * ESV API Proxy Endpoint
 * 
 * Fetches scripture passages from the ESV API and returns them with proper formatting.
 * Includes caching to reduce API calls.
 * 
 * GET /api/esv/passage?reference=2+Corinthians+5:16-17
 */

// Simple in-memory cache (clears on serverless function restart)
const cache = new Map();
const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { reference } = req.query;

  if (!reference) {
    return res.status(400).json({ error: 'Scripture reference is required.' });
  }

  // Check cache first
  const cacheKey = reference.toLowerCase().trim();
  if (cache.has(cacheKey)) {
    const cached = cache.get(cacheKey);
    if (Date.now() - cached.timestamp < CACHE_TTL) {
      console.log(`✅ ESV cache hit for: ${reference}`);
      return res.status(200).json(cached.data);
    } else {
      cache.delete(cacheKey); // Cache expired
    }
  }

  // Check for API key
  if (!process.env.ESV_API_KEY) {
    console.error('ESV_API_KEY is not set.');
    return res.status(500).json({ 
      error: 'Server configuration error: ESV API key missing.',
      message: 'Please configure ESV_API_KEY in your environment variables.'
    });
  }

  try {
    // ESV API endpoint
    // Documentation: https://api.esv.org/docs/passage/text/
    const esvApiUrl = `https://api.esv.org/v3/passage/text/?q=${encodeURIComponent(reference)}&include-verse-numbers=true&include-footnotes=false&include-headings=false&include-short-copyright=false&include-passage-references=false`;

    console.log(`📖 Fetching from ESV API: ${reference}`);

    const esvResponse = await fetch(esvApiUrl, {
      headers: {
        'Authorization': `Token ${process.env.ESV_API_KEY}`
      }
    });

    if (!esvResponse.ok) {
      const errorText = await esvResponse.text();
      console.error(`ESV API error for reference "${reference}": ${esvResponse.status} - ${errorText}`);
      
      if (esvResponse.status === 401) {
        return res.status(401).json({ 
          error: 'ESV API authentication failed. Please check your API key.' 
        });
      }
      
      return res.status(esvResponse.status).json({ 
        error: `Failed to fetch scripture from ESV API: ${esvResponse.statusText}`,
        details: errorText
      });
    }

    const data = await esvResponse.json();
    
    // ESV API returns passages in an array
    const passageText = data.passages ? data.passages.join('\n\n').trim() : '';
    const passageReference = data.canonical || reference;

    if (!passageText) {
      return res.status(404).json({ 
        error: 'No passage found for the given reference.',
        reference: reference
      });
    }

    const result = {
      reference: passageReference,
      text: passageText,
      copyright: 'Scripture quotations are from the ESV® Bible (The Holy Bible, English Standard Version®), copyright © 2001 by Crossway, a publishing ministry of Good News Publishers. Used by permission. All rights reserved.'
    };

    // Cache the result
    cache.set(cacheKey, { data: result, timestamp: Date.now() });
    
    console.log(`✅ ESV API success for: ${reference}`);
    return res.status(200).json(result);

  } catch (error) {
    console.error('Error in ESV API proxy:', error);
    return res.status(500).json({ 
      error: 'Internal server error while fetching scripture.',
      details: error.message
    });
  }
}
