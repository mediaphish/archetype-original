/**
 * Has Bart already published this argument?
 *
 * 2026-09-15. Bart asked for a resurface post. Auto searched the corpus, read
 * "Twenty Points Apart" (published 2026-08-28) in full, and then pitched that
 * same post again: the same reframe (a leader scores intent, the team scores
 * pattern), the same "two different questions", the same close, with only the
 * statistic swapped. Its outline tool saved the pitch as a new draft. Bart had to
 * tell it to check. His words: "It must check the corpus without me having to
 * prompt it."
 *
 * Reading the corpus was never the missing step. Nothing compared the new pitch
 * against what is already published. This does, inside the tools that create a
 * new post, so the check runs whether or not Auto thinks to do it.
 *
 * THE THRESHOLD, measured 2026-09-15 with the same passage search Auto uses
 * (search_corpus_chunks), journal posts only:
 *
 *   The Gap outline vs Twenty Points Apart ......... 0.693 (0.682 with the slug removed)
 *   A Cain-like pitch vs The Cain Archetype ........ 0.673
 *   A Nehemiah pitch vs The Nehemiah Archetype ..... 0.718
 *   A new resurface with its own mechanism ......... 0.526 (closest post)
 *   An unrelated resurface pitch ................... 0.527 (closest post)
 *   Series part 5 vs part 1 of the same series ..... 0.672  <- exempt, see below
 *
 * 0.62 sits between them with room on both sides. It is a flag for Bart, not a
 * verdict: a match stops the save until Bart has seen the prior post and said to
 * go ahead, which Auto passes back as prior_coverage_cleared.
 *
 * Parts of the same series build on each other by design, so posts in the
 * draft's own series never count against it.
 */
export const PRIOR_COVERAGE_THRESHOLD = 0.62;

const MAX_MATCHES = 3;

/**
 * Pure selection over grouped search results.
 *
 * @param {Array<{slug, title, doc_type, similarity, passages?}>} docs
 * @param {object} opts
 * @param {string} [opts.slug]            The draft's own slug, never a match.
 * @param {string} [opts.seriesSlug]      The draft's series; its posts are exempt.
 * @param {string[]} [opts.excludeSlugs]  Prior parts already loaded for this piece.
 * @param {Record<string, {series_slug?: string, published_at?: string}>} [opts.publishedBySlug]
 */
export function selectPriorCoverage(
  docs,
  { slug = null, seriesSlug = null, excludeSlugs = [], publishedBySlug = {}, threshold = PRIOR_COVERAGE_THRESHOLD } = {}
) {
  const exclude = new Set([slug, ...(excludeSlugs || [])].filter(Boolean));
  const series = seriesSlug && seriesSlug !== 'standalone' ? seriesSlug : null;

  return (Array.isArray(docs) ? docs : [])
    .filter((d) => String(d?.doc_type || '') === 'journal-post')
    .filter((d) => Number(d?.similarity) >= threshold)
    .filter((d) => !exclude.has(d.slug))
    .filter((d) => !(series && publishedBySlug[d.slug]?.series_slug === series))
    .sort((a, b) => Number(b.similarity) - Number(a.similarity))
    .slice(0, MAX_MATCHES)
    .map((d) => ({
      slug: d.slug,
      title: d.title,
      url: `/journal/${d.slug}`,
      similarity: Number(Number(d.similarity).toFixed(3)),
      published_at: publishedBySlug[d.slug]?.published_at || null,
      passage: String(d?.passages?.[0]?.content || d?.passages?.[0] || '').slice(0, 400) || null,
    }));
}

/**
 * Does this reply pitch a new piece?
 *
 * The save-time check only runs when Auto saves. A pitch written straight into
 * the chat is what Bart reads first, and on 2026-09-15 Auto mentioned the
 * overlap only after Bart asked, and even then named the draft it had just
 * created rather than the published post. So a pitch-shaped reply is checked
 * too, whether or not anything was saved.
 *
 * Two or more pitch markers, so an ordinary reply that says "title" once does
 * not trigger a corpus search.
 */
