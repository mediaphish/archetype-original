/**
 * Browser copy of mentionedAgents in lib/ao/team/agents.js (a test holds the
 * two to the same answers). Bart, 2026-10-25: "Can we do an "@Reach" type
 * thing to bring them in?"
 */
const MENTION_NAMES = { ada: 'auto', jot: 'jot', vox: 'reach', cam: 'producer', producer: 'producer', red: 'editor', des: 'designer', bit: 'it' };

export function mentionedAgents(message) {
  const text = String(message || '');
  const out = [];
  const add = (k) => {
    if (k && !out.includes(k)) out.push(k);
  };
  const lead = text.match(/^\s*(ada|jot|vox|cam|red|des|bit)\s*[,:]/i);
  if (lead) add(MENTION_NAMES[lead[1].toLowerCase()]);
  const re = /(^|[^\w@])@(ada|jot|vox|cam|red|des|bit|producer|team)\b/gi;
  let m;
  while ((m = re.exec(text))) {
    const word = m[2].toLowerCase();
    // @team brings in everyone, Ada first (2026-10-26, Phase 1).
    if (word === 'team') ['auto', 'jot', 'reach', 'producer', 'editor', 'designer', 'it'].forEach(add);
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
  { key: 'it', handle: 'Bit', role: 'IT' },
  { key: 'team', handle: 'team', role: 'Everyone' },
];

/** The @word being typed at the end of the box, if any. */
export function pendingMention(input) {
  const m = String(input || '').match(/(^|\s)@(\w*)$/);
  return m ? m[2].toLowerCase() : null;
}

/**
 * Teammates a teammate's reply actually hands the work to. A name inside a
 * sentence that waits on Bart ("If you say yes, @Jot builds the outline") is a
 * plan for later, not a hand-off, so it is skipped. Bart, 2026-11-09, after
 * that exact sentence set Jot off on a full outline before he had picked the
 * angle: "Once I approve the brief, then you can finish the research and
 * produce the outline. Once I approve the outline, then you can write the post."
 */
const WAITS_ON_BART = /\b(if|once|when|whenever|after|as soon as|should|unless|until|pending)\s+(you|bart|he)\b|\bif (that|this|it|the (angle|brief|pitch|outline))\b|\bsay the word\b|\bwith your (ok|okay|yes|approval|go[- ]ahead)\b|\b(your|bart'?s) (ok|okay|yes|approval|go[- ]ahead)\b|\bon your (ok|okay|yes|word|approval)\b/i;

export function handoffMentions(reply) {
  const text = String(reply || '');
  const sentences = text.split(/(?<=[.!?])\s+|\n+/);
  const out = [];
  sentences.forEach((s, i) => {
    if (WAITS_ON_BART.test(s)) return;
    // "Jot, take it" counts only at the very start, as it always has.
    const part = i === 0 ? s : s.replace(/^\s*(ada|jot|vox|cam|red|des|bit)\s*[,:]/i, ' ');
    for (const k of mentionedAgents(part)) {
      if (!out.includes(k)) out.push(k);
    }
  });
  return out;
}
