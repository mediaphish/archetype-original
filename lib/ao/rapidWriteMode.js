/**
 * Rapid Write — recipe mode: structured seeds → short journal posts (Auto v1).
 * @see plan: rapid_write_mode_spec (Cursor plans)
 */

import { getOpenAiKey } from '../openaiKey.js';
import { getVoiceAnchors } from './voiceAnchors.js';
import { buildRapidWriteStyleContext } from './rapidWriteStyleFingerprint.js';

function safeText(v, maxLen = 0) {
  const s = String(v || '').trim();
  if (!s) return '';
  return maxLen ? s.slice(0, maxLen) : s;
}

/** Normalize title for duplicate detection (case/punctuation insensitive). */
export function normalizeRapidWriteTitleKey(title) {
  return String(title || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** True if this title matches any prior title in the batch (normalized). */
export function rapidWriteTitleDuplicatesPrior(title, priorTitles) {
  const k = normalizeRapidWriteTitleKey(title);
  if (!k) return false;
  const arr = Array.isArray(priorTitles) ? priorTitles : [];
  for (const p of arr) {
    const pk = normalizeRapidWriteTitleKey(p);
    if (pk && pk === k) return true;
  }
  return false;
}

/**
 * True if title is an exact duplicate OR a thin variant of a prior title (e.g. "The Cost of Silence"
 * vs "The Cost of Leadership Silence" — same shell, last word repeated).
 */
export function rapidWriteTitleCollidesWithBatch(title, priorTitles) {
  if (rapidWriteTitleDuplicatesPrior(title, priorTitles)) return true;
  const k = normalizeRapidWriteTitleKey(title);
  if (!k || !k.startsWith('the cost of ')) return false;
  const tail = k.slice('the cost of '.length).trim();
  if (tail.length < 2) return false;
  const arr = Array.isArray(priorTitles) ? priorTitles : [];
  for (const p of arr) {
    const pk = normalizeRapidWriteTitleKey(p);
    if (!pk.startsWith('the cost of ')) continue;
    const ptail = pk.slice('the cost of '.length).trim();
    if (!ptail) continue;
    if (tail === ptail) return true;
    const wTail = tail.split(/\s+/).filter(Boolean);
    const wPrior = ptail.split(/\s+/).filter(Boolean);
    if (wTail.length && wPrior.length && wTail[wTail.length - 1] === wPrior[wPrior.length - 1]) {
      const last = wTail[wTail.length - 1];
      if (last.length >= 5 && (wTail.length <= 3 || wPrior.length <= 3)) {
        const shorter = wTail.length <= wPrior.length ? wTail.join(' ') : wPrior.join(' ');
        const longer = wTail.length > wPrior.length ? wTail.join(' ') : wPrior.join(' ');
        if (longer !== shorter && longer.endsWith(` ${shorter}`)) return true;
      }
    }
  }
  return false;
}

/** Sort rw-1 … rw-n so bulk revise applies earlier seeds first (titles accumulate predictably). */
export function sortRapidWriteSeedIds(ids) {
  const arr = Array.isArray(ids) ? [...ids] : [];
  return arr.sort((a, b) => {
    const ma = String(a).match(/^rw-(\d+)$/i);
    const mb = String(b).match(/^rw-(\d+)$/i);
    if (ma && mb) return Number(ma[1]) - Number(mb[1]);
    return String(a).localeCompare(String(b));
  });
}

/** How many batch titles already use the "The Cost of …" headline shell. */
export function countRapidWriteCostOfTitles(priorTitles) {
  const arr = Array.isArray(priorTitles) ? priorTitles : [];
  let n = 0;
  for (const t of arr) {
    if (/^\s*the\s+cost\s+of\b/i.test(String(t || '').trim())) n += 1;
  }
  return n;
}

/**
 * Stock "AI prose" intros: appositive leader setup ("X, known for his…").
 * Checks the start of the body only.
 */
export function rapidWriteBodyHasBannedLeaderIntros(body) {
  const sample = String(body || '').slice(0, 1200);
  return (
    /\b(the\s+)?(leader|director|manager|executive|supervisor),\s+[^.\n]{0,140}\bknown\s+for\b/i.test(sample) ||
    /\b(the\s+)?(leader|director)\s*,\s+a\s+(seasoned|respected|well[- ]respected)\s+[^.\n]{0,100}\bknown\s+for\b/i.test(sample) ||
    /\bat\s+the\s+head\s+of\s+the\s+table\s+sat\s+the\s+[^.\n]{0,120}\bknown\s+for\b/i.test(sample) ||
    /\b(the\s+)?(leader|director|manager|executive),\s*(respected|admired|noted)\s+for\b/i.test(sample) ||
    /\b(the\s+)?(leader|director),\s+a\s+seasoned\s+professional\b/i.test(sample) ||
    /\b(the\s+)?(leader|director),\s+a\s+(well[- ]?respected|respected)\s+figure\b/i.test(sample)
  );
}

/**
 * Reflection questions that share a very long identical prefix read as duplicated workbook prompts.
 */
export function rapidWriteReflectionTooSimilar(newQ, priorQs) {
  const n = normalizeRapidWriteTitleKey(newQ);
  if (n.length < 36) return false;
  const arr = Array.isArray(priorQs) ? priorQs : [];
  for (const p of arr) {
    const pn = normalizeRapidWriteTitleKey(p);
    if (pn.length < 36) continue;
    let i = 0;
    const max = Math.min(n.length, pn.length);
    while (i < max && n[i] === pn[i]) i += 1;
    if (i >= 72) return true;
  }
  return false;
}

/** Max titles per Rapid Write batch that may begin with "The Cost of…" before the next must use another architecture. */
export const RAPID_WRITE_MAX_COST_OF_TITLES_PER_BATCH = 2;

/**
 * Recurring “same play, different noun” spines in the first ~1k chars — counted across the batch.
 * @returns {string[]}
 */
export function rapidWriteDetectScenarioMoldsInLead(body, sampleLen = 1100) {
  const t = String(body || '')
    .slice(0, sampleLen)
    .toLowerCase()
    .replace(/\s+/g, ' ');
  const out = new Set();
  if (
    /\b(in a busy office|clatter of keyboard|sunlit corner of the office|sleek, modern office|office atmosphere|moved through their tasks|office remained|keyboard(s)? often masked)\b/.test(
      t
    )
  ) {
    out.add('corporate_office_interior_open');
  }
  if (
    /\bconference room\b/.test(t) ||
    /\bstrategy meeting\b/.test(t) ||
    /\bmonthly strategy\b/.test(t) ||
    /\bquarterly review\b/.test(t) ||
    /\bgathered for their quarterly\b/.test(t) ||
    (/\b(long, polished table|head of the table|polished surface before him)\b/.test(t) &&
      /\b(meeting|gathered|team|room fell silent|director|managers gathered)\b/.test(t))
  ) {
    out.add('formal_group_meeting_spine');
  }
  if (
    /\b(slides detailing|slides detail|metrics reflected|metrics flashed|flashed on the screen|metrics on the screen)\b/.test(t)
  ) {
    out.add('metrics_or_slides_beat');
  }
  if (/\braised a hand during (a )?meeting\b/.test(t) || /\bsenior analyst.*\braised a hand\b/.test(t)) {
    out.add('meeting_hand_raise_hook');
  }
  return [...out];
}

/** Per-mold caps for one Rapid Write batch (prevents ten near-identical table dramas). */
export const RAPID_WRITE_SCENARIO_MOLD_LIMITS = {
  corporate_office_interior_open: 2,
  formal_group_meeting_spine: 2,
  metrics_or_slides_beat: 2,
  meeting_hand_raise_hook: 2,
};

export function rapidWriteScenarioMoldCountsFromBodies(bodies) {
  const counts = {};
  for (const b of Array.isArray(bodies) ? bodies : []) {
    for (const m of rapidWriteDetectScenarioMoldsInLead(b)) {
      counts[m] = (counts[m] || 0) + 1;
    }
  }
  return counts;
}

/**
 * True if this body reuses a scenario mold that already hit its batch cap in priorBodies.
 */
export function rapidWriteScenarioMoldsExhausted(body, priorBodies, limits = RAPID_WRITE_SCENARIO_MOLD_LIMITS) {
  const counts = rapidWriteScenarioMoldCountsFromBodies(priorBodies);
  const hits = rapidWriteDetectScenarioMoldsInLead(body);
  const reasons = [];
  for (const m of hits) {
    const cap = limits[m];
    if (cap == null) continue;
    if ((counts[m] || 0) >= cap) {
      reasons.push(`${m}: batch already has ${counts[m]} (cap ${cap})`);
    }
  }
  return { exhausted: reasons.length > 0, reasons, hits, counts };
}

export function buildRapidWriteScenarioMoldPromptBlock(priorBodies, limits = RAPID_WRITE_SCENARIO_MOLD_LIMITS) {
  const counts = rapidWriteScenarioMoldCountsFromBodies(priorBodies);
  const keys = Object.keys(counts).filter((k) => counts[k] > 0);
  if (!keys.length) return '';
  const lines = keys.map((k) => `- **${k}** — used in **${counts[k]}** prior draft(s) (batch cap **${limits[k] ?? '—'}**)`);
  const atCap = keys.filter((k) => (limits[k] != null ? counts[k] >= limits[k] : false));
  const forbid =
    atCap.length > 0
      ? `\n**MANDATORY:** These molds are **at quota** — your piece must **not** trigger them in the opening ~1000 words: **${atCap.join(', ')}**. Re-stage the story (different primary site, different narrative engine than “corporate meeting / office keyboard / slides / hand raised in meeting”).\n`
      : '';
  return `\n**Batch scenario spine (readers reject ten copies of the same room):**\n${lines.join('\n')}${forbid}\n`;
}

/** Thin headline shells that stack into sameness (separate from “The Cost of…” quota). */
export const RAPID_WRITE_TITLE_SHELL_RULES = [
  { re: /^\s*the\s+burden\s+of\b/i, max: 1, label: '“The Burden of…”' },
  { re: /^\s*the\s+weight\s+of\b/i, max: 1, label: '“The Weight of…”' },
  { re: /^\s*the\s+paradox\s+of\b/i, max: 1, label: '“The Paradox of…”' },
  { re: /^\s*the\s+price\s+of\b/i, max: 1, label: '“The Price of…”' },
  { re: /^\s*navigating\b/i, max: 1, label: '“Navigating…”' },
];

export function rapidWriteTitleShellQuotaViolated(title, priorTitles, rules = RAPID_WRITE_TITLE_SHELL_RULES) {
  const ti = String(title || '');
  for (const { re, max, label } of rules) {
    if (!re.test(ti)) continue;
    let n = 0;
    for (const p of Array.isArray(priorTitles) ? priorTitles : []) {
      if (re.test(String(p || ''))) n += 1;
    }
    if (n >= max) return { violated: true, label, max, priorCount: n };
  }
  return { violated: false };
}

/**
 * Length band + anti-overwrite rules for Rapid Write generation and precision revision.
 * Narrative voice must stay intact; cuts are editorial, not “make it short by flattening.”
 */
export const RAPID_WRITE_LENGTH_DISCIPLINE = `**Reader (who this is for):**
- Leaders who invest in getting better (time, attention, seriousness)—not drive-by motivation.
- They care how teams actually function and whether growth lasts—not optics hacks or generic “leadership tips.”

**Length and structure (body only):**
- Target **425–575 words**. Going meaningfully **over 600 words** is unacceptable unless the owner explicitly asks for more depth and every added paragraph introduces new, non-redundant substance.
- Do **not** land the core insight and then keep explaining the same point in new paragraphs. That is overwrite, not depth. Cut or merge paragraphs that restate the same emotional, psychological, or conceptual move; keep the strongest version.
- Each paragraph should add a **new layer** (deeper observation, sharper example, clearer psychological impact, or more tension). If a paragraph only reinforces what the reader already feels, remove it or merge it by trimming repeated clauses inside existing paragraphs—not by breaking prose into stacked short lines.
- Stay **narrative-first**: natural paragraph structure, professional authoritative AO tone. Do not shift to social-style pacing, one-line paragraphs for effect, or repetitive sentence molds. Do not “compress visually” with fragments.

**Voice (adaptive, not universal):**
- Match the **Archetype Original** voice implied by the corpus fingerprint and passage notes supplied separately. Formality, heat, and lyricism follow **this story’s** needs—do not force one template across all posts.
- **Teaching / how-to voice** is allowed only when the story clearly calls for it—never condescending, never talking down to the reader.

**Register (anti-feed, anti-generic):**
- No emojis. No “tip of the day” framing or numbered life-lesson stacks in the body unless the story genuinely needs a short list.
- Avoid throat-clearing cadences and padding (“here’s the thing,” “let me be clear,” rhetorical triples used as filler).
- Do not open with a **detached aphorism** that could headline any leadership post; ground the opening in **specific observation or scene** tied to this seed.
- Calibrate **intensity** to subject matter and stakes—some stories need heat; others need quiet authority. Do not default everything to the same emotional volume.

**Story settings and names (privacy + craft):**
- **Industry default:** Do **not** default to software engineering, tech startups, or coding-centric workplaces unless the seed **explicitly** calls for that context. Prefer generic organization language (“a growing company,” “a team under real pressure”) or **other sectors** that still fit the psychology. If the story *is* set in tech, avoid stacking **recognizable** signals (sprints, standups, tickets, repos, “the engineer who…”) unless the seed requires them—those details invite readers to wonder whether real people or their workplace are being described.
- **Names:** Keep narrative-first scenes. **Do not reuse any first name** listed under “Already used in this batch” in the instructions—those names are **reserved** to other posts in this run. If the list is long, prefer **role-only** labels (“her peer,” “the director”) over inventing new names. Within **one** post: **at most one or two** named people unless the story truly needs more; do **not** reuse the same first name for different roles in one piece. Names are **illustrative fiction**. A **continuing** character arc across multiple posts only when the owner runs a **labeled series**; otherwise each post is **standalone**.

**Anti-formula (do not default to the same arc every time):**
- **Banned default arc** (unless the seed *requires* resolution): trouble appears → leader “steps up” → **one big meeting** fixes the emotional center → **peace returns** → tidy lesson. That reads as a template; readers will tune out.
- **Vary structure:** at least one of—**unresolved** cost at the end, **partial** fix only, leader **misread** the situation, damage that **outlasts** the scene, **no meeting** as the turning beat (corridor, message, silence, small choice that fails), or consequence **without** a bow.
- Do not lean on “the moment everything changed” / “turning point” / grand rally unless earned and specific.

**Banned stock phrases (do not use in the body):** elephant in the room; **hum of** (any noun—computers, activity, conversation, etc.—this cadence is a crutch); modest office space where the hum of computers; bustling office on the edge of; palpable tension hanging in the air (as a repeated crutch—if tension matters, show it without this exact device every time).

**Default stock scenes (avoid unless the assigned story pattern explicitly requires a formal group setting):** opening or centering the spine on a **conference room**, **executive table**, **weekly check-in**, **team gathered** for a presentation, or **director addresses the room** as the main emotional stage. Those defaults produce batch sameness—use the assigned pattern’s stage instead.

**Anti–“model prose” (mandatory—read as failure if violated):**
- **Banned leader intros:** Do **not** introduce a leader/director with an appositive “**, known for his/her/their …**” or “**The leader, a seasoned/respected … known for …**” or “**At the head of the table sat the director, known for …**.” Those sentence molds read as synthetic and repeat across batches. Reveal competence through **action, dialogue, or concrete detail**, not résumé phrasing in the first lines.
- **Banned résumé openers:** Avoid “**a [role] known for**,” “**a well-respected figure known for**,” “**a respected figure known for**” in the opening **two paragraphs**. Same rule: show, don’t credential-stuff.
- **Opening variety:** Do not start the body with the same **syntactic mold** as another post in this batch (e.g. multiple pieces beginning “In a [room], …” + “The leader…” in the same run). If the batch list includes openings, yours must diverge in **setting + grammar**, not just noun swaps.

**Within one “Run all” batch (when batch lists below are non-empty):**
- This post must be **standalone**: a different **concrete situation**, **narrative spine**, and **closing move** from every other post already listed (titles, openings, closings, reflection shapes, snippets).
- **Title:** must **not** duplicate any title under “Titles already used in this batch” (**including** same words with different punctuation or casing). **No two posts in one batch may share the same normalized title.**
- **“The Cost of…” quota:** If the instructions include a **mandatory headline quota** line, obey it exactly. Otherwise: treat **“The Cost of [X]”** as a **scarce** shell—when several titles in the batch already use it, your title must use a **different architecture** (scene-first title, tension line, two-word stake, named moment—**not** another “The Cost of…” variant).
- **Do not** mirror another post’s **assigned story pattern** (each seed gets its own pattern slot—honor yours only).
- **Middle and conclusion:** do not recycle the same **beat sequence** or **resolution type** implied by the closing excerpts listed (e.g. multiple “leader finally sees / small meeting fixes it / journey continues” closers).
- **Scenario spine (not cosmetic):** If **batch scenario usage** appears in the instructions, those counts are **real caps** on how many pieces may open with the same corporate-office keyboard scene, formal conference-table / strategy-meeting spine, metrics/slides beat, or “hand raised in a meeting” beat. Hitting quota means you must **move the story**—different primary location, different pressure source, different narrative engine—not the same room with a swapped adjective.

**Closing (body):**
- Earn the ending with **human weight**—not a recap-as-closer.
- **Rewrite triggers** (unless clearly earned and grounded in the story): ending by **summarizing** the thesis; **re-stating** the same idea in softer words; **motivational uplift** not earned by the narrative; **generic leadership closer** phrasing.
- Prefer endings that feel **honest and specific** to the scene you built—sometimes quiet clarity, sometimes unresolved tension—without pivoting into advice columns.

**Reflection question (one sentence):**
- Must be **grounded in this post’s specific story**, not detachable boilerplate.
- **Avoid:** checklist / “what steps can leaders take…” framing; **generic** questions that could fit any post; **overly safe** questions that avoid real tension; **advice disguised as a question**; a question **detached** from what the reader just read.
- **Avoid repeated stems** across posts: do **not** default to **“How can you…”**, **“How would you bring peace…”**, or “your team” workbook prompts. If the instructions list **reflection questions already used in this batch**, do **not** mirror their **shape, length, or template** (swapping “your team” for “this group” is not enough—change the *kind* of question).
- **Near-duplicate questions fail:** Do **not** reuse the same **long opening phrase** as another post’s reflection question in this batch (e.g. two questions that begin with the same 8–12 words). Change the **grammatical shape** (not just the last noun).
- **Prefer:** naming the **specific** tension, tradeoff, or cost from **this** narrative—without sounding like a workbook.`;

/** Count of distinct mandatory story patterns (first N indices in a batch are unique modulo this length). */
export const RAPID_WRITE_STORY_PATTERN_COUNT = 12;

const RAPID_WRITE_STORY_PATTERNS = [
  `**Assigned story pattern (mandatory—the whole piece must obey): Pattern 1 — Threshold / passage**
- **Stage:** doorways, hallways, handoff moments, two people crossing paths—not a conference table as the spine.
- **Consciousness:** one focal consciousness or a tight two-person thread; not “the whole team in a room.”
- **Tension:** what is unsaid in passing; **no** single speech that fixes the emotional center.
- **Close:** cost remains vivid; avoid tidy lesson or “peace returns.”`,

  `**Assigned story pattern (mandatory—the whole piece must obey): Pattern 2 — Aftermath / residue**
- **Stage:** days or weeks later; evidence in rhythm, silence, or small habits—not a flashback meeting that carries the whole arc.
- **Consciousness:** collective “they” or steady third person on the group’s weather.
- **Tension:** what lingers when the crisis slide is gone.
- **Close:** unresolved or partial; **no** director speech that wraps it.`,

  `**Assigned story pattern (mandatory—the whole piece must obey): Pattern 3 — Compressed interior**
- **Stage:** one leader’s mind under pressure (commute, wakeful night, short walk)—**not** a convened meeting.
- **Consciousness:** interior perception; dialogue minimal or absent.
- **Tension:** self-justification vs. dawning doubt.
- **Close:** decision deferred or half-taken; avoid rally or pep-turn.`,

  `**Assigned story pattern (mandatory—the whole piece must obey): Pattern 4 — Misread stands**
- **Stage:** any setting except default conference-table spine.
- **Consciousness:** reader sees the gap; leader’s read may stay wrong or shallow.
- **Tension:** no earned redemption beat; **no** “everything clicked” closure.
- **Close:** irony or quiet wrong-footedness, not correction-as-lesson.`,

  `**Assigned story pattern (mandatory—the whole piece must obey): Pattern 5 — External pressure bleeds in**
- **Stage:** client site, audit window, board packet, regulator clock, public deadline—pressure **from outside** the team circle.
- **Consciousness:** team or leader caught between outside demand and inside psychology.
- **Tension:** not solvable in one internal meeting.
- **Close:** structural weight, not interpersonal hug.`,

  `**Assigned story pattern (mandatory—the whole piece must obey): Pattern 6 — Written trace**
- **Stage:** calendar titles, subject lines, comment threads, version notes, chat logs—**artifacts** carry the story.
- **Consciousness:** close reading of what people wrote and avoided writing.
- **Tension:** meaning in what was edited out or left hanging.
- **Close:** paper (or screen) truth; avoid cinematic table confrontation as climax.`,

  `**Assigned story pattern (mandatory—the whole piece must obey): Pattern 7 — Field / floor / site**
- **Stage:** warehouse, clinic floor, service bay, retail floor, loading dock—**not** the executive suite as default.
- **Consciousness:** embodied pace, noise, bodies, time windows.
- **Tension:** dignity and fatigue under real operating conditions.
- **Close:** ground-level cost; no abstract leadership seminar wrap.`,

  `**Assigned story pattern (mandatory—the whole piece must obey): Pattern 8 — Dyad without hero director**
- **Stage:** two peers or manager-and-peer; **no** omniscient narrator fixing them through a speech.
- **Consciousness:** tilted toward one side’s partial view.
- **Tension:** rivalry, credit, or silence between two—not “room applauds clarity.”
- **Close:** relationship still strained or unfinished.`,

  `**Assigned story pattern (mandatory—the whole piece must obey): Pattern 9 — Silence as the scene**
- **Stage:** pauses, withheld replies, meetings where the real topic never lands.
- **Consciousness:** attention to who does **not** speak and what is dodged.
- **Tension:** **forbidden:** breakthrough confession that solves tone-reading in one beat.
- **Close:** silence still costly; question hangs.`,

  `**Assigned story pattern (mandatory—the whole piece must obey): Pattern 10 — Handoff / shift edge**
- **Stage:** night handoff, weekend coverage, shift change, notes left for the next crew.
- **Consciousness:** continuity and dropped batons across time seams.
- **Tension:** what the previous shift knew and the next inherits blind.
- **Close:** seam stays visible; not one heroic sync meeting.`,

  `**Assigned story pattern (mandatory—the whole piece must obey): Pattern 11 — Semi-public sting**
- **Stage:** correction, praise-withdrawal, or mixed signal in a **semi-public** moment (huddle, open floor, copied thread).
- **Consciousness:** witness and face; reputation as object.
- **Tension:** humiliation or ambiguity **with witnesses**; not private office closure only.
- **Close:** social cost, not private debrief lesson.`,

  `**Assigned story pattern (mandatory—the whole piece must obey): Pattern 12 — Domestic or private mirror (light touch)**
- **Stage:** kitchen table, car, insomnia, family text thread—**parallel** pressure that mirrors org psychology without preaching parallel.
- **Consciousness:** intimate third; keep professional stakes legible.
- **Tension:** one private choice echoes work pattern.
- **Close:** quiet parallel, not “and therefore leadership lesson.”`,
];

/**
 * Deterministic story-pattern assignment for batch position `batchIndex` (0 = first draft in this run).
 * First twelve indices cycle through all patterns; index 12 wraps with orthogonal emphasis via pattern text variety.
 */
export function rapidWriteStoryPatternForBatchIndex(batchIndex) {
  const i = Math.max(0, Math.floor(Number(batchIndex) || 0));
  return RAPID_WRITE_STORY_PATTERNS[i % RAPID_WRITE_STORY_PATTERNS.length];
}

const RAPID_WRITE_REVISE_SYSTEM = `You are the Editor for Archetype Original Rapid Write. Reply with JSON only.

Apply **precision editing**: remove redundancy and overwrite while preserving narrative quality, voice, and paragraph flow. This is not simplification. Do not break paragraphs into stacked sentences. Do not convert long-form prose into short-form or “AI cadence.” Edit inside paragraphs when merging ideas. Enforce closing and reflection-question rules in the discipline below (fix summary closes, generic closers, weak questions, feed-voice).

**Hard failures (your JSON must not violate these):** duplicate or colliding titles vs other drafts in the batch, “The Cost of…” and other **headline-shell** quotas when listed, **scenario-mold** quotas (same office/meeting/metrics spine repeated across the batch), banned résumé-style leader intros (including “respected for / noted for / seasoned professional” molds), near-duplicate reflection questions. If a retry instruction appears, fix those issues completely.

${RAPID_WRITE_LENGTH_DISCIPLINE}

If the owner's instruction explicitly asks only to expand or add new material, honor that while still avoiding redundant paragraphs. If they ask to tighten length, bring the body into the 425–575 band using the rules above.`;

const RAPID_WRITE_POLISH_SYSTEM = `You are the Register Editor for Archetype Original Rapid Write. Reply with JSON only.

Raise prose register for **serious professionals**: cut social-feed cadence, generic uplift, worksheet tone, and “AI influencer” phrasing. Do **not** change the core argument, seed alignment, or psychological DNA. Preserve narrative paragraph flow unless a merge clearly improves quality. Keep length roughly in the 425–575 band unless trimming for voice requires a modest exception.

${RAPID_WRITE_LENGTH_DISCIPLINE}`;

/** First line activates; body is freeform seed list (interpreted by guardrails), not a required JSON shape. */
export function wantsRapidWriteActivation(text) {
  const raw = String(text || '').trim();
  if (!raw) return false;
  const first = raw.split('\n')[0].trim();
  return /^\s*rapid\s+write\b/i.test(first) || /^\s*rapid\s+write\s*:/i.test(first);
}

/** Everything after the first line (the Rapid Write trigger). */
export function stripRapidWriteHeader(text) {
  const raw = String(text || '');
  const lines = raw.split('\n');
  if (!lines.length) return '';
  if (/^\s*rapid\s+write\b/i.test(lines[0].trim())) {
    return lines.slice(1).join('\n').trim();
  }
  return raw.trim();
}

export function wantsExitRapidWrite(text) {
  const s = String(text || '').trim().toLowerCase();
  return /^(exit\s+rapid\s+write|end\s+rapid\s+write\s+mode)\b/.test(s) || /^end\s+rapid\s+write\s+mode\b/.test(s);
}

/** Spec: message starts with Agent Training or Agent Training: */
export function wantsRapidWriteAgentTraining(text) {
  const raw = String(text || '').trim();
  if (!raw) return false;
  const first = raw.split('\n')[0].trim();
  return /^agent\s+training\s*$/i.test(first) || /^agent\s+training\s*:/i.test(first);
}

export function extractAgentTrainingBody(text) {
  const raw = String(text || '').trim();
  const lines = raw.split('\n');
  if (lines.length < 2 && !/^agent\s+training\s*:/i.test(lines[0] || '')) return '';
  if (/^agent\s+training\s*$/i.test(lines[0]?.trim() || '')) {
    return lines.slice(1).join('\n').trim();
  }
  if (/^agent\s+training\s*:/i.test(lines[0] || '')) {
    return lines[0].replace(/^agent\s+training\s*:\s*/i, '').trim() + (lines.length > 1 ? `\n${lines.slice(1).join('\n')}` : '');
  }
  return '';
}

function normalizeSeedObject(o, index) {
  const id = safeText(o.id, 80) || `rw-${index + 1}`;
  const core_idea = safeText(o.core_idea, 4000);
  const leadership_category = safeText(o.leadership_category, 200);
  const psychological_outcome = safeText(o.psychological_outcome, 200);
  const real_world_context = safeText(o.real_world_context, 4000);
  const research_notes = safeText(o.research_notes, 8000);
  const insight_anchor = safeText(o.insight_anchor, 2000);
  const new_angle = safeText(o.new_angle, 2000);
  if (!core_idea || !leadership_category || !psychological_outcome) return null;
  return {
    id,
    core_idea,
    leadership_category,
    psychological_outcome,
    real_world_context,
    research_notes,
    insight_anchor,
    new_angle,
  };
}

/**
 * Optional: parse JSON array from fenced block or `[...]` in text (power users / tooling).
 */
export function parseRapidWriteSeedsJson(text) {
  const raw = String(text || '');
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fence ? fence[1].trim() : raw;
  let jsonStr = candidate;
  const arrStart = candidate.indexOf('[');
  const arrEnd = candidate.lastIndexOf(']');
  if (arrStart >= 0 && arrEnd > arrStart) jsonStr = candidate.slice(arrStart, arrEnd + 1);
  try {
    const parsed = JSON.parse(jsonStr);
    if (!Array.isArray(parsed)) return { ok: false, seeds: [], error: 'Expected a JSON array of seed objects.' };
    const seeds = [];
    for (let i = 0; i < parsed.length; i += 1) {
      const o = parsed[i];
      if (!o || typeof o !== 'object') continue;
      const n = normalizeSeedObject(o, i);
      if (!n) {
        return {
          ok: false,
          seeds: [],
          error: `Seed ${safeText(o.id, 80) || i + 1}: core_idea, leadership_category, and psychological_outcome are required.`,
        };
      }
      seeds.push(n);
    }
    if (!seeds.length) return { ok: false, seeds: [], error: 'No valid seed objects in the JSON array.' };
    return { ok: true, seeds, error: '' };
  } catch (e) {
    return { ok: false, seeds: [], error: `Could not parse JSON: ${e.message || e}` };
  }
}

/**
 * Turn freeform pasted list (bullets, numbers, paragraphs) into structured seeds — **system responsibility**, not user formatting rules.
 */
export async function extractRapidWriteSeedsFromFreeform(paste) {
  const apiKey = getOpenAiKey();
  const body = String(paste || '').trim();
  if (!body) return { ok: false, seeds: [], error: 'Add your seed list below the first line (Rapid Write).' };
  if (!apiKey) {
    return {
      ok: false,
      seeds: [],
      error:
        'Freeform seed lists need the AI interpreter on the server. If you see this often, ask your technical owner to confirm the AI key for Auto.',
    };
  }

  const user = `The owner pasted a list of content seeds for "Psychological Cost of Leadership" style posts (roughly **425–575 words** when drafted—narrative, not padded). Infer one seed per distinct idea. The paste may be bullets, numbers, paragraphs, or messy notes — do not require a specific format.

Paste:
---
${body.slice(0, 48000)}
---

Return JSON only:
{"seeds":[{"id":"rw-1","core_idea":"string","leadership_category":"string","psychological_outcome":"string","real_world_context":"string","research_notes":"string","insight_anchor":"string","new_angle":"string"}]}

Rules:
- core_idea: the main claim or angle for that post.
- leadership_category: e.g. Inconsistent Leadership, Avoidant Leadership, Transactional Leadership, Overcontrol — or a short label that fits the paste.
- psychological_outcome: e.g. Anxiety, Burnout, Resentment — or a short label that fits.
- real_world_context, research_notes: use "" if unknown; infer lightly from context when obvious.
- insight_anchor: what is new or differentiated vs repeating old ground (required string; use best guess).
- new_angle: optional extra line if helpful.
- id: rw-1, rw-2, … in order.
- Maximum 100 seeds; if more ideas, take the clearest distinct items first.`;

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: process.env.AO_AUTO_RAPID_WRITE_EXTRACT_MODEL || 'gpt-4o-mini',
        temperature: 0.2,
        max_tokens: 8000,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'You extract structured Rapid Write seeds from unstructured paste. JSON only. Archetype Original — servant leadership, diagnostic tone.',
          },
          { role: 'user', content: user },
        ],
      }),
    });
    if (!res.ok) return { ok: false, seeds: [], error: 'Could not interpret seeds (request failed).' };
    const json = await res.json().catch(() => ({}));
    const content = json.choices?.[0]?.message?.content?.trim() || '';
    const parsed = JSON.parse(content);
    const arr = Array.isArray(parsed.seeds) ? parsed.seeds : [];
    const seeds = [];
    for (let i = 0; i < arr.length; i += 1) {
      const n = normalizeSeedObject(arr[i], i);
      if (n) seeds.push(n);
    }
    if (!seeds.length) return { ok: false, seeds: [], error: 'Could not infer any seeds from that paste. Try adding clearer one-idea-per-block spacing.' };
    return { ok: true, seeds, error: '' };
  } catch (e) {
    return { ok: false, seeds: [], error: `Could not interpret seeds: ${e.message || e}` };
  }
}

