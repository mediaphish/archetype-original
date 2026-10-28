/**
 * What Bart says on stage, turned into an action (2026-10-28).
 *
 * Slide moves are understood right here in the page: instant, free, and
 * nothing can go wrong waiting on a reply. Anything said to a teammate goes to
 * that teammate. See notes/PLAN-talk-mode.md.
 */

const AGENT_WORDS = { ada: 'auto', jot: 'jot', vox: 'reach', cam: 'producer', red: 'editor', des: 'designer', bit: 'it' };
const NUMBER_WORDS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12 };
const ORDINALS = { first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7, eighth: 8, ninth: 9, tenth: 10 };

/** Pure: { type: 'next'|'back'|'goto'|'last'|'demo'|'ask'|'none', ... } */
export function parseTalkCommand(said) {
  const raw = String(said || '').trim();
  const t = raw.toLowerCase().replace(/[.,!?]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!t) return { type: 'none' };

  // Who it is addressed to: "Hey Ada", "@ada", "Ada," anywhere near the start.
  const who = /(?:^|\b(?:hey|okay|ok|so)\s+|@)(ada|jot|vox|cam|red|des|bit)\b/.exec(t);
  const agent = who ? AGENT_WORDS[who[1]] : null;

  if (/\b(start|run|open|begin)\b.*\bdemo\b/.test(t)) return { type: 'demo', agent };
  if (/\b(next|forward)\b(\s+(slide|one|section))?/.test(t) && !/\bwhat'?s next\b/.test(t) && t.split(' ').length <= 8) return { type: 'next', agent };
  if (/\b(go back|back up|previous|last one|back a slide)\b/.test(t)) return { type: 'back', agent };
  if (/\b(last|final) slide\b/.test(t)) return { type: 'last', agent };

  const ord = /\b(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth)\s+slide\b/.exec(t);
  if (ord) return { type: 'goto', index: ORDINALS[ord[1]] - 1, agent };
  const num = /\bslide\s+(?:number\s+)?(\d{1,2}|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\b/.exec(t);
  if (num) return { type: 'goto', index: (NUMBER_WORDS[num[1]] || Number(num[1])) - 1, agent };

  if (agent) return { type: 'ask', agent, text: raw };
  return { type: 'none' };
}

export const TEAM_LABELS = { auto: 'Ada', jot: 'Jot', reach: 'Vox', producer: 'Cam', editor: 'Red', designer: 'Des', it: 'Bit' };
