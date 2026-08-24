/**
 * Quote → finished card, in one call.
 *
 * Generates the artwork, composes the [CARD] spec, renders it and uploads the
 * PNG. This is the piece that lets the cadence run without Bart: everything
 * before it still required a person to call three things in order and paste the
 * results between them.
 *
 * The split of labour is deliberate and load-bearing. The image model paints and
 * never letters; the canvas sets every glyph and places the brand lockup as
 * vector art. gpt-image-1 garbles rendered text and mangles the lockup, and it
 * is never asked to do either — which is why the cards it produces are postable
 * without review.
 */

import { buildLikenessArtworkPrompt } from './likenessPrompt.js';
import { generateDesignImage } from './generateDesignImage.js';
import { generateQuoteCardImage } from './generateQuoteCardImage.js';
import { pickBartPhotoUrl } from './bartPhotoReferences.js';

const BRAND_RED = '#D42B1E';
const BRAND_INK = '#0a0a0a';
const BRAND_PAPER = '#f2f2f0';

/**
 * Scene artwork for a quote that is not Bart's.
 *
 * Bart: "Nice images with the quotes in front of them when they aren't mine.
 * When they are mine, stylized images of me using my likeness."
 *
 * No people at all. A face nobody can place reads as a stock photo, and a face
 * that resembles someone real is worse.
 */
export function buildSceneArtworkPrompt({ subjectSide = 'right', scene = '' } = {}) {
  const emptySide = String(subjectSide).toLowerCase() === 'left' ? 'RIGHT' : 'LEFT';
  const subject =
    scene ||
    'an atmospheric architectural interior — weathered concrete, brick and steel, raking light through a high window, dust in the air';
  return [
    `Fine-art photograph of ${subject}.`,
    'No people, no figures, no faces, no hands anywhere in the frame.',
    `COMPOSITION IS CRITICAL: keep all visual interest in the ${
      emptySide === 'LEFT' ? 'RIGHT' : 'LEFT'
    } HALF of the frame.`,
    `The ${emptySide} HALF must be near-black empty shadow — no objects, no texture, no detail — reserved for text added later.`,
    'Deep cinematic contrast, restrained colour, film grain.',
    'Absolutely no text, no words, no lettering, no logos and no watermarks anywhere in the image.',
  ].join(' ');
}