/**
 * Prefer JSON if present; otherwise interpret freeform paste (guardrails).
 */
export async function parseOrExtractRapidWriteSeeds(fullMessage) {
  const stripped = stripRapidWriteHeader(fullMessage);
  const tryText = stripped || fullMessage;

  const jsonFromStripped = parseRapidWriteSeedsJson(tryText);
  if (jsonFromStripped.ok && jsonFromStripped.seeds.length) {
    return { ...jsonFromStripped, source: 'json' };
  }

  const jsonFromFull = parseRapidWriteSeedsJson(fullMessage);
  if (jsonFromFull.ok && jsonFromFull.seeds.length) {
    return { ...jsonFromFull, source: 'json' };
  }

  return { ...(await extractRapidWriteSeedsFromFreeform(tryText)), source: 'freeform' };
}

/**
 * User wants to draft every seed in the current Rapid Write batch (paraphrases included).
 */
export function wantsRunAllSeeds(text) {
  const raw = String(text || '').trim();
  const s = raw.toLowerCase();
  if (/\b(run all seeds|generate all|write all|process all seeds|draft every seed|draft all seeds)\b/.test(s)) return true;
  if (/\bwrite all\s+\d+\s+(posts?|drafts?|seeds?)\b/.test(s)) return true;
  if (/\bdraft all\s+\d+\b/.test(s)) return true;
  if (/\bgenerate all\s+\d+\b/.test(s)) return true;
  if (/\b(write|draft|generate|create)\s+all\s+\d+\s+(posts?|drafts?|pieces?)\b/.test(s)) return true;
  if (/\b(write|draft)\s+every\s+seed\b/.test(s)) return true;
  return false;
}

