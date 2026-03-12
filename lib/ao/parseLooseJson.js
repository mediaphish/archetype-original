export function parseLooseJson(text) {
  const raw = String(text || '').trim();
  if (!raw) return null;

  let s = raw;

  // Common failure mode: the model wraps JSON in fenced code blocks:
  // ```json
  // { ... }
  // ```
  if (s.startsWith('```')) {
    s = s.replace(/^```[a-zA-Z0-9_-]*\s*/i, '');
    s = s.replace(/\s*```$/i, '');
    s = s.trim();
  }

  // Try direct parse first.
  try {
    return JSON.parse(s);
  } catch (_) {}

  // Recovery: attempt to extract the first JSON object/array from the text.
  const first = s.search(/[\[{]/);
  if (first < 0) return null;
  const lastCurly = s.lastIndexOf('}');
  const lastSquare = s.lastIndexOf(']');
  const last = Math.max(lastCurly, lastSquare);
  if (last <= first) return null;

  const slice = s.slice(first, last + 1).trim();
  try {
    return JSON.parse(slice);
  } catch (_) {
    return null;
  }
}

