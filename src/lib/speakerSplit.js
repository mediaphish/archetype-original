/**
 * One chat bubble per teammate (Bart, 2026-10-26: "those need to be treated
 * like individual chat bubbles for each. Just like a real chat would.").
 *
 * A reply sometimes carries more than one voice ("Vox: ..." then "Ada: ...").
 * This splits it at each line that opens with a teammate's name, so each part
 * shows as that teammate's own bubble with their picture.
 */
const NAME_TO_KEY = { ada: 'auto', auto: 'auto', jot: 'jot', vox: 'reach', reach: 'reach', cam: 'producer', red: 'editor', des: 'designer' };

const LABEL = /^\s*(?:\*\*)?(Ada|Auto|Jot|Vox|Reach|Cam|Red|Des)(?:\*\*)?:(?:\*\*)?\s*/;

/** @returns {Array<{ agent: string, text: string }>} */
export function splitBySpeaker(text, defaultAgent = 'auto') {
  const lines = String(text || '').split('\n');
  const parts = [];
  let current = { agent: defaultAgent, lines: [] };
  for (const line of lines) {
    const m = line.match(LABEL);
    if (m) {
      if (current.lines.join('\n').trim()) parts.push(current);
      current = { agent: NAME_TO_KEY[m[1].toLowerCase()], lines: [line.replace(LABEL, '')] };
    } else {
      current.lines.push(line);
    }
  }
  if (current.lines.join('\n').trim()) parts.push(current);
  const out = parts.map((p) => ({ agent: p.agent, text: p.lines.join('\n').trim() }));
  // Two parts in a row from the same teammate are one bubble.
  return out.reduce((acc, p) => {
    const last = acc[acc.length - 1];
    if (last && last.agent === p.agent) last.text = `${last.text}\n\n${p.text}`;
    else acc.push({ ...p });
    return acc;
  }, []);
}
