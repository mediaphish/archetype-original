/**
 * Build a guide PDF in the Remaining Human look.
 *
 * Bart, 2026-10-30: the guides match his RemAIning Human PDF: off-white
 * pages, Garamond-style serif chapter titles, small sans body in two
 * columns, full-bleed muted teal/grey photos as full pages and bands.
 *
 * Usage:
 *   node scripts/guides/build-guide-pdf.mjs <draft.md> <images-dir> <out.pdf>
 *
 * Draft format (see notes/GUIDE-01-toxic-empathy-draft.md):
 *   "# Section N" + "## Title" open a chapter; "### Heading" is a subhead;
 *   "> PULL: ..." is a pull quote; "### WORKSHEET: Title" starts a worksheet
 *   page; "[lines: N]" draws N writing lines; markdown tables become
 *   fill-in tables.
 *
 * Images are read from <images-dir> by name (cover, ch1..ch7, band1, band2,
 * with any of .png/.jpg/.jpeg/.webp). A missing image prints as a labeled
 * placeholder so the layout can be reviewed before the photos exist.
 *
 * The finished PDF is a paid product: write it outside this public repo.
 */

import fs from 'node:fs';
import path from 'node:path';
import { marked } from 'marked';
import puppeteer from 'puppeteer';

const [draftPath, imagesDir, outPath] = process.argv.slice(2);
if (!draftPath || !imagesDir || !outPath) {
  console.error('usage: build-guide-pdf.mjs <draft.md> <images-dir> <out.pdf>');
  process.exit(1);
}

const md = fs.readFileSync(draftPath, 'utf8');

// Where each band photo sits: after the named subhead in that chapter.
const BANDS = { 3: { after: 'Strong people recalibrate', name: 'band1' }, 5: { after: 'Stay in it', name: 'band2' } };

function imageUrl(name) {
  for (const ext of ['png', 'jpg', 'jpeg', 'webp']) {
    const f = path.join(imagesDir, `${name}.${ext}`);
    if (fs.existsSync(f)) return 'file://' + path.resolve(f);
  }
  return null;
}

function photo(name, cls) {
  const url = imageUrl(name);
  if (url) return `<div class="${cls}" style="background-image:url('${url}')"></div>`;
  return `<div class="${cls} placeholder"><span>Photo: ${name}</span></div>`;
}

function lines(n) {
  return `<div class="lines">${'<div class="line"></div>'.repeat(Number(n) || 1)}</div>`;
}

function inline(s) {
  return marked.parseInline(s);
}

/** Render a block of draft markdown with the guide's own markers. */
function renderBlock(text, { chapter } = {}) {
  const out = [];
  const paras = text.split(/\n{2,}/);
  for (const raw of paras) {
    const p = raw.trim();
    if (!p || p === '---') continue;
    let m;
    if ((m = /^\[lines:\s*(\d+)\]$/.exec(p))) { out.push(lines(m[1])); continue; }
    if ((m = /^>\s*PULL:\s*(.+)$/s.exec(p))) { out.push(`<blockquote class="pull">${inline(m[1].trim())}</blockquote>`); continue; }
    if ((m = /^###\s+(.+)$/.exec(p))) {
      out.push(`<h3>${inline(m[1])}</h3>`);
      const band = BANDS[chapter];
      if (band && m[1].trim() === band.after) out.push(photo(band.name, 'band'));
      continue;
    }
    if (p.startsWith('|')) { out.push(marked.parse(p)); continue; }
    out.push(marked.parse(p));
  }
  return out.join('\n');
}

// Split the draft at top-level headings.
const parts = md.split(/^# /m).filter(Boolean).map((s) => {
  const nl = s.indexOf('\n');
  return { head: s.slice(0, nl).trim(), body: s.slice(nl + 1) };
});

const pages = [];

