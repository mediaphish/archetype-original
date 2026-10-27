/**
 * Browser copy of mentionedAgents in lib/ao/team/agents.js (a test holds the
 * two to the same answers). Bart, 2026-10-25: "Can we do an "@Reach" type
 * thing to bring them in?"
 */
const MENTION_NAMES = { ada: 'auto', jot: 'jot', vox: 'reach', cam: 'producer', producer: 'producer', red: 'editor', des: 'designer' };

export function mentionedAgents(message) {
  const text = String(message || '');
  const out = [];
  const add = (k) => {
    if (k && !out.includes(k)) out.push(k);
  };
  const lead = text.match(/^\s*(ada|jot|vox|cam|red|des)\s*[,:]/i);
  if (lead) add(MENTION_NAMES[lead[1].toLowerCase()]);
  const re = /(^|[^\w@])@(ada|jot|vox|cam|red|des|producer|team)\b/gi;
  let m;
  while ((m = re.exec(text))) {
    const word = m[2].toLowerCase();
    // @team brings in everyone, Ada first (2026-10-26, Phase 1).
    if (word === 'team') ['auto', 'jot', 'reach', 'producer', 'editor', 'designer'].forEach(add);
    else add(MENTION_NAMES[word]);
  }
  return out;
}

export const MENTION_CHOICES = [
  { key: 'auto', handle: 'Ada', role: 'Marketing Director' },
  { key: 'jot', handle: 'Jot', role: 'Writer' },
  { key: 'reach', handle: 'Vox', role: 'Publicist' },
  { key: 'producer', handle: 'Cam', role: 'Producer' },
  { key: 'editor', handle: 'Red', role: 'Editor' },
  { key: 'designer', handle: 'Des', role: 'Designer' },
  { key: 'team', handle: 'team', role: 'Everyone' },
];

/** The @word being typed at the end of the box, if any. */
export function pendingMention(input) {
  const m = String(input || '').match(/(^|\s)@(\w*)$/);
  return m ? m[2].toLowerCase() : null;
}
