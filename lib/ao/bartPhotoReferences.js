/**
 * Real Bart photos in the repo for resurface / branded graphics.
 * Paths under public/images/ — served live at /images/<filename>.
 */

import fs from 'fs';
import path from 'path';

/** Preferred candid / editorial set used for resurface matching. */
export const BART_PHOTO_FILENAMES = [
  'Bart-1.jpg',
  'Bart-4.jpg',
  'Bart-8.jpg',
  'Bart-32.jpg',
  'Bart-44.jpg',
  'Bart-52.jpg',
  'Bart-78.jpg',
  'Bart-87.jpg',
  'Bart-97.jpg',
  'Bart-141.jpg',
  'bart-headshot-2026.png',
  'bart-headshot-001.jpg',
  'bart-headshot-002.jpg',
  'bart-headshot-003.jpg',
];

export function siteBaseUrl() {
  return (process.env.PUBLIC_SITE_URL || 'https://www.archetypeoriginal.com').replace(/\/$/, '');
}

export function bartPhotoPublicUrl(filename) {
  const name = String(filename || '').replace(/^\/+/, '');
  return `${siteBaseUrl()}/images/${name}`;
}

/**
 * List Bart photo URLs that actually exist on disk (or all known public URLs
 * when running without local files, e.g. serverless — still valid on the live site).
 */
export function listAvailableBartPhotoUrls({ requireLocalFile = false } = {}) {
  const urls = [];
  for (const name of BART_PHOTO_FILENAMES) {
    const localPath = path.join(process.cwd(), 'public', 'images', name);
    const exists = fs.existsSync(localPath);
    if (requireLocalFile && !exists) continue;
    urls.push(bartPhotoPublicUrl(name));
  }
  return urls;
}

/**
 * Pick one Bart photo URL for a resurface graphic.
 * Optional mood keyword biases toward headshot vs candid (simple heuristic).
 */
export function pickBartPhotoUrl({ mood = '' } = {}) {
  const m = String(mood || '').toLowerCase();
  const preferHeadshot = /\b(formal|serious|portrait|headshot|close)\b/.test(m);
  const urls = listAvailableBartPhotoUrls({ requireLocalFile: false });
  if (!urls.length) return null;
  if (preferHeadshot) {
    const head = urls.find((u) => /headshot/i.test(u));
    if (head) return head;
  }
  // Stable-ish pick from mood hash so same mood tends to same photo
  let hash = 0;
  const key = m || 'default';
  for (let i = 0; i < key.length; i += 1) hash = (hash + key.charCodeAt(i) * (i + 1)) % urls.length;
  return urls[hash] || urls[0];
}

/**
 * Build the standing resurface image plan Auto must follow.
 * Quote selection: a short, stand-alone pull line from the post body (caller supplies quote).
 */
export function buildResurfaceImagePlan({
  title = '',
  pullQuote = '',
  mood = '',
  photoUrl = null,
} = {}) {
  const photo = photoUrl || pickBartPhotoUrl({ mood: mood || title || pullQuote });
  const quote = String(pullQuote || '').trim();
  const prompt = [
    'Resurface graphic for Archetype Original.',
    'Use the attached real photograph of Bart as the primary visual subject — do not invent a different person.',
    quote
      ? `Integrate this pull quote as the featured text (verbatim): "${quote}"`
      : 'If a pull quote is supplied elsewhere in this prompt, use it verbatim as featured text.',
    'Compose for a 4:3 social crop (letterbox/safe area on a landscape canvas).',
    'Brand: Archetype Original — dark/cream palette, red used sparingly, no stock-photo look.',
    title ? `Post title context: ${title}.` : '',
  ]
    .filter(Boolean)
    .join(' ');

  return {
    content_type: 'resurface',
    size: '4:3',
    reference_image_urls: photo ? [photo] : [],
    prompt_description: prompt,
    photo_url: photo,
    pull_quote: quote || null,
  };
}
