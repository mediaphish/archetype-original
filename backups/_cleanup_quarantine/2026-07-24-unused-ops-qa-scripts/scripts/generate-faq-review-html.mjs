#!/usr/bin/env node
/**
 * Build a single offline HTML file for reviewing FAQ markdown sources.
 * Usage:
 *   node scripts/generate-faq-review-html.mjs
 *   node scripts/generate-faq-review-html.mjs notes/my-review.html
 *   node scripts/generate-faq-review-html.mjs notes/my-review.html slug-a,slug-b
 */

import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const FAQ_DIR = path.join(ROOT, 'ao-knowledge-hq-kit', 'faqs');
const DEFAULT_OUT = path.join(ROOT, 'notes', 'faq-review-viewer.html');

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function wordCount(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function collectFiles(slugFilter) {
  const all = fs.existsSync(FAQ_DIR)
    ? fs.readdirSync(FAQ_DIR).filter((f) => f.endsWith('.md'))
    : [];
  let names = all;
  if (slugFilter?.length) {
    const want = new Set(slugFilter.map((s) => (s.endsWith('.md') ? s.slice(0, -3) : s)));
    names = all.filter((f) => want.has(path.basename(f, '.md')));
  }
  const items = [];
  for (const name of names.sort()) {
    const filePath = path.join(FAQ_DIR, name);
    const raw = fs.readFileSync(filePath, 'utf8');
    const { data, content } = matter(raw);
    const body = content.trim();
    const wc = wordCount(body);
    items.push({
      file: name,
      slug: data.slug || path.basename(name, '.md'),
      title: data.title || '(no title)',
      status: data.status || '',
      categories: Array.isArray(data.categories) ? data.categories.join(', ') : '',
      body,
      words: wc,
      chars: body.length,
    });
  }
  items.sort((a, b) => b.words - a.words || a.title.localeCompare(b.title));
  return items;
}

function buildHtml(items) {
  const totalWords = items.reduce((s, i) => s + i.words, 0);
  const avg = items.length ? Math.round(totalWords / items.length) : 0;
  const buckets = {
    tiny: items.filter((i) => i.words <= 25).length,
    short: items.filter((i) => i.words > 25 && i.words <= 80).length,
    medium: items.filter((i) => i.words > 80 && i.words <= 200).length,
    long: items.filter((i) => i.words > 200).length,
  };

  const toc = items
    .map(
      (i, idx) =>
        `<li><a href="#faq-${idx}">${escapeHtml(i.title)}</a> <span class="wc">(${i.words} w)</span></li>`
    )
    .join('\n');

  const sections = items
    .map(
      (i, idx) => `
<section class="faq-card" id="faq-${idx}" data-title="${escapeHtml(i.title)}" data-file="${escapeHtml(i.file)}" data-body="${escapeHtml(i.body)}">
  <header class="faq-head">
    <h2>${escapeHtml(i.title)}</h2>
    <p class="meta"><strong>File:</strong> ${escapeHtml(i.file)} · <strong>Slug:</strong> ${escapeHtml(i.slug)} · <strong>Words:</strong> ${i.words} · <strong>Chars:</strong> ${i.chars}</p>
    ${i.categories ? `<p class="meta"><strong>Categories:</strong> ${escapeHtml(i.categories)}</p>` : ''}
    ${i.status ? `<p class="meta"><strong>Status:</strong> ${escapeHtml(i.status)}</p>` : ''}
  </header>
  <div class="body prose">${escapeHtml(i.body).replace(/\n/g, '<br/>')}</div>
</section>`
    )
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>FAQ source review — Archetype Original</title>
  <style>
    :root { font-family: ui-sans-serif, system-ui, sans-serif; color: #1a1a1a; background: #fafaf9; }
    body { margin: 0; line-height: 1.5; }
    .wrap { max-width: 960px; margin: 0 auto; padding: 1.25rem 1rem 3rem; }
    h1 { font-size: 1.35rem; margin: 0 0 0.5rem; }
    .summary { background: #fff; border: 1px solid #e5e2dc; padding: 1rem 1.25rem; margin-bottom: 1.25rem; border-radius: 6px; font-size: 0.95rem; }
    .summary strong { font-weight: 600; }
    .toc { background: #fff; border: 1px solid #e5e2dc; padding: 1rem 1.25rem; margin-bottom: 1.5rem; border-radius: 6px; max-height: 40vh; overflow-y: auto; }
    .toc h2 { font-size: 1rem; margin: 0 0 0.75rem; }
    .toc ul { margin: 0; padding-left: 1.25rem; }
    .toc li { margin: 0.35rem 0; }
    .toc .wc { color: #6b6b6b; font-size: 0.85em; }
    #filter { width: 100%; max-width: 28rem; padding: 0.5rem 0.65rem; margin-bottom: 1rem; border: 1px solid #ccc; border-radius: 4px; font-size: 1rem; box-sizing: border-box; }
    .faq-card { background: #fff; border: 1px solid #e5e2dc; border-radius: 6px; padding: 1rem 1.25rem 1.25rem; margin-bottom: 1rem; }
    .faq-head h2 { font-size: 1.1rem; margin: 0 0 0.5rem; font-weight: 600; }
    .meta { font-size: 0.85rem; color: #444; margin: 0.25rem 0; }
    .body.prose { margin-top: 0.75rem; font-size: 1rem; color: #222; }
    .hidden { display: none !important; }
    @media print { .toc, #filter, .summary { break-inside: avoid; } }
  </style>
</head>
<body>
  <div class="wrap">
    <h1>FAQ markdown review</h1>
    <p>Open this file in your browser (double-click or drag into Chrome/Safari). Use the filter box to narrow by title, filename, or body text.</p>
    <div class="summary">
      <strong>Files:</strong> ${items.length} &nbsp;·&nbsp;
      <strong>Total words (body):</strong> ${totalWords} &nbsp;·&nbsp;
      <strong>Average:</strong> ${avg} words<br/>
      <strong>Length buckets:</strong>
      ≤25 words: ${buckets.tiny} ·
      26–80: ${buckets.short} ·
      81–200: ${buckets.medium} ·
      &gt;200: ${buckets.long}
    </div>
    <label class="sr-only" for="filter">Filter</label>
    <input type="search" id="filter" placeholder="Filter by title, file name, or body text…" autocomplete="off" />
    <nav class="toc" aria-label="Table of contents">
      <h2>Jump to</h2>
      <ul>${toc}</ul>
    </nav>
    <main id="faq-main">${sections}</main>
  </div>
  <script>
    (function () {
      var input = document.getElementById('filter');
      var cards = document.querySelectorAll('.faq-card');
      input.addEventListener('input', function () {
        var q = (input.value || '').trim().toLowerCase();
        cards.forEach(function (card) {
          var title = (card.getAttribute('data-title') || '').toLowerCase();
          var file = (card.getAttribute('data-file') || '').toLowerCase();
          var body = (card.getAttribute('data-body') || '').toLowerCase();
          var show = !q || title.indexOf(q) !== -1 || file.indexOf(q) !== -1 || body.indexOf(q) !== -1;
          card.classList.toggle('hidden', !show);
        });
      });
    })();
  </script>
</body>
</html>`;
}

// Usage: node scripts/generate-faq-review-html.mjs [optional-output.html] [optional slug1,slug2,...]
const args = process.argv.slice(2);
let outFile = DEFAULT_OUT;
let slugArg = '';
if (args[0]?.includes('.html')) {
  outFile = path.isAbsolute(args[0]) ? args[0] : path.join(ROOT, args[0]);
  slugArg = args[1] || '';
} else {
  slugArg = args[0] || '';
}
const slugFilter = slugArg ? slugArg.split(',').map((s) => s.trim()).filter(Boolean) : null;
const items = collectFiles(slugFilter);

if (!items.length) {
  console.error('No FAQ files matched. Check ao-knowledge-hq-kit/faqs/ and optional slug list.');
  process.exit(1);
}

fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, buildHtml(items), 'utf8');
console.log(`✅ Wrote ${outFile}`);
console.log(`   ${items.length} files, ${items.reduce((s, i) => s + i.words, 0)} total words (body)`);
