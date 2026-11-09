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
  if (/\b(post it|send it|ship it|publish it|let'?s post|go ahead and post)\b/.test(t)) return { type: 'post', agent };
  // "Team, tell them about a time you got it wrong": Jot, Des and Bit each own a
  // real mistake (section 6, approved by Bart 2026-11-08).
  // The whole team, however Bart says it (2026-11-08: an intro request said
  // another way was silently dropped).
  const everyone = /\b(team|everybody|everyone|y'?all|you all|you guys|guys|folks|crew|all of you)\b/.test(t);
  if (everyone && /\b(got it wrong|get it wrong|mistakes?|messed up|screwed up|went wrong)\b/.test(t)) return { type: 'mistakes', agent: null, text: raw };
  // "Team, say hi to Neosho": every teammate introduces themselves, in order.
  if (everyone && /\b(say hi|say hello|introduce|introductions?|intros?|meet|who you are|who they are)\b/.test(t)) return { type: 'team', agent: null, text: raw };
  if (/\bintroduce (yourselves|themselves)\b/.test(t)) return { type: 'team', agent: null, text: raw };
  if (/\b(next|forward)\b(\s+(slide|one|section))?/.test(t) && !/\bwhat'?s next\b/.test(t) && t.split(' ').length <= 8) return { type: 'next', agent };
  if (/\b(go back|back up|previous|last one|back a slide)\b/.test(t)) return { type: 'back', agent };
  if (/\b(last|final) slide\b/.test(t)) return { type: 'last', agent };

  const ord = /\b(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth)\s+slide\b/.exec(t);
  if (ord) return { type: 'goto', index: ORDINALS[ord[1]] - 1, agent };
  const num = /\bslide\s+(?:number\s+)?(\d{1,2}|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\b/.exec(t);
  if (num) return { type: 'goto', index: (NUMBER_WORDS[num[1]] || Number(num[1])) - 1, agent };

  // "Bit, tell them how all this was built" (2026-11-08): Bit's scripted moment.
  // Bart's cue: "Hey Bit, give them a run down on what it took to get here today."
  if (agent === 'it' && (/\b(run ?down|what it took|get here|got here)\b/.test(t) || (/\b(built|build|made)\b/.test(t) && /\b(how|what)\b/.test(t)))) return { type: 'ask', agent, text: raw, topic: 'built' };
  if (agent) return { type: 'ask', agent, text: raw };
  return { type: 'none', text: raw };
}

/** Who owns a mistake in section 6, in order. Matches MISTAKE_ORDER in lib/ao/talkAsk.js. */
export const MISTAKE_ORDER = ['jot', 'designer', 'it'];

/** The order the team introduces itself. */
export const TEAM_ORDER = ['auto', 'jot', 'reach', 'producer', 'editor', 'designer', 'it'];

export const TEAM_LABELS = { auto: 'Ada', jot: 'Jot', reach: 'Vox', producer: 'Cam', editor: 'Red', designer: 'Des', it: 'Bit' };