export function wantsNextSeed(text) {
  const s = String(text || '').trim().toLowerCase();
  return /^(next seed|next|write next)\b/.test(s) || /^\s*next\s*$/i.test(String(text || '').trim());
}

/**
 * Whether a seed may be drafted this turn.
 * - **run_all:** always draft (owner asked for the whole batch; flags are advisory only).
 * - **next:** overlap / plain-fact advisories block unless the seed id is in `overrides` (e.g. do it anyway).
 */
export function rapidWriteSeedIsDraftable(seedId, validation, overrides, mode) {
  if (mode === 'run_all') return true;
  const v = Array.isArray(validation) ? validation.find((x) => x.id === seedId) : null;
  const ov = overrides instanceof Set ? overrides : new Set(Array.isArray(overrides) ? overrides : []);
  if (!v || !v.flags?.length) return true;
  if (ov.has(seedId)) return true;
  return false;
}

/** Owner override — proceed despite flags. */
export function wantsDoItAnyway(text) {
  const s = String(text || '').trim().toLowerCase();
  return /\bdo it anyway\b/.test(s) || /\bproceed anyway\b/.test(s) || /\boverride\b.*\bflag/.test(s);
}

/**
 * Extract seed ids like rw-1, rw-10 from free text; only ids present in `allowedIds` are returned (preserves order).
 */
