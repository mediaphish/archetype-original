/**
 * Infographic posts: explainer graphics built from Bart's own writing.
 *
 * Bart, 2026-10-23, sharing other people's infographics for style only: "I
 * want to use OpenAI to build similar, but on brand and better styled and
 * using my content. I want 3 images a week with captions." And 2026-10-24:
 * "These I will want to approve. Don't copy them. They are for inspiration
 * only."
 *
 * Every word on the graphic is set here, by the site, in the brand fonts. Image
 * models garble text, which is the lesson from the quote cards, so nothing
 * here asks a model to draw letters. 1080 x 1350, the portrait size Instagram
 * and LinkedIn show largest.
 *
 * Layouts (content shapes are checked in lib/ao/infographicContent.js):
 *   framework  a title, three to five named ideas, each with a line and a few
 *              moves, and the principle that ties them together
 *   paths      two ways of leading side by side, row by row
 *   myths      what people get wrong, and what is true instead
 */

import { createCanvas, GlobalFonts, loadImage } from '@napi-rs/canvas';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SANS = 'AOInfoInter';
const SERIF = 'AOInfoPlayfair';
const W = 1080;
const H = 1350;
const PAD = 64;

const C = {
  paper: '#F7F5F2',
  card: '#FFFFFF',
  ink: '#1A1A1A',
  body: '#3A3A3A',
  muted: '#7A7A7A',
  line: 'rgba(26,26,26,0.12)',
  red: '#DB0812',
  redSoft: 'rgba(219,8,18,0.08)',
};

let fontsReady = false;
function ensureFonts() {
  if (fontsReady) return;
  GlobalFonts.registerFromPath(join(__dirname, 'fonts', 'Inter-latin-700-normal.ttf'), SANS);
  GlobalFonts.registerFromPath(join(__dirname, 'fonts', 'PlayfairDisplay-BoldItalic.ttf'), SERIF);
  fontsReady = true;
}

const sans = (px) => `700 ${px}px ${SANS}`;
const serif = (px) => `italic 700 ${px}px ${SERIF}`;

