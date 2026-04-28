const OPENAI_API_URL = 'https://api.openai.com/v1';
const EMBEDDING_MODEL = 'text-embedding-3-small';
const CHAT_MODEL = 'gpt-4o-mini';

function getOpenAiApiKey() {
  return (process.env.OPEN_API_KEY || '').trim();
}

async function openAiChatJSON(systemPrompt, userPrompt) {
  const apiKey = getOpenAiApiKey();
  if (!apiKey) throw new Error('OPEN_API_KEY missing');

  const response = await fetch(`${OPENAI_API_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: CHAT_MODEL,
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenAI chat failed: ${text}`);
  }
  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content || '{}';
  return JSON.parse(content);
}

async function openAiChatText(systemPrompt, userPrompt) {
  const apiKey = getOpenAiApiKey();
  if (!apiKey) throw new Error('OPEN_API_KEY missing');

  const response = await fetch(`${OPENAI_API_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: CHAT_MODEL,
      temperature: 0.2,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenAI chat failed: ${text}`);
  }
  const data = await response.json();
  return (data?.choices?.[0]?.message?.content || '').trim();
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

  return openAiChatJSON(systemPrompt, userPrompt);
}

export async function detectStoryTone(storyText) {
  const systemPrompt = 'You are a leadership research analyst.';
  const userPrompt = `Classify if this story is mostly dysfunctional or exemplary leadership.
Return JSON only:
{"tone":"dysfunctional|exemplary","confidence":"high|medium|low","reason":"one sentence"}

Story:
${storyText}`;
  return openAiChatJSON(systemPrompt, userPrompt);
}

export async function neutralizeStory(storyText) {
  const systemPrompt = 'You neutralize identifying information in workplace stories.';
  const userPrompt = `Rewrite this story and remove names, company names, exact locations, exact dates, unique titles, and identifying details.
Keep behavior, pattern, and impact.
Return only the neutralized story text.

Story:
${storyText}`;
  return openAiChatText(systemPrompt, userPrompt);
}

export async function classifyAliConditions(neutralizedText, tone) {
  const systemPrompt = 'You classify stories against seven leadership conditions.';
  const userPrompt = `The seven conditions are clarity, consistency, trust, communication, alignment, stability, drift.
Classify this ${tone} story and return JSON only:
{"conditions":["clarity"],"scoreboard_leadership":true,"confidence":"high|medium|low"}

Mark scoreboard_leadership true only when a dysfunctional story clearly optimizes for metrics, visibility, or credit while harming people.

Story:
${neutralizedText}`;
  return openAiChatJSON(systemPrompt, userPrompt);
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
  return openAiChatText(systemPrompt, userPrompt);
}
