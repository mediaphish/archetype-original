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

// Bart, 2026-10-31: the AO logo on every page, "[AO logo] Archetype Original"
// in a faded green, with the page number moved to the bottom right.
// The mark is the real file from public/brand, only its fill color changes.
const MARK_SVG = fs.readFileSync(new URL('../../public/brand/ao-logo.svg', import.meta.url), 'utf8');
function markUri(color, size) {
  let svg = MARK_SVG.replace(/<\?xml[^>]*>\s*/, '').replace(/fill:\s*#[0-9a-f]{3,6}/i, `fill: ${color}`);
  // The page footer shows images at their own size, so the footer copy carries one.
  if (size) svg = svg.replace('<svg ', `<svg width="${(size * 440.3 / 480.05).toFixed(2)}pt" height="${size}pt" `);
  return 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64');
}
// Each guide can set its own color under its title: "[brand-color: #c9925f]".
const BRAND_FOOTER = (/^\[brand-color:\s*(#[0-9a-f]{3,6})\]$/im.exec(md) || [])[1] || '#8fa8a4';
const brandMark = (color, cls) => `<div class="${cls}"><img src="${markUri(color)}" alt=""><span>Archetype Original</span></div>`;

// Where each band photo sits: after the named subhead in that chapter.
const BANDS = { 3: { after: 'The work moves', name: 'band1' }, 5: { after: 'It does not have to feel perfect', name: 'band2' } };

function imageUrl(name) {
  for (const ext of ['png', 'jpg', 'jpeg', 'webp']) {
    const f = path.join(imagesDir, `${name}.${ext}`);
    if (fs.existsSync(f)) return 'file://' + path.resolve(f);
  }
  return null;
}

function photo(name, cls, position) {
  const url = imageUrl(name);
  if (url) return `<div class="${cls}" style="background-image:url('${url}')${position ? `;background-position:${position}` : ''}"></div>`;
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
    // "[band: name]" places a band photo right there; Holding the Line uses the BANDS table instead.
    // "[band: name 28%]" also slides the photo when the middle crop would cut off a head.
    if ((m = /^\[band:\s*([\w-]+)(?:\s+([\w%]+))?\]$/.exec(p))) { out.push(photo(m[1], 'band', m[2] ? `center ${m[2]}` : undefined)); continue; }
    if ((m = /^###\s+(.+)$/.exec(p))) {
      // The band photo sits just above its subhead, so the heading never strands at a page bottom.
      const band = BANDS[chapter];
      if (band && m[1].trim() === band.after) out.push(photo(band.name, 'band'));
      out.push(`<h3>${inline(m[1])}</h3>`);
      continue;
    }
    if (p.startsWith('|')) { out.push(marked.parse(p)); continue; }
    out.push(marked.parse(p));
  }
  return out.join('\n');
}

/**
 * Worksheets print as fixed pages (Bart, 2026-10-31: a form that runs onto
 * a second page needs structure there too). "[page]" in the draft starts a
 * new printed page with a "continued" header. Each prompt and its writing
 * space is one field that never splits; writing spaces stretch to fill the
 * page, so every page ends in ruled lines instead of blank paper.
 */
const BOX_COLS = /^(check|yes|partly|no)$/i;

function sheetTable(p) {
  const rows = p.split('\n').filter((r) => !/^\|[\s|:-]*-[\s|:-]*\|$/.test(r.trim()))
    .map((r) => r.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim()));
  const [head, ...body] = rows;
  const boxes = head.map((h) => BOX_COLS.test(h));
  const labelled = body.some((r) => r[0]);
  const cls = labelled ? 'labelled' : 'empty';
  const th = head.map((h, i) => `<th${boxes[i] ? ' class="boxcol"' : ''}>${inline(h)}</th>`).join('');
  const tr = body.map((r) => `<tr>${head.map((_, i) => boxes[i] ? '<td class="boxcol"><span class="box"></span></td>' : `<td>${inline(r[i] || '')}</td>`).join('')}</tr>`).join('');
  return `<table class="${cls}"><thead><tr>${th}</tr></thead><tbody>${tr}</tbody></table>`;
}

function blanks(html) {
  return html.replace(/_{4,}/g, '<span class="blank"></span>');
}

function renderSheetPage(text, first) {
  const blocks = text.split(/\n{2,}/).map((b) => b.trim()).filter((b) => b && b !== '---');
  const fields = [];
  let cur = null;
  const open = (head) => {
    // A lead-in paragraph joins the prompt that follows it, unless it holds fill-in blanks.
    if (cur && !cur.body.length && !cur.head.includes('class="blank"')) { cur.head += head; return; }
    cur = { head, body: [], grow: 0 };
    fields.push(cur);
  };
  blocks.forEach((b, i) => {
    let m;
    if ((m = /^\[lines:\s*(\d+)\]$/.exec(b))) {
      if (!cur) open('');
      const n = Number(m[1]);
      cur.body.push(`<div class="write" style="min-height:${(n * 0.3).toFixed(2)}in"></div>`);
      cur.grow += n;
      cur = null;
      return;
    }
    if (b.startsWith('|')) {
      if (!cur) open('');
      cur.body.push(sheetTable(b));
      cur = null;
      return;
    }
    if (first && i === 0 && !b.startsWith('**')) { fields.push({ intro: marked.parse(b) }); return; }
    open(blanks(marked.parse(b)));
  });
  return fields.map((f) => {
    if (f.intro) return `<div class="ws-intro">${f.intro}</div>`;
    if (!f.body.length) return `<div class="${f.head.includes('class="blank"') ? 'field fill-in' : 'ws-note'}">${f.head}</div>`;
    // One-line answers stay one line; bigger writing spaces share the leftover page.
    const grow = f.grow > 1 ? f.grow : 0;
    const style = grow ? ` style="flex:${grow} 0 auto"` : '';
    return `<div class="field${grow ? ' grows' : ''}"${style}>${f.head}${f.body.join('')}</div>`;
  }).join('\n');
}

// Split the draft at top-level headings.
const parts = md.split(/^# /m).filter(Boolean).map((s) => {
  const nl = s.indexOf('\n');
  return { head: s.slice(0, nl).trim(), body: s.slice(nl + 1) };
});

const pages = [];

// Cover.
// The guide's title is the heading right after "# TITLE PAGE".
const titleIdx = parts.findIndex((p) => p.head === 'TITLE PAGE') + 1;
const title = parts[titleIdx]?.head || '';
const subtitle = (/^##\s+(.+)$/m.exec(parts[titleIdx]?.body || '') || [])[1] || '';
// "[cover-position: top]" under the title slides the cover photo when its subject would sit under the text.
const coverPosition = (/^\[cover-position:\s*([\w ]+)\]$/m.exec(parts[titleIdx]?.body || '') || [])[1];
pages.push(`
<section class="cover">
  ${photo('cover', 'cover-photo', coverPosition)}
  ${brandMark('#ffffff', 'photo-brand')}
  <div class="cover-text">
    <h1>${title}</h1>
    <p class="cover-sub">${subtitle}</p>
    <p class="cover-author">Bart Paden</p>
  </div>
</section>`);

// The closing line belongs to whichever section comes last, chapter 7 or a "# Closing".
const lastSection = parts.filter((p) => /^(Section\s+\d+|Closing)$/.test(p.head)).pop();

for (const part of parts) {
  if (part.head === 'TITLE PAGE' || part.head === title) continue;

  const sec = /^Section\s+(\d+)$/.exec(part.head);
  if (sec || part.head === 'Closing') {
    const n = sec ? Number(sec[1]) : null;
    const t = (/^##\s+(.+)$/m.exec(part.body) || [])[1] || '';
    const rest = part.body.replace(/^##\s+.+$/m, '');
    const [prose, ...sheets] = rest.split(/^### WORKSHEET:\s*/m);
    pages.push(`<section class="full">${photo(sec ? `ch${n}` : 'closing', 'full-photo')}${brandMark('#ffffff', 'photo-brand')}</section>`);
    pages.push(`
<section class="chapter">
  <h2 class="chapter-title">${sec ? `Chapter ${n}: ` : ''}${inline(t)}</h2>
  <div class="cols">${renderBlock(prose, { chapter: n })}</div>
</section>`);
    for (const sheet of sheets) {
      const nl = sheet.indexOf('\n');
      const sheetTitle = sheet.slice(0, nl).trim();
      let body = sheet.slice(nl + 1);
      // The closing line after the last worksheet is the book's last word.
      let coda = '';
      const tail = body.split(/\n---\n/);
      if (part === lastSection && tail.length > 1) {
        body = tail[0];
        coda = tail.slice(1).join('\n').trim();
      }
      body.split(/^\[page\]\s*$/m).forEach((chunk, i) => {
        pages.push(`
<section class="worksheet">
  <p class="ws-eyebrow">Worksheet · ${sec ? `Chapter ${n}` : 'Closing'}${i ? ' · continued' : ''}</p>
  <h2 class="ws-title${i ? ' cont' : ''}">${inline(sheetTitle)}</h2>
  ${renderSheetPage(chunk, i === 0)}
</section>`);
      });
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
    @bottom-left { content: url('${markUri(BRAND_FOOTER, 10)}') "\\00a0\\00a0 ARCHETYPE ORIGINAL"; font: 500 7.5pt 'Oswald', sans-serif; letter-spacing: .14em; color: ${BRAND_FOOTER}; vertical-align: middle; }
    @bottom-right { content: counter(page); font: 8pt 'Open Sans', sans-serif; color: #8a8f8f; vertical-align: middle; } }
  @page bleed { margin: 0; @bottom-left { content: none; } @bottom-right { content: none; } }
  .photo-brand { position: absolute; left: .75in; bottom: .38in; display: flex; align-items: center; gap: 6pt; opacity: .9; z-index: 2; }
  /* A soft shade along the bottom edge keeps the white logo readable on bright photos. */
  .cover::after, .full::after { content: ''; position: absolute; left: 0; right: 0; bottom: 0; height: 1.3in; background: linear-gradient(to bottom, rgba(40,28,18,0), rgba(40,28,18,.5)); z-index: 1; }
  .photo-brand img { height: 11pt; }
  .photo-brand span { font: 500 7.5pt 'Oswald', sans-serif; letter-spacing: .14em; text-transform: uppercase; color: #fff; }
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

  .chapter-title { font: 600 26pt/1.1 'Oswald', sans-serif; text-transform: uppercase; letter-spacing: .02em; margin: 0 0 .32in; color: #1f2323; }
  .cols { column-count: 2; column-gap: .32in; }
  /* Paragraphs may continue into the next column so the left column always fills;
     a split leaves at least two lines on each side. */
  .cols p { orphans: 2; widows: 2; }
  .cols li { break-inside: avoid; }
  h3 { font: 500 12pt/1.25 'Oswald', sans-serif; text-transform: uppercase; letter-spacing: .03em; margin: 1.1em 0 .45em; break-after: avoid; color: #1f2323; }
  .pull { font: italic 500 13pt/1.35 'EB Garamond', serif; color: var(--teal); margin: 1em 0 1.1em; padding: .1in 0 .1in .16in; border-left: 2px solid var(--teal); break-inside: avoid; }
  .band { column-span: all; break-inside: avoid; height: 2.1in; margin: .15in 0 .25in; background-size: cover; background-position: center; }
  /* A heading under a band starts flush, so it lines up with a heading at the top of the next column. */
  .band + h3 { margin-top: 0; }

  .matter { max-width: 5.4in; }
  .matter p { font-size: 10pt; }

  /* Worksheets: one fixed page each, fields never split, writing space fills the page. */
  .worksheet { height: 9.3in; display: flex; flex-direction: column; overflow: hidden; }
  .ws-eyebrow { font: 600 7.5pt 'Open Sans', sans-serif; letter-spacing: .28em; text-transform: uppercase; color: var(--teal); margin: 0 0 .06in; flex: none; }
  .ws-title { font: 600 24pt/1.1 'Oswald', sans-serif; text-transform: uppercase; letter-spacing: .02em; margin: 0 0 .16in; color: #1f2323; flex: none; padding-bottom: .1in; border-bottom: 2px solid var(--teal); }
  .ws-title.cont { font-size: 15pt; color: var(--muted); }
  .ws-intro { flex: none; background: #eef3f2; padding: .12in .16in; margin: 0 0 .14in; }
  .ws-intro p { font-size: 9.4pt; margin: 0; }
  .ws-note { flex: none; margin-top: .12in; }
  .ws-note p { font: italic 500 11pt/1.4 'EB Garamond', serif; color: var(--teal); margin: 0; }
  .field { flex: none; margin: 0 0 .16in; display: flex; flex-direction: column; }
  .field > p { font-size: 9.4pt; margin: 0 0 .04in; }
  .field > ul { font-size: 9.4pt; margin: 0 0 .14in; padding-left: .2in; }
  .fill-in > p { font-size: 10pt; margin: .04in 0 .06in; }
  .field.grows { min-height: 0; }
  .write { flex: 1 1 auto; display: flex; flex-direction: column; }
  .write-line { flex: 1 1 0; border-bottom: .75pt solid var(--rule); }
  .blank { display: inline-block; width: 1.5in; border-bottom: 1px solid var(--ink); margin: 0 .12in 0 .04in; vertical-align: -2px; }
  .worksheet h3 { margin-top: .9em; }
  .lines { margin: .06in 0 .26in; }
  .line { height: .34in; border-bottom: 1px solid var(--rule); }
  table { width: 100%; border-collapse: collapse; margin: .04in 0 0; font-size: 8.4pt; break-inside: avoid; table-layout: fixed; }
  th { text-align: left; font-weight: 600; color: var(--muted); border-bottom: 1.5px solid var(--teal); padding: 4pt 5pt; vertical-align: bottom; line-height: 1.3; }
  td { border-bottom: 1px solid var(--rule); padding: 3pt 5pt; vertical-align: middle; color: var(--ink); }
  td + td, th + th { border-left: 1px solid var(--rule); }
  table.empty td { height: .48in; }
  table.labelled td { height: .36in; }
  .boxcol { width: .65in; text-align: center; }
  .box { display: inline-block; width: 11pt; height: 11pt; border: 1.2px solid var(--muted); border-radius: 2px; }

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
await page.emulateMediaType('print');
const over = await page.$$eval('.worksheet', (els) => els.map((e, i) => [i, e.scrollHeight - e.clientHeight, e.querySelector('.ws-title')?.textContent]).filter(([, d]) => d > 2));
if (over.length) console.warn('worksheet pages that overflow:', JSON.stringify(over));
// Writing lines are drawn once each space has its final size, so they are real, evenly spaced lines.
await page.$$eval('.write', (els) => els.forEach((e) => {
  const count = Math.max(1, Math.floor(e.getBoundingClientRect().height / (0.3 * 96)));
  e.innerHTML = '<div class="write-line"></div>'.repeat(count);
}));
await page.pdf({ path: outPath, preferCSSPageSize: true, printBackground: true });
await browser.close();
console.log('wrote', outPath, 'and', htmlPath);
