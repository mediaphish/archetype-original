/**
 * POST /api/ao/auto/generate-design-image
 *
 * Generates a styled graphic using OpenAI DALL-E 3.
 * Used for journal entry headers, social post graphics, and any
 * content that needs actual design rather than a templated card.
 *
 * Quote cards use the canvas route (/api/ao/auto/generate-card-image).
 * Everything else uses this route.
 *
 * Body: {
 *   prompt: string,        // Description of the image to generate
 *   content_type: string,  // "journal_header" | "social_graphic" | "other"
 *   title: string,         // Optional — used to build the prompt if not provided
 *   size: string,          // Optional — "1024x1024" | "1792x1024" | "1024x1792" (default: 1792x1024)
 * }
 *
 * Returns: {
 *   ok: true,
 *   image_url: string,  // Supabase storage public URL
 *   path: string,
 * }
 */

import { requireAoSession } from '../../../lib/ao/requireAoSession.js';
import { generateDesignImage } from '../../../lib/ao/generateDesignImage.js';

export default async function handler(req, res) {
  const auth = requireAoSession(req, res);
  if (!auth) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const { prompt, content_type, title, size } = req.body || {};

  if (!prompt?.trim() && !title?.trim()) {
    return res.status(400).json({
      ok: false,
      error: 'prompt or title is required.',
    });
  }

  const result = await generateDesignImage({ prompt, content_type, title, size });

  if (!result.ok) {
    return res.status(500).json({ ok: false, error: result.error });
  }

  return res.status(200).json({
    ok: true,
    image_url: result.image_url,
    path: result.path,
  });
}