/** First line or sentence start of body — for batch anti-duplication. */
export function rapidWriteOpeningSnippet(body, maxLen = 140) {
  const t = safeText(body, 20000).trim();
  if (!t) return '';
  const line = t.split(/\n+/)[0].trim();
  return maxLen && line.length > maxLen ? `${line.slice(0, maxLen)}…` : line;
}

/** Last narrative paragraph (whitespace-collapsed) — batch anti-repeat for closers. */
export function rapidWriteClosingSnippet(body, maxLen = 220) {
  const raw = safeText(body, 20000).trim();
  if (!raw) return '';
  const paras = raw
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  const last = paras.length ? paras[paras.length - 1] : raw.replace(/\s+/g, ' ').trim();
  return maxLen && last.length > maxLen ? `${last.slice(0, maxLen)}…` : last;
}

/** Start, several mid-body slices, and end — catches repeated meeting-spine language, not only edges. */
export function rapidWriteBodySignatureSnippets(body, maxLen = 100) {
  const t = String(body || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!t) return [];
  const n = Math.min(200, Math.max(40, Number(maxLen) || 100));
  if (t.length <= n * 2) return [t];
  const picks = [
    t.slice(0, n),
    t.slice(Math.floor(t.length * 0.28), Math.floor(t.length * 0.28) + n),
    t.slice(Math.floor(t.length * 0.5), Math.floor(t.length * 0.5) + n),
    t.slice(Math.floor(t.length * 0.72), Math.floor(t.length * 0.72) + n),
    t.slice(-n),
  ];
  const out = [];
  for (const c of picks) {
    const chunk = c.trim();
    if (!chunk) continue;
    if (out.some((o) => o === chunk)) continue;
    out.push(chunk);
  }
  return out.slice(0, 6);
}

/** Overused first names in model output — scan bodies so batch prompts can forbid reuse. */
const RW_OVERUSED_FIRST_NAMES = new Set([
  'alex',
  'anna',
  'chris',
  'claire',
  'daniel',
  'david',
  'emily',
  'emma',
  'james',
  'jenna',
  'jennifer',
  'john',
  'kevin',
  'linda',
  'lisa',
  'maria',
  'mark',
  'mary',
  'michael',
  'olivia',
  'patricia',
  'paul',
  'robert',
  'ryan',
  'sarah',
  'steve',
  'susan',
  'tom',
]);

/**
 * Extract likely first names from draft body for batch deduplication (heuristic: known overused list).
 */
export function extractRapidWriteFirstNamesFromBody(body) {
  const text = String(body || '');
  const found = new Map();
  for (const n of RW_OVERUSED_FIRST_NAMES) {
    if (new RegExp(`\\b${n}\\b`, 'i').test(text)) {
      found.set(n.toLowerCase(), n.charAt(0).toUpperCase() + n.slice(1).toLowerCase());
    }
  }
  return [...found.values()];
}

