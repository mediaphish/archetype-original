/**
 * Series matching for Auto — pure, no IO, so the scoring is directly testable.
 *
 * Split out of autoV2.js because that module builds a Supabase client at import
 * time, which makes anything inside it untestable without a live database.
 */

/**
 * Match a message against a list of known series.
 *
 * @param {string} userMessageText
 * @param {Array<{series_key:string,title:string,parts?:Array<{slug?:string,title?:string}>}>} series
 * @returns {{ key: string, title: string, slugs: string[], score: number } | null}
 */
export function matchSeries(userMessageText, series = []) {
  if (!userMessageText || !Array.isArray(series) || series.length === 0) return null;

  const text = String(userMessageText).toLowerCase();
  const words = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const tokensOf = (s) => words(s).split(' ').filter((t) => t.length >= 4);

  // Only tokens unique to ONE series may identify it.
  //
  // Without this, "another Case for Servant Leadership post" resolved to the
  // Clenched Fist series: both titles contain "leadership", every series scored
  // on it, and the tie broke on recency. Shared vocabulary is noise here
  // precisely because everything Bart writes is about leadership.
  const frequency = new Map();
  for (const s of series) {
    for (const token of new Set([...tokensOf(s.title), ...tokensOf(s.series_key)])) {
      frequency.set(token, (frequency.get(token) || 0) + 1);
    }
  }

  let best = null;
  for (const s of series) {
    let score = 0;

    // An exact title or key phrase is unambiguous; it outranks token evidence.
    for (const name of [words(s.title), words(s.series_key)]) {
      if (name && text.includes(name)) score = Math.max(score, name.length + 100);
    }
    // Naming any recorded part names the series.
    for (const part of s.parts || []) {
      const name = words(part.title);
      if (name && text.includes(name)) score = Math.max(score, name.length + 50);
    }
    // Otherwise accumulate distinctive tokens only.
    const distinctive = [...new Set([...tokensOf(s.title), ...tokensOf(s.series_key)])].filter(
      (t) => frequency.get(t) === 1
    );
    score = Math.max(
      score,
      distinctive.filter((t) => text.includes(t)).reduce((sum, t) => sum + t.length, 0)
    );

    if (score > (best?.score || 0)) {
      best = {
        score,
        key: s.series_key,
        title: s.title,
        slugs: (s.parts || []).map((p) => p.slug).filter(Boolean),
      };
    }
  }
  return best && best.score > 0 ? best : null;
}

