/**
 * Split neutralized BLP story text into plain paragraphs for display (no HTML/markdown).
 */
export function splitNeutralizedParagraphs(text) {
  const raw = String(text || '').trim();
  if (!raw) return [];

  let chunks = raw.split(/\n\n+/);
  if (chunks.length === 1) {
    chunks = raw.split(/\n/);
  }

  const out = [];
  for (const c of chunks) {
    const t = c.replace(/\n+/g, ' ').trim();
    if (t) out.push(t);
  }

  return out.length ? out : [raw];
}
