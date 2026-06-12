/**
 * Post-process Archy episode copy to enforce Bart voice constraints.
 */

const FILLER_PATTERNS = [
  /\bit'?s worth noting\b/gi,
  /\bat its core\b/gi,
  /\bin many ways\b/gi,
  /\bdelve\b/gi,
  /\btapestry\b/gi,
  /\bnuanced\b/gi,
  /\blet me be clear\b/gi,
  /\bhere'?s the thing\b/gi,
];

export function sanitizeEpisodeVoiceText(text) {
  let s = String(text || '');
  s = s.replace(/\u2014/g, '-');
  s = s.replace(/\u2013/g, '-');
  s = s.replace(/\s--\s/g, '. ');
  for (const re of FILLER_PATTERNS) {
    s = s.replace(re, '');
  }
  s = s.replace(/\n{3,}/g, '\n\n');
  s = s.replace(/[ \t]+\n/g, '\n');
  return s.trim();
}

export function sanitizeEpisodeFields(fields) {
  const out = { ...fields };
  for (const key of ['title', 'summary', 'body_md']) {
    if (out[key]) out[key] = sanitizeEpisodeVoiceText(out[key]);
  }
  for (const key of ['show_notes', 'key_takeaways']) {
    if (Array.isArray(out[key])) {
      out[key] = out[key].map((x) => sanitizeEpisodeVoiceText(x)).filter(Boolean);
    }
  }
  return out;
}
