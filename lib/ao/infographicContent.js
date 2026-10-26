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

export const LAYOUTS = ['framework', 'paths', 'myths', 'stages', 'lessons', 'pillars', 'grid'];

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
  line: 70,
  move: 45,
  label: 32,
  side: 60,
  myth: 70,
  truth: 120,
  stage_name: 36,
  stage_line: 80,
  action: 60,
  lesson_name: 48,
  point: 55,
  pillar_name: 36,
  pillar_line: 90,
  column: 24,
  cell: 60,
};

const SHAPES = {
  framework: `{
  "kicker": "two to four words naming the subject",
  "title": "the headline, up to ${CAPS.title} characters",
  "subtitle": "one line that sharpens it, up to ${CAPS.subtitle}",
  "items": [ { "name": "the idea, up to ${CAPS.name}", "line": "what it means, up to ${CAPS.line}", "moves": ["two concrete things a leader does, each up to ${CAPS.move}"] } ],
  "principle": "the one line that ties it together, up to ${CAPS.principle}"
}
Three or four items.`,
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
  stages: `{
  "kicker": "two to four words",
  "title": "up to ${CAPS.title}",
  "subtitle": "up to ${CAPS.subtitle}",
  "items": [ { "name": "the stage, up to ${CAPS.stage_name}", "line": "what it looks like at this stage, up to ${CAPS.stage_line}" } ],
  "this_week": ["optional: two or three concrete things to try this week, each up to ${CAPS.action}"],
  "principle": "up to ${CAPS.principle}"
}
Four to seven stages (six or seven only when the piece really has that many; keep each line short), in order: the first is the foundation, the last is the highest. Only use this when the piece really describes a progression where each stage builds on the one before.`,
  lessons: `{
  "kicker": "two to four words",
  "title": "up to ${CAPS.title}",
  "items": [ { "name": "the lesson as a complete statement, up to ${CAPS.lesson_name}", "points": ["two short things that make it true or put it into practice, each up to ${CAPS.point}"] } ],
  "principle": "up to ${CAPS.principle}"
}
Four or five lessons.`,
  pillars: `{
  "kicker": "two to four words",
  "title": "up to ${CAPS.title}",
  "subtitle": "up to ${CAPS.subtitle}",
  "items": [ { "name": "the pillar, up to ${CAPS.pillar_name}", "line": "what it asks of a leader, up to ${CAPS.pillar_line}" } ],
  "principle": "up to ${CAPS.principle}"
}
Six or eight pillars (an even number).`,
  grid: `{
  "kicker": "two to four words",
  "title": "up to ${CAPS.title}",
  "subtitle": "up to ${CAPS.subtitle}",
  "columns": ["three column headings, each up to ${CAPS.column}: the first is the common way, the last is the way the piece argues for"],
  "rows": [ ["one cell per column, each up to ${CAPS.cell}"] ],
  "principle": "up to ${CAPS.principle}"
}
Exactly three columns, and three to five rows. Each row is one situation read across the columns.`,
};

export function contentPrompt(doc, layout, { redoNote = '' } = {}) {
  return `Make one explainer graphic for social media from this piece of Bart Paden's writing. Bart is a business owner and leadership advisor who writes about servant leadership.

THE PIECE: "${doc.title}"
${String(doc.body || '').slice(0, 14000)}

Rules:
- Every idea comes from this piece. Use Bart's own words and phrases where they fit. Do not bring in outside frameworks, famous quotes, or generic leadership advice.
- Power and authority are not the same thing. Power can be positional and can force compliance; authority is earned through care, accountability and consistency. Never call authority positional, never say authority forces compliance, and never set empathy against authority.
- No names of people, clients, companies or programs, even if the piece names them. Tell the lesson, not who it happened to.
- Sentence case for every line (only the first word and proper nouns capitalized).
- Concrete and plain, leader to leader. No hype, no slogans that could be on anyone's poster.
- ${ARCHY_DASH_RULE}
- Never use: ${VOICE_VIOLATIONS.filter((v) => !v.soft).map((v) => `"${v.label}"`).join(', ')}.
- Keep strictly to the character limits. Every line must be a complete thought that fits; anything longer is sent back to you. The caption carries the depth.
${redoNote ? `\nBart asked for a redo with this note. Follow it closely:\n${redoNote}\n` : ''}
Return JSON only:
{
  "graphic": ${SHAPES[layout]},
  "caption": "The post text for Instagram, Facebook and LinkedIn: what this means and why it matters, in Bart's voice, as long as it needs to be (usually a short paragraph or two). Do not repeat the graphic line by line.",
  "caption_x": "A separate post for X, up to 190 characters, complete sentences."
}`;
}

