/**
 * Prompt builder for card artwork that carries Bart's likeness.
 *
 * Pure string construction, no IO, so the wording can be tested and changed
 * without spending an image generation to find out what it does.
 *
 * Three things this has to get right, learned from the first real output:
 *
 *   1. Composition. The card is a split panel — subject one side, quote on the
 *      other. If the model centres the subject, the type lands on his face. It
 *      obeys an explicit instruction to leave one half empty, so the negative
 *      space is designed rather than hoped for.
 *
 *   2. Age and texture. Bart on the first result: "It's too clean and polished.
 *      Hair and Beard are too perfect. Face is 15 years younger than I really
 *      am." Image models default to idealised skin and groomed hair; left
 *      unsaid, they quietly de-age and tidy the subject. It has to be said.
 *
 *   3. No lettering. The canvas sets all type. Any text the model draws is
 *      garbage that has to be regenerated, so it is forbidden outright.
 */

/** Where the subject sits. The opposite half is left empty for the quote panel. */
const SIDES = { right: 'RIGHT', left: 'LEFT' };

// Bart, comparing his own card to the first one generated here: "Yours is dark
// and eerie. Mine has positive emotion in spite of the setting."
//
// That is the whole note. The subject is not brooding in an empty room. He is a
// composed, warm presence inside a working environment that is itself under
// strain, and the contrast between the two is the point. The room can carry the
// bad news. His face carries the steadiness.
export const DEFAULT_SCENE =
  'a real working office behind him, softly out of focus: people at desks mid-motion, ' +
  'screens and city windows, warm practical light through the space';
export const DEFAULT_WARDROBE = 'a cream cardigan over a plain white t-shirt and blue jeans';

/**
 * Wording that keeps the subject his actual age and texture.
 *
 * Stated as concrete physical detail rather than as "realistic" or "candid",
 * which models treat as a style cue and largely ignore.
 */
const AUTHENTICITY = [
  'CRITICAL — match the reference photograph exactly, do not idealise:',
  // Anchor age to the reference, never to a number. An earlier version of this
  // prompt asserted "mid fifties" — a figure nobody had established — and the
  // model dutifully aged him past his real age to hit it. The reference photo
  // is the only age evidence there is; naming a number overrides it.
  'he must appear EXACTLY as old as he does in the reference photograph — no younger, and no older.',
  'Reproduce the same lines, creases and skin texture visible in the reference, at the same depth. Do not add age, and do not remove it.',
  'Do not smooth the skin, do not slim the face, do not de-age him, and do not age him up.',
  'His hair and beard are naturally uneven and lived-in, not styled, trimmed or groomed for the camera —',
  'keep stray hairs, irregular edges, and the real greying pattern from the reference.',
  'Natural skin with visible pores, blemishes and unevenness. No retouching, no beauty filter, no airbrushing.',
  'He should look like a real photograph taken on an ordinary day, not a studio portrait.',
  // Identity, not wardrobe. Asked for a hoodie in a warehouse, the model changed
  // the outfit and quietly removed his glasses — these have to be pinned
  // separately from whatever the scene calls for.
  'Always keep his dark-framed rectangular eyeglasses and his full beard, regardless of the clothing or setting described.',
  // Tattoos are real and must not be erased, but image models reliably invent
  // the wrong artwork when they are prominent. Bart: "Many times they are
  // rendered inaccurately. Don't remove them, but the system needs to know I
  // know it will have a hard time with them."
  //
  // So the instruction is compositional rather than a request for accuracy the
  // model cannot deliver: keep the tattoos present and true to the reference,
  // and stage them where a wrong detail does not read as wrong — turned away,
  // partly covered, softened by shadow or depth of field.
  'He has tattooed forearms. Keep them — never remove or bare-over them — but do NOT make them a focal point.',
  'Prefer sleeves down or partly covering the forearms, arms angled away from camera, or the tattooed areas',
  'falling into shadow or soft focus. Any visible tattoo must match the reference photograph and must not be',
  'invented, restyled, or turned into a legible design. Never place a tattoo in the sharpest, brightest part of the frame.',
].join(' ');

/**
 * Build the artwork prompt.
 *
 * @param {object} opts
 * @param {'right'|'left'} [opts.subjectSide]  Half of the frame the subject occupies.
 * @param {string} [opts.scene]     Setting, e.g. 'a weathered brick warehouse at dusk'.
 * @param {string} [opts.wardrobe]  Clothing, e.g. 'a black hoodie'.
 * @param {string} [opts.mood]      Expression or posture note.
 * @param {string} [opts.extra]     Anything else to append verbatim.
 */
export function buildLikenessArtworkPrompt({
  subjectSide = 'right',
  scene = DEFAULT_SCENE,
  wardrobe = DEFAULT_WARDROBE,
  mood = 'settled and approachable, a hint of warmth around the eyes, looking directly at the camera with quiet confidence',
  extra = '',
} = {}) {
  const side = SIDES[String(subjectSide).toLowerCase()] || SIDES.right;
  const emptySide = side === 'RIGHT' ? 'LEFT' : 'RIGHT';

  return [
    'Editorial photograph of the man in the reference image.',
    `He is wearing ${wardrobe}, in ${scene}, with ${mood}.`,
    AUTHENTICITY,
    // Framing. Left unsaid the model returns a tight head-and-shoulders portrait
    // with a blurred wash behind it, and the room stops meaning anything. Bart's
    // own cards are medium shots where the background is legible and doing work:
    // people at desks, a city window, a screen showing the quarter going badly.
    'Medium shot, seated, from roughly the waist up, with enough depth that the room behind him is readable rather than an abstract blur.',
    'The environment should tell its own small story and stay in soft focus behind him.',
    `COMPOSITION IS CRITICAL: place him entirely within the ${side} HALF of the frame.`,
    `The ${emptySide} HALF must be near-black empty background — no objects, no furniture, no pattern, no detail.`,
    'That empty half is reserved for text added later and must stay clean.',
    // Contrast is needed for the text panel, but it must not turn the subject
    // into a silhouette in a horror frame. Light HIM warmly; let the empty half
    // fall away instead.
    'Light his face warmly and clearly so he reads as present and human, not shadowed or ominous.',
    'The mood is steady and quietly positive even when the setting is under pressure. Not brooding, not grim, not eerie.',
    `Let the ${emptySide.toLowerCase()} half fall into darkness for the text, but keep the space around him alive and lit.`,
    'Absolutely no text, no words, no lettering, no captions, no logos and no watermarks anywhere in the image.',
    extra,
  ]
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}
