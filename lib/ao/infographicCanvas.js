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
 *   stages     a pyramid: the foundation at the bottom, the highest stage on top,
 *              four to seven of them, with an optional "this week" box beneath
 *   lessons    a numbered run down a red spine, each with what to do
 *   pillars    six or eight numbered pillars in two columns
 *   grid       a table: the same rows seen through three columns
 *
 * The last four came from examples Bart shared on 2026-10-25 (in
 * notes/reference-images/, inspiration only, never shown to the writer).
 *
 * 2026-11-05, "starting to look the same": four more layouts, and every
 * graphic now wears a look (lib/ao/infographicLooks.js) chosen apart from its
 * layout: a paper, ink or red ground, a headline set three ways, and a
 * closing line set three ways.
 *   quadrant   two qualities crossed: four squares, the one argued for in color
 *   cycle      four steps that feed each other around a center
 *   questions  four or five questions a leader asks, each with why it matters
 *   statement  one idea set big, a few sentences, three short points
 */

import { createCanvas, GlobalFonts, loadImage } from '@napi-rs/canvas';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';
import { LOOKS, defaultLook, looksFor } from './infographicLooks.js';

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

/** A hex color at some opacity. */
function alpha(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/**
 * Color families, picked by what the piece is saying (Bart, 2026-11-05: "It
 * doesn't have to be brand only. It has to tell the story and sometimes that
 * requires other colors"). Each family has a light ground (paper), a deep
 * ground (ink) and a bold ground (bold). The logo and the brand name stay on
 * every one. Red belongs to the brand family; the others carry their own mark.
 */
export const MOODS = {
  brand: { paper: '#F4F0EA', ink: '#151515', inkSoft: '#222222', bold: '#DB0812', boldFg: '#F4F0EA', accent: '#DB0812', accentDark: '#DB0812', boldAccent: '#151515', hl: '#DB0812', hlText: '#F4F0EA', cream: '#F4F0EA' },
  trust: { paper: '#F2EFE5', ink: '#15302A', inkSoft: '#1F3E35', bold: '#2E6A55', boldFg: '#F4F0E4', accent: '#A87A22', accentDark: '#D8AE55', boldAccent: '#F0D58C', hl: '#D8AE55', hlText: '#15302A', cream: '#F4F0E4' },
  standards: { paper: '#F1EFEA', ink: '#13203B', inkSoft: '#1D2D4D', bold: '#21407C', boldFg: '#F3F0E8', accent: '#9C7428', accentDark: '#CDA759', boldAccent: '#E9CF8A', hl: '#CDA759', hlText: '#13203B', cream: '#F3F0E8' },
  warning: { paper: '#F2EEE5', ink: '#1D1E21', inkSoft: '#2A2B30', bold: '#E39B1B', boldFg: '#1D1E21', accent: '#C2740A', accentDark: '#F0A92A', boldAccent: '#1D1E21', hl: '#F0A92A', hlText: '#1D1E21', cream: '#F2EEE5' },
  character: { paper: '#F3EEEA', ink: '#2A1730', inkSoft: '#3A2442', bold: '#5E2C66', boldFg: '#F4EEE8', accent: '#A0702A', accentDark: '#D7A956', boldAccent: '#EBCB85', hl: '#D7A956', hlText: '#2A1730', cream: '#F4EEE8' },
  people: { paper: '#F4EDE2', ink: '#263A31', inkSoft: '#31483E', bold: '#B4502B', boldFg: '#F6EFE6', accent: '#B4502B', accentDark: '#E58A5F', boldAccent: '#DCE6D5', hl: '#B9532E', hlText: '#F6EFE6', cream: '#F6EFE6' },
};

/** What a graphic draws with, for one family on one ground (paper, ink or bold). */
function tokens(moodKey, ground) {
  const m = MOODS[moodKey] || MOODS.brand;
  const card = { cream: m.cream, cardText: m.cream, cardBody: alpha(m.cream, 0.74), cardLine: alpha(m.cream, 0.14), cardMark: m.accentDark };
  const blockText = { blockText: m.cream, blockBody: alpha(m.cream, 0.82) };
  if (ground === 'ink') {
    return { name: 'ink', dark: true, ground: m.ink, fg: m.cream, body: alpha(m.cream, 0.76), muted: alpha(m.cream, 0.5), rule: alpha(m.cream, 0.14), kickerRule: alpha(m.cream, 0.14), tint: alpha(m.cream, 0.06), accent: m.accentDark, card: m.inkSoft, deep: m.cream, block: m.bold, ...blockText, blockText: m.boldFg, blockBody: alpha(m.boldFg, 0.82), blockMark: m.boldAccent, hl: m.hl, hlText: m.hlText, hlBody: alpha(m.hlText, 0.88), seamFill: m.hl, seamMark: m.hlText, ...card };
  }
  if (ground === 'red' || ground === 'bold') {
    const darkText = m.boldFg === m.ink;
    return { name: 'red', dark: !darkText, ground: m.bold, fg: m.boldFg, body: alpha(m.boldFg, 0.86), muted: alpha(m.boldFg, 0.64), rule: alpha(m.boldFg, 0.3), kickerRule: alpha(m.boldFg, 0.3), tint: alpha(m.ink, 0.13), accent: m.boldAccent, card: m.ink, deep: m.ink, block: m.ink, ...blockText, blockMark: m.accentDark, hl: m.ink, hlText: m.cream, hlBody: alpha(m.cream, 0.82), seamFill: m.cream, seamMark: m.bold, ...card };
  }
  return { name: 'paper', dark: false, ground: m.paper, fg: m.ink, body: alpha(m.ink, 0.8), muted: alpha(m.ink, 0.55), rule: alpha(m.ink, 0.14), kickerRule: alpha(m.ink, 0.18), tint: alpha(m.ink, 0.045), accent: m.accent, card: m.ink, deep: m.ink, block: m.ink, ...blockText, blockMark: m.accentDark, hl: m.hl, hlText: m.hlText, hlBody: alpha(m.hlText, 0.88), seamFill: m.hl, seamMark: m.hlText, ...card };
}

let fontsReady = false;
function ensureFonts() {
  if (fontsReady) return;
  // One literal path per file, so the host bundles every font with the function.
  GlobalFonts.registerFromPath(join(__dirname, 'fonts', 'Inter-latin-700-normal.ttf'), SANS);
  GlobalFonts.registerFromPath(join(__dirname, 'fonts', 'PlayfairDisplay-BoldItalic.ttf'), SERIF);
  GlobalFonts.registerFromPath(join(__dirname, 'fonts', 'BebasNeue-Regular.ttf'), DISPLAY);
  GlobalFonts.registerFromPath(join(__dirname, 'fonts', 'barlow-condensed-latin-700-normal.ttf'), 'AOInfoBarlowCond');
  GlobalFonts.registerFromPath(join(__dirname, 'fonts', 'lora-latin-600-italic.ttf'), 'AOInfoLora');
  GlobalFonts.registerFromPath(join(__dirname, 'fonts', 'work-sans-latin-700-normal.ttf'), 'AOInfoWorkSans');
  GlobalFonts.registerFromPath(join(__dirname, 'fonts', 'oswald-latin-600-normal.ttf'), 'AOInfoOswald');
  GlobalFonts.registerFromPath(join(__dirname, 'fonts', 'source-serif-4-latin-600-italic.ttf'), 'AOInfoSourceSerif');
  GlobalFonts.registerFromPath(join(__dirname, 'fonts', 'ibm-plex-sans-latin-700-normal.ttf'), 'AOInfoPlex');
  GlobalFonts.registerFromPath(join(__dirname, 'fonts', 'anton-latin-400-normal.ttf'), 'AOInfoAnton');
  GlobalFonts.registerFromPath(join(__dirname, 'fonts', 'merriweather-latin-700-italic.ttf'), 'AOInfoMerriweather');
  GlobalFonts.registerFromPath(join(__dirname, 'fonts', 'archivo-latin-800-normal.ttf'), 'AOInfoArchivo');
  GlobalFonts.registerFromPath(join(__dirname, 'fonts', 'cormorant-garamond-latin-700-normal.ttf'), 'AOInfoCormorant');
  GlobalFonts.registerFromPath(join(__dirname, 'fonts', 'eb-garamond-latin-600-italic.ttf'), 'AOInfoGaramond');
  GlobalFonts.registerFromPath(join(__dirname, 'fonts', 'jost-latin-600-normal.ttf'), 'AOInfoJost');
  GlobalFonts.registerFromPath(join(__dirname, 'fonts', 'big-shoulders-display-latin-800-normal.ttf'), 'AOInfoBigShoulders');
  GlobalFonts.registerFromPath(join(__dirname, 'fonts', 'newsreader-latin-600-italic.ttf'), 'AOInfoNewsreader');
  GlobalFonts.registerFromPath(join(__dirname, 'fonts', 'dm-sans-latin-700-normal.ttf'), 'AOInfoDMSans');
  fontsReady = true;
}

/**
 * Type for each color family (Bart, 2026-11-05: "Same thing goes with fonts.
 * We don't have to just use a select few"). Three roles: a headline sans, an
 * italic serif for the human lines, and a display face for numbers, labels
 * and big type. [family, weight]
 */
const TYPE = {
  brand: { sans: [SANS, 700], serif: [SERIF, 700], display: [DISPLAY, 400], lead: 0.93 },
  trust: { sans: ['AOInfoWorkSans', 700], serif: ['AOInfoLora', 600], display: ['AOInfoBarlowCond', 700], lead: 0.98 },
  standards: { sans: ['AOInfoPlex', 700], serif: ['AOInfoSourceSerif', 600], display: ['AOInfoOswald', 600], lead: 1.08 },
  warning: { sans: ['AOInfoArchivo', 800], serif: ['AOInfoMerriweather', 700], display: ['AOInfoAnton', 400], lead: 1.12 },
  character: { sans: ['AOInfoJost', 600], serif: ['AOInfoGaramond', 600], display: ['AOInfoCormorant', 700], lead: 0.98 },
  people: { sans: ['AOInfoDMSans', 700], serif: ['AOInfoNewsreader', 600], display: ['AOInfoBigShoulders', 800], lead: 0.98 },
};

// The type in use for the graphic being drawn. Set at the start of a render;
// everything after the logo loads is drawn without a pause, so renders never interleave.
let F = TYPE.brand;
const sans = (px) => `${F.sans[1]} ${px}px ${F.sans[0]}`;
const serif = (px) => `italic ${F.serif[1]} ${px}px ${F.serif[0]}`;
const display = (px) => `${F.display[1]} ${px}px ${F.display[0]}`;

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
  let yy = valign === 'top' ? y : valign === 'bottom' ? y + Math.max(0, height - chosen.h) : y + Math.max(0, (height - chosen.h) / 2);
  for (const sg of chosen.laid) {
    ctx.font = sg.font(sg.size);
    sg.lines.forEach((ln, i) => {
      const ly = yy + i * sg.size * sg.lead;
      if (sg.tick && i === 0) tick(ctx, x, ly + sg.size * 0.12, sg.size * 0.8, sg.tickColor || C.red);
      ctx.fillStyle = sg.color;
      ctx.textAlign = align;
      ctx.textBaseline = 'top';
      ctx.fillText(ln, align === 'center' ? x + width / 2 : align === 'right' ? x + width : x + sg.indent, ly);
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

/** The kicker in display caps with a rule running to the margin. Returns the y below it. */
function kickerLine(ctx, c, y, color, ruleColor) {
  if (!c.kicker) return y;
  ctx.font = display(30);
  ctx.fillStyle = color;
  ctx.textBaseline = 'top';
  const k = String(c.kicker).toUpperCase();
  ctx.fillText(k, PAD, y);
  const kw = ctx.measureText(k).width;
  ctx.fillStyle = ruleColor;
  ctx.fillRect(PAD + kw + 18, y + 15, Math.max(0, W - PAD * 2 - kw - 18), 2);
  return y + 52;
}

/** The text on a solid block: cream, with an accent that shows against it. */
const onBlock = (T) => ({ fg: T.blockText, body: T.blockBody, accent: T.blockMark });

/**
 * The headline, set one of three ways. Returns the body's top.
 *   editorial  sans headline with a brush stroke under its last line, serif subtitle
 *   display    tall display caps with a thick bar beneath
 *   band       the whole head on a solid block across the top
 *   kicker     only the kicker (the statement layout sets its own headline)
 */
function masthead(ctx, c, { T, rand, head }) {
  let y = PAD - 4;
  if (head === 'kicker') return kickerLine(ctx, c, y, T.accent, T.rule) + 20;

  if (head === 'band') {
    const B = onBlock(T);
    const t = fit(ctx, c.title, sans, W - PAD * 2, 3, 64, 42);
    const s = c.subtitle ? fit(ctx, c.subtitle, serif, W - PAD * 2, 2, 32, 25) : null;
    const h = PAD - 4 + (c.kicker ? 52 : 0) + t.lines.length * t.size * 1.06 + (s ? 22 + s.lines.length * s.size * 1.24 : 0) + 52;
    ctx.fillStyle = T.block;
    ctx.fillRect(0, 0, W, h);
    y = kickerLine(ctx, c, y, B.accent, alpha(T.cream, 0.25));
    ctx.font = sans(t.size);
    y = drawLines(ctx, t.lines, PAD, y, t.size, B.fg, 1.06);
    if (s) {
      ctx.font = serif(s.size);
      drawLines(ctx, s.lines, PAD, y + 22, s.size, B.body, 1.24);
    }
    return h + 44;
  }

  if (head === 'display') {
    if (c.kicker) {
      const k = fit(ctx, c.kicker, serif, W - PAD * 2, 1, 32, 24);
      y = drawLines(ctx, k.lines, PAD, y, k.size, T.accent, 1.2) + 6;
    }
    const t = fit(ctx, String(c.title).toUpperCase(), display, W - PAD * 2, 3, 104, 70);
    y = drawLines(ctx, t.lines, PAD, y, t.size, T.fg, F.lead) + 8;
    ctx.fillStyle = T.accent;
    ctx.fillRect(PAD, y, 132, 12);
    y += 12;
    if (c.subtitle) {
      y += 24;
      const s = fit(ctx, c.subtitle, serif, W - PAD * 2, 2, 32, 25);
      y = drawLines(ctx, s.lines, PAD, y, s.size, T.body, 1.24);
    }
    return y + 40;
  }

  y = kickerLine(ctx, c, y, T.accent, T.kickerRule);
  const t = fit(ctx, c.title, sans, W - PAD * 2, 3, 70, 44);
  ctx.font = sans(t.size);
  const lastW = ctx.measureText(t.lines[t.lines.length - 1] || '').width;
  const lastY = y + (t.lines.length - 1) * t.size * 1.06;
  brushStroke(ctx, PAD - 4, PAD + Math.min(lastW, W - PAD * 2) + 8, lastY + t.size * 1.12, T.accent, rand, t.size * 0.16);
  y = drawLines(ctx, t.lines, PAD, y, t.size, T.fg, 1.06) + t.size * 0.12;
  if (c.subtitle) {
    y += 24;
    const s = fit(ctx, c.subtitle, serif, W - PAD * 2, 2, 34, 26);
    y = drawLines(ctx, s.lines, PAD, y, s.size, T.body, 1.24);
  }
  return y + 40;
}

/** Signature row: the logo with the brand name beside it (Bart, 2026-10-24: the mark goes with Archetype Original, not his name), and the site. */
function signature(ctx, { T, img }) {
  const y = H - PAD - 30;
  let x = PAD;
  if (img) {
    const lh = 38;
    const lw = (img.width / img.height) * lh;
    ctx.drawImage(img, x, y - 4, lw, lh);
    x += lw + 16;
  }
  // The brand name keeps its own face on every graphic, whatever the family.
  ctx.font = `400 26px ${DISPLAY}`;
  ctx.fillStyle = T.fg;
  ctx.textBaseline = 'top';
  ctx.fillText('ARCHETYPE ORIGINAL', x, y + 4);
  ctx.font = sans(18);
  ctx.fillStyle = T.muted;
  ctx.textAlign = 'right';
  ctx.fillText('archetypeoriginal.com', W - PAD, y + 8);
  ctx.textAlign = 'left';
  return y - 28;
}

/**
 * The closing line, set one of three ways. Returns its top.
 *   quote   a big quote mark and the serif line
 *   bar     the line on a solid band across the page
 *   center  centered beneath a short accent rule
 */
function closing(ctx, text, bottom, { T, close }) {
  if (!text) return bottom;
  if (close === 'bar') {
    const B = onBlock(T);
    const p = fit(ctx, text, serif, W - PAD * 2 - 40, 3, 38, 28);
    const h = p.lines.length * p.size * 1.22 + 64;
    const top = bottom - h + 8;
    ctx.fillStyle = T.block;
    ctx.fillRect(0, top, W, h);
    drawLines(ctx, p.lines, W / 2, top + 32, p.size, B.fg, 1.22, 'center');
    return top;
  }
  if (close === 'center') {
    const p = fit(ctx, text, serif, W - PAD * 2 - 80, 3, 38, 28);
    const h = p.lines.length * p.size * 1.22;
    const top = bottom - h;
    ctx.fillStyle = T.accent;
    ctx.fillRect(W / 2 - 44, top - 30, 88, 5);
    drawLines(ctx, p.lines, W / 2, top, p.size, T.fg, 1.22, 'center');
    return top - 30;
  }
  const p = fit(ctx, text, serif, W - PAD * 2 - 90, 3, 40, 28);
  const h = p.lines.length * p.size * 1.2;
  const top = bottom - h;
  ctx.font = serif(150);
  ctx.fillStyle = T.accent;
  ctx.textBaseline = 'top';
  ctx.fillText('“', PAD - 6, top - 34);
  ctx.font = serif(p.size);
  drawLines(ctx, p.lines, PAD + 82, top, p.size, T.fg, 1.2);
  return top;
}

// ---------------------------------------------------------------- framework: the hub

function hubLabel(c) {
  const words = String(c.kicker || '').trim().split(/\s+/).filter(Boolean);
  return words.slice(0, 3).join(' ');
}

function framework(ctx, c, top, bottom, { T }) {
  const items = c.items.slice(0, 4);
  const areaH = bottom - top;
  const gap = 26;

  if (items.length === 4) {
    const cw = (W - PAD * 2 - gap) / 2;
    const ch = (areaH - gap) / 2;
    const moves = sharedMoveCount(ctx, items, cw, ch, T);
    items.forEach((it, i) => {
      card(ctx, it, i, PAD + (i % 2) * (cw + gap), top + Math.floor(i / 2) * (ch + gap), cw, ch, moves, T);
    });
    // The four meet in the middle: a red cross through the gaps and a seal where they cross.
    const cx = W / 2;
    const cy = top + ch + gap / 2;
    ctx.fillStyle = T.accent;
    ctx.fillRect(cx - 1.5, top + 30, 3, areaH - 60);
    ctx.fillRect(PAD + 30, cy - 1.5, W - PAD * 2 - 60, 3);
    ctx.fillStyle = T.ground;
    ctx.beginPath();
    ctx.arc(cx, cy, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = T.accent;
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
  const moves = sharedMoveCount(ctx, items, w, ch, T);
  items.forEach((it, i) => {
    const y = top + i * (ch + gap);
    card(ctx, it, i, x, y, w, ch, moves, T);
    arrow(ctx, hx + hubR * 0.8, hy + (i - 1) * hubR * 0.55, x - 14, y + ch / 2, T.accent, (i - 1) * -0.15, 3);
  });
  hub(ctx, hx, hy, hubR, hubLabel(c), T);
}

const CARD_TOP = 112;
const CARD_SIDE = 28;
const CARD_BOTTOM = 22;
const CARD_MIN_SCALE = 0.95;

function cardSegs(it, moveCount, T) {
  return [
    { text: it.name, font: sans, size: 32, color: T.cardText, lead: 1.08, gap: 12, maxLines: 2 },
    { text: it.line, font: serif, size: 26, color: T.cardBody, lead: 1.2, gap: 16, maxLines: 3 },
    ...(it.moves || []).slice(0, moveCount).map((m) => ({ text: m, font: sans, size: 23, color: T.cardText, tick: true, tickColor: T.cardMark, gap: 10, maxLines: 2 })),
  ];
}

/**
 * Legible on a phone means nothing much under 22px on a 1080 canvas. When the
 * cards cannot all hold two action lines at that size, every card drops to the
 * same number, so the set stays even instead of the text shrinking or spilling.
 */
function sharedMoveCount(ctx, items, w, h, T) {
  for (let n = 2; n > 0; n -= 1) {
    if (items.every((it) => fitsAt(ctx, cardSegs(it, n, T), w - CARD_SIDE * 2, h - CARD_TOP - CARD_BOTTOM, CARD_MIN_SCALE))) return n;
  }
  return 0;
}

function card(ctx, it, i, x, y, w, h, moveCount, T) {
  roundRect(ctx, x, y, w, h, 22, T.card, T.cardLine, 2);
  // The number, big, as the card's anchor.
  ctx.font = display(84);
  ctx.fillStyle = T.cardMark;
  ctx.textBaseline = 'top';
  ctx.fillText(String(i + 1).padStart(2, '0'), x + CARD_SIDE, y + 20);
  drawBlock(ctx, cardSegs(it, moveCount, T), x + CARD_SIDE, y + CARD_TOP, w - CARD_SIDE * 2, h - CARD_TOP - CARD_BOTTOM, {
    maxScale: 1.15,
    minScale: CARD_MIN_SCALE,
    valign: 'top',
  });
}

function hub(ctx, cx, cy, r, label, T) {
  // A ring of the ground color first, so the hub sits on the cards like a seal.
  ctx.fillStyle = T.ground;
  ctx.beginPath();
  ctx.arc(cx, cy, r + 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = T.hl;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = alpha(T.hlText, 0.5);
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 7]);
  ctx.beginPath();
  ctx.arc(cx, cy, r - 14, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  const t = fit(ctx, String(label || '').toUpperCase(), display, r * 1.45, 3, 46, 24);
  const h = t.lines.length * t.size * 0.95;
  drawLines(ctx, t.lines, cx, cy - h / 2 + 2, t.size, T.hlText, 0.95, 'center');
}

// ---------------------------------------------------------------- paths: the split poster

function paths(ctx, c, top, bottom, { T }) {
  const mid = W / 2;
  // The right half goes dark: the way the piece argues for.
  ctx.fillStyle = T.card;
  ctx.fillRect(mid, top - 10, W - mid, bottom - top + 10);
  const colW = mid - PAD - 40;
  const head = 96;
  const L = fit(ctx, String(c.left_label).toUpperCase(), display, colW, 1, 64, 36);
  drawLines(ctx, L.lines, PAD, top + 14, L.size, T.muted, 1);
  const R = fit(ctx, String(c.right_label).toUpperCase(), display, colW, 1, 64, 36);
  drawLines(ctx, R.lines, mid + 40, top + 14, R.size, T.cardMark, 1);

  const rows = c.rows.slice(0, 6);
  const rt = top + head + 10;
  const rh = (bottom - 20 - rt) / rows.length;
  rows.forEach((r, i) => {
    const y = rt + i * rh;
    if (i) {
      ctx.fillStyle = T.rule;
      ctx.fillRect(PAD, y, mid - PAD - 30, 1.5);
      ctx.fillStyle = T.cardLine;
      ctx.fillRect(mid + 30, y, W - PAD - mid - 30, 1.5);
    }
    drawBlock(ctx, [{ text: r.left, font: serif, size: 28, color: T.body, lead: 1.18, maxLines: 3 }], PAD, y + 10, colW, rh - 20, { maxScale: 1.2, minScale: 0.85 });
    drawBlock(ctx, [{ text: r.right, font: sans, size: 27, color: T.cardText, lead: 1.18, maxLines: 3 }], mid + 40, y + 10, colW, rh - 20, { maxScale: 1.2, minScale: 0.85 });
    // The turn from one to the other, on the seam.
    const cy = y + rh / 2;
    // On a red ground the seam turns cream so it does not vanish into it.
    ctx.fillStyle = T.seamFill;
    ctx.beginPath();
    ctx.arc(mid, cy, 17, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = T.seamMark;
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

function myths(ctx, c, top, bottom, { T, rand }) {
  const rows = c.rows.slice(0, 4);
  const rh = (bottom - top) / rows.length;
  rows.forEach((r, i) => {
    const y = top + i * rh;
    if (i) {
      ctx.fillStyle = T.rule;
      ctx.fillRect(PAD, y, W - PAD * 2, 1.5);
    }
    ctx.font = display(92);
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = T.accent;
    ctx.textBaseline = 'top';
    ctx.fillText(String(i + 1).padStart(2, '0'), PAD - 4, y + 14);
    ctx.globalAlpha = 1;
    const x = PAD + 104;
    const w = W - PAD - x;
    // What people think: serif, muted, struck through by hand.
    const m = fit(ctx, r.myth, serif, w, 2, 32, 26);
    const my = y + 22;
    drawLines(ctx, m.lines, x, my, m.size, T.muted, 1.2);
    ctx.font = serif(m.size);
    m.lines.forEach((ln, j) => strike(ctx, x, my + j * m.size * 1.2 + m.size * 0.6, ctx.measureText(ln).width, T.accent, rand));
    const ty = my + m.lines.length * m.size * 1.2 + 16;
    drawBlock(ctx, [{ text: r.truth, font: sans, size: 28, color: T.fg, lead: 1.2, tick: true, tickColor: T.accent, maxLines: 4 }], x - 40, ty, w + 40, y + rh - 12 - ty, { maxScale: 1.15, minScale: 0.85, valign: 'top' });
  });
}

// ---------------------------------------------------------------- stages: the pyramid

/** "This week": a few things to try, in a ruled box. Returns its top. */
function thisWeek(ctx, actions, bottom, T) {
  const list = (actions || []).slice(0, 3);
  if (!list.length) return bottom;
  const x = PAD;
  const w = W - PAD * 2;
  const segs = list.map((a) => ({ text: a, font: sans, size: 23, color: T.fg, tick: true, tickColor: T.accent, gap: 8, maxLines: 2 }));
  const l = layoutBlock(ctx, segs, w - 56, 1) || { h: list.length * 40 };
  const h = 60 + l.h + 18;
  const y = bottom - h;
  roundRect(ctx, x, y, w, h, 16, alpha(T.accent, 0.06), alpha(T.accent, 0.4), 2);
  ctx.font = display(30);
  ctx.fillStyle = T.accent;
  ctx.textBaseline = 'top';
  ctx.fillText('THIS WEEK', x + 28, y + 20);
  drawBlock(ctx, segs, x + 28, y + 60, w - 56, h - 72, { maxScale: 1, minScale: 0.9, valign: 'top' });
  return y;
}

function stages(ctx, c, top, bottom, { T }) {
  // Written foundation first; drawn with the foundation at the bottom.
  const list = c.items.slice(0, 7);
  const n = list.length;
  bottom = c.this_week?.length ? thisWeek(ctx, c.this_week, bottom, T) - 28 : bottom;
  const areaH = bottom - top;
  const gap = n > 5 ? 8 : 12;
  const th = (areaH - gap * (n - 1)) / n;
  const pw = 430;
  const cx = PAD + pw / 2;
  const tx = PAD + pw + 44;
  const tw = W - PAD - tx;
  const widthAt = (y) => 90 + ((y - top) / areaH) * (pw - 90);
  const segsFor = (it, i) => [
    ...(n > 5 ? [] : [{ text: `STAGE ${i + 1}`, font: display, size: 24, color: T.accent, lead: 1, gap: 6, maxLines: 1 }]),
    { text: it.name, font: sans, size: n > 5 ? 26 : 30, color: T.fg, lead: 1.08, gap: n > 5 ? 4 : 8, maxLines: 2 },
    { text: it.line, font: serif, size: n > 5 ? 22 : 24, color: T.body, lead: 1.18, maxLines: n > 5 ? 2 : 3 },
  ];
  // One text size for every tier, so no stage reads smaller than its neighbors.
  let scale = 1.15;
  while (scale > 0.8 && !list.every((it, i) => fitsAt(ctx, segsFor(it, i), tw, th, scale))) scale -= 0.03;
  for (let k = 0; k < n; k += 1) {
    const i = n - 1 - k; // k = 0 is the top tier, the highest stage
    const y1 = top + k * (th + gap);
    const y2 = y1 + th;
    const w1 = widthAt(y1);
    const w2 = widthAt(y2);
    ctx.fillStyle = k === 0 ? T.hl : alpha(T.deep, 0.94 - k * 0.12);
    ctx.beginPath();
    ctx.moveTo(cx - w1 / 2, y1);
    ctx.lineTo(cx + w1 / 2, y1);
    ctx.lineTo(cx + w2 / 2, y2);
    ctx.lineTo(cx - w2 / 2, y2);
    ctx.closePath();
    ctx.fill();
    ctx.font = display(Math.min(70, th * 0.66));
    ctx.fillStyle = k === 0 ? T.hlText : T.ground;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(i + 1), cx, y1 + th / 2 + 3);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    // A rule from the tier's edge out to its words.
    ctx.fillStyle = T.rule;
    ctx.fillRect(cx + (w1 + w2) / 4 + 12, y1 + th / 2, tx - 16 - (cx + (w1 + w2) / 4 + 12), 2);
    const it = list[i];
    drawBlock(ctx, segsFor(it, i), tx, y1, tw, th, { maxScale: scale, minScale: scale });
  }
}

// ---------------------------------------------------------------- lessons: down a red spine

const LESSON_MIN_SCALE = 0.92;

function lessonSegs(it, pointCount, T) {
  return [
    { text: it.name, font: sans, size: 30, color: T.fg, lead: 1.08, gap: 8, maxLines: 2 },
    ...(it.points || []).slice(0, pointCount).map((p) => ({ text: p, font: sans, size: 23, color: T.body, tick: true, tickColor: T.accent, gap: 6, maxLines: 2 })),
  ];
}

function lessons(ctx, c, top, bottom, { T }) {
  const list = c.items.slice(0, 5);
  const rh = (bottom - top) / list.length;
  const sx = PAD + 34;
  const x = PAD + 100;
  const w = W - PAD - x;
  let points = 2;
  while (points > 0 && !list.every((it) => fitsAt(ctx, lessonSegs(it, points, T), w, rh - 18, LESSON_MIN_SCALE))) points -= 1;
  ctx.fillStyle = T.accent;
  ctx.fillRect(sx - 2, top + rh * 0.3, 4, rh * (list.length - 0.6));
  list.forEach((it, i) => {
    const y = top + i * rh;
    const cy = y + rh / 2;
    ctx.fillStyle = T.card;
    ctx.beginPath();
    ctx.arc(sx, cy, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = T.accent;
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.font = display(42);
    ctx.fillStyle = T.cardText;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(i + 1), sx, cy + 2);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    if (i) {
      ctx.fillStyle = T.rule;
      ctx.fillRect(x, y, w, 1.5);
    }
    drawBlock(ctx, lessonSegs(it, points, T), x, y + 9, w, rh - 18, { maxScale: 1.15, minScale: LESSON_MIN_SCALE });
  });
}

// ---------------------------------------------------------------- pillars: two columns of numbered pillars

function pillars(ctx, c, top, bottom, { T }) {
  const list = c.items.slice(0, 8);
  const rows = Math.ceil(list.length / 2);
  const gap = 22;
  const cw = (W - PAD * 2 - gap) / 2;
  const ch = (bottom - top - gap * (rows - 1)) / rows;
  list.forEach((it, i) => {
    const x = PAD + (i % 2) * (cw + gap);
    const y = top + Math.floor(i / 2) * (ch + gap);
    roundRect(ctx, x, y, cw, ch, 18, T.card, T.cardLine, 2);
    // The pillar's mark: a red column on the card's edge.
    ctx.fillStyle = T.cardMark;
    ctx.fillRect(x, y + 18, 6, ch - 36);
    ctx.font = display(58);
    ctx.fillStyle = T.cardMark;
    ctx.textBaseline = 'top';
    ctx.fillText(String(i + 1).padStart(2, '0'), x + 26, y + 16);
    drawBlock(
      ctx,
      [
        { text: it.name, font: sans, size: 27, color: T.cardText, lead: 1.08, gap: 8, maxLines: 2 },
        { text: it.line, font: serif, size: 22, color: T.cardBody, lead: 1.22, maxLines: 4 },
      ],
      x + 26,
      y + 80,
      cw - 46,
      ch - 96,
      { maxScale: 1.15, minScale: 0.9, valign: 'top' }
    );
  });
}

// ---------------------------------------------------------------- grid: the table

function grid(ctx, c, top, bottom, { T }) {
  const cols = c.columns.slice(0, 3);
  const rows = c.rows.slice(0, 5);
  const gap = 10;
  const cw = (W - PAD * 2 - gap * (cols.length - 1)) / cols.length;
  const hh = 78;
  cols.forEach((label, j) => {
    const x = PAD + j * (cw + gap);
    roundRect(ctx, x, top, cw, hh, 14, j === cols.length - 1 ? T.hl : T.card);
    const t = fit(ctx, String(label).toUpperCase(), display, cw - 28, 2, 34, 22);
    const h = t.lines.length * t.size * 1;
    drawLines(ctx, t.lines, x + cw / 2, top + (hh - h) / 2 + 2, t.size, j === cols.length - 1 ? T.hlText : T.cardText, 1, 'center');
  });
  const rt = top + hh + gap;
  const rh = (bottom - rt - gap * (rows.length - 1)) / rows.length;
  rows.forEach((row, i) => {
    const y = rt + i * (rh + gap);
    cols.forEach((_, j) => {
      const x = PAD + j * (cw + gap);
      const first = j === 0;
      const last = j === cols.length - 1;
      roundRect(ctx, x, y, cw, rh, 12, last ? alpha(T.hl, 0.1) : first ? alpha(T.deep, 0.04) : alpha(T.deep, 0.08), last ? alpha(T.hl, 0.45) : null, 2);
      drawBlock(
        ctx,
        [{ text: row[j], font: first ? serif : sans, size: first ? 24 : 23, color: first ? T.muted : T.fg, lead: 1.2, maxLines: 4 }],
        x + 16,
        y + 10,
        cw - 32,
        rh - 20,
        { maxScale: 1.15, minScale: 0.88, align: 'center' }
      );
    });
  });
}

// ---------------------------------------------------------------- quadrant: two qualities crossed

/** The color that stands out on this ground, and the text that sits on it. */
const highlight = (T) => ({ fill: T.hl, fg: T.hlText, body: T.hlBody });

/**
 * Where the quadrant's axes, labels and squares sit. Every label gets an explicit
 * clear gap on both sides (arrow on one side, squares on the other), so the axis
 * words never touch the squares. Bart, 2026-11-12: "The text to the right of the
 * Care arrow touches the boxes beside them."
 */
export const QUADRANT_LABEL_SIZE = 30;
export const QUADRANT_CLEAR = 22;
export function quadrantFrame(top, bottom) {
  const ax = PAD + 6; // the up arrow's line
  const ay = bottom - 6; // the right arrow's line
  const labelLeft = ax + QUADRANT_CLEAR; // the rotated label's near edge
  const x0 = labelLeft + QUADRANT_LABEL_SIZE + QUADRANT_CLEAR; // squares start
  const y1 = ay - QUADRANT_CLEAR - QUADRANT_LABEL_SIZE - QUADRANT_CLEAR; // squares end
  const labelTop = y1 + QUADRANT_CLEAR;
  return { ax, ay, labelLeft, labelTop, x0, x1: W - PAD, y0: top, y1 };
}

function quadrant(ctx, c, top, bottom, { T }) {
  const { ax, ay, labelLeft, labelTop, x0, x1, y0, y1 } = quadrantFrame(top, bottom);
  const gap = 14;
  const cw = (x1 - x0 - gap) / 2;
  const ch = (y1 - y0 - gap) / 2;
  const q = c.cells;
  // Up is more of y, right is more of x: the top right square is the one argued for.
  const cells = [
    [q.y_only, 0, 0, false],
    [q.both_high, 1, 0, true],
    [q.both_low, 0, 1, false],
    [q.x_only, 1, 1, false],
  ];
  const segsFor = (cell, win) => {
    const hl = highlight(T);
    return [
      { text: cell.name, font: sans, size: 32, color: win ? hl.fg : T.fg, lead: 1.08, gap: 12, maxLines: 2 },
      { text: cell.line, font: serif, size: 25, color: win ? hl.body : T.body, lead: 1.22, maxLines: 4 },
    ];
  };
  let scale = 1.15;
  while (scale > 0.85 && !cells.every(([cell, , , win]) => fitsAt(ctx, segsFor(cell, win), cw - 56, ch - 56, scale))) scale -= 0.03;
  cells.forEach(([cell, col, row, win]) => {
    const x = x0 + col * (cw + gap);
    const y = y0 + row * (ch + gap);
    if (win) roundRect(ctx, x, y, cw, ch, 18, highlight(T).fill);
    else roundRect(ctx, x, y, cw, ch, 18, T.tint, T.rule, 2);
    drawBlock(ctx, segsFor(cell, win), x + 28, y + 28, cw - 56, ch - 56, { maxScale: scale, minScale: scale });
  });
  // The axes: arrows along the left and bottom, each with its quality.
  arrow(ctx, ax, y1, ax, y0 + 4, T.fg, 0, 3);
  arrow(ctx, x0, ay, x1 - 4, ay, T.fg, 0, 3);
  ctx.font = display(QUADRANT_LABEL_SIZE);
  ctx.fillStyle = T.muted;
  ctx.textBaseline = 'top';
  ctx.textAlign = 'center';
  ctx.fillText(String(c.x_label).toUpperCase(), (x0 + x1) / 2, labelTop);
  ctx.save();
  // Rotated a quarter turn up: the text's top edge faces the arrow, at labelLeft.
  ctx.translate(labelLeft, (y0 + y1) / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(String(c.y_label).toUpperCase(), 0, 0);
  ctx.restore();
  ctx.textAlign = 'left';
}

// ---------------------------------------------------------------- cycle: four steps that feed each other

function cycle(ctx, c, top, bottom, { T }) {
  // Bart, 2026-11-05: "Why is this not an actual circle?" A true ring at the
  // center, cut into four arrows that run clockwise, with each step's words in
  // the corner beside its arrow and what the loop builds inside the ring.
  const list = c.items.slice(0, 4);
  const areaH = bottom - top;
  const cx = W / 2;
  const cy = (top + bottom) / 2;
  const Ro = Math.min(areaH / 2 - 6, 210);
  const band = Math.round(Ro * 0.24);
  const Rm = Ro - band / 2;
  const hl = highlight(T);

  // The four arrows. Step 1 is the top right quarter; then clockwise.
  const slice = Math.PI / 2;
  const cut = 0.11;
  for (let i = 0; i < 4; i += 1) {
    const a0 = -Math.PI / 2 + i * slice + cut;
    const a1 = -Math.PI / 2 + (i + 1) * slice - cut - 0.12;
    ctx.strokeStyle = hl.fill;
    ctx.lineWidth = band;
    ctx.lineCap = 'butt';
    ctx.beginPath();
    ctx.arc(cx, cy, Rm, a0, a1);
    ctx.stroke();
    // The arrowhead, pointing on around the ring.
    const tip = a1 + 0.16;
    const out = Rm + band * 0.85;
    const inn = Rm - band * 0.85;
    ctx.fillStyle = hl.fill;
    ctx.beginPath();
    ctx.moveTo(cx + out * Math.cos(a1), cy + out * Math.sin(a1));
    ctx.lineTo(cx + Rm * Math.cos(tip), cy + Rm * Math.sin(tip));
    ctx.lineTo(cx + inn * Math.cos(a1), cy + inn * Math.sin(a1));
    ctx.closePath();
    ctx.fill();
    // The step's number on its arrow.
    const mid = (a0 + a1) / 2;
    ctx.font = display(Math.round(band * 0.8));
    ctx.fillStyle = hl.fg;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(i + 1), cx + Rm * Math.cos(mid), cy + Rm * Math.sin(mid) + 2);
  }
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  // What the loop builds, inside the ring.
  const ri = Ro - band - 14;
  const label = fit(ctx, String(c.center || '').toUpperCase(), display, ri * 1.55, 3, 56, 26);
  ctx.font = display(label.size);
  const lh = label.lines.length * label.size * 0.95;
  drawLines(ctx, label.lines, cx, cy - lh / 2 + 3, label.size, T.fg, 0.95, 'center');

  // Each step's words in the corner beside its arrow.
  const colW = cx - Ro - 30 - PAD;
  const half = (areaH - 24) / 2;
  const spots = [
    { x: cx + Ro + 30, y: top, align: 'left' },
    { x: cx + Ro + 30, y: top + half + 24, align: 'left' },
    { x: PAD, y: top + half + 24, align: 'right' },
    { x: PAD, y: top, align: 'right' },
  ];
  const segsFor = (it, i) => [
    { text: `STEP ${i + 1}`, font: display, size: 26, color: T.accent, lead: 1, gap: 6, maxLines: 1 },
    { text: it.name, font: sans, size: 30, color: T.fg, lead: 1.08, gap: 8, maxLines: 3 },
    { text: it.line, font: serif, size: 24, color: T.body, lead: 1.22, maxLines: 5 },
  ];
  let scale = 1.1;
  while (scale > 0.86 && !list.every((it, i) => fitsAt(ctx, segsFor(it, i), colW, half, scale))) scale -= 0.03;
  list.forEach((it, i) => {
    const sp = spots[i];
    // Top steps sit toward the ring's top, bottom steps toward its bottom.
    drawBlock(ctx, segsFor(it, i), sp.x, sp.y, colW, half, { maxScale: scale, minScale: scale, align: sp.align });
  });
}

// ---------------------------------------------------------------- questions: what a leader asks

function questions(ctx, c, top, bottom, { T }) {
  const list = c.items.slice(0, 5);
  const rh = (bottom - top) / list.length;
  const x = PAD + 120;
  const w = W - PAD - x;
  const segsFor = (it) => [
    { text: it.question, font: serif, size: 36, color: T.fg, lead: 1.14, gap: 10, maxLines: 3 },
    { text: it.why, font: sans, size: 24, color: T.body, lead: 1.25, maxLines: 2 },
  ];
  let scale = 1.1;
  while (scale > 0.9 && !list.every((it) => fitsAt(ctx, segsFor(it), w, rh - 24, scale))) scale -= 0.03;
  list.forEach((it, i) => {
    const y = top + i * rh;
    if (i) {
      ctx.fillStyle = T.rule;
      ctx.fillRect(PAD, y, W - PAD * 2, 1.5);
    }
    // The number as an outline, so the question carries the weight.
    ctx.font = display(Math.min(120, rh * 0.8));
    ctx.strokeStyle = T.accent;
    ctx.lineWidth = 2.5;
    ctx.textBaseline = 'middle';
    ctx.strokeText(String(i + 1).padStart(2, '0'), PAD - 2, y + rh / 2 + 4);
    ctx.textBaseline = 'top';
    drawBlock(ctx, segsFor(it), x, y + 12, w, rh - 24, { maxScale: scale, minScale: scale });
  });
}

// ---------------------------------------------------------------- statement: one idea, set big

function statement(ctx, c, top, bottom, { T }) {
  // Three short points along the bottom.
  const pts = (c.points || []).slice(0, 3);
  const gap = 28;
  const pw = (W - PAD * 2 - gap * (pts.length - 1)) / Math.max(1, pts.length);
  const ph = 150;
  const py = bottom - ph;
  pts.forEach((pt, i) => {
    const x = PAD + i * (pw + gap);
    if (i) {
      ctx.fillStyle = T.rule;
      ctx.fillRect(x - gap / 2, py + 6, 2, ph - 12);
    }
    ctx.font = display(44);
    ctx.fillStyle = T.accent;
    ctx.textBaseline = 'top';
    ctx.fillText(String(i + 1).padStart(2, '0'), x, py);
    drawBlock(ctx, [{ text: pt, font: sans, size: 26, color: T.fg, lead: 1.2, maxLines: 4 }], x, py + 52, pw - 8, ph - 52, { maxScale: 1.1, minScale: 0.85, valign: 'top' });
  });
  // The idea, as large as the space allows, then the sentences that open it up.
  const room = py - 40 - top;
  const b = c.body ? fit(ctx, c.body, serif, W - PAD * 2, 5, 34, 26) : { lines: [], size: 0 };
  const bh = b.lines.length * b.size * 1.28;
  const t = fit(ctx, String(c.title).toUpperCase(), display, W - PAD * 2, 4, 176, 84);
  let th = t.lines.length * t.size * F.lead;
  let ts = t;
  if (th + 46 + bh > room) {
    ts = fit(ctx, String(c.title).toUpperCase(), display, W - PAD * 2, 5, Math.max(84, Math.floor(t.size * ((room - 46 - bh) / th))), 70);
    th = ts.lines.length * ts.size * F.lead;
  }
  const y0 = top + Math.max(0, (room - th - 46 - bh) / 2);
  ctx.font = display(ts.size);
  let y = drawLines(ctx, ts.lines, PAD, y0, ts.size, T.fg, F.lead) + 10;
  ctx.fillStyle = T.accent;
  ctx.fillRect(PAD, y, 140, 12);
  y += 36;
  if (b.size) ctx.font = serif(b.size);
  drawLines(ctx, b.lines, PAD, y, b.size, T.body, 1.28);
}

// ---------------------------------------------------------------- iceberg: what shows and what is underneath

const ICE = '#EAF2F5';

function iceberg(ctx, c, top, bottom, { T, rand }) {
  const areaH = bottom - top;
  const yw = top + Math.round(areaH * 0.34);
  const water = T.name === 'ink' ? alpha(T.cream, 0.08) : T.card;
  const waterText = T.name === 'ink' ? T.fg : T.cardText;
  ctx.fillStyle = water;
  ctx.fillRect(0, yw, W, bottom - yw + 10);
  // The berg: a small tip above the line, a mass several times its size below.
  const bx = PAD + 220;
  const jag = (n, amp) => Array.from({ length: n }, () => (rand() - 0.5) * amp);
  const tip = [[bx - 120, yw], [bx - 70, yw - (yw - top) * 0.45], [bx - 18, top + 14], [bx + 30, yw - (yw - top) * 0.62], [bx + 74, yw - (yw - top) * 0.3], [bx + 118, yw]];
  ctx.fillStyle = ICE;
  ctx.beginPath();
  tip.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  ctx.fill();
  // A shaded face and an edge, so the tip reads on a light ground too.
  ctx.strokeStyle = alpha(T.deep, 0.3);
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = 'rgba(70,110,130,0.22)';
  ctx.beginPath();
  ctx.moveTo(bx - 18, top + 14);
  [[bx + 30, yw - (yw - top) * 0.62], [bx + 74, yw - (yw - top) * 0.3], [bx + 118, yw], [bx + 10, yw]].forEach(([x, y]) => ctx.lineTo(x, y));
  ctx.closePath();
  ctx.fill();
  const j = jag(8, 30);
  const mass = [[bx - 124, yw], [bx - 175 + j[0], yw + areaH * 0.08], [bx - 215 + j[1], yw + areaH * 0.24], [bx - 200 + j[2], yw + areaH * 0.42], [bx - 120 + j[3], bottom - 14], [bx + 20 + j[4], bottom - 4], [bx + 150 + j[5], bottom - 30], [bx + 215 + j[6], yw + areaH * 0.36], [bx + 200 + j[7], yw + areaH * 0.14], [bx + 124, yw]];
  const massPath = () => {
    ctx.beginPath();
    mass.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
  };
  ctx.fillStyle = 'rgba(170,210,228,0.34)';
  massPath();
  ctx.fill();
  // Definition below the water too (Bart, 2026-11-06: a flat mass "just looks like a blob"):
  // the tip's ridge carries down, the far side sits in shade, facet edges catch the light,
  // and the whole mass dims as it goes deeper. All clipped to the mass.
  ctx.save();
  massPath();
  ctx.clip();
  const ridge = [[bx + 10, yw], [bx + 4 + j[2] * 0.5, yw + areaH * 0.3], mass[5]];
  ctx.fillStyle = 'rgba(20,45,60,0.26)';
  ctx.beginPath();
  ridge.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
  [mass[6], mass[7], mass[8], mass[9]].forEach(([px, py]) => ctx.lineTo(px, py));
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = alpha(ICE, 0.32);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ridge.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
  for (const [from, to] of [[ridge[1], mass[2]], [ridge[1], mass[3]], [ridge[1], mass[7]], [mass[7], mass[5]]]) {
    ctx.moveTo(from[0], from[1]);
    ctx.lineTo(to[0], to[1]);
  }
  ctx.stroke();
  const depth = ctx.createLinearGradient(0, yw, 0, bottom);
  depth.addColorStop(0, 'rgba(10,25,35,0)');
  depth.addColorStop(1, 'rgba(10,25,35,0.32)');
  ctx.fillStyle = depth;
  ctx.fillRect(0, yw, W, bottom - yw);
  ctx.restore();
  ctx.strokeStyle = alpha(ICE, 0.5);
  ctx.lineWidth = 2;
  massPath();
  ctx.stroke();
  // The waterline.
  ctx.fillStyle = alpha(ICE, 0.7);
  ctx.fillRect(0, yw - 2, W, 3);

  const x = PAD + 490;
  const w = W - PAD - x;
  const list = (items, color) => items.map((t) => ({ text: t, font: sans, size: 25, color, lead: 1.18, gap: 12, tick: true, tickColor: T.name === 'ink' ? T.accent : T.cardMark, maxLines: 2 }));
  const aboveSegs = [{ text: String(c.above_label || '').toUpperCase(), font: display, size: 30, color: T.accent, lead: 1, gap: 12, maxLines: 1 }, ...list(c.above, T.fg).map((sg) => ({ ...sg, tickColor: T.accent }))];
  const belowSegs = [{ text: String(c.below_label || '').toUpperCase(), font: display, size: 30, color: T.name === 'ink' ? T.accent : T.cardMark, lead: 1, gap: 14, maxLines: 1 }, ...list(c.below, waterText)];
  drawBlock(ctx, aboveSegs, x, top, w, yw - top - 18, { maxScale: 1.35, minScale: 0.85 });
  drawBlock(ctx, belowSegs, x, yw + 26, w, bottom - yw - 40, { maxScale: 1.35, minScale: 0.85 });
}

// ---------------------------------------------------------------- scale: two things held at once

function scale(ctx, c, top, bottom, { T }) {
  const cx = W / 2;
  const by = top + 76;
  const hl = highlight(T);
  const lx = PAD + 190;
  const rx = W - PAD - 190;
  // The post and its base.
  ctx.fillStyle = T.fg;
  ctx.fillRect(cx - 6, by, 12, bottom - by - 26);
  roundRect(ctx, cx - 90, bottom - 30, 180, 22, 8, T.fg);
  // The beam, level: both are carried in full.
  roundRect(ctx, PAD + 40, by - 6, W - PAD * 2 - 80, 12, 6, T.fg);
  // Pans on cords.
  const py = by + 120;
  for (const px of [lx, rx]) {
    ctx.strokeStyle = T.muted;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(px, by + 6);
    ctx.lineTo(px - 120, py);
    ctx.moveTo(px, by + 6);
    ctx.lineTo(px + 120, py);
    ctx.stroke();
    ctx.fillStyle = T.accent;
    ctx.beginPath();
    ctx.ellipse(px, py, 130, 34, 0, 0, Math.PI);
    ctx.fill();
  }
  // The one holding both, at the pivot.
  const r = 74;
  ctx.fillStyle = hl.fill;
  ctx.beginPath();
  ctx.arc(cx, by, r, 0, Math.PI * 2);
  ctx.fill();
  const t = fit(ctx, String(c.center || '').toUpperCase(), display, r * 1.45, 3, 30, 18);
  ctx.font = display(t.size);
  drawLines(ctx, t.lines, cx, by - (t.lines.length * t.size * F.lead) / 2 + 2, t.size, hl.fg, F.lead, 'center');

  const colW = cx - 40 - PAD;
  const segsFor = (label, items) => [
    { text: String(label || '').toUpperCase(), font: display, size: 40, color: T.fg, lead: F.lead, gap: 16, maxLines: 2 },
    ...items.map((it) => ({ text: it, font: serif, size: 27, color: T.body, lead: 1.2, gap: 14, maxLines: 3 })),
  ];
  const y = py + 66;
  const h = bottom - 46 - y;
  let sc = 1.5;
  while (sc > 0.82 && !(fitsAt(ctx, segsFor(c.left_label, c.left), colW, h, sc) && fitsAt(ctx, segsFor(c.right_label, c.right), colW, h, sc))) sc -= 0.03;
  drawBlock(ctx, segsFor(c.left_label, c.left), PAD, y, colW, h, { maxScale: sc, minScale: sc, align: 'center' });
  drawBlock(ctx, segsFor(c.right_label, c.right), W - PAD - colW, y, colW, h, { maxScale: sc, minScale: sc, align: 'center' });
}

// ---------------------------------------------------------------- staircase: one step at a time

function staircase(ctx, c, top, bottom, { T }) {
  const list = c.items.slice(0, 4);
  const n = list.length;
  const areaH = bottom - top;
  const gap = 8;
  const cw = (W - PAD * 2 - gap * (n - 1)) / n;
  const h0 = areaH * 0.16;
  const h1 = areaH * 0.5;
  const segsFor = (it) => [
    { text: it.name, font: sans, size: 27, color: T.fg, lead: 1.08, gap: 8, maxLines: 3 },
    { text: it.line, font: serif, size: 22, color: T.body, lead: 1.2, maxLines: 6 },
  ];
  const stepTop = (i) => bottom - (h0 + ((h1 - h0) * i) / Math.max(1, n - 1));
  let sc = 1.1;
  while (sc > 0.82 && !list.every((it, i) => fitsAt(ctx, segsFor(it), cw - 12, stepTop(i) - top - 20, sc))) sc -= 0.03;
  list.forEach((it, i) => {
    const x = PAD + i * (cw + gap);
    const y = stepTop(i);
    // One color, deepening as the steps climb.
    ctx.fillStyle = alpha(T.hl, 0.3 + (0.7 * i) / Math.max(1, n - 1));
    ctx.fillRect(x, y, cw, bottom - y);
    ctx.font = display(Math.min(84, (bottom - y) * 0.6));
    ctx.fillStyle = i >= n / 2 ? T.hlText : T.fg;
    ctx.textBaseline = 'top';
    ctx.fillText(String(i + 1), x + 16, y + 12);
    drawBlock(ctx, segsFor(it), x + 4, top, cw - 12, y - top - 18, { maxScale: sc, minScale: sc, valign: 'bottom' });
  });
}

// ---------------------------------------------------------------- dial: where most leaders sit on a range

function dial(ctx, c, top, bottom, { T }) {
  const list = c.items.slice(0, 5);
  const n = list.length;
  const areaH = bottom - top;
  const R = Math.min(220, areaH * 0.33);
  const gx = W / 2;
  const gy = top + R + 10;
  const band = 64;
  const hl = highlight(T);
  const span = Math.PI / n;
  list.forEach((_, i) => {
    const a0 = Math.PI + i * span + 0.02;
    const a1 = Math.PI + (i + 1) * span - 0.02;
    ctx.strokeStyle = alpha(T.hl, 0.25 + (0.75 * i) / Math.max(1, n - 1));
    ctx.lineWidth = band;
    ctx.lineCap = 'butt';
    ctx.beginPath();
    ctx.arc(gx, gy, R - band / 2, a0, a1);
    ctx.stroke();
    const mid = (a0 + a1) / 2;
    ctx.font = display(34);
    ctx.fillStyle = i >= n / 2 ? T.hlText : T.fg;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(i + 1), gx + (R - band / 2) * Math.cos(mid), gy + (R - band / 2) * Math.sin(mid) + 2);
  });
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  // The ends of the range.
  // Each end label sits outside its end of the arc, so nothing meets in the middle.
  const endW = gx - R - 20 - PAD;
  const lo = fit(ctx, String(c.low_label || '').toUpperCase(), display, endW, 2, 34, 22);
  ctx.font = display(lo.size);
  drawLines(ctx, lo.lines, gx - R - 20, gy - lo.lines.length * lo.size * F.lead, lo.size, T.muted, F.lead, 'right');
  const hi = fit(ctx, String(c.high_label || '').toUpperCase(), display, endW, 2, 34, 22);
  ctx.font = display(hi.size);
  drawLines(ctx, hi.lines, gx + R + 20, gy - hi.lines.length * hi.size * F.lead, hi.size, T.muted, F.lead);
  // The needle, at where most leaders sit.
  const at = Math.min(n, Math.max(1, Number(c.most_at) || 1)) - 1;
  const na = Math.PI + (at + 0.5) * span;
  ctx.strokeStyle = T.fg;
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(gx, gy);
  ctx.lineTo(gx + (R - band - 18) * Math.cos(na), gy + (R - band - 18) * Math.sin(na));
  ctx.stroke();
  ctx.fillStyle = T.fg;
  ctx.beginPath();
  ctx.arc(gx, gy, 16, 0, Math.PI * 2);
  ctx.fill();
  if (c.most_note) {
    // Under the needle's hub, between the two ends of the range.
    const t = fit(ctx, c.most_note, serif, R * 1.8, 1, 28, 20);
    ctx.font = serif(t.size);
    drawLines(ctx, t.lines, gx, gy + 26, t.size, T.accent, 1.2, 'center');
  }
  // What each point on the range looks like, two to a row.
  const ly = gy + (c.most_note ? 82 : 40);
  const cols = 2;
  const rows = Math.ceil(n / cols);
  const cgap = 28;
  const cw = (W - PAD * 2 - cgap) / cols;
  const rh = (bottom - ly - 14 * (rows - 1)) / rows;
  const segsFor = (it, i) => [
    { text: `${i + 1}  ${it.name}`, font: sans, size: 28, color: i === at ? T.accent : T.fg, lead: 1.08, gap: 6, maxLines: 2 },
    { text: it.line, font: serif, size: 24, color: T.body, lead: 1.2, maxLines: 3 },
  ];
  let sc = 1.2;
  while (sc > 0.82 && !list.every((it, i) => fitsAt(ctx, segsFor(it, i), cw, rh, sc))) sc -= 0.03;
  list.forEach((it, i) => drawBlock(ctx, segsFor(it, i), PAD + (i % cols) * (cw + cgap), ly + Math.floor(i / cols) * (rh + 14), cw, rh, { maxScale: sc, minScale: sc, valign: 'top' }));
}

// ---------------------------------------------------------------- path: a journey with turning points

function path(ctx, c, top, bottom, { T }) {
  const list = c.items.slice(0, 5);
  const n = list.length;
  const rh = (bottom - top) / n;
  // The road winds down its own lane on the left; the words never sit on it.
  const lane = [PAD + 40, PAD + 190];
  const pts = list.map((_, i) => ({ x: lane[i % 2], y: top + rh * (i + 0.5) }));
  const road = () => {
    ctx.beginPath();
    ctx.moveTo(pts[0].x, top);
    ctx.lineTo(pts[0].x, pts[0].y);
    pts.forEach((p, i) => {
      if (!i) return;
      const q = pts[i - 1];
      ctx.bezierCurveTo(q.x, q.y + rh * 0.55, p.x, p.y - rh * 0.55, p.x, p.y);
    });
  };
  ctx.strokeStyle = alpha(T.deep, 0.1);
  ctx.lineWidth = 44;
  ctx.lineCap = 'round';
  road();
  ctx.stroke();
  ctx.strokeStyle = T.accent;
  ctx.lineWidth = 4;
  ctx.setLineDash([14, 12]);
  road();
  ctx.stroke();
  ctx.setLineDash([]);
  const hl = highlight(T);
  const x = PAD + 270;
  const w = W - PAD - x;
  const segsFor = (it) => [
    { text: it.name, font: sans, size: 30, color: T.fg, lead: 1.08, gap: 6, maxLines: 2 },
    { text: it.line, font: serif, size: 24, color: T.body, lead: 1.2, maxLines: 3 },
  ];
  let sc = 1.15;
  while (sc > 0.82 && !list.every((it) => fitsAt(ctx, segsFor(it), w, rh - 16, sc))) sc -= 0.03;
  list.forEach((it, i) => {
    const p = pts[i];
    ctx.fillStyle = T.ground;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 40, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = hl.fill;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 32, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = display(36);
    ctx.fillStyle = hl.fg;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(i + 1), p.x, p.y + 2);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    // A short rule from the milestone to its words.
    ctx.fillStyle = T.rule;
    ctx.fillRect(p.x + 46, p.y - 1, x - 16 - (p.x + 46), 2);
    drawBlock(ctx, segsFor(it), x, p.y - rh / 2 + 8, w, rh - 16, { maxScale: sc, minScale: sc });
  });
}

// ---------------------------------------------------------------- entry

const DRAW = { framework, paths, myths, stages, lessons, pillars, grid, quadrant, cycle, questions, statement, iceberg, scale, staircase, dial, path };

/**
 * @param {{ layout: string, look?: string, kicker?, title, subtitle?, principle?, items?, left_label?, right_label?, columns?, rows?, cells?, x_label?, y_label?, center?, body?, points? }} content
 *   look is a key of LOOKS (lib/ao/infographicLooks.js); a graphic without one draws as it always has.
 * @returns {Promise<{ ok: true, buffer: Buffer } | { ok: false, error: string }>}
 */
export async function renderInfographicPng(content) {
  try {
    ensureFonts();
    const draw = DRAW[content.layout];
    if (!draw) return { ok: false, error: `Unknown layout ${content.layout}` };
    const lookKey = looksFor(content.layout).includes(content.look) ? content.look : defaultLook(content.layout);
    const look = LOOKS[lookKey];
    // A graphic without a mood is the brand family, so older graphics redraw as they were.
    const mood = MOODS[content.mood] ? content.mood : 'brand';
    const T = tokens(mood, look.ground);
    const img = await logo(T.dark);
    F = TYPE[mood];
    const rand = rng(`${content.layout}:${content.title}`);
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = T.ground;
    ctx.fillRect(0, 0, W, H);
    grain(ctx, rand, T.dark);
    ctx.textBaseline = 'top';

    const head = content.layout === 'statement' ? 'kicker' : look.head;
    const top = masthead(ctx, content, { T, rand, head });
    const sigTop = signature(ctx, { T, img });
    const closeTop = closing(ctx, content.principle, sigTop - 8, { T, close: look.close });
    const bottom = content.principle ? closeTop - 44 : sigTop - 20;
    draw(ctx, content, top, bottom, { T, rand });
    return { ok: true, buffer: canvas.toBuffer('image/png') };
  } catch (err) {
    return { ok: false, error: err?.message || String(err) };
  } finally {
    F = TYPE.brand;
  }
}
