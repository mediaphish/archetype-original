/**
 * The words for an infographic post, from one of Bart's published pieces.
 *
 * Bart, 2026-10-24: "Start working on this as another Quote Card style content
 * generator. These I will want to approve. Don't copy them. They are for
 * inspiration only." The examples he shared belong to other people and are
 * never given to the model; it only sees his own piece.
 *
 * One graphic comes from one piece, so the idea holds together and the post
 * can point to where it came from. Every field has a length cap so the text
 * fits the layout (lib/ao/infographicCanvas.js), and every word is checked
 * against his voice rules before it can reach the Queue.
 */

import { completeJson } from './textModel.js';
import { loadKnowledgeDocs, toSourceUrl } from './corpusPullQuotes.js';
import { stripProseDashes, ARCHY_DASH_RULE } from './archyVoice.js';
import { detectVoiceViolations, VOICE_VIOLATIONS } from './voiceGuardrails.js';

export const LAYOUTS = ['framework', 'paths', 'myths'];

/** Pieces that can carry a graphic: published journal entries and the book's chapters. */
export function eligibleSources(docs, usedSlugs = new Set(), today = new Date().toISOString().slice(0, 10)) {
  return (docs || []).filter((d) => {
    const status = d.status || 'published';
    const live =
      (d.type === 'journal-post' && status === 'published') || ((d.type === 'chapter' || d.type === 'preface') && (status === 'final' || status === 'published'));
    const dated = !d.publish_date || String(d.publish_date).slice(0, 10) <= today;
    return live && dated && !usedSlugs.has(d.slug) && String(d.body || '').length > 1500 && toSourceUrl(d.slug, d.type, d);
  });
}

/** Servant leadership pieces first (Bart: "focus on real servant leadership"), then the rest. */
export function rankSources(docs) {
  const score = (d) => {
    const tags = (d.tags || []).map((t) => String(t).toLowerCase());
    const text = `${d.title} ${d.summary || ''}`.toLowerCase();
    return (tags.includes('servant-leadership') ? 3 : 0) + (/servant|authority|trust|accountab|power/.test(text) ? 2 : 0) + (tags.includes('leadership') ? 1 : 0);
  };
  return [...docs].sort((a, b) => score(b) - score(a));
}

const CAPS = {
  kicker: 32,
  title: 60,
  subtitle: 90,
  principle: 110,
  name: 40,
  line: 90,
  move: 60,
  label: 32,
  side: 70,
  myth: 80,
  truth: 140,
};

const SHAPES = {
  framework: `{
  "kicker": "two to four words naming the subject",
  "title": "the headline, up to ${CAPS.title} characters",
  "subtitle": "one line that sharpens it, up to ${CAPS.subtitle}",
  "items": [ { "name": "the idea, up to ${CAPS.name}", "line": "what it means, up to ${CAPS.line}", "moves": ["two or three concrete things a leader does, each up to ${CAPS.move}"] } ],
  "principle": "the one line that ties it together, up to ${CAPS.principle}"
}
Three to five items.`,
  paths: `{
  "kicker": "two to four words",
  "title": "up to ${CAPS.title}",
  "subtitle": "up to ${CAPS.subtitle}",
  "left_label": "the way the piece argues against, up to ${CAPS.label}",
  "right_label": "the way the piece argues for, up to ${CAPS.label}",
  "rows": [ { "left": "up to ${CAPS.side}", "right": "up to ${CAPS.side}" } ],
  "principle": "up to ${CAPS.principle}"
}
Four to six rows. Each row is the same situation seen both ways.`,
  myths: `{
  "kicker": "two to four words",
  "title": "up to ${CAPS.title}",
  "rows": [ { "myth": "what people commonly believe, up to ${CAPS.myth}", "truth": "what the piece shows instead, up to ${CAPS.truth}" } ],
  "principle": "up to ${CAPS.principle}"
}
Three to four rows.`,
};