const tidy = (v) => stripProseDashes(String(v ?? '').trim());

/**
 * Pure: the model's answer, held to the layout's shape. Nothing is cut: a
 * field over its limit is reported so the writer shortens it itself. The
 * first samples (2026-10-24) were cut mid-word ("will not be crossed aga").
 * @returns {{ graphic: object|null, tooLong: string[] }}
 */
export function checkGraphic(raw, layout) {
  const g = raw && typeof raw === 'object' ? raw : {};
  const tooLong = [];
  const take = (v, n, label) => {
    const t = tidy(v);
    if (t.length > n) tooLong.push(`${label} (${t.length} characters, limit ${n}): "${t}"`);
    return t;
  };
  const base = { layout, kicker: take(g.kicker, CAPS.kicker, 'kicker'), title: take(g.title, CAPS.title, 'title'), principle: take(g.principle, CAPS.principle, 'principle') };
  if (!base.title) return { graphic: null, tooLong };
  let graphic = null;
  if (layout === 'framework') {
    const items = (Array.isArray(g.items) ? g.items : [])
      .slice(0, 4)
      .map((it, i) => ({
        name: take(it?.name, CAPS.name, `item ${i + 1} name`),
        line: take(it?.line, CAPS.line, `item ${i + 1} line`),
        moves: (Array.isArray(it?.moves) ? it.moves : []).slice(0, 2).map((m, j) => take(m, CAPS.move, `item ${i + 1} move ${j + 1}`)).filter(Boolean),
      }))
      .filter((it) => it.name);
    if (items.length >= 3) graphic = { ...base, subtitle: take(g.subtitle, CAPS.subtitle, 'subtitle'), items };
  } else if (layout === 'paths') {
    const rows = (Array.isArray(g.rows) ? g.rows : [])
      .slice(0, 6)
      .map((r, i) => ({ left: take(r?.left, CAPS.side, `row ${i + 1} left`), right: take(r?.right, CAPS.side, `row ${i + 1} right`) }))
      .filter((r) => r.left && r.right);
    const left_label = take(g.left_label, CAPS.label, 'left label');
    const right_label = take(g.right_label, CAPS.label, 'right label');
    if (rows.length >= 4 && left_label && right_label) graphic = { ...base, subtitle: take(g.subtitle, CAPS.subtitle, 'subtitle'), left_label, right_label, rows };
  } else if (layout === 'myths') {
    const rows = (Array.isArray(g.rows) ? g.rows : [])
      .slice(0, 4)
      .map((r, i) => ({ myth: take(r?.myth, CAPS.myth, `row ${i + 1} myth`), truth: take(r?.truth, CAPS.truth, `row ${i + 1} truth`) }))
      .filter((r) => r.myth && r.truth);
    if (rows.length >= 3) graphic = { ...base, rows };
  } else if (layout === 'stages' || layout === 'pillars') {
    const nc = layout === 'stages' ? [CAPS.stage_name, CAPS.stage_line] : [CAPS.pillar_name, CAPS.pillar_line];
    const word = layout === 'stages' ? 'stage' : 'pillar';
    const items = (Array.isArray(g.items) ? g.items : [])
      .slice(0, layout === 'stages' ? 7 : 8)
      .map((it, i) => ({ name: take(it?.name, nc[0], `${word} ${i + 1} name`), line: take(it?.line, nc[1], `${word} ${i + 1} line`) }))
      .filter((it) => it.name && it.line);
    const ok = layout === 'stages' ? items.length >= 4 : items.length >= 6 && items.length % 2 === 0;
    const extra = {};
    if (layout === 'stages') {
      const actions = (Array.isArray(g.this_week) ? g.this_week : []).slice(0, 3).map((a, j) => take(a, CAPS.action, `this week ${j + 1}`)).filter(Boolean);
      if (actions.length) extra.this_week = actions;
    }
    if (ok) graphic = { ...base, subtitle: take(g.subtitle, CAPS.subtitle, 'subtitle'), items, ...extra };
  } else if (layout === 'lessons') {
    const items = (Array.isArray(g.items) ? g.items : [])
      .slice(0, 5)
      .map((it, i) => ({
        name: take(it?.name, CAPS.lesson_name, `lesson ${i + 1}`),
        points: (Array.isArray(it?.points) ? it.points : []).slice(0, 2).map((p, j) => take(p, CAPS.point, `lesson ${i + 1} point ${j + 1}`)).filter(Boolean),
      }))
      .filter((it) => it.name && it.points.length);
    if (items.length >= 4) graphic = { ...base, items };
  } else if (layout === 'grid') {
    const columns = (Array.isArray(g.columns) ? g.columns : []).slice(0, 3).map((c, j) => take(c, CAPS.column, `column ${j + 1}`));
    const rows = (Array.isArray(g.rows) ? g.rows : [])
      .slice(0, 5)
      .map((row, i) => (Array.isArray(row) ? row : []).slice(0, 3).map((cell, j) => take(cell, CAPS.cell, `row ${i + 1} cell ${j + 1}`)))
      .filter((row) => row.length === 3 && row.every(Boolean));
    if (columns.length === 3 && columns.every(Boolean) && rows.length >= 3) graphic = { ...base, subtitle: take(g.subtitle, CAPS.subtitle, 'subtitle'), columns, rows };
  }
  return { graphic, tooLong };
}

