/**
 * Images the server needs, read from the live site (2026-11-08).
 *
 * Every server piece used to carry its own copy of the site's images, up to
 * 142 MB each, and packing those copies ran the site build out of memory.
 * Bart: "Once they are live a push should not have to push what is already
 * there." The images are already on the site, so server code reads them from
 * there. A local copy is still used when one exists (scripts on a laptop).
 */
import fs from 'fs';
import path from 'path';

const siteBase = () => (process.env.PUBLIC_SITE_URL || 'https://www.archetypeoriginal.com').replace(/\/$/, '');

/** Pure: "public/images/x.png", "/images/x.png" or "x.png" -> "x.png". */
export function siteImageName(name) {
  return String(name || '')
    .trim()
    .replace(/^.*?\/public\/images\//, '')
    .replace(/^\/+/, '')
    .replace(/^(public\/)?images\//, '');
}

export function siteImageUrl(name) {
  return `${siteBase()}/images/${siteImageName(name)}`;
}

/** The image's bytes, from a local copy if there is one, else from the live site. Null when neither has it. */
export async function readSiteImage(name) {
  const rel = siteImageName(name);
  if (!rel) return null;
  const local = path.join(process.cwd(), 'public', 'images', rel);
  if (fs.existsSync(local)) return fs.readFileSync(local);
  try {
    const res = await fetch(siteImageUrl(rel));
    // A missing file comes back as the site's own page with a 200, so only an image counts.
    if (!res.ok || !/^image\//i.test(res.headers.get('content-type') || '')) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}
