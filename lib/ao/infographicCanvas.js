/**
 * Infographic posts: explainer graphics built from Bart's own writing.
 *
 * Bart, 2026-10-23, sharing other people's infographics for style only: "I
 * want to use OpenAI to build similar, but on brand and better styled and
 * using my content. I want 3 images a week with captions." 2026-10-24: "Don't
 * copy them. They are for inspiration only." Then, on the first set: "Content
 * is ok. Design is mediocre. Can we bring more design aesthetic?"
 *
 * So the second design is editorial rather than a grid of white boxes: a
 * poster for each idea, with a display face for numbers and labels, the brand
 * serif for the human lines, drawn marks (an underline stroke, strike-outs,
 * arrows) and a paper or ink ground with a little grain.
 *
 * Every word is set here, by the site, in the brand fonts. Image models garble
 * text (the quote card lesson), so nothing here asks a model to draw letters.
 * 1080 x 1350, the portrait size Instagram and LinkedIn show largest.
 *
 * Layouts (content shapes are checked in lib/ao/infographicContent.js):
 *   framework  a hub: the subject at the center, three or four ideas around it
 *   paths      a split poster: the way argued against, the way argued for
 *   myths      what people think, struck out, and what is true
 */

import { createCanvas, GlobalFonts, loadImage } from '@napi-rs/canvas';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SANS = 'AOInfoInter';
const SERIF = 'AOInfoPlayfair';
const DISPLAY = 'AOInfoBebas';
const W = 1080;
const H = 1350;
const PAD = 72;

const C = {
  paper: '#F4F0EA',
  ink: '#151515',
  inkSoft: '#222222',
  inkLine: 'rgba(244,240,234,0.14)',
  body: '#3A3A3A',
  muted: '#8A857E',
  cream: '#F4F0EA',
  creamSoft: 'rgba(244,240,234,0.72)',
  red: '#DB0812',
};

let fontsReady = false;
function ensureFonts() {
  if (fontsReady) return;
  GlobalFonts.registerFromPath(join(__dirname, 'fonts', 'Inter-latin-700-normal.ttf'), SANS);
  GlobalFonts.registerFromPath(join(__dirname, 'fonts', 'PlayfairDisplay-BoldItalic.ttf'), SERIF);
  GlobalFonts.registerFromPath(join(__dirname, 'fonts', 'BebasNeue-Regular.ttf'), DISPLAY);
  fontsReady = true;
}

const sans = (px) => `700 ${px}px ${SANS}`;
const serif = (px) => `italic 700 ${px}px ${SERIF}`;
const display = (px) => `400 ${px}px ${DISPLAY}`;

// ---------------------------------------------------------------- text

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

/** Largest size (down to min) at which the text fits in maxLines. Never drops words. */
function fit(ctx, text, font, maxWidth, maxLines, start, min) {
  for (let size = start; size >= min; size -= 1) {
    ctx.font = font(size);
    const lines = wrap(ctx, text, maxWidth);
    if (lines.length <= maxLines) return { size, lines };
  }
  ctx.font = font(min);
  return { size: min, lines: wrap(ctx, text, maxWidth) };
}

function drawLines(ctx, lines, x, y, size, color, lead = 1.25, align = 'left') {
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'top';
  lines.forEach((l, i) => ctx.fillText(l, x, y + i * size * lead));
  ctx.textAlign = 'left';
  return y + lines.length * size * lead;
}

/**
 * A box's content as segments, laid out at the largest scale that fits and
 * centered in the box. Segment: { text, font, size, color, lead?, gap?, tick?, maxLines? }
 */
function layoutBlock(ctx, segs, width, scale) {
  const laid = [];
  let h = 0;
  for (const sg of segs) {
    if (!sg.text) continue;
    const size = Math.round(sg.size * scale);
    ctx.font = sg.font(size);
    const indent = sg.tick ? Math.round(size * 1.1) : 0;
    const lines = wrap(ctx, sg.text, width - indent);
    if (sg.maxLines && lines.length > sg.maxLines) return null;
    const lead = sg.lead || 1.28;
    const gap = Math.round((sg.gap ?? 10) * scale);
    laid.push({ ...sg, size, lines, lead, gap, indent });
    h += lines.length * size * lead + gap;
  }
  if (laid.length) h -= laid[laid.length - 1].gap;
  return { laid, h };
}

/** Whether the segments fit the box at this scale or larger. */
function fitsAt(ctx, segs, width, height, minScale) {
  const l = layoutBlock(ctx, segs, width, minScale);
  return Boolean(l && l.h <= height);
}

