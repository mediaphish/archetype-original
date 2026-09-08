/**
 * Split a reply into the two surfaces that have different rules.
 *
 * Bart, 2026-09-08, and this is his design, not mine:
 *
 *   "If I say 'sit with,' I'm giving a note. It should never ignore that. It
 *    should never delete that. If it's responding to my callout with 'This is
 *    why I used sit with,' that's dialogue about what I need it to do. Where
 *    'sit with' should never exist is in the writing itself."
 *
 * Today one guardrail runs over the whole reply. That produced the exact
 * inversion of what he wants. On 2026-09-08 he asked why "sit with" survived
 * two drafts. Auto had to quote the phrase to answer him. The quote tripped the
 * detector, the whole reply was handed to a second model to be rewritten, and
 * the answer he had asked for was replaced. Meanwhile the phrase that actually
 * shipped in the post, "the hardest leadership failures to sit with", matched
 * nothing on the list and went out twice.
 *
 * So the system sanitised the conversation and published the violation.
 *
 * The fix is not a better phrase list. It is recognising that a reply contains
 * two different things:
 *
 *   PROSE     — the artifact, the post, anything published under his name.
 *               Strict. A banned phrase must never reach him here.
 *   DIALOGUE  — everything else. His notes, Auto's reasoning, Auto explaining
 *               its own failures, ordinary English like "sit with a friend".
 *               Unrestricted. Never rewritten, never stripped.
 *
 * Splitting on the [ARTIFACT] boundary is deliberate: it is the same boundary
 * the client already uses to decide what goes in the panel versus the chat, so
 * the guardrail now agrees with what Bart sees on screen.
 */

const ARTIFACT_TAG = /\[ARTIFACT([^\]]*)\]([\s\S]*?)\[\/ARTIFACT\]/gi;

/**
 * @param {string} reply
 * @returns {{ dialogue: string, prose: string[], hasProse: boolean }}
 *   dialogue — the reply with every artifact block removed
 *   prose    — the inner content of each artifact block, in order
 */
export function splitReplySurfaces(reply) {
  const text = String(reply ?? '');
  if (!text) return { dialogue: '', prose: [], hasProse: false };

  const prose = [];
  // Fresh lastIndex each call: the regex is module scope and /g is stateful.
  ARTIFACT_TAG.lastIndex = 0;
  let m;
  while ((m = ARTIFACT_TAG.exec(text)) !== null) {
    const body = String(m[2] || '').trim();
    if (body) prose.push(body);
  }

  ARTIFACT_TAG.lastIndex = 0;
  const dialogue = text.replace(ARTIFACT_TAG, '').trim();

  return { dialogue, prose, hasProse: prose.length > 0 };
}

/**
 * Put a corrected prose block back where it came from.
 *
 * Rebuilds by walking the original and swapping each artifact body for its
 * corrected counterpart, so attributes, ordering and the surrounding dialogue
 * survive untouched. Anything the corrector did not return is left as it was
 * rather than dropped, because losing a draft is worse than a surviving tic.
 *
 * @param {string} reply     Original reply, artifacts intact.
 * @param {string[]} corrected Corrected prose bodies, same order as splitReplySurfaces.
 */
export function rejoinReplySurfaces(reply, corrected) {
  const text = String(reply ?? '');
  if (!Array.isArray(corrected) || corrected.length === 0) return text;

  let i = 0;
  ARTIFACT_TAG.lastIndex = 0;
  return text.replace(ARTIFACT_TAG, (whole, attrs, body) => {
    const original = String(body || '').trim();
    if (!original) return whole;
    const next = corrected[i++];
    if (typeof next !== 'string' || !next.trim()) return whole;
    return `[ARTIFACT${attrs}]\n${next.trim()}\n[/ARTIFACT]`;
  });
}
