/**
 * Detect whether a user message is approving a draft (#132).
 *
 * Bare single words (ready, yes, solid, …) are too easy to match inside long
 * planning docs (e.g. "paste-ready"). Multi-word phrases may match anywhere;
 * single-word triggers only count in short messages and never inside hyphen compounds.
 */

/** Multi-word / multi-token phrases — safe enough to match in longer messages. */
export const APPROVAL_PHRASE_PATTERN =
  /\b(looks good|go ahead|publish it|that.?s it|do it|fire it|send it|this works|i think (it'?s|this is|it) (good|works|solid)|nailed it|let'?s lock it|lock it in)\b/i;

/**
 * Single-word triggers — only considered when the whole message is short.
 * "approved" / "approve" live here so a long planning doc cannot silently approve.
 */
export const APPROVAL_SHORT_WORD_PATTERN =
  /\b(approved?|yes|yep|yeah|perfect|confirmed?|ready|solid)\b/i;

export const APPROVAL_SHORT_MAX_WORDS = 15;

// "nothing"/"none" are real negation words — must be listed explicitly (not covered by \bnot\b).
export const NEGATED_APPROVAL_PATTERN =
  /\b(not|nothing|none|isn'?t|don'?t|doesn'?t|didn'?t|wasn'?t|weren'?t|never|no)\b[\s\S]{0,20}\b(ready|solid|good|approved?|works?|there yet|it)\b|\b(ready|solid|good|approved?|works?)\b[\s\S]{0,15}\b(not|nothing|none|yet\??$|isn'?t|don'?t)\b/i;

function wordCount(text) {
  return String(text || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

/** Hyphen compounds like paste-ready must not count as standalone "ready". */
export function isHyphenCompoundMatch(text, matchIndex, matchLength) {
  const s = String(text || '');
  const before = matchIndex > 0 ? s[matchIndex - 1] : '';
  const after = matchIndex + matchLength < s.length ? s[matchIndex + matchLength] : '';
  return before === '-' || after === '-';
}

function firstSafeMatch(text, pattern) {
  const re = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`);
  let m;
  while ((m = re.exec(text)) !== null) {
    if (isHyphenCompoundMatch(text, m.index, m[0].length)) continue;
    return m;
  }
  return null;
}

/**
 * @param {string} userMessage
 * @returns {{ isApproval: boolean, matchedText: string|null, mode: string|null }}
 */
export function detectUserApprovalIntent(userMessage) {
  const text = String(userMessage || '');
  const userLower = text.toLowerCase();
  if (!userLower.trim()) {
    return { isApproval: false, matchedText: null, mode: null };
  }

  if (NEGATED_APPROVAL_PATTERN.test(userLower)) {
    return { isApproval: false, matchedText: null, mode: 'negated' };
  }

  const phraseMatch = firstSafeMatch(userLower, APPROVAL_PHRASE_PATTERN);
  if (phraseMatch) {
    try {
      const idx = phraseMatch.index;
      const start = Math.max(0, idx - 60);
      const end = Math.min(userLower.length, idx + phraseMatch[0].length + 60);
      console.warn('[detectUserApprovalIntent] fired', {
        matchedText: phraseMatch[0],
        mode: 'phrase',
        context: userLower.slice(start, end),
      });
    } catch (_) {
      /* diagnostic only */
    }
    return { isApproval: true, matchedText: phraseMatch[0], mode: 'phrase' };
  }

  if (wordCount(userLower) <= APPROVAL_SHORT_MAX_WORDS) {
    const shortMatch = firstSafeMatch(userLower, APPROVAL_SHORT_WORD_PATTERN);
    if (shortMatch) {
      try {
        const idx = shortMatch.index;
        const start = Math.max(0, idx - 60);
        const end = Math.min(userLower.length, idx + shortMatch[0].length + 60);
        console.warn('[detectUserApprovalIntent] fired', {
          matchedText: shortMatch[0],
          mode: 'short_word',
          context: userLower.slice(start, end),
        });
      } catch (_) {
        /* diagnostic only */
      }
      return { isApproval: true, matchedText: shortMatch[0], mode: 'short_word' };
    }
  }

  return { isApproval: false, matchedText: null, mode: null };
}
