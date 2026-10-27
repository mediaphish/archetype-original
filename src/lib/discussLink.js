/**
 * Bridges from the Queue (and anywhere else) into a conversation with the
 * team. Bart, 2026-10-25: "jump between a chat ... to the Queue or to Reach."
 * The link opens Auto with a note already started, so he only types his part.
 */
export function discussUrl({ text = '', agent = 'auto', topic = '', channel = 'social' } = {}) {
  const name = agent === 'jot' ? 'Jot' : agent === 'reach' ? 'Vox' : agent === 'producer' ? 'Cam' : null;
  const opener = name ? `${name}, ${text}` : text;
  // Each thing talked over gets its own conversation, never the one already
  // open (Bart, 2026-10-27: "I don't think we can have multiple conversations
  // about multiple projects in just one single chat").
  const fresh = topic ? `&new=${encodeURIComponent(channel)}&topic=${encodeURIComponent(topic)}` : '';
  return `/ao/analyst?compose=${encodeURIComponent(opener)}${fresh}`;
}

export const QUEUE_PATH = '/ao/library/review-queue';
export const WEEK_PATH = '/ao/library/review-queue#week';
