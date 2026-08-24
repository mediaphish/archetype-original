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
  'a dark interior with exposed black-painted brick, a warm edison bulb and shelving just visible in ' +
  'deep shadow, everything behind him dim and softly out of focus';

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
  mood = '',
  extra = '',
} = {}) {
  const side = SIDES[String(subjectSide).toLowerCase()] || SIDES.right;
  const emptySide = side === 'RIGHT' ? 'LEFT' : 'RIGHT';

  // This is a background-and-wardrobe REPLACEMENT, not a new photograph.
  //
  // Bart's three standard cards are one photograph. Same chair, same lean, same
  // arm along the chair back, same leg position; only the room behind him and
  // the garment change, and one of them still wears the cardigan from the
  // original. Every earlier version of this prompt asked the model to re-stage
  // the whole scene, so pose, framing and room drifted on every attempt and no
  // amount of describing lighting or scale could hold them still.
  //
  // The man is not to be re-imagined. He is to be left alone.
  return [
    'Take the man in the reference photograph and KEEP HIM EXACTLY AS HE IS.',
    'Do not re-pose him, do not re-frame him, do not change his body, his face, his expression, his angle to camera, or where his hands and legs sit.',
    'His pose, proportions and the chair he is sitting in must match the reference photograph precisely, as though this is the same frame with a different backdrop behind it.',
    `CHANGE ONLY TWO THINGS. First, his clothing becomes ${wardrobe}, fitted to the same body in the same position. Second, the background behind him becomes ${scene}.`,
    'Everything else in the picture stays as photographed. This is a background replacement and a wardrobe change on an existing photograph, not a new photograph.',
    AUTHENTICITY,
    `PLACEMENT: position him on the ${side} side of the frame, occupying roughly the outer 40%. The remaining 60%, running to the ${emptySide} edge, is empty near-black background with nothing in it. That area is reserved for text and must stay clean.`,
    'Keep his whole body and the whole chair inside the frame. Do not crop his arm, shoulder or the chair at the frame edge.',
    'The background is two to three stops darker than he is and thrown well out of focus, so he remains the brightest, sharpest thing in the picture.',
    'He stays crisply sharp with high micro-contrast: individual beard hairs, skin texture and fabric weave all clearly resolved.',
    mood,
    'Absolutely no text, no words, no lettering, no captions, no logos and no watermarks anywhere in the image.',
    extra,
  ]
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}