export function extractRapidWriteSeedIdsFromMessage(message, allowedIds) {
  const allow = allowedIds instanceof Set ? allowedIds : new Set(Array.isArray(allowedIds) ? allowedIds : []);
  const msg = String(message || '');
  const out = [];
  const seen = new Set();
  const re = /\brw-[\w-]+\b/gi;
  let m;
  while ((m = re.exec(msg))) {
    const id = m[0];
    if (!allow.has(id) || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

/**
 * Merge thread overrides when the owner approves drafting despite validation flags.
 * @returns {{ overrides: Set<string>, source: string }}
 */
export function collectRapidWriteOverrideIds(userMessage, rwExisting) {
  const validation = Array.isArray(rwExisting?.validation) ? rwExisting.validation : [];
  const seeds = Array.isArray(rwExisting?.seeds) ? rwExisting.seeds : [];
  const seedIdSet = new Set(seeds.map((s) => s.id));
  const flaggedIds = new Set(validation.filter((v) => v.flags?.length).map((v) => v.id));
  const existing = new Set(Array.isArray(rwExisting?.overrides) ? rwExisting.overrides : []);
  const msg = String(userMessage || '');

  const mentioned = extractRapidWriteSeedIdsFromMessage(msg, seedIdSet);
  const out = new Set(existing);

  if (/\b(approve all flagged|all flagged seeds|clear all flags|every flagged seed)\b/i.test(msg) && flaggedIds.size) {
    flaggedIds.forEach((id) => out.add(id));
    return { overrides: out, source: 'all_flagged_phrase' };
  }

  if (wantsDoItAnyway(msg)) {
    if (mentioned.length) {
      mentioned.forEach((id) => {
        if (flaggedIds.has(id)) out.add(id);
      });
      return { overrides: out, source: 'do_it_anyway_named' };
    }
    flaggedIds.forEach((id) => out.add(id));
    return { overrides: out, source: 'do_it_anyway_all' };
  }

  const approveContext =
    /should not have been flagged|shouldn't have been flagged|not have been flagged|unflag|clear flag|enhanced or added to|can all be enhanced|approve these|go ahead with|draft anyway|write those|proceed with (?:these|those|them)|override.*flag/i.test(
      msg
    );

  if (mentioned.length && approveContext) {
    let added = false;
    mentioned.forEach((id) => {
      if (flaggedIds.has(id)) {
        out.add(id);
        added = true;
      }
    });
    if (added) return { overrides: out, source: 'named_approval' };
  }

  return { overrides: out, source: 'none' };
}

/** Keep corpus links stable across revisions — strip from markdown for the writer; re-append after body. */
export function extractRelatedCorpusBlock(markdown) {
  const m = String(markdown || '');
  const idx = m.indexOf('**Related (corpus)**');
  if (idx < 0) return '';
  return m.slice(idx).trim();
}

/** Parse `**Tags:** a, b` line from stored markdown (for revisions). */
export function extractTagsLineFromMarkdown(markdown) {
  const m = String(markdown || '');
  const match = m.match(/^\*\*Tags:\*\*\s*(.+)$/m);
  if (!match) return [];
  return match[1]
    .split(',')
    .map((s) => safeText(s.trim(), 120))
    .filter(Boolean);
}

/**
 * Same assembly as writeRapidWritePost return path. Tags render before Related (corpus). relatedBlock is optional tail from extractRelatedCorpusBlock.
 */
export function buildRapidWriteMarkdownFromParts(title, body, reflectionQuestion, relatedBlock = '', tags = []) {
  const lines = [
    `## ${safeText(title, 200)}`,
    '',
    safeText(body, 12000),
    '',
    `*${safeText(reflectionQuestion, 400)}*`,
  ];
  const tagArr = Array.isArray(tags) ? tags.map((t) => safeText(t, 120)).filter(Boolean) : [];
  if (tagArr.length) {
    lines.push('', `**Tags:** ${tagArr.join(', ')}`);
  }
  const rel = String(relatedBlock || '').trim();
  if (rel) lines.push('', rel);
  return lines.join('\n');
}

/**
 * @param {object} w - writeRapidWritePost success object
 * @param {string|null} corpusDraftId
 */
export function normalizeRapidWriteDraftState(w, corpusDraftId = null) {
  if (!w || !w.markdown || !w.seed_id) return null;
  return {
    title: safeText(w.title, 200),
    slug: safeText(w.slug, 240),
    markdown: safeText(w.markdown, 50000),
    body: safeText(w.body, 12000),
    reflection_question: safeText(w.reflection_question, 400),
    seed_id: safeText(w.seed_id, 80),
    corpus_draft_id: corpusDraftId ? String(corpusDraftId) : null,
    updated_at: new Date().toISOString(),
  };
}

const INTENT_MODEL = () => process.env.AO_AUTO_RAPID_WRITE_INTENT_MODEL || 'gpt-4o-mini';

/**
 * Classify message: revise existing draft text vs discuss-only. seed_ids must be valid draft keys when intent is revise_draft.
 */
export async function parseRapidWriteDraftOrDiscussIntent(userMessage, { seeds = [], drafts_by_seed_id = {} }) {
  const apiKey = getOpenAiKey();
  const draftKeys = Object.keys(drafts_by_seed_id || {});
  if (!draftKeys.length) return { intent: 'discuss', seed_ids: [], instruction: '' };
  if (!apiKey) return { intent: 'discuss', seed_ids: [], instruction: '' };

  const seedList = (Array.isArray(seeds) ? seeds : []).map((s) => `${s.id}: ${safeText(s.core_idea, 120)}`).join('\n');

  const user = `Bart is in Rapid Write mode. He may have drafts keyed by seed id.

Known seed ids (drafts may exist for some): ${draftKeys.join(', ')}

Seed summary:
${seedList || '(none)'}

His message:
---
${String(userMessage || '').slice(0, 8000)}
---

Return JSON only:
{"intent":"revise_draft"|"discuss","seed_ids":["rw-1"],"instruction":"string"}

Rules:
- intent "revise_draft" ONLY if he wants the draft TEXT changed (shorten, lengthen, sharpen, merge ideas, fix tone, rewrite opening, remove first-person, align with overlap, etc.).
- intent "discuss" for strategy questions, "what should I do?", understanding flags, or chit-chat without editing text.
- seed_ids: which draft(s) to edit — must be subset of [${draftKeys.map((k) => JSON.stringify(k)).join(', ')}]. Empty if discuss.
- If he names one or more seeds (e.g. rw-4, rw-9, rw-10) and asks for edits, include **every** named id that appears in the draft list above.
- If he says "all drafts" with one instruction, include all draft ids in seed_ids.
- instruction: the editing request in his words; empty if discuss.

If the message clearly asks to change wording but intent is unclear, prefer "revise_draft" with all named seed ids.`;

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: INTENT_MODEL(),
        temperature: 0.1,
        max_tokens: 600,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'You classify Rapid Write owner messages. JSON only. When Bart names multiple rw-* ids and wants tone or text changes (e.g. remove "I"), use revise_draft and include ALL named ids that exist in Known seed ids.',
          },
          { role: 'user', content: user },
        ],
      }),
    });
    if (!res.ok) return { intent: 'discuss', seed_ids: [], instruction: '' };
    const json = await res.json().catch(() => ({}));
    const content = json.choices?.[0]?.message?.content?.trim() || '';
    const parsed = JSON.parse(content);
    const intent = parsed.intent === 'revise_draft' ? 'revise_draft' : 'discuss';
    const rawIds = Array.isArray(parsed.seed_ids) ? parsed.seed_ids : [];
    const allowed = new Set(draftKeys);
    const seed_ids = rawIds.map((x) => safeText(x, 80)).filter((id) => allowed.has(id));
    let instruction = safeText(parsed.instruction, 4000);
    let outIds = seed_ids;
    if (intent === 'revise_draft' && !outIds.length) {
      const found = new Set();
      const re = /\brw-[\w-]+\b/gi;
      const msg = String(userMessage || '');
      let m;
      while ((m = re.exec(msg))) {
        const id = m[0];
        if (allowed.has(id)) found.add(id);
      }
      outIds = [...found];
    }
    /** Union: classifier ids + any rw-* in message that have drafts (deterministic coverage). */
    if (intent === 'revise_draft') {
      const union = new Set(outIds);
      const re = /\brw-[\w-]+\b/gi;
      const msg = String(userMessage || '');
      let m;
      while ((m = re.exec(msg))) {
        const id = m[0];
        if (allowed.has(id)) union.add(id);
      }
      outIds = [...union];
    }
    if (intent === 'revise_draft' && outIds.length && !instruction) {
      instruction = safeText(userMessage, 4000);
    }
    return { intent, seed_ids: outIds, instruction };
  } catch {
    return { intent: 'discuss', seed_ids: [], instruction: '' };
  }
}

/**
 * Per-seed validation: overlap (advisory) + optional plain-fact check (author is the source; extreme bar).
 * @returns {Promise<Array<{ id: string, flags: Array<{ type: string, detail: string }>, anchors: Array, differentiation_hint?: string }>>}
 */
export async function validateRapidWriteSeeds(seeds, _email) {
  const apiKey = getOpenAiKey();
  const skipPlainFact = String(process.env.AO_RAPID_WRITE_SKIP_FALSITY_CHECK || '').trim() === '1';
  const out = [];
  for (const seed of seeds) {
    const flags = [];
    let differentiation_hint = '';
    const query = [seed.core_idea, seed.real_world_context, seed.insight_anchor].filter(Boolean).join(' ');
    const anchors = await getVoiceAnchors({ queryText: query, limit: 3 });
    const insightLen = (seed.insight_anchor || '').length;
    const newAngleLen = (seed.new_angle || '').length;
    if (anchors.length >= 2 && insightLen < 50 && newAngleLen < 30) {
      const titles = anchors.map((a) => a.title).join('; ');
      differentiation_hint = `Differentiate from existing corpus themes (${titles}): stress one fresh angle in the body—specific scenario, consequence, or counterintuitive read—not a repeat headline.`;
      flags.push({
        type: 'overlap',
        detail: `Advisory: similar angles may exist (${titles}). Your insight_anchor is short—you can still draft; add a clear new angle or approve with **do it anyway** / name these seeds. ${differentiation_hint}`,
      });
    }

    if (apiKey && !skipPlainFact) {
      try {
        const seedBlock = [
          `Core idea: ${seed.core_idea || '(none)'}`,
          `Leadership category: ${seed.leadership_category || '(none)'}`,
          `Psychological outcome: ${seed.psychological_outcome || '(none)'}`,
          `Real-world context: ${seed.real_world_context || '(none)'}`,
          `Insight anchor: ${seed.insight_anchor || '(none)'}`,
          `Research notes: ${seed.research_notes || '(none)'}`,
          `New angle: ${seed.new_angle || '(none)'}`,
        ].join('\n');
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: process.env.AO_AUTO_RAPID_WRITE_VALIDATE_MODEL || 'gpt-4o-mini',
            temperature: 0.1,
            max_tokens: 350,
            response_format: { type: 'json_object' },
            messages: [
              {
                role: 'system',
                content: `You help review Rapid Write SEEDS for Archetype Original. The AUTHOR is the source: seeds are provided in good faith.

Default: likely_false MUST be false.

Set likely_false to true ONLY if the seed asserts something that is logically impossible, physically false as stated, or absurd in plain language—not leadership opinion, plausible psychology, organizational dynamics, or debatable management takes.

Normative opinions (e.g. what matters most in business) are NOT objective falsity. Do not flag servant-leadership or team-dynamics premises unless they are absurd.

Reply JSON only:
{"likely_false":boolean,"reason":string,"quoted_claim":string}

If likely_false is true, reason must name the specific problematic claim; quoted_claim should quote the shortest phrase from the seed text that is the problem (or empty string if impossible). If likely_false is false, use empty strings for reason and quoted_claim.`,
              },
              {
                role: 'user',
                content: `Full seed:\n${seedBlock}`,
              },
            ],
          }),
        });
        if (res.ok) {
          const json = await res.json().catch(() => ({}));
          const content = json.choices?.[0]?.message?.content?.trim() || '';
          const parsed = JSON.parse(content);
          if (parsed.likely_false === true) {
            const q = safeText(parsed.quoted_claim, 240);
            const r = safeText(parsed.reason, 500);
            const detail = [
              'Plain-fact advisory (rare): Auto thinks a stated claim may be objectively problematic—not that you are wrong about leadership in general.',
              r ? `Reason: ${r}` : '',
              q ? `Quoted: “${q}”` : '',
              'You can still draft: **Run all seeds** includes every seed. For **Next seed**, say **do it anyway** if you want to proceed past flags.',
            ]
              .filter(Boolean)
              .join(' ');
            flags.push({
              type: 'plain_fact',
              detail: detail || 'Plain-fact advisory; review or say do it anyway for Next seed.',
            });
          }
        }
      } catch {
        /* skip plain-fact check if API fails */
      }
    }

    const row = { id: seed.id, flags, anchors };
    if (differentiation_hint) row.differentiation_hint = differentiation_hint;
    out.push(row);
  }
  return out;
}

/**
 * Writer: one canonical journal post per seed (markdown-friendly). Default length ~2 min read.
 */
