/**
 * Build readable quote blocks for card rendering.
 * Goal: keep natural clause boundaries (labels, sentence breaks, separators)
 * so line wrapping does not create awkward "hanging" starts.
 */

function splitByLabelMarkers(line) {
  const s = String(line || '').trim();
  if (!s) return [];

  const re = /[A-Za-z][^:\n]{1,42}:\s*/g;
  const starts = [];
  let m;
  while ((m = re.exec(s)) !== null) {
    const token = String(m[0] || '').trim();
    if (!token) continue;
    if (/https?:\/\//i.test(token)) continue;
    if (/[.!?;]/.test(token)) continue;
    const words = token.replace(/:\s*$/, '').trim().split(/\s+/).filter(Boolean);
    if (!words.length || words.length > 8) continue;
    starts.push(m.index);
  }

  if (starts.length < 2) return [s];
  const out = [];
  for (let i = 0; i < starts.length; i += 1) {
    const from = starts[i];
    const to = i + 1 < starts.length ? starts[i + 1] : s.length;
    const part = s.slice(from, to).trim();
    if (part) out.push(part);
  }
  return out.length ? out : [s];
}

function splitClauseSeparators(text) {
  const s = String(text || '').trim();
  if (!s) return [];
  return s
    .split(/\s*[—–]\s*|\s*;\s*|(?<=[.!?])\s+(?=[A-Z0-9"'(])/g)
    .map((x) => x.trim())
    .filter(Boolean);
}

/**
 * @param {string} text
 * @returns {string[]} blocks in intended reading order
 */
export function buildQuoteCardLineBlocks(text) {
  const rawLines = String(text || '')
    .split(/\r?\n+/)
    .map((l) => l.trim())
    .filter(Boolean);

  const lines = rawLines.length ? rawLines : [String(text || '').trim()].filter(Boolean);
  const blocks = [];
  for (const line of lines) {
    const labels = splitByLabelMarkers(line);
    for (const labelBlock of labels) {
      const clauses = splitClauseSeparators(labelBlock);
      if (clauses.length) {
        blocks.push(...clauses);
      } else {
        blocks.push(labelBlock);
      }
    }
  }
  return blocks.filter(Boolean);
}

