/**
 * FAQ category config and helpers (shared by React app and static FAQ build scripts).
 */

export const FAQ_CATEGORY_CONFIG = [
  { key: 'culture-science', label: 'Culture Science' },
  { key: 'ali', label: 'ALI' },
  { key: 'philosophy', label: 'Philosophy' },
  { key: 'methods', label: 'Methods' },
  { key: 'meet-archy', label: 'Archy' },
  { key: 'engagement', label: 'Working with Bart' },
  { key: 'accidental-ceo', label: 'Accidental CEO' },
  { key: 'meet-bart', label: 'Meet Bart' },
];

export function normalizeFaqCategory(value) {
  return String(value || '').trim().toLowerCase();
}

export function getFaqCategoryLabel(key) {
  const normalized = normalizeFaqCategory(key);
  const match = FAQ_CATEGORY_CONFIG.find((item) => item.key === normalized);
  if (match) return match.label;
  return String(key || '')
    .split('-')
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : ''))
    .join(' ')
    .trim();
}

export function getPrimaryCategory(faq) {
  if (!Array.isArray(faq?.categories) || !faq.categories.length) return '';
  return normalizeFaqCategory(faq.categories[0]);
}

/**
 * Group published FAQ docs by primary category (first categories[] entry).
 * @returns {Map<string, object[]>}
 */
export function groupFaqsByPrimaryCategory(faqDocs) {
  const groups = new Map();
  for (const faq of faqDocs) {
    const key = getPrimaryCategory(faq);
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(faq);
  }
  for (const [, items] of groups) {
    items.sort((a, b) =>
      String(a.title || '').localeCompare(String(b.title || ''), undefined, { sensitivity: 'base' })
    );
  }
  return groups;
}

/**
 * Category keys that have at least one FAQ, in FAQ_CATEGORY_CONFIG order then extras.
 */
export function faqCategoryKeysWithContent(faqDocs) {
  const groups = groupFaqsByPrimaryCategory(faqDocs);
  const keys = [];
  for (const { key } of FAQ_CATEGORY_CONFIG) {
    if (groups.has(key) && groups.get(key).length > 0) keys.push(key);
  }
  for (const key of groups.keys()) {
    if (!keys.includes(key)) keys.push(key);
  }
  return keys;
}
