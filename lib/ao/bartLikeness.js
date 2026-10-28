/**
 * Images with Bart in them, made the way his own ChatGPT images are made.
 *
 * Bart, 2026-10-25: "Auto cannot generate this quality of images of me. Either
 * our code or our prompts aren't good enough to get that level of result."
 * Both were. Every image of him went out with one photo (often an earlier AI
 * image, so the face drifted: a trimmed beard instead of his full white one),
 * at "high" when OpenAI's top settings are "xhigh" and "max", and with no
 * picture of the look he wants. A side-by-side test that night, same words,
 * proved it; of the new way he said: "The second image is bang on."
 *
 * So an image of Bart now always carries:
 *   1. real photographs of him from the professional shoot, so the face, beard,
 *      glasses and build come from him and never from a past AI image;
 *   2. one photo from his approved series (public/images/reshare-backgrounds/),
 *      the one whose mood fits the piece, for the photographic style only;
 *   3. a short line saying what each picture is for, then his words as written
 *      (the wording rule: when Bart writes the brief, it is used as he wrote it);
 *   4. the top quality setting.
 */
import { BACKGROUNDS, backgroundMenu } from './reshareBackgrounds.js';

/** Real photographs from the professional shoot: face, beard, glasses and build clearly shown. */
export const REAL_BART_PHOTOS = ['/images/Bart-52.jpg', '/images/Bart-32.jpg', '/images/Bart-87.jpg', '/images/Bart-97.jpg'];

export const LIKENESS_QUALITY = String(process.env.OPENAI_IMAGE_QUALITY_LIKENESS || 'max').trim();

/**
 * Pure: whether an image is meant to show Bart. The model says so with
 * features_bart. Without it, only wording that plainly puts him in the frame
 * counts ("of Bart", "Bart sits", "the man in the attached photo"): a loose
 * match once put him into a battlefield scene (2026-08-31,
 * likenessReferenceGate.js), so a passing mention of his name is not enough.
 */
export function featuresBart(input = {}) {
  if (input.features_bart === true) return true;
  if (input.features_bart === false) return false;
  if (String(input.content_type || '').toLowerCase() === 'resurface') return false;
  const p = String(input.prompt_description || '');
  return (
    /\b(photo|photograph|portrait|image|picture|shot) of (bart|me)\b/i.test(p) ||
    /\bbart (paden )?(is |)(sits|sitting|stands|standing|walks|walking|leans|leaning|looks|looking|reads|reading|writes|writing|works|working)\b/i.test(p) ||
    /\bthe man in the (attached|reference) (photo|photos|image|images)\b/i.test(p)
  );
}

/** The series photo used as the style guide: the one whose mood fits, or the matcher's pick. */
export function styleReference(styleId) {
  const b = BACKGROUNDS.find((x) => x.id === styleId) || BACKGROUNDS[0];
  return { id: b.id, url: `/images/reshare-backgrounds/${b.id}.png` };
}

/**
 * Pure: the pictures sent with an image of Bart, in order, each with what it
 * is for. His likeness always comes from the real photographs. A picture he
 * attached is followed for what he asked of it; it is never taken as his face,
 * since it may itself be an AI image. A previous version (a correction round)
 * goes last and is only for the composition.
 */
export function likenessReferences({ attached = [], previous = null, styleId = null, style = true } = {}) {
  const refs = REAL_BART_PHOTOS.map((url) => ({ url, role: 'real' }));
  for (const url of attached.filter(Boolean).slice(0, 2)) refs.push({ url, role: 'attached' });
  if (style && !attached.length) refs.push({ url: styleReference(styleId).url, role: 'style' });
  if (previous && !attached.includes(previous)) refs.push({ url: previous, role: 'previous' });
  return refs;
}

const ORDINAL = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth'];

/** Pure: Bart's words, after one line that says what each picture is for. */
export function likenessPrompt(brief, refs) {
  const real = refs.filter((r) => r.role === 'real').length;
  const at = (role) => ORDINAL[refs.findIndex((r) => r.role === role)];
  const parts = [
    `The ${real === 1 ? 'first image is a real photograph' : `first ${real} images are real photographs`} of Bart Paden, the man in this picture. Keep his face, hair, full beard, glasses and build exactly as they are in ${real === 1 ? 'it' : 'them'}. Do not make him younger, thinner or more polished.`,
    // Bart, 2026-10-28: "The tattoos on my arms are wrong. AI is never going to
    // get them exactly right ... I've requested in these situations that my arms
    // be covered." Every image of him, every time.
    'His arms are always covered to the wrist: long sleeves, or a jacket over them. Never rolled sleeves or bare forearms, and never draw tattoos on his arms.',
  ];
  const attachedAt = refs.map((r, i) => (r.role === 'attached' ? ORDINAL[i] : null)).filter(Boolean);
  if (attachedAt.length) parts.push(`The ${attachedAt.join(' and ')} ${attachedAt.length === 1 ? 'image is the one' : 'images are the ones'} Bart attached: follow ${attachedAt.length === 1 ? 'it' : 'them'} for what he asks below, but take his likeness only from the real photographs.`);
  if (refs.some((r) => r.role === 'style')) parts.push(`The ${at('style')} image shows the photographic style, light and color to match. Do not copy its scene.`);
  if (refs.some((r) => r.role === 'previous')) parts.push(`The ${at('previous')} image is the previous version: keep what works in its composition, but take his likeness only from the real photographs.`);
  return `${parts.join(' ')}\n\n${String(brief || '').trim()}`;
}

/**
 * The series photo whose mood fits what the image is for. Falls back to the
 * first one if the matcher cannot run.
 */
export async function chooseStyleFor(text, { complete = null } = {}) {
  try {
    const ask = complete || (await import('./textModel.js')).completeJson;
    const raw = await ask({
      task: 'classify',
      maxTokens: 300,
      timeoutMs: 20000,
      prompt: `Pick the one photo whose setting, light and mood best fit this image request. Choose only from this list.\n\n${backgroundMenu()}\n\nImage request: ${String(text || '').slice(0, 2000)}\n\nReturn JSON only: { "best": "one id" }`,
    });
    const id = String(raw?.best || '').trim();
    return BACKGROUNDS.some((b) => b.id === id) ? id : BACKGROUNDS[0].id;
  } catch {
    return BACKGROUNDS[0].id;
  }
}
