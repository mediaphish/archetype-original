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

const files = ['sitemap.xml', 'robots.txt', 'knowledge.json', 'llms.txt'];

for (const f of files) {
  const src = join(root, 'public', f);
  if (!existsSync(src)) continue;
  const dest = join(dist, f);
  mkdirSync(dirname(dest), { recursive: true });
  copyFileSync(src, dest);
  console.log(`📋 Copied public/${f} → dist/${f}`);
}
