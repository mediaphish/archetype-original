/**
 * Corpus gap / TL;DR report shape (for Auto CORPUS mode + optional persistence).
 *
 * @typedef {object} CorpusGapReportV1
 * @property {string} topic - user topic or question
 * @property {string} landscape - what is generally discussed "out there" (sampled, not exhaustive)
 * @property {string} corpus_gaps - what is thin or missing vs published work
 * @property {string} ao_fit - tone, voice, AO theology alignment + risks
 * @property {string[]} related_doc_titles - optional titles from knowledge.json used as evidence
 * @property {string} generated_at - ISO timestamp
 */

export function buildGapReportStub(topic) {
  return {
    topic: String(topic || '').trim() || 'Untitled',
    landscape: '',
    corpus_gaps: '',
    ao_fit: '',
    related_doc_titles: [],
    generated_at: new Date().toISOString(),
  };
}

function normWords(s) {
  return String(s || '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 2);
}

/**
 * Heuristic gap hints: weak overlap between topic words and published titles/summaries/tags → possible gap.
 */
export function rankCorpusGapsFromDocs(topic, docs) {
  const tw = new Set(normWords(topic));
  if (!tw.size) return [];

  const rows = [];
  for (const d of Array.isArray(docs) ? docs : []) {
    const blob = [d.title, d.summary, ...(Array.isArray(d.tags) ? d.tags : [])].join(' ');
    const bw = new Set(normWords(blob));
    let overlap = 0;
    for (const w of tw) {
      if (bw.has(w)) overlap += 1;
    }
    const ratio = overlap / tw.size;
    rows.push({
      slug: d.slug || '',
      title: d.title || '',
      overlap: ratio,
    });
  }
  rows.sort((a, b) => a.overlap - b.overlap);
  const weakest = rows.slice(0, 5).filter((r) => r.overlap < 0.25);

  return weakest.map((r, i) => ({
    topic: String(topic).slice(0, 200),
    rationale:
      r.title && r.slug
        ? `Low keyword overlap with “${r.title}” — may be a gap angle or needs a distinct lane.`
        : 'Thin overlap with part of the index — treat as approximate.',
    related_slugs: r.slug ? [r.slug] : [],
    priority: i === 0 ? 'high' : 'medium',
  }));
}