export function contentPrompt(doc, layout, { redoNote = '' } = {}) {
  return `Make one explainer graphic for social media from this piece of Bart Paden's writing. Bart is a business owner and leadership advisor who writes about servant leadership.

THE PIECE: "${doc.title}"
${String(doc.body || '').slice(0, 14000)}

Rules:
- Every idea comes from this piece. Use Bart's own words and phrases where they fit. Do not bring in outside frameworks, famous quotes, or generic leadership advice.
- Power and authority are not the same thing. Authority is earned through care, accountability and consistency; never set empathy against authority.
- Concrete and plain, leader to leader. No hype, no slogans that could be on anyone's poster.
- ${ARCHY_DASH_RULE}
- Never use: ${VOICE_VIOLATIONS.filter((v) => !v.soft).map((v) => `"${v.label}"`).join(', ')}.
- Keep to the character limits. Short beats complete here; the caption carries the depth.
${redoNote ? `\nBart asked for a redo with this note. Follow it closely:\n${redoNote}\n` : ''}
Return JSON only:
{
  "graphic": ${SHAPES[layout]},
  "caption": "The post text for Instagram, Facebook and LinkedIn: what this means and why it matters, in Bart's voice, as long as it needs to be (usually a short paragraph or two). Do not repeat the graphic line by line.",
  "caption_x": "A separate post for X, up to 200 characters, full sentences."
}`;
}

const clip = (v, n) => stripProseDashes(String(v ?? '').trim()).slice(0, n).trim();

/** Pure: the model's answer, held to the layout's shape and limits, or null. */
export function normalizeGraphic(raw, layout) {
  const g = raw && typeof raw === 'object' ? raw : {};
  const base = { layout, kicker: clip(g.kicker, CAPS.kicker), title: clip(g.title, CAPS.title), principle: clip(g.principle, CAPS.principle) };
  if (!base.title) return null;
  if (layout === 'framework') {
    const items = (Array.isArray(g.items) ? g.items : [])
      .map((it) => ({
        name: clip(it?.name, CAPS.name),
        line: clip(it?.line, CAPS.line),
        moves: (Array.isArray(it?.moves) ? it.moves : []).map((m) => clip(m, CAPS.move)).filter(Boolean).slice(0, 3),
      }))
      .filter((it) => it.name)
      .slice(0, 5);
    return items.length >= 3 ? { ...base, subtitle: clip(g.subtitle, CAPS.subtitle), items } : null;
  }
  if (layout === 'paths') {
    const rows = (Array.isArray(g.rows) ? g.rows : [])
      .map((r) => ({ left: clip(r?.left, CAPS.side), right: clip(r?.right, CAPS.side) }))
      .filter((r) => r.left && r.right)
      .slice(0, 6);
    const left_label = clip(g.left_label, CAPS.label);
    const right_label = clip(g.right_label, CAPS.label);
    return rows.length >= 4 && left_label && right_label ? { ...base, subtitle: clip(g.subtitle, CAPS.subtitle), left_label, right_label, rows } : null;
  }
  if (layout === 'myths') {
    const rows = (Array.isArray(g.rows) ? g.rows : [])
      .map((r) => ({ myth: clip(r?.myth, CAPS.myth), truth: clip(r?.truth, CAPS.truth) }))
      .filter((r) => r.myth && r.truth)
      .slice(0, 4);
    return rows.length >= 3 ? { ...base, rows } : null;
  }
  return null;
}

/** Every string on the graphic and in the captions, for the voice check. */
export function allText(graphic, caption, captionX) {
  const out = [caption, captionX];
  const walk = (v) => {
    if (typeof v === 'string') out.push(v);
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === 'object') Object.values(v).forEach(walk);
  };
  walk(graphic);
  return out.filter(Boolean).join('\n');
}

/**
 * Write one graphic from one piece.
 * @returns {Promise<{ ok: true, graphic, caption, caption_x } | { ok: false, error }>}
 */
export async function writeInfographic(doc, layout, { redoNote = '', complete = completeJson } = {}) {
  let note = redoNote;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const raw = await complete({ prompt: contentPrompt(doc, layout, { redoNote: note }), task: 'voice', maxTokens: 12000, timeoutMs: 150000 });
    const graphic = normalizeGraphic(raw?.graphic, layout);
    const caption = stripProseDashes(String(raw?.caption || '').trim()).slice(0, 2000);
    const caption_x = stripProseDashes(String(raw?.caption_x || '').trim()).slice(0, 200);
    if (!graphic || !caption || !caption_x) {
      console.error(`[infographic] unusable answer for ${doc.slug} (${layout}), attempt ${attempt + 1}`);
      continue;
    }
    const bad = detectVoiceViolations(allText(graphic, caption, caption_x));
    if (bad.length) {
      note = `${redoNote ? `${redoNote}\n` : ''}Your last draft used banned phrasing: ${bad.map((b) => b.label).join(', ')}. Rewrite without it.`;
      continue;
    }
    return { ok: true, graphic, caption, caption_x };
  }
  return { ok: false, error: 'Could not write a clean graphic from that piece this time.' };
}

export { loadKnowledgeDocs, toSourceUrl };
