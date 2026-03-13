/**
 * AO Analyst — decide the best move, pull quote, risks, and per-channel objectives.
 * Uses OpenAI when configured; otherwise returns conservative defaults.
 */

import { getOpenAiKey } from '../openaiKey.js';
import { parseLooseJson } from './parseLooseJson.js';

function safeText(v, maxLen) {
  const s = String(v || '').trim();
  if (!s) return '';
  return maxLen ? s.slice(0, maxLen) : s;
}

function clampScore(n, fallback = 50) {
  const x = Number(n);
  if (!Number.isFinite(x)) return fallback;
  return Math.max(0, Math.min(100, Math.round(x)));
}

function normalizeFlags(arr) {
  const raw = Array.isArray(arr) ? arr : [];
  const out = [];
  const seen = new Set();
  for (const x of raw) {
    const s = String(x || '').trim();
    if (!s) continue;
    const k = s.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(s.slice(0, 80));
  }
  return out.slice(0, 10);
}

function defaultObjectives() {
  return {
    linkedin: { objective: 'authority', rationale: 'Teach a clear leadership principle with executive framing.' },
    facebook: { objective: 'engagement', rationale: 'Invite conversation with a grounded prompt.' },
    instagram: { objective: 'reach', rationale: 'Make the idea highly shareable and simple.' },
    x: { objective: 'engagement', rationale: 'One strong point plus one question.' },
  };
}

function fallbackDecision(row) {
  const isInternal = !!row?.is_internal;
  const url = safeText(row?.source_url || row?.source_slug_or_url, 500);
  const title = safeText(row?.source_title, 300) || safeText(row?.quote_text, 300);
  const excerpt = safeText(row?.source_excerpt, 600) || safeText(row?.raw_content, 600);
  const pull = excerpt ? excerpt.split(/(?<=[.!?])\s+/)[0]?.slice(0, 220) : '';
  const pullQuote = pull || title || '';
  const why = pullQuote ? 'This is a leadership signal worth translating into practical clarity for your audience.' : '';

  const riskFlags = [];
  if (!url) riskFlags.push('Missing link');
  if (!pullQuote) riskFlags.push('No quote-worthy line found');

  const autoDiscard = (!isInternal && !url) || !pullQuote;

  return {
    ok: true,
    auto_discarded: autoDiscard,
    discard_reason: autoDiscard ? (riskFlags[0] || 'Low-signal') : null,
    best_move: autoDiscard ? 'discard' : 'ao_angle_post',
    publishability_score: autoDiscard ? 0 : 55,
    content_kind: isInternal ? 'internal_corpus' : 'external_article',
    ao_lane: 'Leadership clarity',
    topic_tags: ['leadership'],
    pull_quote: pullQuote,
    why_it_matters: why,
    summary_interpretation: excerpt ? `Summary: ${excerpt}` : '',
    risk_flags: normalizeFlags(riskFlags),
    objectives_by_channel: defaultObjectives(),
    alt_moves: [
      { move: 'question_post', why: 'Convert the idea into a prompt that sparks comments.' },
      { move: 'third_party_summary', why: isInternal ? 'Summarize the AO post with a tight takeaway.' : 'Share the source with a short interpretation and attribution.' },
    ],
    quote_card_worthy: false,
    quote_card_reason: 'No model configured',
  };
}

async function openAiJson(prompt) {
  const apiKey = getOpenAiKey();
  if (!apiKey) return null;
  const model = process.env.AO_ANALYST_MODEL || 'gpt-4o-mini';
  const controller = new AbortController();
  const timeoutMs = Math.max(1500, Math.min(12000, Number(process.env.AO_ANALYST_TIMEOUT_MS || 6500)));
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1000,
        temperature: 0.2,
      }),
    });
    if (!res.ok) return null;
    const json = await res.json().catch(() => ({}));
    const content = json.choices?.[0]?.message?.content?.trim() || '';
    if (!content) return null;
    return parseLooseJson(content);
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

/**
 * @param {any} row ao_quote_review_queue row
 */
