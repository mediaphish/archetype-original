/**
 * POST /api/ao/auto/generate-card-image — owner session only (requireAoSession).
 */

import { requireAoSession } from '../../../lib/ao/requireAoSession.js';
import { generateQuoteCardImage } from '../../../lib/ao/generateQuoteCardImage.js';

export default async function handler(req, res) {
  const auth = requireAoSession(req, res);
  if (!auth) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const { line1, line2, card_index, batch_id } = req.body || {};
  const out = await generateQuoteCardImage({ line1, line2, card_index, batch_id });

  if (!out.ok) {
    return res.status(out.error?.includes('required') ? 400 : 500).json({
      ok: false,
      error: out.error || 'Image generation failed',
    });
  }

  return res.status(200).json({
    ok: true,
    image_url: out.image_url,
    path: out.path,
    filename: out.filename,
  });
}
