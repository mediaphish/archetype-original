#!/usr/bin/env node
/**
 * Every word on every public page of the site, into the corpus.
 *
 * Bart, 2026-10-22: "Every word on the website on all pages should have been
 * consumed by the corpus and used to train all AI systems." Until now the
 * corpus held the books, journal, devotionals, podcast and FAQs, but none of
 * the page copy itself (Work with Bart, Meet Bart, Advisory, the book pages and
 * the rest), because that copy lives in the site code rather than in markdown.
 *
 * This reads the pre-rendered pages in dist/ (run after scripts/prerender.mjs)
 * and writes one markdown file per page to ao-knowledge-hq-kit/site-pages/.
 * build-knowledge.mjs picks those up as type 'site-page', and the nightly
 * corpus job indexes them for Archy and Auto like any other document.
 *
 * A page that later leaves the site keeps its file, marked archived, so its
 * words stay in the corpus (Bart: archive old pages, never delete them).
 * The date on a file only moves when the page's words change, so an unchanged
 * page is never re-indexed.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { JSDOM } from 'jsdom';
import matter from 'gray-matter';
import { getPublicStaticPaths } from './lib/public-static-routes.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DIST = join(ROOT, 'dist');
export const SITE_PAGES_DIR = join(ROOT, 'ao-knowledge-hq-kit', 'site-pages');
const SITE = 'https://www.archetypeoriginal.com';

/** Pages with no words of Bart's worth keeping (legal boilerplate is still kept). */
const SKIP_PATHS = new Set(['/culture-science/ali/dashboard']);

export function slugForPath(path) {
  return path === '/' ? 'site-page-home' : `site-page-${path.replace(/^\//, '').replace(/\//g, '-')}`;
}

const BLOCK_TAGS = new Set([
  'P', 'DIV', 'SECTION', 'ARTICLE', 'LI', 'UL', 'OL', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
  'BLOCKQUOTE', 'FIGCAPTION', 'TR', 'TABLE', 'BR', 'DT', 'DD', 'FORM', 'LABEL', 'HEADER', 'MAIN',
  // Buttons and links sit side by side on the page; keep them apart in the text.
  'A', 'BUTTON',
]);

/** Visible text of one element as markdown-ish lines: headings marked, blocks separated. */
function textOf(node, out) {
  if (node.nodeType === 3) {
    out.push(node.textContent);
    return;
  }
  if (node.nodeType !== 1) return;
  const tag = node.tagName;
  if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'SVG', 'TEMPLATE', 'IFRAME'].includes(tag)) return;
  if (node.getAttribute('aria-hidden') === 'true') return;
  const heading = /^H([1-6])$/.exec(tag);
  const block = BLOCK_TAGS.has(tag);
  if (block) out.push('\n\n');
  if (heading) out.push(`${'#'.repeat(Number(heading[1]))} `);
  if (tag === 'LI') out.push('- ');
  for (const child of node.childNodes) textOf(child, out);
  if (tag === 'IMG' && node.getAttribute('alt')) out.push(` [Image: ${node.getAttribute('alt')}] `);
  if (block) out.push('\n\n');
  // Prices and labels are often two spans touching ("$500" + "one time").
  if (tag === 'SPAN') out.push(' ');
}

function clean(raw) {
  return raw
    .replace(/[ \t ]+/g, ' ')
    .split('\n')
    .map((l) => l.trim())
    .join('\n')
    .replace(/^(#+ |- )\s*$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function extractPage(html) {
  const { document } = new JSDOM(html).window;
  const title = (document.querySelector('title')?.textContent || '').trim();
  const description = (document.querySelector('meta[name="description"]')?.getAttribute('content') || '').trim();
  // The menu and footer repeat on every page; keep the page's own words.
  for (const el of document.querySelectorAll('body > div header, nav, footer, [role="navigation"]')) el.remove();
  const root = document.querySelector('main') || document.querySelector('#root') || document.body;
  const out = [];
  textOf(root, out);
  return { title, description, body: clean(out.join('')) };
}

function main() {
  if (!existsSync(DIST)) {
    console.error('❌ dist/ not found. Run the pre-render first.');
    process.exit(1);
  }
  mkdirSync(SITE_PAGES_DIR, { recursive: true });
  const today = new Date().toISOString().slice(0, 10);
  // A full timestamp, so a second edit on the same day still reads as newer
  // than the copy indexed that morning.
  const now = new Date().toISOString();
  const live = new Set();
  let written = 0;
  let unchanged = 0;

  for (const path of getPublicStaticPaths()) {
    if (SKIP_PATHS.has(path)) continue;
    const file = path === '/' ? join(DIST, 'index.html') : join(DIST, path, 'index.html');
    if (!existsSync(file)) {
      console.warn(`⚠️  No pre-rendered page for ${path}`);
      continue;
    }
    const { title, description, body } = extractPage(readFileSync(file, 'utf8'));
    if (body.length < 200) {
      // A page that rendered almost nothing is a render failure, not content.
      console.warn(`⚠️  ${path} rendered only ${body.length} characters; keeping the previous copy.`);
      live.add(slugForPath(path));
      continue;
    }
    const slug = slugForPath(path);
    live.add(slug);
    const target = join(SITE_PAGES_DIR, `${slug}.md`);
    let createdAt = today;
    const updatedAt = now;
    if (existsSync(target)) {
      const prev = matter(readFileSync(target, 'utf8'));
      createdAt = String(prev.data.created_at || today);
      if (prev.content.trim() === body && !prev.data.archived) {
        unchanged += 1;
        continue;
      }
    }
    const fm = {
      title: title.replace(/\s*\|\s*Archetype Original\s*$/i, '') || slug,
      slug,
      type: 'site-page',
      status: 'published',
      url: `${SITE}${path === '/' ? '' : path}`,
      summary: description,
      tags: ['site-page'],
      created_at: createdAt,
      updated_at: updatedAt,
      source: { kind: 'site', note: 'Generated from the live page by scripts/extract-site-pages.mjs. Edit the page, not this file.' },
    };
    writeFileSync(target, matter.stringify(`${body}\n`, fm));
    written += 1;
  }

  // Pages that left the site stay in the corpus, marked archived.
  let archived = 0;
  for (const name of readdirSync(SITE_PAGES_DIR)) {
    if (!name.endsWith('.md')) continue;
    const slug = name.replace(/\.md$/, '');
    if (live.has(slug)) continue;
    const target = join(SITE_PAGES_DIR, name);
    const prev = matter(readFileSync(target, 'utf8'));
    if (prev.data.archived) continue;
    prev.data.archived = true;
    prev.data.archived_at = today;
    prev.data.updated_at = now;
    writeFileSync(target, matter.stringify(prev.content, prev.data));
    archived += 1;
  }

  console.log(`📄 Site pages in the corpus: ${written} written, ${unchanged} unchanged, ${archived} newly archived.`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
