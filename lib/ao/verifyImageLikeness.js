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
          'Image A is a real reference photo of a specific real person. Image B is a newly generated ' +
          'image claimed to depict the same person, possibly in a different pose, outfit, or setting. ' +
          'This is an identity check, not a category check — "both are a heavyset man with a gray beard ' +
          'and glasses" is NOT sufficient to answer yes; many different real people fit that description. ' +
          'Weigh specific, individuating features: exact face shape and proportions, jaw and chin shape, ' +
          'nose and eye spacing, skin tone and texture, and precise beard/hair color and pattern — not just ' +
          'the general presence of a beard or glasses. If Image B looks like a plausible different person ' +
          'who merely shares the same broad build, hair color, and accessories as Image A, answer false. ' +
          'If you are genuinely uncertain after weighing the specific features above, answer false — a ' +
          'missed real match costs one retry; a false positive means a stranger\'s face is presented ' +
          'as his own. Respond with ONLY a JSON object, no other text: ' +
          '{"match": true|false, "reason": "one short sentence naming the specific feature(s) that decided it"}.',
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
