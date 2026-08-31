/**
 * Never attach a photograph of Bart to an image that is not supposed to contain him.
 *
 * The incident, 2026-08-31. Auto was generating the header for Part 4 of the
 * Scoreboard Leadership series and asked for a Vietnam battlefield scene: an
 * infantry officer in his early 40s, lean, close-cropped dark hair, angular jaw.
 * The activity log shows what the server actually attached as a reference:
 *
 *   manual-upload-the-signal-i-was-actually-watching-1787252286444.jpg
 *
 * That is one of Bart's approved quote cards. His face. The model did exactly
 * what it was told and put a bearded man in his glasses in the Ia Drang Valley.
 * Two retries then referenced the previous generated header, so each attempt
 * chained off the contaminated one and he stayed in the frame.
 *
 * The cause was a fallback that fired for ANY journal header when no explicit
 * reference was supplied. The comment sitting directly above it said the
 * painterly series headers succeed precisely because they carry no likeness,
 * which is the same sentence explaining why the fallback should never have
 * applied to them.
 *
 * The asymmetry is the whole argument for making this opt-in. Attaching no
 * reference is a recoverable miss: the model paints a generic scene, which is
 * what the Archetype and Scoreboard headers already are. Attaching the wrong
 * reference is not recoverable by retrying, because the retry references the
 * bad output.
 *
 * Quote cards no longer need this fallback at all. They are composited from
 * Bart's shot plates by generatePlateCard, where his likeness is a fixed
 * photograph rather than something a model has to reproduce.
 */

/** content_type values that are actually asking for Bart in the frame. */
const LIKENESS_CONTENT_TYPES = new Set(['quote_card', 'resurface']);

/**
 * Should a previously approved likeness card be attached as a reference?
 *
 * Opt-in by content_type. A journal header is a scene unless the caller says
 * otherwise, because that is what every published series header actually is.
 *
 * @param {{ contentType?: string, intent?: string }} args
 * @returns {boolean}
 */
export function shouldAttachApprovedCard({ contentType, intent } = {}) {
  const ct = String(contentType || '').trim().toLowerCase();

  // Resurface has its own dedicated Bart-photo path further down the chain and
  // does not need the approved-card fallback, but it is a likeness format, so
  // allowing it here is correct if that path ever returns nothing.
  if (LIKENESS_CONTENT_TYPES.has(ct)) return true;

  // Everything else, including intent 'header_image_for_post' and content_type
  // 'journal_header', is a scene. This is the branch that put Bart in Vietnam.
  void intent;
  return false;
}
