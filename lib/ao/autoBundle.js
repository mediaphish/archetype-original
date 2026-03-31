import matter from 'gray-matter';
import { getOpenAiKey } from '../openaiKey.js';
import { generateReadyPostDrafts } from './readyPostSocialDrafts.js';
import { draftQuotePost } from './draftQuotePost.js';

function safeText(v, maxLen = 0) {
  const s = String(v || '').trim();
  if (!s) return '';
  return maxLen ? s.slice(0, maxLen) : s;
}

function titleCase(s) {
  return String(s || '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 12)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function inferTitle(text) {
  const firstLine = safeText(String(text || '').split('\n').map((x) => x.trim()).filter(Boolean)[0], 120);
  if (!firstLine) return 'Untitled';
  if (firstLine.length <= 80) return firstLine;
  return titleCase(firstLine.slice(0, 80));
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function extractSummary(text) {
  const cleaned = String(text || '').replace(/\s+/g, ' ').trim();
  if (!cleaned) return '';
  return cleaned.length > 220 ? `${cleaned.slice(0, 217).trim()}...` : cleaned;
}

function scheduleSuggestion() {
  const now = new Date();
  const suggestion = {};
  const addHours = (hours) => {
    const d = new Date(now.getTime() + hours * 60 * 60 * 1000);
    d.setMinutes(0, 0, 0);
    return d.toISOString();
  };
  suggestion.linkedin = addHours(24);
  suggestion.facebook = addHours(26);
  suggestion.instagram = addHours(30);
  suggestion.x = addHours(25);
  return suggestion;
}

async function openAiJson(prompt, maxTokens = 1200) {
  const apiKey = getOpenAiKey();
  if (!apiKey) return null;
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.AO_AUTO_MODEL || 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: maxTokens,
        temperature: 0.2,
      }),
    });
    if (!res.ok) return null;
    const json = await res.json().catch(() => ({}));
    const content = json.choices?.[0]?.message?.content?.trim() || '';
    if (!content) return null;
    try {
      return JSON.parse(content);
    } catch {
      const start = content.indexOf('{');
      const end = content.lastIndexOf('}');
      if (start >= 0 && end > start) return JSON.parse(content.slice(start, end + 1));
      return null;
    }
  } catch {
    return null;
  }
}

export async function detectQualityAlarm({ text } = {}) {
  const source = safeText(text, 6000);
  if (!source) return { has_issue: false };

  const obviousBadWordTypos = [
    { wrong: ' shit ', right: ' shirt ' },
    { wrong: ' assesment', right: ' assessment' },
  ];
  const padded = ` ${source.toLowerCase()} `;
  for (const rule of obviousBadWordTypos) {
    if (padded.includes(rule.wrong)) {
      return {
        has_issue: true,
        issue_type: 'major_typo',
        explanation: 'This looks like an embarrassing typo that could change the meaning publicly.',
        before: rule.wrong.trim(),
        after: rule.right.trim(),
      };
    }
  }

  const parsed = await openAiJson(`You are a strict quality alarm for a finished post.

Your only job is to decide whether there is a MAJOR issue that should block packaging even when the user said "don't refine".

High bar only. Flag ONLY:
- embarrassing typo / accidental profanity
- meaning-breaking grammar error
- likely false factual claim
- obvious tone/brand risk that could backfire publicly

Do NOT flag stylistic preferences or "better writing."

Return ONLY JSON:
{
  "has_issue": boolean,
  "issue_type": "major_typo" | "factual_risk" | "tone_risk" | "grammar_break" | null,
  "explanation": string,
  "before": string,
  "after": string
}

Post:
${JSON.stringify(source)}`);

  if (!parsed || typeof parsed !== 'object') return { has_issue: false };
  return {
    has_issue: !!parsed.has_issue,
    issue_type: parsed.issue_type || null,
    explanation: safeText(parsed.explanation, 300),
    before: safeText(parsed.before, 240),
    after: safeText(parsed.after, 240),
  };
}

export async function extractPullQuotes({ text, max = 4 } = {}) {
  const source = safeText(text, 7000);
  if (!source) return [];

  const parsed = await openAiJson(`Extract ${Math.max(2, Math.min(8, Number(max || 4)))} strong pull quotes from this finished post.

Rules:
- 8 to 25 words each
- memorable, concrete, leadership-forward
- no duplicates
- return ONLY JSON: { "quotes": string[] }

Post:
${JSON.stringify(source)}`, 800);

  if (parsed && Array.isArray(parsed.quotes) && parsed.quotes.length) {
    return parsed.quotes.map((q) => safeText(q, 180)).filter(Boolean).slice(0, max);
  }

  return source
    .split(/(?<=[.!?])\s+/)
    .map((s) => safeText(s, 180))
    .filter((s) => s.length >= 20 && s.length <= 140)
    .slice(0, max);
}

export function buildJournalMarkdown({ title, text, imageFilename = '' } = {}) {
  const finalTitle = safeText(title, 140) || inferTitle(text);
  const body = String(text || '').trim();
  const data = {
    title: finalTitle,
    slug: finalTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
    publish_date: todayIsoDate(),
    created_at: todayIsoDate(),
    updated_at: todayIsoDate(),
    summary: extractSummary(body),
    categories: [],
    featured_image: imageFilename ? `../images/${imageFilename}` : null,
    takeaways: [],
    applications: [],
    related: [],
    status: 'published',
  };
  return matter.stringify(body, data);
}

export async function buildAutoBundle({
  title = '',
  text = '',
  channels = ['linkedin', 'facebook', 'instagram', 'x'],
  imageAttachment = null,
} = {}) {
  const sourceText = String(text || '').trim();
  if (!sourceText) return { ok: false, error: 'text_required' };

  const finalTitle = safeText(title, 140) || inferTitle(sourceText);
  const social = await generateReadyPostDrafts({ markdown: sourceText, title: finalTitle, channels });
  if (!social.ok) return { ok: false, error: social.error || 'draft_generation_failed' };

  const pullQuotes = await extractPullQuotes({ text: sourceText, max: 4 });
  const companions = [];
  for (const quote of pullQuotes.slice(0, 4)) {
    const draft = await draftQuotePost({ quote_text: quote });
    companions.push({
      quote,
      drafts_by_channel: draft.ok ? draft.drafts_by_channel : {},
      hashtags_by_channel: draft.ok ? draft.hashtags_by_channel : {},
      first_comment_suggestions: draft.ok ? draft.first_comment_suggestions : {},
    });
  }

  return {
    ok: true,
    title: finalTitle,
    summary: extractSummary(sourceText),
    journal_markdown: buildJournalMarkdown({
      title: finalTitle,
      text: sourceText,
      imageFilename: imageAttachment?.file_name || '',
    }),
    channel_drafts: social,
    pull_quote_companions: companions,
    schedule_suggestion: scheduleSuggestion(),
    attachment_refs: imageAttachment ? [{ id: imageAttachment.id, file_name: imageAttachment.file_name, label: imageAttachment.label || '' }] : [],
  };
}