export function looksLikeNewPiecePitch(reply) {
  const text = String(reply || '');
  if (text.length < 300) return false;
  const markers = [
    /\bworking title\b/i,
    /^\s*\*\*\s*(?:the\s+)?(?:hook|reframe|angle|build|close|opening|outline|thesis)\b/im,
    /\blinks?\s+back\s+to\b/i,
    /\b(?:resurface|new)\s+(?:post|piece)\b/i,
    /\b\d{3,4}\s*(?:-|to)\s*\d{3,4}\s+words\b/i,
    /\bwant me to write the (?:full )?draft\b/i,
  ];
  return markers.filter((re) => re.test(text)).length >= 2;
}

/** The note shown under a pitch that repeats a published argument. */
export function priorCoverageReplyNote(matches) {
  const lines = (matches || []).map((m) => {
    const when = m.published_at ? `, published ${String(m.published_at).slice(0, 10)}` : '';
    return `- "${m.title}" (${m.url}${when})`;
  });
  return (
    '---\n**Already published:** this pitch is close to an argument Bart has already made:\n' +
    `${lines.join('\n')}\n` +
    'Checked automatically against the published journal. Compare before approving this angle.'
  );
}

/** The tool result Auto gets instead of a saved draft. */
export function priorCoverageGateResult(matches) {
  const lines = matches.map((m) => {
    const when = m.published_at ? `, published ${String(m.published_at).slice(0, 10)}` : '';
    return `- "${m.title}" (${m.url}${when}), similarity ${m.similarity}`;
  });
  return {
    ok: false,
    gate: 'prior_coverage',
    prior_coverage: matches,
    error:
      'NOT SAVED. This pitch makes an argument Bart has already published:\n' +
      `${lines.join('\n')}\n\n` +
      'This is not resurface work, so Bart\'s no-duplicate rule applies. Tell him plainly which published post(s) above ' +
      'this matches and what the difference is, if any, then ask how he wants to proceed. ' +
      'Do not switch to a different topic on your own, and do not describe this pitch or its draft as something he already has. ' +
      'Only if Bart says to go ahead with it, call the tool again with prior_coverage_cleared=true.',
  };
}

/**
 * Search the corpus for published posts that already make this pitch.
 * A search failure never blocks a save: Bart losing work to an outage is worse
 * than a missed flag, and the failure is logged.
 */
export async function findPriorCoverage({ text, slug = null, seriesSlug = null, excludeSlugs = [] }) {
  const query = String(text || '').trim();
  if (!query) return [];
  try {
    const { searchCorpusChunks, groupChunksByDocument } = await import('./corpusChunks.js');
    const hits = await searchCorpusChunks(query.slice(0, 6000), {
      threshold: PRIOR_COVERAGE_THRESHOLD - 0.05,
      maxResults: 30,
      maxPerType: 30,
    });
    const docs = groupChunksByDocument(hits).filter((d) => String(d.doc_type) === 'journal-post');
    if (!docs.length) return [];

    let publishedBySlug = {};
    try {
      const { contentDrafts } = await import('../db/contentDrafts.js');
      const { data } = await contentDrafts()
        .select('slug, series_slug, published_at')
        .eq('kind', 'journal')
        .eq('status', 'published')
        .in('slug', docs.map((d) => d.slug));
      for (const row of data || []) {
        const prev = publishedBySlug[row.slug];
        if (!prev || String(row.published_at || '') > String(prev.published_at || '')) publishedBySlug[row.slug] = row;
      }
    } catch (err) {
      console.warn('[priorCoverage] published lookup failed:', err?.message || err);
    }

    return selectPriorCoverage(docs, { slug, seriesSlug, excludeSlugs, publishedBySlug });
  } catch (err) {
    console.warn('[priorCoverage] search failed; not blocking the save:', err?.message || err);
    return [];
  }
}
