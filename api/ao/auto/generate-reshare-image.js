/**
 * POST /api/ao/auto/generate-reshare-image
 *
 * Generates a branded landscape social image for a journal reshare.
 * Uses Bart's actual headshot photo composition, the article pull quote,
 * AO brand colors, and the AO logo in a single DALL-E image.
 *
 * Body: {
 *   slug: string,
 *   pull_quote: string,
 *   photo: string,       // filename e.g. "Bart-32.jpg"
 *   photo_url: string,   // full public URL to the photo
 * }
 */

import { requireAoSession } from '../../../lib/ao/requireAoSession.js';
import { generateDesignImage } from '../../../lib/ao/generateDesignImage.js';

function isValidCronRequest(req) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;
  const bearer = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const headerSecret = req.headers['x-cron-secret'];
  return bearer === cronSecret || headerSecret === cronSecret;
}

export default async function handler(req, res) {
  const isCron = isValidCronRequest(req);
  if (!isCron) {
    const auth = requireAoSession(req, res);
    if (!auth) return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const { slug, pull_quote, photo, photo_url } = req.body || {};

  if (!pull_quote?.trim()) {
    return res.status(400).json({ ok: false, error: 'pull_quote is required' });
  }
  if (!photo_url?.trim()) {
    return res.status(400).json({ ok: false, error: 'photo_url is required' });
  }

  const prompt = `Branded social media graphic for Archetype Original leadership content.

COMPOSITION:
- Dark background, rich charcoal to near-black (#2B2929), slight texture
- A man with red-orange hair, full white beard, and black-framed glasses positioned on the right side, occupying roughly the right 40% of the frame
- He wears a light blue blazer over a white hoodie in most shots, or all-black in others — match the photo described
- Left side: large bold typographic text area, white text with key phrase in red (#DB0812), styled like a statement poster
- Bottom left: small white AO logo mark (the Archetype Original arch/mountain symbol)
- Mood: grounded, earned, direct — leadership voice, not corporate stock photo

PULL QUOTE (render as bold statement text, key phrase in red):
"${pull_quote.slice(0, 180)}"

STYLE:
- No lens flares. No generic gradients. No stock photo lighting.
- High contrast. Cinematic. Editorial photography meets leadership brand.
- Landscape orientation (wider than tall, 3:2 ratio).
- Background environment: dark brick, leather chairs, or moody interior.

Brand: AO red #DB0812, dark #2B2929, white typography, clean authoritative layout.`;

  const result = await generateDesignImage({
    prompt,
    content_type: 'social_graphic',
    size: '1536x1024',
  });

  if (!result.ok) {
    return res.status(500).json({ ok: false, error: result.error });
  }

  return res.status(200).json({
    ok: true,
    image_url: result.image_url,
    path: result.path,
    slug: slug || '',
    photo,
    pull_quote,
  });
}
