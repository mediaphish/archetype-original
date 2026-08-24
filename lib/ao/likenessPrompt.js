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

// The house standard, read off Bart's own cards rather than guessed at. Three
// of them side by side share a specific and repeatable set:
//
//   seated in a brown leather club chair, full body, jeans, feet planted
//   a dark brick or industrial wall behind him
//   warm practical lights in frame: an edison bulb, a pendant, shelves, bottles
//   he is the brightest thing in the picture, background dark but readable
//   direct gaze, composed, not smiling, hands resting open
//
// Earlier attempts here adjusted lighting adjectives and kept producing
// waist-up crops in generic rooms. The gap was never the mood words. It was
// that the chair, the full-body framing and the room were never specified.
export const DEFAULT_SCENE =
  'THE SAME ROOM AS THE REFERENCE PHOTOGRAPH. Do not invent a new location. Keep its exposed brick, ' +
  'its hanging edison bulbs, its shelves and fittings, and the same warm practical lighting, ' +
  'reproduced faithfully behind him';

/** The chair is part of the identity, not set dressing. It is in every card. */
export const DEFAULT_POSE =
  'seated well back in THE SAME worn brown leather club chair as the reference photograph, full body ' +
  'in frame from the top of his head to below the knee with his legs and boots visible, feet planted, ' +
  'both arms spread along the arms of the chair, hands resting over the ends, shoulders back, relaxed and unhurried';

export const DEFAULT_WARDROBE = 'a plain white t-shirt under an open cardigan or blazer, with blue jeans';

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
  pose = DEFAULT_POSE,
  mood = 'settled and approachable, a hint of warmth around the eyes, looking directly at the camera with quiet confidence',
  extra = '',
} = {}) {
  const side = SIDES[String(subjectSide).toLowerCase()] || SIDES.right;
  const emptySide = side === 'RIGHT' ? 'LEFT' : 'RIGHT';

  return [
    'Editorial photograph of the man in the reference image.',
    `He is ${pose}, wearing ${wardrobe}, in ${scene}, with ${mood}.`,
    AUTHENTICITY,
    // Framing. Left unsaid the model returns a tight head-and-shoulders portrait
    // with a blurred wash behind it, and the room stops meaning anything. Bart's
    // own cards are medium shots where the background is legible and doing work:
    // people at desks, a city window, a screen showing the quarter going badly.
    'Wide enough to show the whole chair and his full seated body, head to below the knee. This is NOT a head-and-shoulders portrait and NOT a waist-up crop.',
    'The room behind him is in soft focus but legible, with its own small story in it.',
    // The model was putting him in a black garment against a black room, so he
    // dissolved into it. Contrast has to be stated, not hoped for.
    'His clothing must contrast clearly against the background so his shoulders and outline read as separate from the room.',
    'He is looking directly into the camera lens. Not off to the side, not past the camera, not down.',
    // Proportions, not halves. The card covers the inner ~46% with a text panel
    // plus a soft fade, so a subject filling a full half is always clipped by
    // it. Giving him the outer 40% leaves real margin between his body and the
    // type. Earlier versions said "half" and every render lost an arm.
    `COMPOSITION IS CRITICAL: he occupies only the OUTER 40% of the frame on the ${side} side. `
      + `The remaining 60% of the frame, running to the ${emptySide} edge, is empty near-black background.`,
    'There must be clear empty space between his body and the middle of the frame. Nothing of him, and no part of the chair, may reach the centre.',
    'That empty area is reserved for text added later and must stay completely clean: no objects, no furniture, no pattern.',
    // Contrast is needed for the text panel, but it must not turn the subject
    // into a silhouette in a horror frame. Light HIM warmly; let the empty half
    // fall away instead.
    // Photographic direction, not mood words. Read off Bart's three standard
    // cards: he is flash-lit and razor sharp while the room sits two to three
    // stops under him and falls into blur. Earlier attempts here asked for
    // "warm" and "alive" and got soft, even, low-contrast frames where the
    // background competed with him for attention. Describe the lighting setup
    // and the model reproduces it.
    'LIGHTING: a single hard studio strobe on him from slightly off camera, with a subtle rim light separating his shoulders and hair from the background.',
    'He is crisply sharp with high micro-contrast: individual beard hairs, skin texture and fabric weave all clearly resolved. Saturated, punchy colour on him.',
    `The room behind him is two to three stops DARKER than he is and thrown well out of focus. It stays visible and warm but never competes with him for attention.`,
    `THE ${emptySide} HALF: unlit, near-black, empty. The darkness belongs there and in the background, never on him.`,
    // Scale. He is large in his half of the frame in every card, not a small
    // figure in a room.
    `SCALE: within that outer 40%, he is large. Head near the top edge of the frame, knees near the bottom, the whole chair including both arms visible. He is the subject, not a person photographed inside a scene.`,
    'His expression is composed and settled, direct to camera, quietly confident. Not stern, not brooding, not grim, not blank, and not a broad smile.',
    'Absolutely no text, no words, no lettering, no captions, no logos and no watermarks anywhere in the image.',
    extra,
  ]
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}