function drawBlock(ctx, segs, x, y, width, height, { maxScale = 1.6, minScale = 0.7, align = 'left', valign = 'middle' } = {}) {
  let chosen = null;
  for (let sc = maxScale; sc >= minScale; sc -= 0.04) {
    const l = layoutBlock(ctx, segs, width, sc);
    if (l && l.h <= height) {
      chosen = l;
      break;
    }
  }
  if (!chosen) chosen = layoutBlock(ctx, segs.map((sg) => ({ ...sg, maxLines: undefined })), width, minScale);
  let yy = valign === 'top' ? y : y + Math.max(0, (height - chosen.h) / 2);
  for (const sg of chosen.laid) {
    ctx.font = sg.font(sg.size);
    sg.lines.forEach((ln, i) => {
      const ly = yy + i * sg.size * sg.lead;
      if (sg.tick && i === 0) tick(ctx, x, ly + sg.size * 0.12, sg.size * 0.8, sg.tickColor || C.red);
      ctx.fillStyle = sg.color;
      ctx.textAlign = align;
      ctx.textBaseline = 'top';
      ctx.fillText(ln, align === 'center' ? x + width / 2 : x + sg.indent, ly);
      ctx.textAlign = 'left';
    });
    yy += sg.lines.length * sg.size * sg.lead + sg.gap;
  }
  return chosen.h;
}

// ---------------------------------------------------------------- marks

/** Seeded so the same graphic draws the same every time. */
function rng(seed) {
  let s = 0;
  for (const ch of String(seed)) s = (s * 31 + ch.charCodeAt(0)) >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** A faint paper or film grain, so the ground is not flat digital color. */
function grain(ctx, rand, dark) {
  for (let i = 0; i < 9000; i += 1) {
    ctx.fillStyle = dark ? `rgba(255,255,255,${0.012 + rand() * 0.03})` : `rgba(60,40,20,${0.012 + rand() * 0.03})`;
    ctx.fillRect(rand() * W, rand() * H, 1 + rand() * 1.5, 1 + rand() * 1.5);
  }
}

/** A brush-like underline: a few overlapping strokes that thin at the ends. */
function brushStroke(ctx, x1, x2, y, color, rand, weight = 10) {
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  for (let k = 0; k < 3; k += 1) {
    ctx.lineWidth = weight * (0.55 + rand() * 0.35);
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    const dy = (rand() - 0.5) * weight * 0.6;
    ctx.moveTo(x1 + rand() * 8, y + dy);
    ctx.quadraticCurveTo((x1 + x2) / 2, y + dy + (rand() - 0.6) * weight * 1.4, x2 - rand() * 10, y + dy + (rand() - 0.5) * weight);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

/** A hand-drawn check, for "what is true". */
function tick(ctx, x, y, s, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(3, s * 0.16);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.55);
  ctx.lineTo(x + s * 0.35, y + s * 0.9);
  ctx.lineTo(x + s * 0.95, y + s * 0.1);
  ctx.stroke();
}

/** A drawn strike through a line of text. */
function strike(ctx, x, y, w, color, rand) {
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x - 6, y + (rand() - 0.5) * 4);
  ctx.quadraticCurveTo(x + w / 2, y + (rand() - 0.5) * 10, x + w + 6, y + (rand() - 0.5) * 4);
  ctx.stroke();
}

/** A curved arrow from (x1,y1) to (x2,y2). */
function arrow(ctx, x1, y1, x2, y2, color, bend = 0.2, width = 3) {
  const mx = (x1 + x2) / 2 - (y2 - y1) * bend;
  const my = (y1 + y2) / 2 + (x2 - x1) * bend;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.quadraticCurveTo(mx, my, x2, y2);
  ctx.stroke();
  const a = Math.atan2(y2 - my, x2 - mx);
  const s = 9 + width * 2;
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - s * Math.cos(a - 0.45), y2 - s * Math.sin(a - 0.45));
  ctx.lineTo(x2 - s * Math.cos(a + 0.45), y2 - s * Math.sin(a + 0.45));
  ctx.closePath();
  ctx.fill();
}

function roundRect(ctx, x, y, w, h, r, fill, stroke = null, lw = 2) {
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
    ctx.lineWidth = lw;
    ctx.stroke();
  }
}