export async function writeRapidWritePost(
  seed,
  {
    seriesSlugPrefix = 'psychological-cost',
    agentTrainingNotes = [],
    batchOpeningSnippets = [],
    batchUsedFirstNames = [],
    batchPriorReflectionQuestions = [],
    batchAntiRepeatSnippets = [],
    batchPriorTitles = [],
    batchPriorClosingSnippets = [],
    batchPriorBodies = [],
    batchPatternIndex = 0,
    differentiationHint = '',
  } = {}
) {
  const apiKey = getOpenAiKey();
  if (!apiKey) return { ok: false, error: 'OpenAI not configured' };

  const anchors = await getVoiceAnchors({
    queryText: [seed.core_idea, seed.leadership_category].join(' '),
    limit: 3,
  });
  const anchorHint = anchors.length
    ? `Closest corpus titles for voice alignment (do not cite as bibliography in body): ${anchors.map((a) => a.title).join('; ')}.`
    : '';

  const { fingerprintBlock, passageBlock, goldBlock } = await buildRapidWriteStyleContext({
    queryText: [seed.core_idea, seed.leadership_category, seed.psychological_outcome].join(' '),
  });
  const styleBlock = [goldBlock, fingerprintBlock, passageBlock].filter(Boolean).join('\n\n');

  const trainingBlock =
    Array.isArray(agentTrainingNotes) && agentTrainingNotes.length
      ? `\nOwner mode instructions (highest priority for tone):\n${agentTrainingNotes.slice(-6).join('\n')}\n`
      : '';

  const openings = Array.isArray(batchOpeningSnippets)
    ? batchOpeningSnippets.map((s) => safeText(s, 220)).filter(Boolean)
    : [];
  const antiDup =
    openings.length > 0
      ? `\nOpen with a **distinct** angle. Do NOT mirror or lightly rephrase these openings already used in this batch:\n${openings.map((t) => `- ${t}`).join('\n')}\n`
      : '';

  const names = Array.isArray(batchUsedFirstNames)
    ? [...new Set(batchUsedFirstNames.map((s) => String(s || '').trim()).filter(Boolean))].slice(0, 80)
    : [];
  const namesBlock =
    names.length > 0
      ? `\n**Names already used in this batch (do not use these first names again in this post):** ${names.join(', ')}\n`
      : '';

  const refl = Array.isArray(batchPriorReflectionQuestions)
    ? batchPriorReflectionQuestions.map((s) => safeText(s, 400)).filter(Boolean).slice(-12)
    : [];
  const reflBlock =
    refl.length > 0
      ? `\n**Reflection questions already used in this batch (use a different shape; do not mirror these stems):**\n${refl.map((t) => `- ${t}`).join('\n')}\n`
      : '';

  const snippets = Array.isArray(batchAntiRepeatSnippets)
    ? batchAntiRepeatSnippets.map((s) => safeText(s, 200)).filter(Boolean).slice(0, 40)
    : [];
  const phraseBlock =
    snippets.length > 0
      ? `\n**Do not repeat or lightly rephrase these snippets from other posts in this batch:**\n${snippets.map((t) => `- ${t}`).join('\n')}\n`
      : '';

  const priorTitlesRaw = Array.isArray(batchPriorTitles)
    ? batchPriorTitles.map((s) => String(s || '').trim()).filter(Boolean)
    : [];
  const priorTitles = [...new Set(priorTitlesRaw)].slice(-20);
  const costOfPriorCount = countRapidWriteCostOfTitles(priorTitlesRaw);
  const costOfQuotaBlock =
    costOfPriorCount >= RAPID_WRITE_MAX_COST_OF_TITLES_PER_BATCH
      ? `\n**MANDATORY (headline quota):** This batch already has **${costOfPriorCount}** title(s) beginning with **"The Cost of…"**. Your title **must NOT** begin with **"The Cost of"** (use a different architecture: concrete moment, tension-first line, scene title, or short stake—**not** a shell swap).\n`
      : costOfPriorCount === 1
        ? `\n**Headline discipline:** One post in this batch already uses **"The Cost of…"**. Prefer a **different** title architecture for this piece unless the seed demands that exact shape.\n`
        : '';

  const titlesBlock =
    priorTitles.length > 0
      ? `\n**Titles already used in this batch (yours must be clearly different—not a light rephrase; **normalized duplicates are forbidden**):**\n${priorTitles.map((t) => `- ${safeText(t, 200)}`).join('\n')}\n`
      : '';

  const closingSnips = Array.isArray(batchPriorClosingSnippets)
    ? batchPriorClosingSnippets.map((s) => safeText(s, 240)).filter(Boolean).slice(-14)
    : [];
  const closingBlock =
    closingSnips.length > 0
      ? `\n**Closing moves already used in this batch (do not echo their beat sequence or resolution type):**\n${closingSnips.map((t) => `- ${t}`).join('\n')}\n`
      : '';

  const patternIdx = Math.max(0, Math.floor(Number(batchPatternIndex) || 0));
  const patternBlock = `\n${rapidWriteStoryPatternForBatchIndex(patternIdx)}\n`;

  const diffBlock = differentiationHint ? `\nDifferentiation (use in the narrative): ${differentiationHint}\n` : '';

  const priorBodiesForScenario = Array.isArray(batchPriorBodies)
    ? batchPriorBodies.map((b) => String(b || '').trim()).filter(Boolean).slice(-12)
    : [];
  const scenarioBlock = buildRapidWriteScenarioMoldPromptBlock(
    priorBodiesForScenario,
    RAPID_WRITE_SCENARIO_MOLD_LIMITS
  );

  const userCore = `Write ONE journal post for Archetype Original. One coherent arc; depth without overwrite.

${RAPID_WRITE_LENGTH_DISCIPLINE}
${patternBlock}
${styleBlock}

Seed (do not change core meaning, category, or outcome):
- Core idea: ${seed.core_idea}
- Leadership category: ${seed.leadership_category}
- Psychological outcome: ${seed.psychological_outcome}
- Real-world context: ${seed.real_world_context || '(none)'}
- Insight anchor (what is new): ${seed.insight_anchor || '(none)'}

${anchorHint}${diffBlock}${titlesBlock}${costOfQuotaBlock}${closingBlock}${antiDup}${namesBlock}${reflBlock}${phraseBlock}${scenarioBlock}
${trainingBlock}`;

  const userJsonTail = `
Output JSON only:
{
  "title": "short grounded title, no hype — must differ from all titles listed under batch titles above",
  "slug_suffix": "kebab-case short topic fragment",
  "tags": ["${seed.leadership_category}", "${seed.psychological_outcome}"],
  "body": "narrative only — earn the closing; follow fingerprint and passage guidance for level; no section labels. No emojis. Stay within the word band.",
  "reflection_question": "one sentence, grounded in this story; follow reflection rules above"
}

Rules: AO Living Voice — human, direct, observational. Not marketer, therapist, or academic. No clichés. Do not moralize. Do not mention tags or system in body. No em dashes as a stylistic crutch. User examples in instructions are **intent only** — do not copy their wording.`;

  try {
    const tempRaw = String(process.env.AO_AUTO_RAPID_WRITE_TEMPERATURE || '').trim();
    const tempParsed = parseFloat(tempRaw);
    const temperature =
      Number.isFinite(tempParsed) && tempParsed >= 0 && tempParsed <= 2 ? tempParsed : 0.45;

    let lastFixBlock = '';
    for (let attempt = 1; attempt <= 3; attempt++) {
      const user = `${userCore}${lastFixBlock}${userJsonTail}`;
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: process.env.AO_AUTO_RAPID_WRITE_MODEL || process.env.AO_AUTO_MODEL || 'gpt-4o-mini',
          temperature,
          max_tokens: 3000,
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'system',
              content:
                'You are the Writer for Archetype Original Rapid Write. JSON only. Treat duplicate titles, headline-shell quotas, scenario-mold quotas (same office/meeting spine repeated across the batch), stock résumé leader intros, and near-duplicate reflection questions as **errors to fix**, not suggestions. Obey the user message: reader bar, word band, adaptive AO voice, narrative-first prose, closing and reflection-question rules, and corpus fingerprint/passage context.',
            },
            { role: 'user', content: user },
          ],
        }),
      });
      if (!res.ok) return { ok: false, error: 'Writer request failed' };
      const json = await res.json().catch(() => ({}));
      const content = json.choices?.[0]?.message?.content?.trim() || '';
      let parsed;
      try {
        parsed = JSON.parse(content);
      } catch {
        if (attempt === 3) return { ok: false, error: 'Writer returned invalid JSON' };
        lastFixBlock = `\n\n---\n**CRITICAL (retry ${attempt + 1}/3):** Your previous reply was not valid JSON. Return **only** one JSON object with the required keys.\n`;
        continue;
      }

      const title = safeText(parsed.title, 200);
      const body = safeText(parsed.body, 12000);
      const reflection_question = safeText(parsed.reflection_question, 400);

      const dupTitle = rapidWriteTitleCollidesWithBatch(title, priorTitlesRaw);
      const costOfViolated =
        costOfPriorCount >= RAPID_WRITE_MAX_COST_OF_TITLES_PER_BATCH && /^\s*the\s+cost\s+of\b/i.test(title);
      const shellViol = rapidWriteTitleShellQuotaViolated(title, priorTitlesRaw);
      const bannedIntro = rapidWriteBodyHasBannedLeaderIntros(body);
      const reflSimilar = rapidWriteReflectionTooSimilar(reflection_question, refl);
      const scenarioEx = rapidWriteScenarioMoldsExhausted(body, priorBodiesForScenario, RAPID_WRITE_SCENARIO_MOLD_LIMITS);

      if (
        (dupTitle ||
          costOfViolated ||
          shellViol.violated ||
          bannedIntro ||
          reflSimilar ||
          scenarioEx.exhausted) &&
        attempt < 3
      ) {
        const bits = [];
        if (dupTitle) {
          bits.push(
            `The title **${title || '(empty)'}** collides with another title in this batch (exact duplicate or a thin “The Cost of … / …silence” variant). Return a **distinct** title architecture.`
          );
        }
        if (costOfViolated) {
          bits.push(
            `The headline quota already used **"The Cost of…"** ${costOfPriorCount} time(s). Your title must **not** begin with **"The Cost of"**.`
          );
        }
        if (shellViol.violated) {
          bits.push(
            `The title uses **${shellViol.label}** but that shell is already at its batch limit (${shellViol.priorCount} prior). Pick a different headline architecture.`
          );
        }
        if (bannedIntro) {
          bits.push(
            `The body uses a **banned stock intro** (e.g. “leader/director … known for …”). Rewrite the **opening two paragraphs** so no character is introduced with “, known for” / “a respected … known for” / “at the head of the table sat … known for.” Show detail without résumé phrasing.`
          );
        }
        if (reflSimilar) {
          bits.push(
            `The reflection_question is too close to another post’s question in this batch (long shared opening). Rewrite it with a **different grammatical shape** and different opening words.`
          );
        }
        if (scenarioEx.exhausted) {
          bits.push(
            `The opening/spine repeats batch-limited scenario mold(s): ${scenarioEx.reasons.join('; ')}. Re-stage: different primary site and story engine in the first ~1000 words (honor your assigned story pattern).`
          );
        }
        lastFixBlock = `\n\n---\n**CRITICAL (retry ${attempt + 1}/3):**\n${bits.join('\n')}\nReturn the **full** JSON again with title, body, and reflection_question corrected. Keep seed alignment and the word band.\n`;
        continue;
      }

      if (dupTitle || costOfViolated || shellViol.violated || bannedIntro || reflSimilar || scenarioEx.exhausted) {
        return {
          ok: false,
          error:
            'Writer output still violated duplicate-title, headline/scenario quotas, banned-intro, or reflection-similarity rules after retries.',
        };
      }

      const slug = `${seriesSlugPrefix}-${safeText(parsed.slug_suffix, 80).replace(/[^a-z0-9-]/gi, '-').replace(/-+/g, '-').toLowerCase()}`;
      const internal_links = anchors
        .filter((a) => a.url)
        .map((a) => `- [${a.title}](${a.url})`)
        .join('\n');
      const relatedBlock = internal_links ? `**Related (corpus)**\n${internal_links}` : '';
      const tags = Array.isArray(parsed.tags) ? parsed.tags : [seed.leadership_category, seed.psychological_outcome];
      const markdown = buildRapidWriteMarkdownFromParts(title, body, reflection_question, relatedBlock, tags);

      return {
        ok: true,
        title,
        slug,
        tags,
        body,
        reflection_question,
        markdown,
        seed_id: seed.id,
      };
    }
    return { ok: false, error: 'Writer exhausted retries' };
  } catch (e) {
    return { ok: false, error: e.message || 'Writer failed' };
  }
}

