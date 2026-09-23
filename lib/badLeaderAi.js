/**
 * Bad Leader — screening, neutralizing and classifying submitted stories.
 *
 * Every text call here runs on Claude through lib/ao/textModel.js. These called
 * OpenAI directly until 2026-09-23, and Bart's rule is that OpenAI is for image
 * creation only. Embeddings below still use OpenAI, which that rule allows.
 */

import { completeJson, completeText, textModelConfigured } from './ao/textModel.js';

const OPENAI_API_URL = 'https://api.openai.com/v1';
const EMBEDDING_MODEL = 'text-embedding-3-small';

function getOpenAiApiKey() {
  return (process.env.OPEN_API_KEY || '').trim();
}

async function chatJson(systemPrompt, userPrompt, task) {
  if (!textModelConfigured()) throw new Error('ANTHROPIC_API_KEY missing');
  const parsed = await completeJson({ prompt: userPrompt, system: systemPrompt, task, maxTokens: 1500 });
  if (!parsed) throw new Error('Text model returned no usable JSON');
  return parsed;
}

async function chatText(systemPrompt, userPrompt, task, maxTokens = 4000) {
  if (!textModelConfigured()) throw new Error('ANTHROPIC_API_KEY missing');
  const text = await completeText({ prompt: userPrompt, system: systemPrompt, task, maxTokens });
  if (!text) throw new Error('Text model returned nothing');
  return text;
}

export async function runRelevanceCheck(storyText) {
  const systemPrompt = 'You are a content screening system for a leadership research archive.';
  const userPrompt = `Assess whether this submission is relevant for a leadership archive.
Return JSON only with:
{"decision":"approve|flag|reject","reason":"one sentence"}

Reject if spam, nonsense, pure fiction, targeted harassment, violence promotion, illegal activity promotion, or self-harm promotion.
Flag if ambiguous, possible defamation risk, personal relationship context, legal complaint framing, or uncertain fit.
Approve for real organizational leadership experiences.

Story:
${storyText}`;

  return chatJson(systemPrompt, userPrompt, 'classify');
}

export async function detectStoryTone(storyText) {
  const systemPrompt = 'You are a leadership research analyst.';
  const userPrompt = `Classify if this story is mostly dysfunctional or exemplary leadership.
Return JSON only:
{"tone":"dysfunctional|exemplary","confidence":"high|medium|low","reason":"one sentence"}

Story:
${storyText}`;
  return chatJson(systemPrompt, userPrompt, 'classify');
}

export async function neutralizeStory(storyText) {
  const systemPrompt = `You de-identify workplace leadership stories for a public research archive.
Replace real identifiers with plausible fictional substitutes so the narrative stays vivid and readable.
Do not reduce the story to vague pronouns only; keep roles, relationships, and turning points clear.
Preserve paragraph breaks: use a blank line between paragraphs (double newline) in your output.`;
  const userPrompt = `Rewrite the story below for publication:

- Replace every organization or company name with a clearly fictional, unrelated name (not "the company" unless natural).
- Replace every real person's name with a different plausible first name (vary them; keep who did what obvious).
- Remove or generalize exact addresses, exact dates, and uniquely identifying titles where they could reveal someone.
- Keep emotional stakes, sequence of events, behavior, and impact; the story should still feel specific and true.

Return only the rewritten story text, no title or preamble.

Story:
${storyText}`;
  return chatText(systemPrompt, userPrompt, 'analysis');
}

export async function classifyAliConditions(neutralizedText, tone) {
  const systemPrompt = 'You classify stories against seven leadership conditions.';
  const userPrompt = `The seven conditions are clarity, consistency, trust, communication, alignment, stability, drift.
Classify this ${tone} story and return JSON only:
{"conditions":["clarity"],"scoreboard_leadership":true,"confidence":"high|medium|low"}

Mark scoreboard_leadership true only when a dysfunctional story clearly optimizes for metrics, visibility, or credit while harming people.

Story:
${neutralizedText}`;
  return chatJson(systemPrompt, userPrompt, 'classify');
}

export async function createEmbedding(text) {
  const apiKey = getOpenAiApiKey();
  if (!apiKey) throw new Error('OPEN_API_KEY missing');
  const response = await fetch(`${OPENAI_API_URL}/embeddings`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: text.slice(0, 12000),
    }),
  });
  if (!response.ok) {
    const textErr = await response.text();
    throw new Error(`OpenAI embeddings failed: ${textErr}`);
  }
  const data = await response.json();
  return data?.data?.[0]?.embedding || [];
}

export async function buildPatternPrompts(stories, tone) {
  const corpus = stories.join('\n\n---\n\n').slice(0, 120000);
  const systemPrompt = 'You are a leadership research analyst.';
  const userPrompt =
    tone === 'dysfunctional'
      ? `From these dysfunctional leadership stories, generate 5 to 10 pattern prompts.
Format each with:
PATTERN:
BEHAVIOR:
CONDITIONS:
DIAGNOSTIC:

Stories:
${corpus}`
      : `From these exemplary leadership stories, generate 5 to 10 pattern prompts.
Format each with:
PATTERN:
OUTCOME:
CONDITIONS:
REFLECTION:

Stories:
${corpus}`;
  return chatText(systemPrompt, userPrompt, 'analysis');
}
