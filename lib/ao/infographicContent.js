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
import { borrowedLines, judgeBorrowed } from './infographicOriginality.js';

export const LAYOUTS = ['framework', 'paths', 'myths', 'stages', 'lessons', 'pillars', 'grid', 'quadrant', 'cycle', 'questions', 'statement', 'iceberg', 'scale', 'staircase', 'dial', 'path'];

/**
 * The feeling of a piece decides its colors and type (lib/ao/infographicCanvas.js
 * MOODS). Bart, 2026-11-05: "What color and what design communicates what we
 * want to communicate the best?"
 */
export const MOOD_GUIDE = {
  trust: 'trust, care, serving people, safety, belonging (deep green and gold)',
  standards: 'standards, accountability, earned authority, responsibility (navy and brass)',
  warning: 'warning signs: misuse of power, manipulation, toxic culture, what goes wrong (charcoal and amber)',
  character: 'character, quiet faithfulness, the hidden years, humility, forgiveness (plum and gold)',
  people: 'culture, teams, people working together, everyday workplace life (terracotta and sage)',
  brand: 'urgent conviction, a hard line drawn, a call to act now (red, black and cream)',
};

/** Layouts that set one way against another. Two in a row read as the same graphic (2026-11-05). */
export const CONTRAST_LAYOUTS = ['paths', 'myths', 'grid'];

/**
 * Pieces that can carry a graphic: published journal entries. The book's
 * chapters are memoir, and memoir is never a source (Bart, 2026-10-27:
 * "infographics just don't need a whole lot about me in them").
 */