const REVISE_MODEL = () => process.env.AO_AUTO_RAPID_WRITE_REVISE_MODEL || process.env.AO_AUTO_RAPID_WRITE_MODEL || process.env.AO_AUTO_MODEL || 'gpt-4o-mini';

/**
 * Apply owner instruction to an existing Rapid Write draft; preserves **Related (corpus)** block when present.
 */
export async function reviseRapidWriteDraft(
  seed,
  currentDraft,
  instruction,
  {
    agentTrainingNotes = [],
    overlapHint = '',
    differentiationHint = '',
    siblingOpeningSnippets = [],
    batchPriorTitles = [],
    batchPriorClosingSnippets = [],
    batchPriorReflectionQuestions = [],
    batchAntiRepeatSnippets = [],
    batchPriorBodiesForScenario = [],
    assignedStoryPattern = '',
  } = {}
) {
  const apiKey = getOpenAiKey();
  if (!apiKey) return { ok: false, error: 'OpenAI not configured' };
  const inst = String(instruction || '').trim();
  if (!inst) return { ok: false, error: 'No instruction for revision.' };
  if (!seed || !currentDraft || !String(currentDraft.markdown || '').trim()) {
    return { ok: false, error: 'Missing seed or draft.' };
  }

  const priorBodiesForScenario = Array.isArray(batchPriorBodiesForScenario)
    ? batchPriorBodiesForScenario.map((b) => String(b || '').trim()).filter(Boolean).slice(-12)
    : [];
  const scenarioBlock = buildRapidWriteScenarioMoldPromptBlock(
    priorBodiesForScenario,
    RAPID_WRITE_SCENARIO_MOLD_LIMITS
  );

  const relatedPreserved = extractRelatedCorpusBlock(currentDraft.markdown);
  const trainingBlock =
    Array.isArray(agentTrainingNotes) && agentTrainingNotes.length
      ? `\nOwner mode instructions (highest priority):\n${agentTrainingNotes.slice(-6).join('\n')}\n`
      : '';
  const overlapBlock = overlapHint ? `\nContext (corpus overlap note): ${overlapHint}\n` : '';
  const diffBlock = differentiationHint ? `\nDifferentiation: ${differentiationHint}\n` : '';
  const sibs = Array.isArray(siblingOpeningSnippets)
    ? siblingOpeningSnippets.map((s) => safeText(s, 200)).filter(Boolean)
    : [];
  const sibBlock =
    sibs.length > 0
      ? `\nOther drafts in this batch use these openings (do not converge to the same phrasing):\n${sibs.map((t) => `- ${t}`).join('\n')}\n`
      : '';

  const priorTitlesRaw = Array.isArray(batchPriorTitles)
    ? batchPriorTitles.map((s) => String(s || '').trim()).filter(Boolean)
    : [];
  const sibTitles = [...new Set(priorTitlesRaw.map((t) => safeText(t, 200)))].slice(-20);
  const costOfPriorCount = countRapidWriteCostOfTitles(priorTitlesRaw);
  const costOfQuotaBlock =
    costOfPriorCount >= RAPID_WRITE_MAX_COST_OF_TITLES_PER_BATCH
      ? `\n**MANDATORY (headline quota):** Other drafts in this batch already use **${costOfPriorCount}** title(s) beginning with **"The Cost of…"**. Your revised title **must NOT** begin with **"The Cost of"**.\n`
      : costOfPriorCount === 1
        ? `\n**Headline discipline:** Another draft already uses **"The Cost of…"**. Prefer a **different** title architecture for this revision unless the owner explicitly demands that shell.\n`
        : '';

  const sibTitlesBlock =
    sibTitles.length > 0
      ? `\nOther drafts’ titles in this batch (do not retitle to match, lightly rephrase, or collide with these — **normalized duplicates and thin variants fail**):\n${sibTitles.map((t) => `- ${t}`).join('\n')}\n`
      : '';

  const sibClose = Array.isArray(batchPriorClosingSnippets)
    ? batchPriorClosingSnippets.map((s) => safeText(s, 240)).filter(Boolean).slice(-14)
    : [];
  const sibCloseBlock =
    sibClose.length > 0
      ? `\nOther drafts’ closing moves in this batch (do not steer this revision toward the same resolution beat):\n${sibClose.map((t) => `- ${t}`).join('\n')}\n`
      : '';

  const sibRefl = Array.isArray(batchPriorReflectionQuestions)
    ? batchPriorReflectionQuestions.map((s) => safeText(s, 400)).filter(Boolean).slice(-12)
    : [];
  const sibReflBlock =
    sibRefl.length > 0
      ? `\nReflection questions already used on other drafts (do not mirror shape or template):\n${sibRefl.map((t) => `- ${t}`).join('\n')}\n`
      : '';

  const sibSnips = Array.isArray(batchAntiRepeatSnippets)
    ? batchAntiRepeatSnippets.map((s) => safeText(s, 200)).filter(Boolean).slice(0, 36)
    : [];
  const sibSnipBlock =
    sibSnips.length > 0
      ? `\nDo not drift toward repeating these snippets from other drafts in this batch:\n${sibSnips.map((t) => `- ${t}`).join('\n')}\n`
      : '';

  const patternBlock = assignedStoryPattern ? `\nAssigned story pattern for this seed (preserve unless the owner explicitly asks to abandon it):\n${assignedStoryPattern}\n` : '';

  const { fingerprintBlock, passageBlock, goldBlock } = await buildRapidWriteStyleContext({
    queryText: [seed.core_idea, seed.leadership_category, seed.psychological_outcome, inst].join(' '),
  });
  const styleBlock = [goldBlock, fingerprintBlock, passageBlock].filter(Boolean).join('\n\n');

  const userCore = `Revise this Archetype Original Rapid Write draft per the owner's instruction. Keep the same psychological DNA as the seed; do not contradict core idea, leadership category, or outcome.

If the draft is long or the owner asks for length work, apply precision editing: bring the body to **425–575 words** by removing repetition and merge-in-paragraph trims—not by flattening style. If the owner asks only to expand, add material that is genuinely new; still avoid redundant paragraphs.

${styleBlock}

Seed (reference — do not abandon):
- Core idea: ${seed.core_idea}
- Leadership category: ${seed.leadership_category}
- Psychological outcome: ${seed.psychological_outcome}

Current draft body (narrative only, no title line):
${safeText(currentDraft.body, 12000)}

Current title: ${safeText(currentDraft.title, 200)}
Current reflection question: ${safeText(currentDraft.reflection_question, 400)}

Owner instruction:
${inst.slice(0, 6000)}
${trainingBlock}${overlapBlock}${diffBlock}${patternBlock}${sibBlock}${sibTitlesBlock}${costOfQuotaBlock}${sibCloseBlock}${sibReflBlock}${sibSnipBlock}${scenarioBlock}`;

  const userJsonTail = `
Output JSON only:
{
  "title": "string",
  "slug_suffix": "kebab-case fragment or empty to keep tone-derived",
  "body": "revised narrative — closing and reflection rules above; narrative-first",
  "reflection_question": "one sentence, grounded in this story; follow reflection rules above"
}

Rules: AO Living Voice. No emojis. No section labels in body. The Related (corpus) links will be re-appended by the system — do not include them in body. Treat owner examples as **intent**, not mandatory wording.`;

  try {
    const seriesSlugPrefix = 'psychological-cost';
    const baseSlug = safeText(currentDraft.slug, 240) || `${seriesSlugPrefix}-draft`;

    let lastFixBlock = '';
    for (let attempt = 1; attempt <= 3; attempt++) {
      const user = `${userCore}${lastFixBlock}${userJsonTail}`;
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: REVISE_MODEL(),
          temperature: 0.35,
          max_tokens: 3200,
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'system',
              content: RAPID_WRITE_REVISE_SYSTEM,
            },
            { role: 'user', content: user },
          ],
        }),
      });
      if (!res.ok) return { ok: false, error: 'Revision request failed' };
      const json = await res.json().catch(() => ({}));
      const content = json.choices?.[0]?.message?.content?.trim() || '';
      let parsed;
      try {
        parsed = JSON.parse(content);
      } catch {
        if (attempt === 3) return { ok: false, error: 'Revision returned invalid JSON.' };
        lastFixBlock = `\n\n---\n**CRITICAL (retry ${attempt + 1}/3):** Return **only** valid JSON with the required keys.\n`;
        continue;
      }

      const slugSuffix = safeText(parsed.slug_suffix, 80);
      const slug =
        slugSuffix && slugSuffix.length > 1
          ? `${seriesSlugPrefix}-${slugSuffix.replace(/[^a-z0-9-]/gi, '-').replace(/-+/g, '-').toLowerCase()}`
          : baseSlug;

      const title = safeText(parsed.title, 200) || safeText(currentDraft.title, 200);
      const body = safeText(parsed.body, 12000);
      const reflection_question =
        safeText(parsed.reflection_question, 400) || safeText(currentDraft.reflection_question, 400);
      if (!body) {
        if (attempt === 3) return { ok: false, error: 'Revision produced empty body.' };
        lastFixBlock = `\n\n---\n**CRITICAL (retry ${attempt + 1}/3):** The body must not be empty.\n`;
        continue;
      }

      const dupTitle = rapidWriteTitleCollidesWithBatch(title, priorTitlesRaw);
      const costOfViolated =
        costOfPriorCount >= RAPID_WRITE_MAX_COST_OF_TITLES_PER_BATCH && /^\s*the\s+cost\s+of\b/i.test(title);
      const shellViol = rapidWriteTitleShellQuotaViolated(title, priorTitlesRaw);
      const bannedIntro = rapidWriteBodyHasBannedLeaderIntros(body);
      const reflSimilar = rapidWriteReflectionTooSimilar(reflection_question, sibRefl);
      const scenarioEx = rapidWriteScenarioMoldsExhausted(body, priorBodiesForScenario, RAPID_WRITE_SCENARIO_MOLD_LIMITS);

      if (
        (dupTitle ||
          costOfViolated ||
          shellViol.violated ||
          bannedIntro ||
          reflSimilar ||
          scenarioEx.exhausted) &&
        attempt < 3
      ) {
        const bits = [];
        if (dupTitle) {
          bits.push(
            `The title **${title || '(empty)'}** collides with another draft in this batch. Return a **distinct** title (not a duplicate or thin “The Cost of … / …silence” variant).`
          );
        }
        if (costOfViolated) {
          bits.push(
            `The headline quota is exhausted for **"The Cost of…"** in this batch. Your title must **not** begin with **"The Cost of".**`
          );
        }
        if (shellViol.violated) {
          bits.push(
            `The title uses **${shellViol.label}** but that shell is already at its batch limit. Pick a different headline architecture.`
          );
        }
        if (bannedIntro) {
          bits.push(
            `Rewrite the opening two paragraphs: remove banned résumé setups (**known for / respected for / seasoned professional** molds, etc.).`
          );
        }
        if (reflSimilar) {
          bits.push(
            `The reflection_question is too close to another draft’s question. Rewrite with a different shape and opening words.`
          );
        }
        if (scenarioEx.exhausted) {
          bits.push(
            `The opening/spine hits scenario mold(s) already at batch cap: ${scenarioEx.reasons.join('; ')}. Re-stage the story in the first ~1000 words.`
          );
        }
        lastFixBlock = `\n\n---\n**CRITICAL (retry ${attempt + 1}/3):**\n${bits.join('\n')}\nReturn the **full** JSON again.\n`;
        continue;
      }

      if (dupTitle || costOfViolated || shellViol.violated || bannedIntro || reflSimilar || scenarioEx.exhausted) {
        return {
          ok: false,
          error:
            'Revision still violated duplicate-title, headline/scenario quotas, banned-intro, or reflection-similarity rules after retries.',
        };
      }

      const fromDraft = extractTagsLineFromMarkdown(currentDraft.markdown);
      const tags =
        fromDraft.length > 0 ? fromDraft : [seed.leadership_category, seed.psychological_outcome];
      const markdown = buildRapidWriteMarkdownFromParts(title, body, reflection_question, relatedPreserved, tags);

      return {
        ok: true,
        title,
        slug,
        tags,
        body,
        reflection_question,
        markdown,
        seed_id: seed.id,
      };
    }
    return { ok: false, error: 'Revision exhausted retries.' };
  } catch (e) {
    return { ok: false, error: e.message || 'Revision failed' };
  }
}

