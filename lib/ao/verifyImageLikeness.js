/**
 * Vision check: does a generated image match the reference likeness?
 * Used after face-critical generate_image calls with reference_image_urls.
 */
import Anthropic from '@anthropic-ai/sdk';
import { createCompleteMessage } from './anthropicCompleteMessage.js';
import { resolveReferenceImages } from './generateDesignImage.js';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const VERIFY_MODEL = process.env.AUTO_ANTHROPIC_MODEL || 'claude-sonnet-5';

async function fetchGeneratedImageAsBase64(imageUrl) {
  const res = await fetch(imageUrl);
  if (!res.ok) throw new Error(`fetch generated image failed: ${res.status}`);
  const arrayBuffer = await res.arrayBuffer();
  const contentType = res.headers.get('content-type') || 'image/png';
  return { base64: Buffer.from(arrayBuffer).toString('base64'), media_type: contentType };
}

function parseLikenessJson(text) {
  const raw = String(text || '').trim();
  const stripped = raw.replace(/^```json\s*|\s*```$/g, '').trim();
  return JSON.parse(stripped);
}

/**
 * Compare a freshly generated image against reference photo(s).
 * @returns {Promise<{ ok: boolean, match: boolean|null, reason: string|null }>}
 */
export async function verifyImageLikeness({ referenceImageUrls, generatedImageUrl }) {
  try {
    const resolvedRefs = await resolveReferenceImages({ referenceImageUrls });
    if (!resolvedRefs.ok || !resolvedRefs.images?.length) {
      return { ok: false, match: null, reason: 'no reference image available to compare against' };
    }

    const ref = resolvedRefs.images[0];
    const refBase64 = ref.buffer.toString('base64');
    const refMediaType = ref.mime || 'image/jpeg';
    const generated = await fetchGeneratedImageAsBase64(generatedImageUrl);

    const content = [
      {
        type: 'text',
        text:
          'Image A is a real reference photo of a specific real person. Image B is a newly ' +
          'generated image that is supposed to depict the same person, possibly in a different ' +
          'pose, outfit, or setting. Look closely at facial structure, beard color and shape, ' +
          'hair color, build, and glasses — not the background, pose, or clothing. Does the ' +
          'person in Image B genuinely look like the same person as Image A? Respond with ONLY a ' +
          'JSON object, no other text: {"match": true|false, "reason": "one short sentence"}.',
      },
      {
        type: 'image',
        source: { type: 'base64', media_type: refMediaType, data: refBase64 },
      },
      {
        type: 'image',
        source: { type: 'base64', media_type: generated.media_type, data: generated.base64 },
      },
    ];

    const result = await createCompleteMessage(client, {
      model: VERIFY_MODEL,
      max_tokens: 200,
      messages: [{ role: 'user', content }],
    });

    if (!result.ok) {
      return { ok: false, match: null, reason: result.message || 'verification call failed' };
    }

    const parsed = parseLikenessJson(result.text);
    return {
      ok: true,
      match: !!parsed.match,
      reason: String(parsed.reason || '').slice(0, 300) || null,
    };
  } catch (err) {
    return { ok: false, match: null, reason: err?.message || 'verification failed' };
  }
}
