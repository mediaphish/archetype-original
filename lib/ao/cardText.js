/**
 * Font registration and text measurement for cards.
 *
 * Extracted from generateQuoteCardImage.js, which imports supabase-admin at
 * module scope in order to upload finished cards. That made typesetting
 * unreachable without database credentials: rendering a quote onto a plate has
 * nothing to do with Supabase, but importing the helper threw
 * "supabaseUrl is required" before a single glyph was measured.
 *
 * Everything here is pure — fonts, wrapping, emphasis parsing — so any renderer
 * can use it, and the emphasis rules stay in one place rather than being copied
 * into a second file where the two definitions can drift apart.
 */

import { GlobalFonts } from '@napi-rs/canvas';
import { existsSync } from 'fs';
import { join } from 'path';
import { isTooLongForDisplayFace } from './cardTypography.js';

// Bebas Neue is the card display face, chosen against the reference card Bart
// supplied: at 62px "TOXIC LEADERSHIP" sets 343px wide against Inter's 584px, so
// the claim fits one line instead of wrapping to two.
//
// It has no lowercase. That is fine for a short claim and bad for a long corpus
// pull — forty words of all-caps is a wall. So Inter stays registered and any
// line can opt into it, which is what attribution lines and long quotes should
// do. SIL OFL, license bundled alongside the file.
const FONT_FILES = {
  Bebas: ['BebasNeue-Regular.ttf'],
  Inter: ['Inter-Bold.ttf', 'Inter-Bold.otf', 'inter-bold.ttf'],
  Playfair: ['PlayfairDisplay-BoldItalic.ttf'],
};

export const DISPLAY_FONT = 'Bebas';
export const TEXT_FONT = 'Inter';

let fontRegistered = false;
const registeredFamilies = new Set();

export function ensureFont() {
  if (fontRegistered) return;
  for (const [family, candidates] of Object.entries(FONT_FILES)) {
    for (const filename of candidates) {
      const p = join(process.cwd(), 'public', 'fonts', filename);
      if (existsSync(p)) {
        GlobalFonts.registerFromPath(p, family);
        registeredFamilies.add(family);
        break;
      }
    }
  }
  fontRegistered = true;
  if (!registeredFamilies.has('Inter')) {
    console.warn('[cardText] Inter not found — text may not render');
  }
  if (!registeredFamilies.has('Bebas')) {
    console.warn('[cardText] Bebas Neue not found — falling back to Inter');
  }
}

/**
 * Resolve a font name from a card or line attribute to a registered family.
 * Falls back to Inter when the requested face is unavailable, so a missing font
 * file yields a plainer card rather than an unreadable one.
 */
export function fontFamily(name) {
  const key = String(name || '').trim().toLowerCase();
  const family =
    key === 'inter' ? 'Inter'
    : key === 'playfair' ? 'Playfair'
    : key === 'bebas' || key === 'bebasneue' ? 'Bebas'
    : DISPLAY_FONT;
  return registeredFamilies.has(family) ? family : 'Inter';
}

/**
 * Resolve the family for one line, downgrading the display face when the line is
 * too long for it.
 */
export function lineFontFamily(requested, text) {
  const family = fontFamily(requested);
  if (family === 'Bebas' && isTooLongForDisplayFace(text)) return fontFamily('inter');
  return family;
}

/**
 * Split text on *asterisks* into accented and plain segments.
 *
 * The accent is what puts "TWENTY POINTS APART" in red while the rest of the
 * quote stays off-white, which is the single most recognisable feature of the
 * approved cards.
 */
export function parseEmphasis(text) {
  const out = [];
  const re = /\*([^*]+)\*/g;
  let last = 0;
  let m;
  while ((m = re.exec(String(text || ''))) !== null) {
    if (m.index > last) out.push({ text: text.slice(last, m.index), accent: false });
    out.push({ text: m[1], accent: true });
    last = m.index + m[0].length;
  }
  if (last < String(text || '').length) out.push({ text: text.slice(last), accent: false });
  return out.filter((s) => s.text.length > 0);
}

/**
 * Wrap segmented text, keeping each visual line's segments intact so colour
 * survives the line break.
 */
export function wrapSegments(ctx, segments, maxWidth) {
  const lines = [];
  let current = [];
  let currentText = '';

  for (const seg of segments) {
    // Split on spaces but keep them, so re-joining preserves the original gaps.
    const parts = seg.text.split(/(\s+)/).filter((p) => p !== '');
    for (const part of parts) {
      const candidate = currentText + part;
      if (ctx.measureText(candidate).width > maxWidth && currentText.trim()) {
        lines.push(current);
        current = [];
        currentText = '';
        if (/^\s+$/.test(part)) continue; // do not start a line with the wrapped space
      }
      const lastSeg = current[current.length - 1];
      if (lastSeg && lastSeg.accent === seg.accent) lastSeg.text += part;
      else current.push({ text: part, accent: seg.accent });
      currentText += part;
    }
  }
  if (current.length) lines.push(current);
  return lines.map((segs) => segs.map((x) => ({ ...x, text: x.text })));
}