export function eligibleSources(docs, usedSlugs = new Set(), today = new Date().toISOString().slice(0, 10)) {
  return (docs || []).filter((d) => {
    const status = d.status || 'published';
    const live = d.type === 'journal-post' && status === 'published';
    const dated = !d.publish_date || String(d.publish_date).slice(0, 10) <= today;
    // The era of Bart's story that never goes out is not a source for a graphic (2026-10-27).
    const hisStory = EXIT_ERA_SLUGS.has(d.slug) || personalStoryLines(d.body).length >= PERSONAL_SOURCE_LIMIT;
    return live && dated && !hisStory && !usedSlugs.has(d.slug) && String(d.body || '').length > 1500 && toSourceUrl(d.slug, d.type, d);
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
  axis: 24,
  q_name: 30,
  q_line: 80,
  center: 22,
  step_name: 28,
  step_line: 64,
  question: 90,
  why: 80,
  statement: 70,
  body: 220,
  s_point: 45,
  ice_label: 26,
  ice_above: 48,
  ice_below: 60,
  pan_label: 26,
  pan_item: 56,
  pivot: 20,
  stair_name: 30,
  stair_line: 70,
  dial_end: 18,
  dial_name: 30,
  dial_line: 64,
  dial_note: 30,
  path_name: 34,
  path_line: 80,
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
  quadrant: `{
  "kicker": "two to four words",
  "title": "up to ${CAPS.title}",
  "subtitle": "up to ${CAPS.subtitle}",
  "x_label": "the first quality, as a short phrase that grows from left to right, up to ${CAPS.axis}",
  "y_label": "the second quality, growing from bottom to top, up to ${CAPS.axis}",
  "cells": {
    "both_low": { "name": "what it looks like with little of either, up to ${CAPS.q_name}", "line": "up to ${CAPS.q_line}" },
    "x_only": { "name": "plenty of the first, little of the second, up to ${CAPS.q_name}", "line": "up to ${CAPS.q_line}" },
    "y_only": { "name": "plenty of the second, little of the first, up to ${CAPS.q_name}", "line": "up to ${CAPS.q_line}" },
    "both_high": { "name": "both at once: the way the piece argues for, up to ${CAPS.q_name}", "line": "up to ${CAPS.q_line}" }
  },
  "principle": "up to ${CAPS.principle}"
}
Only use this when the piece really weighs two qualities a leader needs at once (for example care and standards), so each square is a recognizable kind of leader.`,
  cycle: `{
  "kicker": "two to four words",
  "title": "up to ${CAPS.title}",
  "subtitle": "up to ${CAPS.subtitle}",
  "center": "what the loop builds, up to ${CAPS.center}",
  "items": [ { "name": "the step, up to ${CAPS.step_name}", "line": "what happens in it, up to ${CAPS.step_line}" } ],
  "principle": "up to ${CAPS.principle}"
}
Exactly four steps. Only use this when the piece describes something that feeds itself: each step leads to the next and the fourth leads back to the first.`,
  questions: `{
  "kicker": "two to four words",
  "title": "up to ${CAPS.title}",
  "subtitle": "up to ${CAPS.subtitle}",
  "items": [ { "question": "a question a leader can ask about their own leadership, up to ${CAPS.question}", "why": "what the honest answer shows, up to ${CAPS.why}" } ],
  "principle": "up to ${CAPS.principle}"
}
Four or five questions, each one ending in a question mark, each one hard to answer honestly.`,
  statement: `{
  "kicker": "two to four words",
  "title": "the one idea of the piece, said plainly and boldly, up to ${CAPS.statement}",
  "body": "two or three sentences that open the idea up, up to ${CAPS.body}",
  "points": ["exactly three short things it asks of a leader, each up to ${CAPS.s_point}"],
  "principle": "up to ${CAPS.principle}"
}
Short and bold: this one is mostly space and one big line.`,
  iceberg: `{
  "kicker": "two to four words",
  "title": "up to ${CAPS.title}",
  "subtitle": "up to ${CAPS.subtitle}",
  "above_label": "what shows on the surface, up to ${CAPS.ice_label}",
  "above": ["two things people can see, each up to ${CAPS.ice_above}"],
  "below_label": "what sits underneath, up to ${CAPS.ice_label}",
  "below": ["three or four things that really drive it, each up to ${CAPS.ice_below}"],
  "principle": "up to ${CAPS.principle}"
}
Only use this when the piece sets what is visible against a larger hidden part that matters more.`,
  scale: `{
  "kicker": "two to four words",
  "title": "up to ${CAPS.title}",
  "subtitle": "up to ${CAPS.subtitle}",
  "center": "who or what holds both, up to ${CAPS.pivot}",
  "left_label": "the first thing held, up to ${CAPS.pan_label}",
  "left": ["two or three things it asks for, each up to ${CAPS.pan_item}"],
  "right_label": "the second thing held, up to ${CAPS.pan_label}",
  "right": ["two or three things it asks for, each up to ${CAPS.pan_item}"],
  "principle": "up to ${CAPS.principle}"
}
Only use this when the piece says a leader has to carry two things at once, both in full, neither traded for the other.`,
  staircase: `{
  "kicker": "two to four words",
  "title": "up to ${CAPS.title}",
  "subtitle": "up to ${CAPS.subtitle}",
  "items": [ { "name": "the step, up to ${CAPS.stair_name}", "line": "what it looks like, up to ${CAPS.stair_line}" } ],
  "principle": "up to ${CAPS.principle}"
}
Exactly four steps, in order, the first the lowest. Only use this when the piece describes growth that comes one step at a time.`,
  dial: `{
  "kicker": "two to four words",
  "title": "up to ${CAPS.title}",
  "subtitle": "up to ${CAPS.subtitle}",
  "low_label": "the low end of the range, up to ${CAPS.dial_end}",
  "high_label": "the high end, up to ${CAPS.dial_end}",
  "items": [ { "name": "a point on the range, up to ${CAPS.dial_name}", "line": "what it looks like there, up to ${CAPS.dial_line}" } ],
  "most_at": "the number (1 = low end) of the point where most leaders or teams actually sit, as the piece describes",
  "most_note": "a short note for that marker, up to ${CAPS.dial_note}",
  "principle": "up to ${CAPS.principle}"
}
Four or five points, low to high. Only use this when the piece describes a range a leader moves along.`,
  path: `{
  "kicker": "two to four words",
  "title": "up to ${CAPS.title}",
  "subtitle": "up to ${CAPS.subtitle}",
  "items": [ { "name": "the turning point, up to ${CAPS.path_name}", "line": "what happens there, up to ${CAPS.path_line}" } ],
  "principle": "up to ${CAPS.principle}"
}
Four or five turning points, in order. Only use this when the piece follows a journey with moments where things turn.`,
};

/** What each shape is for, so the writer can pick the one that mirrors the idea. */
export const SHAPE_USE = {
  framework: 'three or four ideas around one subject, each with what a leader does',
  paths: 'the way the piece argues against beside the way it argues for, row by row',
  myths: 'common beliefs struck out, each with what is true instead',
  stages: 'a pyramid of stages, each built on the one below',
  lessons: 'four or five lessons, each with how to put it into practice',
  pillars: 'six or eight pillars of equal weight',
  grid: 'a table reading the same situations across three columns',
  quadrant: 'two qualities crossed into four kinds of leader',
  cycle: 'a loop of four steps that feed each other',
  questions: 'hard questions a leader asks about their own leadership',
  statement: 'one bold idea set big, with three short things it asks',
  iceberg: 'what people see on the surface against the larger part underneath',
  scale: 'two things a leader has to carry at once, both in full',
  staircase: 'four steps of growth, one at a time',
  dial: 'a range from low to high, with where most leaders actually sit',
  path: 'a journey with four or five turning points',
};

export function contentPrompt(doc, layout, { redoNote = '' } = {}) {
  const options = Array.isArray(layout) ? layout : [layout];
  return `Make one explainer graphic for social media from this piece of Bart Paden's writing. Bart is a business owner and leadership advisor who writes about servant leadership.

THE PIECE: "${doc.title}"
${String(doc.body || '').slice(0, 14000)}

Rules:
- Every idea comes from this piece. Use Bart's own words and phrases where they fit. Do not bring in outside frameworks, famous quotes, or generic leadership advice.
- Never reuse wording, headings, lists or frameworks from anyone else's infographic, post or course, even ones you remember. If a line sounds like a stock leadership graphic, it is wrong: say it the way this piece says it.
- Power and authority are not the same thing. Power can be positional and can force compliance; authority is earned through care, accountability and consistency. Never call authority positional, never say authority forces compliance, and never set empathy against authority.
- No names of people, clients, companies or programs, even if the piece names them. Tell the lesson, not who it happened to.
- The graphic and the captions present the message of servant leadership and what Archetype Original stands for. Keep Bart in the background: a short line about how he built his company or what he does now is fine when it serves the idea, but the graphic is about the idea, not about him. Never, in any form, mention the years his company was dismantled under him, the sale of a company, a COO role, being let go or pushed out, leaving a company, lawyers, buyouts or dissolutions, the gym and its troubles, or his health giving out. Do not hint at that era either.
- Sentence case for every line (only the first word and proper nouns capitalized).
- Concrete and plain, leader to leader. No hype, no slogans that could be on anyone's poster.
- ${ARCHY_DASH_RULE}
- Never use: ${VOICE_VIOLATIONS.filter((v) => !v.soft).map((v) => `"${v.label}"`).join(', ')}.
- Keep strictly to the character limits. Every line must be a complete thought that fits; anything longer is sent back to you. The caption carries the depth.
${redoNote ? `\nBart asked for a redo with this note. Follow it closely:\n${redoNote}\n` : ''}
${options.length > 1 ? `
Choose the one shape below that best mirrors how this piece's idea works, so a reader understands it before reading a word. Shapes:
${options.map((l) => `- ${l}: ${SHAPE_USE[l]}`).join('\n')}
` : ''}
Choose the mood that best matches what the piece is saying. The colors and type follow it:
${Object.entries(MOOD_GUIDE).map(([k, v]) => `- ${k}: ${v}`).join('\n')}

Return JSON only:
{
${options.length > 1 ? `  "layout": "one of ${options.join(', ')}",
` : ''}  "mood": "one of ${Object.keys(MOOD_GUIDE).join(', ')}",
  "graphic": ${options.length > 1 ? options.map((l) => `(if ${l}) ${SHAPES[l]}`).join('\n  OR ') : SHAPES[options[0]]},
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
  const base = { layout, kicker: take(g.kicker, CAPS.kicker, 'kicker'), title: take(g.title, layout === 'statement' ? CAPS.statement : CAPS.title, 'title'), principle: take(g.principle, CAPS.principle, 'principle') };
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
  } else if (layout === 'quadrant') {
    const q = g.cells && typeof g.cells === 'object' ? g.cells : {};
    const cells = {};
    for (const key of ['both_low', 'x_only', 'y_only', 'both_high']) {
      cells[key] = { name: take(q[key]?.name, CAPS.q_name, `${key} name`), line: take(q[key]?.line, CAPS.q_line, `${key} line`) };
    }
    const x_label = take(g.x_label, CAPS.axis, 'x label');
    const y_label = take(g.y_label, CAPS.axis, 'y label');
    if (x_label && y_label && Object.values(cells).every((cell) => cell.name && cell.line)) graphic = { ...base, subtitle: take(g.subtitle, CAPS.subtitle, 'subtitle'), x_label, y_label, cells };
  } else if (layout === 'cycle') {
    const items = (Array.isArray(g.items) ? g.items : [])
      .slice(0, 4)
      .map((it, i) => ({ name: take(it?.name, CAPS.step_name, `step ${i + 1} name`), line: take(it?.line, CAPS.step_line, `step ${i + 1} line`) }))
      .filter((it) => it.name && it.line);
    const center = take(g.center, CAPS.center, 'center');
    if (items.length === 4 && center) graphic = { ...base, subtitle: take(g.subtitle, CAPS.subtitle, 'subtitle'), center, items };
  } else if (layout === 'questions') {
    const items = (Array.isArray(g.items) ? g.items : [])
      .slice(0, 5)
      .map((it, i) => ({ question: take(it?.question, CAPS.question, `question ${i + 1}`), why: take(it?.why, CAPS.why, `question ${i + 1} why`) }))
      .filter((it) => it.question && it.why);
    if (items.length >= 4) graphic = { ...base, subtitle: take(g.subtitle, CAPS.subtitle, 'subtitle'), items };
  } else if (layout === 'statement') {
    const points = (Array.isArray(g.points) ? g.points : []).slice(0, 3).map((pt, i) => take(pt, CAPS.s_point, `point ${i + 1}`)).filter(Boolean);
    const body = take(g.body, CAPS.body, 'body');
    if (points.length === 3 && body) graphic = { ...base, body, points };
  } else if (layout === 'iceberg') {
    const above = (Array.isArray(g.above) ? g.above : []).slice(0, 3).map((t, i) => take(t, CAPS.ice_above, `above ${i + 1}`)).filter(Boolean);
    const below = (Array.isArray(g.below) ? g.below : []).slice(0, 4).map((t, i) => take(t, CAPS.ice_below, `below ${i + 1}`)).filter(Boolean);
    const above_label = take(g.above_label, CAPS.ice_label, 'above label');
    const below_label = take(g.below_label, CAPS.ice_label, 'below label');
    if (above.length >= 2 && below.length >= 3 && above_label && below_label) graphic = { ...base, subtitle: take(g.subtitle, CAPS.subtitle, 'subtitle'), above_label, above, below_label, below };
  } else if (layout === 'scale') {
    const side = (k) => (Array.isArray(g[k]) ? g[k] : []).slice(0, 3).map((t, i) => take(t, CAPS.pan_item, `${k} ${i + 1}`)).filter(Boolean);
    const left = side('left');
    const right = side('right');
    const center = take(g.center, CAPS.pivot, 'center');
    const left_label = take(g.left_label, CAPS.pan_label, 'left label');
    const right_label = take(g.right_label, CAPS.pan_label, 'right label');
    if (left.length >= 2 && right.length >= 2 && center && left_label && right_label) graphic = { ...base, subtitle: take(g.subtitle, CAPS.subtitle, 'subtitle'), center, left_label, left, right_label, right };
  } else if (layout === 'staircase' || layout === 'path') {
    const [nc, lc, max] = layout === 'staircase' ? [CAPS.stair_name, CAPS.stair_line, 4] : [CAPS.path_name, CAPS.path_line, 5];
    const items = (Array.isArray(g.items) ? g.items : [])
      .slice(0, max)
      .map((it, i) => ({ name: take(it?.name, nc, `step ${i + 1} name`), line: take(it?.line, lc, `step ${i + 1} line`) }))
      .filter((it) => it.name && it.line);
    if (layout === 'staircase' ? items.length === 4 : items.length >= 4) graphic = { ...base, subtitle: take(g.subtitle, CAPS.subtitle, 'subtitle'), items };
  } else if (layout === 'dial') {
    const items = (Array.isArray(g.items) ? g.items : [])
      .slice(0, 5)
      .map((it, i) => ({ name: take(it?.name, CAPS.dial_name, `point ${i + 1} name`), line: take(it?.line, CAPS.dial_line, `point ${i + 1} line`) }))
      .filter((it) => it.name && it.line);
    const low_label = take(g.low_label, CAPS.dial_end, 'low label');
    const high_label = take(g.high_label, CAPS.dial_end, 'high label');
    const most_at = Math.round(Number(g.most_at));
    if (items.length >= 4 && low_label && high_label && most_at >= 1 && most_at <= items.length) {
      graphic = { ...base, subtitle: take(g.subtitle, CAPS.subtitle, 'subtitle'), low_label, high_label, items, most_at, most_note: take(g.most_note, CAPS.dial_note, 'most note') };
    }
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
  const shown = (graphic.items || graphic.rows || graphic.points || []).length;
  // The subtitle too: a cycle sample said "three parts" over four steps (2026-11-05).
  for (const field of ['title', 'subtitle']) {
    const m = String(graphic[field] || '').toLowerCase().match(/\b(two|three|four|five|six|seven|eight|[2-8])\b/);
    if (!m || !shown) continue;
    const said = COUNT_WORDS[m[1]] || Number(m[1]);
    if (said !== shown) return `The ${field} says ${m[1]} but the graphic has ${shown}. Make them match.`;
  }
  return null;
}

/** The graphic, or null when it is missing pieces or anything is over its limit. */
export function normalizeGraphic(raw, layout) {
  const { graphic, tooLong } = checkGraphic(raw, layout);
  return graphic && !tooLong.length ? graphic : null;
}

/**
 * Pure: sentences from the era of Bart's story that never goes out: the
 * years the company was dismantled under him, the sale, being pushed out,
 * the fight over the gym, his health giving out.
 *
 * Bart, 2026-10-27: "We have to be very careful with my story, and
 * infographics just don't need a whole lot about me in them." Then: "We can
 * talk about how we built it, and we can talk about what I'm doing now, but
 * that whole era in there where I got kicked to the curb and had to leave the
 * company and all that fun stuff, that doesn't go out there. It just can't."
 */
const PERSONAL_STORY = [
  /\b(the|a|our|my) sale\b/i,
  /\b(sold|selling) (the|my|our) (company|business|gym|firm|stake)\b/i,
  /\bgyms?\b/i,
  /\b(COO|chief operating officer)\b/,
  /\b(let go|forced out|pushed out|kicked|fired|sidelined|stripped|dismantled|edged out|walked away from)\b/i,
  /\b(attorneys?|lawyers?|dissolution|buyout|severance)\b/i,
  /\b(my|his) (health|body)\b/i,
  /\b(health|body) (gave out|failed|broke)\b/i,
  /\ba (company|business|firm) i (poured|gave|spent)\b/i,
  /\b(could no longer anchor|had to leave|had to walk away)\b/i,
  /\bMidwestern\b/,
  /\bMWI\b|\bMWB\b/,
];

/** The book chapters from that era (2019 to 2025): never a source for a graphic. */
export const EXIT_ERA_SLUGS = new Set([
  'chapter-6-the-cost-of-the-climb',
  'chapter-7-the-bridge',
  'chapter-8-the-fire-after-the-fall',
  'chapter-9-the-bridge',
  'chapter-10-the-rise-of-archetype',
]);

/** A piece with this many sentences from that era is about it, not the message. */
export const PERSONAL_SOURCE_LIMIT = 4;

export function personalStoryLines(text) {
  const sentences = String(text || '')
    .split(/(?<=[.!?])\s+|\n+/)
    .map((x) => x.trim())
    .filter(Boolean);
  return [...new Set(sentences.filter((sentence) => PERSONAL_STORY.some((re) => re.test(sentence))))];
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
export async function writeInfographic(doc, layout, { redoNote = '', complete = completeJson, judge = judgeBorrowed } = {}) {
  let note = redoNote;
  // Several shapes may be offered; once the writer picks one, retries keep it.
  let options = Array.isArray(layout) ? layout : [layout];
  // A run has five minutes; drawing and saving need the last one.
  const deadline = Date.now() + 200000;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const left = deadline - Date.now();
    if (left < 45000) break;
    const raw = await complete({ prompt: contentPrompt(doc, options, { redoNote: note }), task: 'voice', effort: 'medium', maxTokens: 12000, timeoutMs: Math.min(110000, left) });
    const chosen = options.includes(raw?.layout) ? raw.layout : options[0];
    options = [chosen];
    const { graphic, tooLong } = checkGraphic(raw?.graphic, chosen);
    if (graphic) graphic.mood = MOOD_GUIDE[raw?.mood] ? raw.mood : 'brand';
    const caption = tidy(raw?.caption).slice(0, 2200);
    const caption_x = tidy(raw?.caption_x);
    if (caption_x.length > 200) tooLong.push(`caption_x (${caption_x.length} characters, limit 190)`);
    if (!graphic || !caption || !caption_x) {
      console.error(`[infographic] unusable answer for ${doc.slug} (${chosen}), attempt ${attempt + 1}`);
      continue;
    }
    const bad = detectVoiceViolations(allText(graphic, caption, caption_x));
    // Hard rule (Bart, 2026-10-27): infographics carry the message, not his story.
    const personal = personalStoryLines(allText(graphic, caption, caption_x));
    // Hard rule (Bart, 2026-10-25): nothing borrowed from other people's infographics.
    const borrowed = borrowedLines({ graphic, caption, caption_x, source: `${doc.title || ''}\n${doc.body || ''}` });
    const fixes = [
      borrowed.length
        ? `These lines are too close to someone else's published infographic. Rewrite each one in this piece's own words and ideas, not a reworded version of a common leadership graphic:\n- ${borrowed.join('\n- ')}`
        : '',
      personal.length
        ? `These lines tell Bart's personal story or past. Infographics carry the message of servant leadership, not his life. Rewrite each as the idea itself, leader to leader, with nothing about him:\n- ${personal.join('\n- ')}`
        : '',
      titleCountMismatch(graphic) || '',
      tooLong.length ? `These were over their limits. Rewrite each to fit as a complete thought, do not just cut words:\n- ${tooLong.join('\n- ')}` : '',
      bad.length ? `Your last draft used banned phrasing: ${bad.map((b) => b.label).join(', ')}. Rewrite without it.` : '',
    ].filter(Boolean);
    if (!fixes.length) {
      // What a word match cannot see: a line reworded from an example.
      const reworded = await judge({ graphic, caption, source: doc.body || '' }, { timeoutMs: Math.max(10000, Math.min(45000, deadline - Date.now() - 20000)) });
      if (reworded.length) fixes.push(`These lines follow someone else's published infographic too closely. Rewrite each from this piece's own ideas:\n- ${reworded.join('\n- ')}`);
    }
    if (fixes.length) {
      note = [redoNote, ...fixes].filter(Boolean).join('\n');
      continue;
    }
    return { ok: true, graphic, caption, caption_x };
  }
  return { ok: false, error: 'Could not write a clean graphic from that piece this time.' };
}

export { loadKnowledgeDocs, toSourceUrl };
