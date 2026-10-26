/**
 * Bridges from the Queue (and anywhere else) into a conversation with the
 * team. Bart, 2026-10-25: "jump between a chat ... to the Queue or to Reach."
 * The link opens Auto with a note already started, so he only types his part.
 */
export function discussUrl({ text = '', agent = 'auto' } = {}) {
  const name = agent === 'jot' ? 'Jot' : agent === 'reach' ? 'Vox' : agent === 'producer' ? 'Cam' : null;
  const opener = name ? `${name}, ${text}` : text;
  return `/ao/analyst?compose=${encodeURIComponent(opener)}`;
}

export const QUEUE_PATH = '/ao/library/review-queue';
export const WEEK_PATH = '/ao/library/review-queue#week';
