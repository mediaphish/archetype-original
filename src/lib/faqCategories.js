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