/**
 * Manual register polish: same draft, higher professional bar. Owner asks explicitly (editor pass / polish pass).
 */
export async function polishRapidWriteDraft(seed, currentDraft) {
  const apiKey = getOpenAiKey();
  if (!apiKey) return { ok: false, error: 'OpenAI not configured' };
  if (!seed || !currentDraft || !String(currentDraft.markdown || '').trim()) {
    return { ok: false, error: 'Missing seed or draft.' };
  }

  const relatedPreserved = extractRelatedCorpusBlock(currentDraft.markdown);
  const { fingerprintBlock, passageBlock, goldBlock } = await buildRapidWriteStyleContext({
    queryText: [seed.core_idea, seed.leadership_category, seed.psychological_outcome].join(' '),
  });
  const styleBlock = [goldBlock, fingerprintBlock, passageBlock].filter(Boolean).join('\n\n');

  const user = `Polish this Rapid Write draft for **register and voice** only. Do not change the core argument or seed alignment.

${styleBlock}

Seed (reference):
- Core idea: ${seed.core_idea}
- Leadership category: ${seed.leadership_category}
- Psychological outcome: ${seed.psychological_outcome}

Current draft body:
${safeText(currentDraft.body, 12000)}

Current title: ${safeText(currentDraft.title, 200)}
Current reflection question: ${safeText(currentDraft.reflection_question, 400)}

Output JSON only:
{
  "title": "string",
  "slug_suffix": "kebab-case fragment or empty to keep",
  "body": "polished narrative — same ideas, higher professional register",
  "reflection_question": "one sentence; must meet reflection rules in system discipline"
}`;

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: REVISE_MODEL(),
        temperature: 0.25,
        max_tokens: 3200,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: RAPID_WRITE_POLISH_SYSTEM },
          { role: 'user', content: user },
        ],
      }),
    });
    if (!res.ok) return { ok: false, error: 'Polish request failed' };
    const json = await res.json().catch(() => ({}));
    const content = json.choices?.[0]?.message?.content?.trim() || '';
    const parsed = JSON.parse(content);
    const seriesSlugPrefix = 'psychological-cost';
    const slugSuffix = safeText(parsed.slug_suffix, 80);
    const baseSlug = safeText(currentDraft.slug, 240) || `${seriesSlugPrefix}-draft`;
    const slug =
      slugSuffix && slugSuffix.length > 1
        ? `${seriesSlugPrefix}-${slugSuffix.replace(/[^a-z0-9-]/gi, '-').replace(/-+/g, '-').toLowerCase()}`
        : baseSlug;

    const title = safeText(parsed.title, 200) || safeText(currentDraft.title, 200);
    const body = safeText(parsed.body, 12000);
    const reflection_question = safeText(parsed.reflection_question, 400) || safeText(currentDraft.reflection_question, 400);
    if (!body) return { ok: false, error: 'Polish produced empty body.' };

    const fromDraft = extractTagsLineFromMarkdown(currentDraft.markdown);
    const tags =
      fromDraft.length > 0 ? fromDraft : [seed.leadership_category, seed.psychological_outcome];
    const markdown = buildRapidWriteMarkdownFromParts(title, body, reflection_question, relatedPreserved, tags);

    return {
      ok: true,
      title,
      slug,
      tags,
      body,
      reflection_question,
      markdown,
      seed_id: seed.id,
    };
  } catch (e) {
    return { ok: false, error: e.message || 'Polish failed' };
  }
}

/** Owner-requested second pass: raise register without changing argument. */
export function wantsRapidWriteManualPolishPass(text) {
  const low = String(text || '').toLowerCase();
  const hasPhrase =
    /\b(editor\s+pass|polish\s+pass|register\s+pass)\b/.test(low) || /\bsecond\s+pass\b/.test(low);
  if (!hasPhrase) return false;
  return /\brapid\s*write\b/.test(low) || /\brw-\d+\b/.test(low);
}

/** Hero image: generate/create (batch or per seed). */
export function wantsGenerateRapidWriteHeroImages(text) {
  const low = String(text || '').toLowerCase();
  if (!/\b(generate|create|make)\b/.test(low)) return false;
  if (!/\b(hero\s+)?images?\b|\bpictures?\b|\bvisuals?\b/.test(low)) return false;
  if (/\b(regenerate|redo|approve)\b/.test(low)) return false;
  return (
    /\brapid\s*write\b/.test(low) ||
    /\ball\s+(draft|drafts|seed|seeds|post|posts)\b/.test(low) ||
    /\brw-\d+\b/.test(low)
  );
}

/**
 * Hero image: regenerate. Must not match common prose-edit phrases like "new paragraphs" / "new layer"
 * (bare "new" + seed id + Rapid Write used to hijack text-revision messages).
 */
export function wantsRegenerateRapidWriteHeroImage(text) {
  const low = String(text || '').toLowerCase();
  const hasRedoVerb =
    /\b(regenerate|redo)\b/.test(low) ||
    /\b(another|a)\s+(hero\s+)?image\b/.test(low) ||
    /\bnew\s+(hero\s+)?image\b/.test(low) ||
    /\b(another|new)\s+picture\b/.test(low);
  if (!hasRedoVerb) return false;
  if (!/\b(hero\s+)?images?\b|\bpictures?\b|\bvisual\b/.test(low) && !/\brw-\d+\b/.test(low)) return false;
  return /\brapid\s*write\b/.test(low) || /\ball\s+(draft|drafts|seed|seeds)\b/.test(low) || /\brw-\d+\b/.test(low);
}

/**
 * True when the owner is clearly asking to edit draft **text** (not hero images).
 * Used so these messages are not routed to the hero-image handler.
 */
export function isRapidWriteDraftTextRevisionMessage(text) {
  const low = String(text || '').toLowerCase();
  const mentionsHeroOrPicture =
    /\b(hero\s+)?images?\b|\bpictures?\b|\bthumbnail\b|\bvisuals?\b/.test(low) ||
    /\b(generate|create|make)\s+.{0,48}\b(image|picture|visual)s?\b/i.test(String(text || '')) ||
    /\b(regenerate|redo)\s+.{0,24}\b(image|picture)s?\b/i.test(String(text || ''));
  if (mentionsHeroOrPicture) return false;
  return (
    /\brevise\b|\brewrite\b|\bre-?edit\b/.test(low) ||
    /\brapid\s*write\s+draft/.test(low) ||
    (/\bcut\b|\bmerge\b|\btighten\b|\bparagraphs?\b/.test(low) && /\brw-\d+/.test(low)) ||
    /\b425\b|\b575\b|\breflection question\b|\bnarrative voice\b|\bno summary\b/.test(low)
  );
}

/** Hero image: approve. */
export function wantsApproveRapidWriteHeroImage(text) {
  const low = String(text || '').toLowerCase();
  if (!/\bapprove\b/.test(low)) return false;
  if (!/\b(hero\s+)?images?\b|\bpictures?\b|\bvisuals?\b|\bthumbnail\b/.test(low) && !/\brw-\d+\b/.test(low)) return false;
  return /\brapid\s*write\b/.test(low) || /\ball\b/.test(low) || /\brw-\d+\b/.test(low);
}
