import { getOpenAiKey } from '../openaiKey.js';

function safeText(v, maxLen) {
  const s = String(v || '').trim();
  if (!s) return '';
  return maxLen ? s.slice(0, maxLen) : s;
}

function clampArray(arr, max) {
  return (Array.isArray(arr) ? arr : []).slice(0, max);
}

function normalizeTags(arr) {
  const raw = Array.isArray(arr) ? arr : [];
  const out = [];
  const seen = new Set();
  for (const x of raw) {
    const s = String(x || '').trim().toLowerCase();
    if (!s) continue;
    if (seen.has(s)) continue;
    seen.add(s);
    out.push(s.slice(0, 24));
  }
  return out.slice(0, 10);
}

function fallbackBrief({ rawInput, sourceUrl }) {
  const text = safeText(rawInput, 1600);
  const title = text.split(/\n+/).find((l) => l.trim().length >= 8)?.trim().slice(0, 90) || 'Untitled idea';
  const missing = [
    'What’s the concrete story or example you want to use?',
    'Who is the audience (leaders, managers, teams) and what pressure are they under?',
    'What is the “practical move” you want the reader to make next?',
  ];
  return {
    ok: true,
    title_suggestion: title,
    content_kind: 'other',
    ao_lane: 'Leadership clarity',
    topic_tags: ['leadership'],
    why_it_matters: 'This could be worth sharing, but it needs one concrete example and a clearer “next move” for the reader.',
    angles: [
      { title: 'Pattern + cost + move', bullets: ['Name the pattern', 'Name the cost', 'Name the practical move'] },
      { title: 'Question-first', bullets: ['Lead with a question', 'Give one hard-earned insight', 'Invite comments'] },
      { title: 'Micro-story', bullets: ['Tell a short story (3–5 lines)', 'Extract the principle', 'Give the next step'] },
    ],
    risks: [
      { risk: 'Too generic', note: 'Add a real example or a sharper claim.' },
      { risk: 'Missing “next move”', note: 'What should a leader do tomorrow morning?' },
    ],
    recommended_next_step: sourceUrl ? 'Shape into a short post, then draft channel versions.' : `Add a source link (optional) and clarify the example, then draft.`,
    what_is_missing: missing,
  };
}

async function openAiJson(prompt) {
  const apiKey = getOpenAiKey();
  if (!apiKey) return null;
  const model = process.env.AO_IDEAS_MODEL || 'gpt-4o-mini';
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1200,
    }),
  });
  if (!res.ok) return null;
  const json = await res.json().catch(() => ({}));
  const content = json.choices?.[0]?.message?.content?.trim() || '';
  if (!content) return null;
  try {
    return JSON.parse(content);
  } catch {
    // Common failure mode: fenced blocks or extra text. Try to recover the first JSON object.
    const start = content.indexOf('{');
    const end = content.lastIndexOf('}');
    if (start >= 0 && end > start) {
      const slice = content.slice(start, end + 1);
      return JSON.parse(slice);
    }
    return null;
  }
}

/**
 * Shape a raw idea into a decision-ready brief.
 */
export async function shapeIdeaBrief({ rawInput, sourceUrl } = {}) {
  const text = safeText(rawInput, 6000);
  const link = safeText(sourceUrl, 900);
  if (!text) return { ok: false, error: 'raw_input_required' };

  if (!getOpenAiKey()) {
    return fallbackBrief({ rawInput: text, sourceUrl: link });
  }

  const prompt = `You are AO Ideas — a senior content researcher sitting across the table from Bart.\n\nGoal:\nTurn the raw input into a decision-ready brief.\nThis is NOT writing the final post; it is the “researcher handoff” that makes approval possible.\n\nHard rules:\n- High bar: it is OK to recommend HOLD or DISCARD.\n- No generic inspiration. No clichés. No filler.\n- No politics. No rage bait. No dunking.\n- If input is vague, say what is missing (example, data, story, practical move) rather than pretending.\n\nStyle:\n- Bart voice: clear, grounded, accountable.\n- Name the pattern, name the cost, name the practical move.\n\nInput:\n- raw_input: ${JSON.stringify(text)}\n- optional_source_url: ${JSON.stringify(link)}\n\nReturn ONLY JSON with exactly these keys:\n- title_suggestion (string)\n- content_kind (string: quote|research|framework|story|trend|other)\n- ao_lane (string)\n- topic_tags (string[])\n- why_it_matters (string, 2-4 sentences)\n- angles (array of 3-5 objects: { title, bullets: string[] })\n- risks (array of 0-5 objects: { risk, note })\n- recommended_next_step (string)\n- what_is_missing (string[])\n\nNotes:\n- Make angles meaningfully different (not rephrases).\n- Bullets should be concrete (what Bart would actually do next).\n- If recommending HOLD or DISCARD, say so clearly in recommended_next_step.\n`;

  try {
    const parsed = await openAiJson(prompt);
    if (!parsed || typeof parsed !== 'object') return fallbackBrief({ rawInput: text, sourceUrl: link });

    const angles = clampArray(parsed.angles, 5).map((a) => ({
      title: safeText(a?.title, 80) || 'Angle',
      bullets: clampArray(a?.bullets, 6).map((b) => safeText(b, 140)).filter(Boolean),
    }));
    const risks = clampArray(parsed.risks, 5).map((r) => ({
      risk: safeText(r?.risk, 60),
      note: safeText(r?.note, 160),
    })).filter((r) => r.risk || r.note);

    return {
      ok: true,
      title_suggestion: safeText(parsed.title_suggestion, 120),
      content_kind: safeText(parsed.content_kind, 24) || 'other',
      ao_lane: safeText(parsed.ao_lane, 80) || 'Leadership clarity',
      topic_tags: normalizeTags(parsed.topic_tags),
      why_it_matters: safeText(parsed.why_it_matters, 900),
      angles,
      risks,
      recommended_next_step: safeText(parsed.recommended_next_step, 220),
      what_is_missing: clampArray(parsed.what_is_missing, 8).map((x) => safeText(x, 140)).filter(Boolean),
    };
  } catch {
    return fallbackBrief({ rawInput: text, sourceUrl: link });
  }
}

