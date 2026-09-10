#!/usr/bin/env node
/**
 * After vite build, some public/ files are regenerated (knowledge.json, sitemap.xml).
 * Copy those into dist/ so the deployed site matches.
 */
import { copyFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const dist = join(root, 'dist');

// rss.xml and devotionals.xml were missing here until 2026-09-10, which meant
// the served feed was always one deploy behind. vite copies public/ into dist/
// before generate-rss runs, so dist/rss.xml held the PREVIOUS build's feed and
// a newly published post did not reach subscribers until the deploy after the
// one that published it. Invisible in a quiet week, because with no new post
// the two files are byte-identical.
const files = [
  'sitemap.xml',
  'robots.txt',
  'knowledge.json',
  'llms.txt',
  'llms-full.txt',
  'rss.xml',
  'devotionals.xml',
];

for (const f of files) {
  const src = join(root, 'public', f);
  if (!existsSync(src)) continue;
  const dest = join(dist, f);
  mkdirSync(dirname(dest), { recursive: true });
  copyFileSync(src, dest);
  console.log(`📋 Copied public/${f} → dist/${f}`);
}