async function logo(dark) {
  const file = dark ? 'ao-logo-offwhite.png' : 'ao-logo-black.png';
  const local = join(__dirname, '..', '..', 'public', 'images', file);
  try {
    return await loadImage(existsSync(local) ? local : `https://www.archetypeoriginal.com/images/${file}`);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------- shared frame

/** Kicker, headline with a brush stroke under its last line, serif subtitle. Returns the body's top. */
function masthead(ctx, c, { dark, rand }) {
  const fg = dark ? C.cream : C.ink;
  let y = PAD - 4;
  if (c.kicker) {
    ctx.font = display(30);
    ctx.fillStyle = C.red;
    ctx.textBaseline = 'top';
    const k = String(c.kicker).toUpperCase();
    ctx.fillText(k, PAD, y);
    const kw = ctx.measureText(k).width;
    ctx.fillStyle = dark ? C.inkLine : 'rgba(21,21,21,0.18)';
    ctx.fillRect(PAD + kw + 18, y + 15, Math.max(0, W - PAD * 2 - kw - 18), 2);
    y += 52;
  }
  const t = fit(ctx, c.title, sans, W - PAD * 2, 3, 70, 44);
  ctx.font = sans(t.size);
  const lastW = ctx.measureText(t.lines[t.lines.length - 1] || '').width;
  const lastY = y + (t.lines.length - 1) * t.size * 1.06;
  brushStroke(ctx, PAD - 4, PAD + Math.min(lastW, W - PAD * 2) + 8, lastY + t.size * 1.12, C.red, rand, t.size * 0.16);
  y = drawLines(ctx, t.lines, PAD, y, t.size, fg, 1.06) + t.size * 0.12;
  if (c.subtitle) {
    y += 24;
    const s = fit(ctx, c.subtitle, serif, W - PAD * 2, 2, 34, 26);
    y = drawLines(ctx, s.lines, PAD, y, s.size, dark ? C.creamSoft : C.body, 1.24);
  }
  return y + 40;
}

/** Signature row: the logo with the brand name beside it (Bart, 2026-10-24: the mark goes with Archetype Original, not his name), and the site. */
async function signature(ctx, { dark }) {
  const y = H - PAD - 30;
  const img = await logo(dark);
  let x = PAD;
  if (img) {
    const lh = 38;
    const lw = (img.width / img.height) * lh;
    ctx.drawImage(img, x, y - 4, lw, lh);
    x += lw + 16;
  }
  ctx.font = display(26);
  ctx.fillStyle = dark ? C.cream : C.ink;
  ctx.textBaseline = 'top';
  ctx.fillText('ARCHETYPE ORIGINAL', x, y + 4);
  ctx.font = sans(18);
  ctx.fillStyle = dark ? C.creamSoft : C.muted;
  ctx.textAlign = 'right';
  ctx.fillText('archetypeoriginal.com', W - PAD, y + 8);
  ctx.textAlign = 'left';
  return y - 28;
}

/** The closing line as a pull quote: a big red quote mark and the serif line. Returns its top. */
function pullQuote(ctx, text, bottom, { dark }) {
  if (!text) return bottom;
  const p = fit(ctx, text, serif, W - PAD * 2 - 90, 3, 40, 28);
  const h = p.lines.length * p.size * 1.2;
  const top = bottom - h;
  ctx.font = serif(150);
  ctx.fillStyle = C.red;
  ctx.textBaseline = 'top';
  ctx.fillText('“', PAD - 6, top - 34);
  ctx.font = serif(p.size);
  drawLines(ctx, p.lines, PAD + 82, top, p.size, dark ? C.cream : C.ink, 1.2);
  return top;
}

// ---------------------------------------------------------------- framework: the hub

function hubLabel(c) {
  const words = String(c.kicker || '').trim().split(/\s+/).filter(Boolean);
  return words.slice(0, 3).join(' ');
}

function framework(ctx, c, top, bottom) {
  const items = c.items.slice(0, 4);
  const areaH = bottom - top;
  const gap = 26;

  if (items.length === 4) {
    const cw = (W - PAD * 2 - gap) / 2;
    const ch = (areaH - gap) / 2;
    const moves = sharedMoveCount(ctx, items, cw, ch);
    items.forEach((it, i) => {
      card(ctx, it, i, PAD + (i % 2) * (cw + gap), top + Math.floor(i / 2) * (ch + gap), cw, ch, moves);
    });
    // The four meet in the middle: a red cross through the gaps and a seal where they cross.
    const cx = W / 2;
    const cy = top + ch + gap / 2;
    ctx.fillStyle = C.red;
    ctx.fillRect(cx - 1.5, top + 30, 3, areaH - 60);
    ctx.fillRect(PAD + 30, cy - 1.5, W - PAD * 2 - 60, 3);
    ctx.fillStyle = C.ink;
    ctx.beginPath();
    ctx.arc(cx, cy, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = C.red;
    ctx.beginPath();
    ctx.arc(cx, cy, 20, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  // Three: the hub on the left, the ideas stacked on the right, joined by arrows.
  const hubR = 128;
  const hx = PAD + hubR;
  const hy = top + areaH / 2;
  const x = PAD + hubR * 2 + 70;
  const w = W - PAD - x;
  const ch = (areaH - gap * 2) / 3;
  const moves = sharedMoveCount(ctx, items, w, ch);
  items.forEach((it, i) => {
    const y = top + i * (ch + gap);
    card(ctx, it, i, x, y, w, ch, moves);
    arrow(ctx, hx + hubR * 0.8, hy + (i - 1) * hubR * 0.55, x - 14, y + ch / 2, C.red, (i - 1) * -0.15, 3);
  });
  hub(ctx, hx, hy, hubR, hubLabel(c));
}

const CARD_TOP = 112;
const CARD_SIDE = 28;
const CARD_BOTTOM = 22;
const CARD_MIN_SCALE = 0.95;

function cardSegs(it, moveCount) {
  return [
    { text: it.name, font: sans, size: 32, color: C.cream, lead: 1.08, gap: 12, maxLines: 2 },
    { text: it.line, font: serif, size: 26, color: C.creamSoft, lead: 1.2, gap: 16, maxLines: 3 },
    ...(it.moves || []).slice(0, moveCount).map((m) => ({ text: m, font: sans, size: 23, color: C.cream, tick: true, gap: 10, maxLines: 2 })),
  ];
}

/**
 * Legible on a phone means nothing much under 22px on a 1080 canvas. When the
 * cards cannot all hold two action lines at that size, every card drops to the
 * same number, so the set stays even instead of the text shrinking or spilling.
 */
function sharedMoveCount(ctx, items, w, h) {
  for (let n = 2; n > 0; n -= 1) {
    if (items.every((it) => fitsAt(ctx, cardSegs(it, n), w - CARD_SIDE * 2, h - CARD_TOP - CARD_BOTTOM, CARD_MIN_SCALE))) return n;
  }
  return 0;
}

function card(ctx, it, i, x, y, w, h, moveCount) {
  roundRect(ctx, x, y, w, h, 22, C.inkSoft, C.inkLine, 2);
  // The number, big, as the card's anchor.
  ctx.font = display(84);
  ctx.fillStyle = C.red;
  ctx.textBaseline = 'top';
  ctx.fillText(String(i + 1).padStart(2, '0'), x + CARD_SIDE, y + 20);
  drawBlock(ctx, cardSegs(it, moveCount), x + CARD_SIDE, y + CARD_TOP, w - CARD_SIDE * 2, h - CARD_TOP - CARD_BOTTOM, {
    maxScale: 1.15,
    minScale: CARD_MIN_SCALE,
    valign: 'top',
  });
}

function hub(ctx, cx, cy, r, label) {
  // A ring of the ground color first, so the hub sits on the cards like a seal.
  ctx.fillStyle = C.ink;
  ctx.beginPath();
  ctx.arc(cx, cy, r + 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = C.red;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(244,240,234,0.5)';
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 7]);
  ctx.beginPath();
  ctx.arc(cx, cy, r - 14, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  const t = fit(ctx, String(label || '').toUpperCase(), display, r * 1.45, 3, 46, 24);
  const h = t.lines.length * t.size * 0.95;
  drawLines(ctx, t.lines, cx, cy - h / 2 + 2, t.size, C.cream, 0.95, 'center');
}

// ---------------------------------------------------------------- paths: the split poster

function paths(ctx, c, top, bottom) {
  const mid = W / 2;
  // The right half goes dark: the way the piece argues for.
  ctx.fillStyle = C.ink;
  ctx.fillRect(mid, top - 10, W - mid, bottom - top + 10);
  const colW = mid - PAD - 40;
  const head = 96;
  const L = fit(ctx, String(c.left_label).toUpperCase(), display, colW, 1, 64, 36);
  drawLines(ctx, L.lines, PAD, top + 14, L.size, C.muted, 1);
  const R = fit(ctx, String(c.right_label).toUpperCase(), display, colW, 1, 64, 36);
  drawLines(ctx, R.lines, mid + 40, top + 14, R.size, C.red, 1);

  const rows = c.rows.slice(0, 6);
  const rt = top + head + 10;
  const rh = (bottom - 20 - rt) / rows.length;
  rows.forEach((r, i) => {
    const y = rt + i * rh;
    if (i) {
      ctx.fillStyle = 'rgba(21,21,21,0.14)';
      ctx.fillRect(PAD, y, mid - PAD - 30, 1.5);
      ctx.fillStyle = C.inkLine;
      ctx.fillRect(mid + 30, y, W - PAD - mid - 30, 1.5);
    }
    drawBlock(ctx, [{ text: r.left, font: serif, size: 28, color: C.body, lead: 1.18, maxLines: 3 }], PAD, y + 10, colW, rh - 20, { maxScale: 1.2, minScale: 0.85 });
    drawBlock(ctx, [{ text: r.right, font: sans, size: 27, color: C.cream, lead: 1.18, maxLines: 3 }], mid + 40, y + 10, colW, rh - 20, { maxScale: 1.2, minScale: 0.85 });
    // The turn from one to the other, on the seam.
    const cy = y + rh / 2;
    ctx.fillStyle = C.red;
    ctx.beginPath();
    ctx.arc(mid, cy, 17, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = C.cream;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(mid - 7, cy);
    ctx.lineTo(mid + 6, cy);
    ctx.moveTo(mid + 1, cy - 5);
    ctx.lineTo(mid + 6, cy);
    ctx.lineTo(mid + 1, cy + 5);
    ctx.stroke();
  });
}

// ---------------------------------------------------------------- myths: struck out and set right

function myths(ctx, c, top, bottom, rand) {
  const rows = c.rows.slice(0, 4);
  const rh = (bottom - top) / rows.length;
  rows.forEach((r, i) => {
    const y = top + i * rh;
    if (i) {
      ctx.fillStyle = 'rgba(21,21,21,0.14)';
      ctx.fillRect(PAD, y, W - PAD * 2, 1.5);
    }
    ctx.font = display(92);
    ctx.fillStyle = 'rgba(219,8,18,0.18)';
    ctx.textBaseline = 'top';
    ctx.fillText(String(i + 1).padStart(2, '0'), PAD - 4, y + 14);
    const x = PAD + 104;
    const w = W - PAD - x;
    // What people think: serif, muted, struck through by hand.
    const m = fit(ctx, r.myth, serif, w, 2, 32, 26);
    const my = y + 22;
    drawLines(ctx, m.lines, x, my, m.size, C.muted, 1.2);
    ctx.font = serif(m.size);
    m.lines.forEach((ln, j) => strike(ctx, x, my + j * m.size * 1.2 + m.size * 0.6, ctx.measureText(ln).width, 'rgba(219,8,18,0.75)', rand));
    const ty = my + m.lines.length * m.size * 1.2 + 16;
    drawBlock(ctx, [{ text: r.truth, font: sans, size: 28, color: C.ink, lead: 1.2, tick: true, maxLines: 4 }], x - 40, ty, w + 40, y + rh - 12 - ty, { maxScale: 1.15, minScale: 0.85, valign: 'top' });
  });
}

// ---------------------------------------------------------------- entry

const THEMES = { framework: { dark: true }, paths: { dark: false }, myths: { dark: false } };

/**
 * @param {{ layout: 'framework'|'paths'|'myths', kicker?, title, subtitle?, principle?, items?, left_label?, right_label?, rows? }} content
 * @returns {Promise<{ ok: true, buffer: Buffer } | { ok: false, error: string }>}
 */
export async function renderInfographicPng(content) {
  try {
    ensureFonts();
    const theme = THEMES[content.layout];
    if (!theme) return { ok: false, error: `Unknown layout ${content.layout}` };
    const { dark } = theme;
    const rand = rng(`${content.layout}:${content.title}`);
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = dark ? C.ink : C.paper;
    ctx.fillRect(0, 0, W, H);
    grain(ctx, rand, dark);
    ctx.textBaseline = 'top';

    const top = masthead(ctx, content, { dark, rand });
    const sigTop = await signature(ctx, { dark });
    const quoteTop = pullQuote(ctx, content.principle, sigTop - 8, { dark });
    const bottom = content.principle ? quoteTop - 44 : sigTop - 20;
    if (content.layout === 'framework') framework(ctx, content, top, bottom);
    else if (content.layout === 'paths') paths(ctx, content, top, bottom);
    else myths(ctx, content, top, bottom, rand);
    return { ok: true, buffer: canvas.toBuffer('image/png') };
  } catch (err) {
    return { ok: false, error: err?.message || String(err) };
  }
}
