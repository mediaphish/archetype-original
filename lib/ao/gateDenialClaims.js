/**
 * gateDenialClaims.js
 *
 * Mirror of gateActionClaims: catch Auto denying something that is concretely
 * present in this turn's injected context. Non-destructive — annotate only.
 *
 * Scope (v1): image/URL denials when context has a real image URL
 * (approved-drafts "image saved at:" lines or manual header-upload facts).
 */

/**
 * @typedef {{
 *   id: string,
 *   label: string,
 *   denialPatterns: RegExp[],
 *   subjectPatterns: RegExp[],
 * }} DenialClaimRule
 */

/** @type {DenialClaimRule[]} */
export const DENIAL_CLAIM_RULES = [
  {
    id: 'image_denial',
    label: 'image / URL presence',
    denialPatterns: [
      /\bi\s+don['’]?t\s+see\b/i,
      /\bi\s+do\s+not\s+see\b/i,
      /\bno\s+(?:url|file|image|photo|path)\s+(?:is\s+|was\s+)?(?:attached|present|included|here)\b/i,
      /\bi\s+don['’]?t\s+have\s+(?:access\s+to|visibility\s+into)\b/i,
      /\bi\s+(?:can['’]?t|cannot)\s+(?:see|find|locate)\b/i,
      /\b(?:there\s+(?:is|was)\s+)?no\s+(?:url|file\s+path|image|photo)\s+(?:attached|available)\b/i,
      /\bnothing\s+(?:is\s+)?attached\b/i,
    ],
    subjectPatterns: [
      /\b(?:url|file(?:\s+path)?|image|photo|header|graphic|attachment|path)\b/i,
    ],
  },
];

/**
 * Pull concrete image URLs from this turn's assembled context text.
 * Only lines that assert a saved/attached image count — "no image saved yet" does not.
 * @param {string} contextText
 * @returns {string[]}
 */
export function extractImageEvidenceUrls(contextText) {
  const text = String(contextText || '');
  if (!text.trim()) return [];

  const urls = [];
  const patterns = [
    /image saved at:\s*(https?:\/\/[^\s|]+)/gi,
    /Image URL:\s*(https?:\/\/[^\s|]+)/gi,
    /Durable URL[^:]*:\s*(https?:\/\/[^\s|]+)/gi,
    /(?:header|reference)\s+image(?:\s+URL)?[:\s]+(https?:\/\/[^\s|]+)/gi,
  ];

  for (const re of patterns) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(text)) !== null) {
      const cleaned = String(m[1] || '')
        .trim()
        .replace(/[.,);\]}>]+$/g, '');
      if (cleaned.startsWith('http')) urls.push(cleaned);
    }
  }

  return [...new Set(urls)];
}

function nearSubject(text, matchIndex, matchLen, subjectPatterns, window = 120) {
  const start = Math.max(0, matchIndex - window);
  const end = Math.min(text.length, matchIndex + matchLen + window);
  const slice = text.slice(start, end);
  return subjectPatterns.some((re) => {
    re.lastIndex = 0;
    return re.test(slice);
  });
}

/**
 * @param {string} reply
 * @param {{ contextText?: string, imageUrls?: string[] }} evidence
 * @returns {{
 *   falseDenials: Array<{ ruleId: string, label: string, matchedText: string, evidenceUrls: string[] }>,
 * }}
 */
export function findFalseDenialClaims(reply, evidence = {}) {
  const text = String(reply || '');
  if (!text.trim()) return { falseDenials: [] };

  const imageUrls =
    Array.isArray(evidence.imageUrls) && evidence.imageUrls.length > 0
      ? [...new Set(evidence.imageUrls.filter(Boolean))]
      : extractImageEvidenceUrls(evidence.contextText || '');

  // Conservative: no concrete URL in context → never fire.
  if (!imageUrls.length) return { falseDenials: [] };

  const falseDenials = [];

  for (const rule of DENIAL_CLAIM_RULES) {
    let matchedText = null;
    for (const pattern of rule.denialPatterns) {
      pattern.lastIndex = 0;
      const m = pattern.exec(text);
      if (!m) continue;
      if (!nearSubject(text, m.index, m[0].length, rule.subjectPatterns)) continue;
      matchedText = m[0];
      break;
    }
    if (!matchedText) continue;

    falseDenials.push({
      ruleId: rule.id,
      label: rule.label,
      matchedText,
      evidenceUrls: imageUrls,
    });
  }

  return { falseDenials };
}

/**
 * User-visible note appended under the original streamed reply (never replaces it).
 */
export function buildVisibleFalseDenialWarning(falseDenials) {
  const urls = [];
  for (const d of falseDenials || []) {
    for (const u of d.evidenceUrls || []) {
      if (u && !urls.includes(u)) urls.push(u);
    }
  }
  const urlList = urls.length ? urls.map((u) => `\`${u}\``).join(', ') : 'an image URL';
  return (
    `---\n**⚠️ SYSTEM NOTE:** The system has a record of an image already attached ` +
    `(${urlList}) — this reply may be incorrect about not having it. ` +
    `The content above was kept as streamed; nothing above this line was rewritten by the server.`
  );
}

/**
 * Annotate a reply in place. Never replaces substantive content.
 * @returns {{ reply: string, appendedNote: string|null, falseDenials: array }}
 */
export function annotateFalseDenialClaims(reply, evidence = {}) {
  const original = String(reply || '');
  const { falseDenials } = findFalseDenialClaims(original, evidence);
  if (!falseDenials.length) {
    return { reply: original, appendedNote: null, falseDenials: [] };
  }
  const appendedNote = buildVisibleFalseDenialWarning(falseDenials);
  return {
    reply: `${original.trim()}\n\n${appendedNote}`.trim(),
    appendedNote,
    falseDenials,
  };
}

export function hasFalseDenialClaims(reply, evidence = {}) {
  return findFalseDenialClaims(reply, evidence).falseDenials.length > 0;
}