/** Escape a value for use inside a [CARD]/[LINE] attribute. */
function attr(value) {
  return String(value ?? '').replace(/"/g, '');
}

/**
 * Build the [CARD] spec.
 *
 * Sizes are starting points, not final: the renderer fits the block to the panel
 * in both directions, so a short claim grows and a long pull shrinks rather than
 * running into the lockup.
 */
export function buildCardSpec({
  lines,
  attribution,
  artworkDataUri,
  ratio = 'portrait',
  subjectSide = 'right',
  bg = BRAND_INK,
  text = BRAND_PAPER,
  accent = BRAND_RED,
  focusY = 0.2,
}) {
  const body = lines
    .map((line) => {
      const value = typeof line === 'object' && line !== null ? line.text : line;
      const emphasised = typeof line === 'object' && line !== null ? !!line.accent : false;
      const color = emphasised ? ` color="${attr(accent)}"` : '';
      return `[LINE size="76"${color} gap_after="12"]${String(value).trim()}[/LINE]`;
    })
    .join('\n');

  // Attribution is set in Inter: it is small, mixed-case, and often carries a
  // year, all of which Bebas handles badly.
  const credit = attribution
    ? `\n[LINE size="24" opacity="0.6" weight="normal" font="inter"]— ${attr(attribution)}[/LINE]`
    : '';

  return (
    `[CARD layout="split" ratio="${attr(ratio)}" bg="${attr(bg)}" text="${attr(text)}" ` +
    `mark="offwhite" mark_opacity="1" logo="lockup" subject_side="${attr(subjectSide)}" ` +
    `focus_y="${focusY}" bg_image="${artworkDataUri}"]\n${body}${credit}\n[/CARD]`
  );
}

/**
 * Generate a complete quote card.
 *
 * @param {object} opts
 * @param {string[]|object[]} opts.lines   Display lines. `{text, accent}` to control emphasis.
 * @param {string} [opts.attribution]      Credit line, without the dash.
 * @param {boolean} [opts.likeness]        True when the quote is Bart's.
 * @param {string} [opts.scene]            Setting override.
 * @param {string} [opts.wardrobe]         Clothing override (likeness only).
 * @param {string} [opts.ratio]            square | portrait | landscape.
 * @param {'left'|'right'} [opts.subjectSide]
 */
export async function generateLikenessCard({
  lines,
  attribution = '',
  likeness = false,
  scene = '',
  wardrobe = '',
  ratio = 'portrait',
  subjectSide = 'right',
  cardIndex = 0,
  batchId = null,
} = {}) {
  // Emphasis: the reference card sets the claim in red and the rest in
  // off-white. Plain strings get that treatment automatically — first line and,
  // when there are three or more, the last — because a caller passing strings
  // has expressed no opinion and an all-white card loses the look entirely.
  // An object with an explicit `accent` always wins.
  const raw = (Array.isArray(lines) ? lines : [lines])
    .map((l) => (typeof l === 'object' && l !== null ? l : { text: l }))
    .filter((l) => String(l.text || '').trim());
  if (!raw.length) return { ok: false, error: 'lines is required' };

  // If any line marks emphasis inline with *asterisks*, the caller has said
  // exactly what should be red — so the automatic whole-line rule stands down.
  // Both firing at once produced a card with three of four lines in red and the
  // emphasis meaning nothing, which is worse than either rule alone.
  const hasInlineEmphasis = raw.some((l) => /\*[^*]+\*/.test(String(l.text || '')));

  const cleanLines = raw.map((l, i) => ({
    text: String(l.text).trim(),
    accent:
      typeof l.accent === 'boolean'
        ? l.accent
        : hasInlineEmphasis
          ? false
          : i === 0 || (raw.length >= 3 && i === raw.length - 1),
  }));

  const prompt = likeness
    ? buildLikenessArtworkPrompt({
        subjectSide,
        ...(scene ? { scene } : {}),
        ...(wardrobe ? { wardrobe } : {}),
      })
    : buildSceneArtworkPrompt({ subjectSide, scene });

  // Only likeness artwork gets a reference photo. A scene prompt with a portrait
  // attached puts a person in a frame that is supposed to have none.
  const referenceImageUrls = likeness ? [pickBartPhotoUrl({ mood: scene })].filter(Boolean) : [];

  // Artwork must be generated at the card's own aspect, not always square.
  //
  // This was hardcoded to 1024x1024. A square image then got cover-cropped
  // again by the renderer to fill a landscape card, so every frame was cropped
  // twice toward its centre, which is the subject's face. That is why the
  // full-body-in-a-chair instruction produced head-and-shoulders portraits no
  // matter how it was worded. The prompt was never the problem.
  const ART_SIZES = {
    square: '1024x1024',
    landscape: '1536x1024',
    portrait: '1024x1536',
  };
  const artSize = ART_SIZES[ratio] || ART_SIZES.portrait;

  const art = await generateDesignImage({
    prompt,
    content_type: 'journal_header',
    title: cleanLines[0].text.slice(0, 60),
    size: artSize,
    referenceImageUrls,
  });
  if (!art?.ok) {
    return { ok: false, stage: 'artwork', error: art?.error || 'Artwork generation failed' };
  }

  const artUrl = art.image_url || art.url;
  let dataUri = null;
  if (art.b64_json) {
    dataUri = `data:image/png;base64,${art.b64_json}`;
  } else if (artUrl) {
    const res = await fetch(artUrl);
    if (!res.ok) {
      return { ok: false, stage: 'artwork_fetch', error: `Artwork fetch failed (${res.status})` };
    }
    dataUri = `data:image/png;base64,${Buffer.from(await res.arrayBuffer()).toString('base64')}`;
  } else {
    return { ok: false, stage: 'artwork', error: 'Artwork returned no image' };
  }

  const card_spec = buildCardSpec({
    lines: cleanLines,
    attribution,
    artworkDataUri: dataUri,
    ratio,
    subjectSide,
  });

  const out = await generateQuoteCardImage({ card_spec, card_index: cardIndex, batch_id: batchId });
  if (!out?.ok) {
    return { ok: false, stage: 'render', error: out?.error || 'Card render failed' };
  }

  return {
    ok: true,
    image_url: out.image_url,
    path: out.path || null,
    filename: out.filename || null,
    likeness,
    ratio,
    artwork_prompt: prompt,
  };
}