export async function analystDecision(row) {
  const isInternal = !!row?.is_internal;
  const url = safeText(row?.source_url || row?.source_slug_or_url, 800);
  const sourceName = safeText(row?.source_name, 200);
  const title = safeText(row?.source_title, 300) || safeText(row?.quote_text, 300);
  const author = safeText(row?.source_author, 140);
  const publishedAt = row?.source_published_at ? safeText(row.source_published_at, 40) : '';
  const excerpt = safeText(row?.source_excerpt, 1200);
  const raw = safeText(row?.raw_content, 6000);
  const fallbackQuoteText = safeText(row?.quote_text, 1200);

  if (!getOpenAiKey()) {
    return fallbackDecision(row);
  }

  const prompt = `You are the AO Analyst bot.

Your job: turn the input into a single high-quality candidate that could realistically be approved.

Context:
- This item is ${isInternal ? 'INTERNAL (from AO corpus)' : 'EXTERNAL (third-party source)'}.

Hard rules:
- No rage bait, no dunking, no politics.
- Do not state uncertain things as facts.
- Do not name specific companies/people unless the source explicitly does AND it is essential.
- Avoid metadata dumps.
- If the extracted text looks like navigation/UI junk (e.g., "skip to navigation", "subscribe", "sign in"), auto_discarded=true.
- If this is not meaningfully about leadership, teams, culture, accountability, trust, execution, or decision-making, auto_discarded=true.
- Only choose pull_quote_card when the pull quote is genuinely memorable, specific, and worth turning into an image. Otherwise prefer ao_angle_post, question_post, third_party_summary, or journal_topic.
- Citations:
  - External: include working link + attribution. Keep quoting minimal (pull quote only).
  - Internal: include a working AO link (provided below). Keep quoting minimal.

Input:
- is_internal: ${JSON.stringify(isInternal)}
- source_name: ${JSON.stringify(sourceName || '')}
- title: ${JSON.stringify(title || '')}
- author: ${JSON.stringify(author || '')}
- published_at: ${JSON.stringify(publishedAt || '')}
- url: ${JSON.stringify(url || '')}
- excerpt: ${JSON.stringify(excerpt || '')}
- raw_content (may be partial): ${JSON.stringify(raw || '')}
- fallback_quote_text: ${JSON.stringify(fallbackQuoteText || '')}

Task:
1) Decide the best move (one of): pull_quote_card, third_party_summary, ao_angle_post, question_post, journal_topic, discard
2) Choose ONE best pull quote (<= 25 words). If none, set auto_discarded=true.
3) Classify what this is: content_kind (one of: quote, research, framework, story, trend, internal_corpus, other)
4) Assign an AO lane (ao_lane): a short label like "Leadership under pressure", "Culture drift", "Accountability", "Execution", "Trust", "Team health", etc.
5) Provide topic_tags: 2-6 short tags (lowercase) that match the AO universe.
6) Write why_it_matters (2-4 sentences) in Bart/AO voice.
7) Write summary_interpretation (6-10 sentences): what it says + what it means + one practical angle.
8) Generate risk_flags array (0-6). Include when relevant: Missing link, Hard paywall, Too generic, Off brand, Low-quality source, No quote-worthy line.
9) Decide objectives_by_channel as JSON with keys linkedin/facebook/instagram/x. Each has objective (reach|engagement|authority|leads) and rationale.
10) Provide alt_moves: 2 alternative moves with a short why.
11) Give publishability_score 0-100.
12) Decide quote_card_worthy boolean with a one-sentence quote_card_reason.

Return ONLY a single JSON object with exactly these keys:
auto_discarded (boolean), discard_reason (string|null), best_move (string), publishability_score (number), content_kind (string), ao_lane (string), topic_tags (string[]), pull_quote (string), why_it_matters (string), summary_interpretation (string), risk_flags (string[]), objectives_by_channel (object), alt_moves (array), quote_card_worthy (boolean), quote_card_reason (string)
`;

  try {
    const parsed = await openAiJson(prompt);
    if (!parsed || typeof parsed !== 'object') return fallbackDecision(row);

    const riskFlags = normalizeFlags(parsed.risk_flags);
    const autoDiscarded = !!parsed.auto_discarded;
    const pullQuote = safeText(parsed.pull_quote, 260);
    const bestMove = safeText(parsed.best_move, 40) || (autoDiscarded ? 'discard' : 'ao_angle_post');

    const mustHaveLink = !isInternal;
    const missingLink = mustHaveLink && !url;

    const fallbackAltMoves = [
      { move: 'question_post', why: 'Convert the idea into a prompt that sparks comments.' },
      { move: 'third_party_summary', why: isInternal ? 'Summarize the AO post with a tight takeaway.' : 'Share the source with a short interpretation and attribution.' },
    ];
    const altMovesRaw = Array.isArray(parsed.alt_moves) ? parsed.alt_moves : [];
    const altMovesClean = altMovesRaw
      .map((x) => ({ move: safeText(x?.move, 40), why: safeText(x?.why, 180) }))
      .filter((x) => x.move && x.why)
      .slice(0, 2);
    const altMoves = (altMovesClean.length >= 2 ? altMovesClean : fallbackAltMoves).slice(0, 2);

    return {
      ok: true,
      auto_discarded: autoDiscarded || missingLink || !pullQuote,
      discard_reason: autoDiscarded
        ? safeText(parsed.discard_reason, 140) || 'Auto-discarded'
        : (missingLink ? 'Missing link' : (!pullQuote ? 'No quote-worthy line found' : null)),
      best_move: bestMove,
      publishability_score: clampScore(parsed.publishability_score, 55),
      content_kind: safeText(parsed.content_kind, 40) || (isInternal ? 'internal_corpus' : 'other'),
      ao_lane: safeText(parsed.ao_lane, 80) || 'Leadership clarity',
      topic_tags: normalizeFlags(parsed.topic_tags).map((t) => String(t).toLowerCase()).slice(0, 6),
      pull_quote: pullQuote,
      why_it_matters: safeText(parsed.why_it_matters, 900),
      summary_interpretation: safeText(parsed.summary_interpretation, 3000),
      risk_flags: riskFlags,
      objectives_by_channel: parsed.objectives_by_channel && typeof parsed.objectives_by_channel === 'object' ? parsed.objectives_by_channel : defaultObjectives(),
      alt_moves: altMoves,
      quote_card_worthy: !!parsed.quote_card_worthy,
      quote_card_reason: safeText(parsed.quote_card_reason, 200) || '',
    };
  } catch {
    return fallbackDecision(row);
  }
}

