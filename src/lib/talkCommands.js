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
  // Chrome hears "Hey Bit" from across a room as "hey bet" or "hey bid"
  // (2026-11-09: two asks from the clicker got no answer). Only after "hey".
  const bitHeard = !who && /\b(?:hey|okay|ok)\s+(?:bet|bid|bits|bitt|bed|pit)\b/.test(t);
  const agent = who ? AGENT_WORDS[who[1]] : bitHeard ? 'it' : null;

  if (/\b(start|run|open|begin)\b.*\bdemo\b/.test(t)) return { type: 'demo', agent };
  if (/\b(post it|send it|ship it|publish it|let'?s post|go ahead and post)\b/.test(t)) return { type: 'post', agent };
  // "Team, tell them about a time you got it wrong": Jot, Des and Bit each own a
  // real mistake (section 6, approved by Bart 2026-11-08).
  // The whole team, however Bart says it (2026-11-08: an intro request said
  // another way was silently dropped).
  const everyone = /\b(team|everybody|everyone|y'?all|you all|you guys|guys|folks|crew|all of you)\b/.test(t);
  if (everyone && /\b(got it wrong|get it wrong|mistakes?|messed up|screwed up|went wrong)\b/.test(t)) return { type: 'mistakes', agent: null, text: raw };
  // "Team, say hi to McDonald County": every teammate introduces themselves, in order.
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
  if (agent === 'it' && (/\b(run[ -]?down|what it took|get here|got here)\b/.test(t) || (/\b(built|build|made)\b/.test(t) && /\b(how|what)\b/.test(t)))) return { type: 'ask', agent, text: raw, topic: 'built' };
  // The cue is his alone, so it reaches Bit even when the name is lost
  // (2026-11-09 cue: "Hey Bit, give them a run down on what it took to build you
  // all and put this presentation together.").
  if (!agent && /\b(run[ -]?down|what it took|build you all|put this presentation together)\b/.test(t)) return { type: 'ask', agent: 'it', text: raw, topic: 'built' };
  if (agent) return { type: 'ask', agent, text: raw };
  return { type: 'none', text: raw };
}

/** Who owns a mistake in section 6, in order. Matches MISTAKE_ORDER in lib/ao/talkAsk.js. */
export const MISTAKE_ORDER = ['jot', 'designer', 'it'];

/** The order the team introduces itself. */
export const TEAM_ORDER = ['auto', 'jot', 'reach', 'producer', 'editor', 'designer', 'it'];

export const TEAM_LABELS = { auto: 'Ada', jot: 'Jot', reach: 'Vox', producer: 'Cam', editor: 'Red', designer: 'Des', it: 'Bit' };

/**
 * Pure: a long spoken reply as screen-sized pieces, read in step with the voice
 * (2026-11-09: Bit's build story ran off the bottom of the screen). Splits at
 * sentences, then at commas, so no piece is longer than max characters.
 */
export function captionChunks(text, max = 150) {
  const sentences = String(text || '').replace(/\s+/g, ' ').trim().match(/[^.!?]+[.!?]+["')\]]*\s*|[^.!?]+$/g) || [];
  const pieces = [];
  for (const raw of sentences) {
    const sentence = raw.trim();
    if (!sentence) continue;
    if (sentence.length <= max) {
      pieces.push(sentence);
      continue;
    }
    let cur = '';
    for (const part of sentence.split(/(?<=,)\s+/)) {
      if (cur && (cur + ' ' + part).length > max) {
        pieces.push(cur);
        cur = part;
      } else cur = cur ? `${cur} ${part}` : part;
    }
    if (cur) pieces.push(cur);
  }
  // Join short neighbours so a piece is not a lone "Yeah, totally."
  const out = [];
  for (const p of pieces) {
    if (out.length && (out[out.length - 1] + ' ' + p).length <= max) out[out.length - 1] += ` ${p}`;
    else out.push(p);
  }
  return out.length ? out : [String(text || '')];
}

/** Pure: which piece is being spoken, from how far through the audio it is (0 to 1). */
export function chunkAt(chunks, progress) {
  const total = chunks.reduce((n, c) => n + c.length, 0) || 1;
  let seen = 0;
  for (let i = 0; i < chunks.length; i++) {
    seen += chunks[i].length;
    if (progress * total < seen) return i;
  }
  return Math.max(0, chunks.length - 1);
}