const COUNT_WORDS = { two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8 };

/**
 * Pure: a count in the title that does not match the graphic, or null.
 * The first framework sample said "Three things" over four cards.
 */
export function titleCountMismatch(graphic) {
  if (!graphic) return null;
  const m = String(graphic.title || '').toLowerCase().match(/\b(two|three|four|five|six|seven|eight|[2-8])\b/);
  if (!m) return null;
  const said = COUNT_WORDS[m[1]] || Number(m[1]);
  const shown = (graphic.items || graphic.rows || []).length;
  return said !== shown ? `The title says ${m[1]} but the graphic has ${shown}. Make them match.` : null;
}

/** The graphic, or null when it is missing pieces or anything is over its limit. */
export function normalizeGraphic(raw, layout) {
  const { graphic, tooLong } = checkGraphic(raw, layout);
  return graphic && !tooLong.length ? graphic : null;
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
  // A run has five minutes; drawing and saving need the last one.
  const deadline = Date.now() + 200000;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const left = deadline - Date.now();
    if (left < 45000) break;
    const raw = await complete({ prompt: contentPrompt(doc, layout, { redoNote: note }), task: 'voice', effort: 'medium', maxTokens: 12000, timeoutMs: Math.min(110000, left) });
    const { graphic, tooLong } = checkGraphic(raw?.graphic, layout);
    const caption = tidy(raw?.caption).slice(0, 2200);
    const caption_x = tidy(raw?.caption_x);
    if (caption_x.length > 200) tooLong.push(`caption_x (${caption_x.length} characters, limit 190)`);
    if (!graphic || !caption || !caption_x) {
      console.error(`[infographic] unusable answer for ${doc.slug} (${layout}), attempt ${attempt + 1}`);
      continue;
    }
    const bad = detectVoiceViolations(allText(graphic, caption, caption_x));
    const fixes = [
      titleCountMismatch(graphic) || '',
      tooLong.length ? `These were over their limits. Rewrite each to fit as a complete thought, do not just cut words:\n- ${tooLong.join('\n- ')}` : '',
      bad.length ? `Your last draft used banned phrasing: ${bad.map((b) => b.label).join(', ')}. Rewrite without it.` : '',
    ].filter(Boolean);
    if (fixes.length) {
      note = [redoNote, ...fixes].filter(Boolean).join('\n');
      continue;
    }
    return { ok: true, graphic, caption, caption_x };
  }
  return { ok: false, error: 'Could not write a clean graphic from that piece this time.' };
}

export { loadKnowledgeDocs, toSourceUrl };