function wrap(ctx, text, maxWidth) {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

/**
 * Largest font size (down to min) at which the text fits in maxLines.
 * @returns {{ size: number, lines: string[] }}
 */
function fit(ctx, text, font, maxWidth, maxLines, start, min) {
  for (let size = start; size >= min; size -= 1) {
    ctx.font = font(size);
    const lines = wrap(ctx, text, maxWidth);
    if (lines.length <= maxLines) return { size, lines };
  }
  // Never drop words: at the smallest size, every line is kept.
  ctx.font = font(min);
  return { size: min, lines: wrap(ctx, text, maxWidth) };
}

function drawLines(ctx, lines, x, y, size, color, lead = 1.3, align = 'left') {
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'top';
  lines.forEach((l, i) => ctx.fillText(l, x, y + i * size * lead));
  ctx.textAlign = 'left';
  return y + lines.length * size * lead;
}

function roundRect(ctx, x, y, w, h, r, fill, stroke = null) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

async function logo() {
  const local = join(__dirname, '..', '..', 'public', 'images', 'ao-logo-black.png');
  try {
    return await loadImage(existsSync(local) ? local : 'https://www.archetypeoriginal.com/images/ao-logo-black.png');
  } catch {
    return null;
  }
}

/** Title block shared by every layout. Returns the y where content starts. */
function header(ctx, { kicker, title, subtitle }) {
  let y = PAD;
  if (kicker) {
    ctx.font = sans(20);
    ctx.fillStyle = C.red;
    ctx.fillText(String(kicker).toUpperCase().split('').join(' '), PAD, y);
    y += 40;
  }
  const t = fit(ctx, title, sans, W - PAD * 2, 2, 64, 44);
  y = drawLines(ctx, t.lines, PAD, y, t.size, C.ink, 1.12);
  if (subtitle) {
    y += 14;
    const s = fit(ctx, subtitle, serif, W - PAD * 2, 2, 34, 26);
    y = drawLines(ctx, s.lines, PAD, y, s.size, C.body, 1.25);
  }
  y += 22;
  ctx.fillStyle = C.red;
  ctx.fillRect(PAD, y, 96, 6);
  return y + 40;
}

/** The closing line and the footer: logo left, site right. */
async function footer(ctx, principle) {
  const fy = H - PAD - 44;
  let top = fy;
  if (principle) {
    const p = fit(ctx, principle, serif, W - PAD * 2 - 64, 2, 36, 26);
    const h = p.lines.length * p.size * 1.25 + 48;
    top = fy - 28 - h;
    roundRect(ctx, PAD, top, W - PAD * 2, h, 14, C.ink);
    drawLines(ctx, p.lines, W / 2, top + 24, p.size, '#FFFFFF', 1.25, 'center');
  }
  const img = await logo();
  if (img) {
    const lh = 40;
    const lw = (img.width / img.height) * lh;
    ctx.drawImage(img, PAD, fy, lw, lh);
  }
  ctx.font = sans(20);
  ctx.fillStyle = C.muted;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillText('archetypeoriginal.com', W - PAD, fy + 20);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  return top;
}

// ---------------------------------------------------------------- blocks

/**
 * A box's content as segments, laid out at the largest scale that fits the
 * box and then centered in it, so no box is half empty.
 * Segment: { text, font, size, color, lead?, gap?, bullet?, strike?, maxLines? }
 */
function layoutBlock(ctx, segs, width, scale) {
  const laid = [];
  let h = 0;
  for (const sg of segs) {
    if (!sg.text) continue;
    const size = Math.round(sg.size * scale);
    ctx.font = sg.font(size);
    const indent = sg.bullet ? Math.round(size * 0.95) : 0;
    let lines = wrap(ctx, sg.text, width - indent);
    if (sg.maxLines && lines.length > sg.maxLines) return null;
    const lead = sg.lead || 1.28;
    const gap = Math.round((sg.gap ?? 10) * scale);
    laid.push({ ...sg, size, lines, lead, gap, indent });
    h += lines.length * size * lead + gap;
  }
  if (laid.length) h -= laid[laid.length - 1].gap;
  return { laid, h };
}

function drawBlock(ctx, segs, x, y, width, height, { maxScale = 1.6, minScale = 0.7, align = 'left' } = {}) {
  let chosen = null;
  for (let sc = maxScale; sc >= minScale; sc -= 0.05) {
    const l = layoutBlock(ctx, segs, width, sc);
    if (l && l.h <= height) {
      chosen = l;
      break;
    }
  }
  if (!chosen) chosen = layoutBlock(ctx, segs.map((sg) => ({ ...sg, maxLines: undefined })), width, minScale);
  let yy = y + Math.max(0, (height - chosen.h) / 2);
  for (const sg of chosen.laid) {
    ctx.font = sg.font(sg.size);
    sg.lines.forEach((ln, i) => {
      const ly = yy + i * sg.size * sg.lead;
      if (sg.bullet && i === 0) {
        ctx.fillStyle = C.red;
        ctx.fillRect(x, ly + sg.size * 0.5, Math.round(sg.size * 0.55), Math.max(3, Math.round(sg.size * 0.14)));
      }
      ctx.fillStyle = sg.color;
      ctx.textAlign = align;
      const tx = align === 'center' ? x + width / 2 : x + sg.indent;
      ctx.fillText(ln, tx, ly);
      if (sg.strike) {
        ctx.fillStyle = 'rgba(122,122,122,0.7)';
        const lw = ctx.measureText(ln).width;
        ctx.fillRect(align === 'center' ? tx - lw / 2 : tx, ly + sg.size * 0.47, lw, Math.max(2, Math.round(sg.size * 0.08)));
      }
      ctx.textAlign = 'left';
    });
    yy += sg.lines.length * sg.size * sg.lead + sg.gap;
  }
}

// ---------------------------------------------------------------- layouts

function badge(ctx, x, y, n) {
  ctx.fillStyle = C.red;
  ctx.beginPath();
  ctx.arc(x, y, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.font = sans(22);
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(n), x, y + 1);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
}

function framework(ctx, c, top, bottom) {
  const items = c.items.slice(0, 5);
  const gap = 20;
  const cols = items.length === 3 ? 1 : 2;
  const rows = Math.ceil(items.length / cols);
  const cw = (W - PAD * 2 - gap * (cols - 1)) / cols;
  const ch = (bottom - top - 28 - gap * (rows - 1)) / rows;
  items.forEach((it, i) => {
    // Five items: the last one spans both columns.
    const span = cols === 2 && items.length % 2 === 1 && i === items.length - 1;
    const col = span ? 0 : i % cols;
    const row = Math.floor(i / cols);
    const x = PAD + col * (cw + gap);
    const y = top + row * (ch + gap);
    const w = span ? W - PAD * 2 : cw;
    roundRect(ctx, x, y, w, ch, 16, C.card, C.line);
    ctx.fillStyle = C.red;
    ctx.fillRect(x, y + 18, 5, ch - 36);
    badge(ctx, x + 50, y + 50, i + 1);
    const segs = [
      { text: it.name, font: sans, size: 24, color: C.ink, lead: 1.12, gap: 12, maxLines: 2 },
      { text: it.line, font: serif, size: 19, color: C.red, lead: 1.22, gap: 14, maxLines: 3 },
      ...(it.moves || []).slice(0, 3).map((m) => ({ text: m, font: sans, size: 16, color: C.body, bullet: true, gap: 8, maxLines: 2 })),
    ];
    drawBlock(ctx, segs, x + 88, y + 26, w - 88 - 28, ch - 52, { maxScale: 1.45 });
  });
}

function paths(ctx, c, top, bottom) {
  const gap = 20;
  const cw = (W - PAD * 2 - gap) / 2;
  const head = 84;
  const sides = [
    { label: c.left_label, bg: '#E7E4DF', fg: C.ink },
    { label: c.right_label, bg: C.red, fg: '#FFFFFF' },
  ];
  sides.forEach((sd, i) => {
    const x = PAD + i * (cw + gap);
    roundRect(ctx, x, top, cw, head, 14, sd.bg);
    drawBlock(ctx, [{ text: sd.label, font: sans, size: 22, color: sd.fg, lead: 1.1, maxLines: 2 }], x + 20, top + 12, cw - 40, head - 24, { align: 'center', maxScale: 1.35 });
  });
  const rows = c.rows.slice(0, 6);
  const rt = top + head + 16;
  const rh = (bottom - 28 - rt - 12 * (rows.length - 1)) / rows.length;
  rows.forEach((r, i) => {
    const y = rt + i * (rh + 12);
    roundRect(ctx, PAD, y, cw, rh, 12, 'rgba(255,255,255,0.6)', C.line);
    roundRect(ctx, PAD + cw + gap, y, cw, rh, 12, C.card, 'rgba(219,8,18,0.55)');
    // The arrow between the two says "instead of this, this".
    ctx.fillStyle = C.red;
    ctx.beginPath();
    const ax = PAD + cw + gap / 2;
    const ay = y + rh / 2;
    ctx.moveTo(ax - 7, ay - 9);
    ctx.lineTo(ax + 7, ay);
    ctx.lineTo(ax - 7, ay + 9);
    ctx.closePath();
    ctx.fill();
    drawBlock(ctx, [{ text: r.left, font: sans, size: 18, color: C.muted, maxLines: 3 }], PAD + 24, y + 14, cw - 48, rh - 28, { maxScale: 1.4 });
    drawBlock(ctx, [{ text: r.right, font: sans, size: 18, color: C.ink, maxLines: 3 }], PAD + cw + gap + 24, y + 14, cw - 48, rh - 28, { maxScale: 1.4 });
  });
}

function myths(ctx, c, top, bottom) {
  const rows = c.rows.slice(0, 5);
  const gap = 18;
  const rh = (bottom - 28 - top - gap * (rows.length - 1)) / rows.length;
  rows.forEach((r, i) => {
    const y = top + i * (rh + gap);
    roundRect(ctx, PAD, y, W - PAD * 2, rh, 14, C.card, C.line);
    ctx.fillStyle = C.red;
    ctx.fillRect(PAD, y + 18, 5, rh - 36);
    const segs = [
      { text: 'WHAT PEOPLE THINK', font: sans, size: 12, color: C.muted, gap: 6 },
      { text: r.myth, font: sans, size: 17, color: C.muted, strike: true, gap: 16, maxLines: 2 },
      { text: 'WHAT IS TRUE', font: sans, size: 12, color: C.red, gap: 6 },
      { text: r.truth, font: sans, size: 20, color: C.ink, lead: 1.25, maxLines: 3 },
    ];
    drawBlock(ctx, segs, PAD + 36, y + 20, W - PAD * 2 - 72, rh - 40, { maxScale: 1.5 });
  });
}

/**
 * @param {{ layout: 'framework'|'paths'|'myths', kicker?, title, subtitle?, principle?, items?, left_label?, right_label?, rows? }} content
 * @returns {Promise<{ ok: true, buffer: Buffer } | { ok: false, error: string }>}
 */
export async function renderInfographicPng(content) {
  try {
    ensureFonts();
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = C.paper;
    ctx.fillRect(0, 0, W, H);
    ctx.textBaseline = 'top';
    const top = header(ctx, content);
    const bottom = await footer(ctx, content.principle);
    if (content.layout === 'framework') framework(ctx, content, top, bottom);
    else if (content.layout === 'paths') paths(ctx, content, top, bottom);
    else if (content.layout === 'myths') myths(ctx, content, top, bottom);
    else return { ok: false, error: `Unknown layout ${content.layout}` };
    return { ok: true, buffer: canvas.toBuffer('image/png') };
  } catch (err) {
    return { ok: false, error: err?.message || String(err) };
  }
}
