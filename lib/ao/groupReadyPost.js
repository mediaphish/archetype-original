function normTag(t) {
  const s = String(t || '').trim().toLowerCase();
  if (!s) return '';
  const cleaned = s.replace(/[^a-z0-9_]/g, '');
  return cleaned ? `#${cleaned}` : '';
}

function uniq(arr) {
  const out = [];
  const seen = new Set();
  for (const x of arr) {
    const v = String(x || '').trim();
    if (!v || seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }
  return out;
}

/**
 * Create copy/paste-ready Facebook Group text.
 *
 * @param {{ title?: string, slug?: string, publish_date?: string, scripture_reference?: string, summary?: string, categories?: any, tags?: any }} fm
 */
export function buildGroupReadyText(fm = {}) {
  const title = String(fm.title || '').trim();
  const slug = String(fm.slug || '').trim();
  const scripture = String(fm.scripture_reference || '').trim();
  const summary = String(fm.summary || '').trim();
  const publishDate = String(fm.publish_date || fm.date || '').trim();

  const url = slug ? `https://www.archetypeoriginal.com/journal/${slug}` : '';

  const cats = Array.isArray(fm.categories) ? fm.categories : [];
  const tags = Array.isArray(fm.tags) ? fm.tags : [];
  const hashTags = uniq([
    normTag('devotional'),
    normTag('servantleadership'),
    ...cats.map(normTag),
    ...tags.map(normTag),
  ].filter(Boolean)).slice(0, 8);

  const lines = [];
  if (title) lines.push(title);
  if (publishDate) lines.push(publishDate);
  if (scripture) lines.push(`Scripture: ${scripture}`);
  lines.push('');
  if (summary) lines.push(summary);
  if (url) {
    lines.push('');
    lines.push(`Read: ${url}`);
  }
  if (hashTags.length) {
    lines.push('');
    lines.push(hashTags.join(' '));
  }
  return lines.join('\n').trim();
}