// Cover.
const titleIdx = parts.findIndex((p) => p.head === 'Holding the Line');
const title = 'Holding the Line';
const subtitle = (/^##\s+(.+)$/m.exec(parts[titleIdx]?.body || '') || [])[1] || '';
pages.push(`
<section class="cover">
  ${photo('cover', 'cover-photo')}
  <div class="cover-text">
    <h1>${title}</h1>
    <p class="cover-sub">${subtitle}</p>
    <p class="cover-author">Bart Paden</p>
  </div>
</section>`);

for (const part of parts) {
  if (part.head === 'TITLE PAGE' || part.head === 'Holding the Line') continue;

  const sec = /^Section\s+(\d+)$/.exec(part.head);
  if (sec) {
    const n = Number(sec[1]);
    const t = (/^##\s+(.+)$/m.exec(part.body) || [])[1] || '';
    const rest = part.body.replace(/^##\s+.+$/m, '');
    const [prose, ...sheets] = rest.split(/^### WORKSHEET:\s*/m);
    pages.push(`<section class="full">${photo(`ch${n}`, 'full-photo')}</section>`);
    pages.push(`
<section class="chapter">
  <h2 class="chapter-title">Chapter ${n}: ${inline(t)}</h2>
  <div class="cols">${renderBlock(prose, { chapter: n })}</div>
</section>`);
    for (const sheet of sheets) {
      const nl = sheet.indexOf('\n');
      const sheetTitle = sheet.slice(0, nl).trim();
      let body = sheet.slice(nl + 1);
      // The closing line after the last worksheet is the book's last word.
      let coda = '';
      const tail = body.split(/\n---\n/);
      if (n === 7 && tail.length > 1) {
        body = tail[0];
        coda = tail.slice(1).join('\n').trim();
      }
      pages.push(`
<section class="worksheet">
  <p class="ws-eyebrow">Worksheet · Chapter ${n}</p>
  <h2 class="ws-title">${inline(sheetTitle)}</h2>
  ${renderBlock(body)}
</section>`);
      if (coda) pages.push(`<section class="coda"><p>${inline(coda.replace(/\n+/g, ' '))}</p></section>`);
    }
    continue;
  }

  // Front and back matter: the note, About Bart.
  pages.push(`
<section class="matter">
  <h2 class="chapter-title">${inline(part.head)}</h2>
  ${renderBlock(part.body)}
</section>`);
}

const html = `<!doctype html>
<html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,500;0,600;1,500&family=Oswald:wght@300;500;600&family=Open+Sans:wght@400;600&display=swap" rel="stylesheet">
<style>
  @page { size: 8.5in 11in; margin: 0.8in 0.75in 0.85in;
    @bottom-center { content: counter(page); font: 8pt 'Open Sans', sans-serif; color: #8a8f8f; } }
  @page bleed { margin: 0; @bottom-center { content: none; } }
  :root { --paper: #ffffff; --ink: #2b2e2e; --muted: #6d7474; --rule: #c9cfcd; --teal: #5f7f7c; }
  html, body { margin: 0; background: var(--paper); color: var(--ink); }
  body { font: 9.4pt/1.62 'Open Sans', sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  section { break-before: page; }
  section:first-child { break-before: auto; }
  p { margin: 0 0 0.9em; }

  .cover, .full { page: bleed; height: 11in; position: relative; overflow: hidden; }
  .cover-photo, .full-photo { position: absolute; inset: 0; background-size: cover; background-position: center; }
  .cover-text { position: absolute; left: 0; right: 0; top: 1.1in; text-align: center; color: #1f2323; }
  /* Cover prompts leave pale fog at the top, so the title sits in dark ink. */
  /* Bart, 2026-10-30: titles in Oswald (tall, bold capitals), cover title large. */
  .cover-text { left: .45in; right: .45in; top: .85in; }
  .cover h1 { font: 600 84pt/1 'Oswald', sans-serif; margin: 0 0 .2in; letter-spacing: .04em; text-transform: uppercase; }
  .cover-sub { font: 300 22pt 'Oswald', sans-serif; margin: 0 0 .35in; }
  .cover-author { font: 600 12pt 'Open Sans', sans-serif; letter-spacing: .32em; text-transform: uppercase; }

  .placeholder { background: linear-gradient(160deg, #cfd9d6 0%, #9fb3b0 45%, #6f8784 100%); display: flex; align-items: flex-end; justify-content: flex-end; }
  .placeholder span { font: 600 8pt 'Open Sans', sans-serif; letter-spacing: .12em; text-transform: uppercase; color: rgba(255,255,255,.85); padding: .25in; }
  .cover .placeholder span { display: none; }

  .chapter-title { font: 600 26pt/1.1 'Oswald', sans-serif; text-transform: uppercase; letter-spacing: .02em; margin: 0 0 .32in; color: #1f2323; max-width: 5.6in; }
  .cols { column-count: 2; column-gap: .32in; }
  .cols p { orphans: 3; widows: 3; }
  h3 { font: 500 12pt/1.25 'Oswald', sans-serif; text-transform: uppercase; letter-spacing: .03em; margin: 1.1em 0 .45em; break-after: avoid; color: #1f2323; }
  .pull { font: italic 500 13pt/1.35 'EB Garamond', serif; color: var(--teal); margin: 1em 0 1.1em; padding: .1in 0 .1in .16in; border-left: 2px solid var(--teal); break-inside: avoid; }
  .band { column-span: all; break-inside: avoid; height: 2.5in; margin: .2in 0 .3in; background-size: cover; background-position: center; }

  .matter { max-width: 5.4in; }
  .matter p { font-size: 10pt; }

  .worksheet { }
  .ws-eyebrow { font: 600 7.5pt 'Open Sans', sans-serif; letter-spacing: .28em; text-transform: uppercase; color: var(--teal); margin: 0 0 .08in; }
  .ws-title { font: 600 24pt/1.1 'Oswald', sans-serif; text-transform: uppercase; letter-spacing: .02em; margin: 0 0 .22in; color: #1f2323; }
  .worksheet p { font-size: 9.6pt; max-width: 6.4in; }
  .worksheet h3 { margin-top: .9em; }
  .lines { margin: .06in 0 .26in; }
  .line { height: .34in; border-bottom: 1px solid var(--rule); }
  table { width: 100%; border-collapse: collapse; margin: .1in 0 .3in; font-size: 8.4pt; break-inside: avoid; }
  th { text-align: left; font-weight: 600; color: var(--muted); border-bottom: 1.5px solid var(--teal); padding: 4pt 5pt; vertical-align: bottom; }
  td { border-bottom: 1px solid var(--rule); height: .42in; padding: 3pt 5pt; vertical-align: top; color: var(--muted); }

  .coda { display: flex; align-items: center; justify-content: center; height: 8.5in; }
  .coda p { font: italic 500 18pt/1.45 'EB Garamond', serif; text-align: center; max-width: 4.8in; color: #1f2323; }
</style></head>
<body>
${pages.join('\n')}
</body></html>`;

const htmlPath = outPath.replace(/\.pdf$/i, '.html');
fs.writeFileSync(htmlPath, html);

const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();
await page.goto('file://' + path.resolve(htmlPath), { waitUntil: 'networkidle0' });
await page.pdf({ path: outPath, preferCSSPageSize: true, printBackground: true });
await browser.close();
console.log('wrote', outPath, 'and', htmlPath);
