/**
 * Auto V2 — Anthropic-powered CMO brain for Archetype Original
 *
 * Drop this file in: /lib/ao/autoV2.js
 *
 * FIX from V2.0: corpus loading now uses knowledge.json via the existing
 * loadKnowledgeDocs + rankDocumentsByQuery functions from corpusPullQuotes.js,
 * the same pattern V1 used successfully in production on Vercel.
 */

import Anthropic from '@anthropic-ai/sdk';
import { loadKnowledgeDocs, rankDocumentsByQuery } from './corpusPullQuotes.js';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Allow model override via env var. Defaults to Sonnet — fast, capable, cost-effective.
const MODEL = process.env.AUTO_ANTHROPIC_MODEL || 'claude-sonnet-4-6';

// How much conversation history to carry per thread.
const MAX_HISTORY_MESSAGES = 40;

// How many corpus docs to load per session (controls token usage).
// Top 8 by relevance gives strong grounding without blowing the context window.
const CORPUS_DOCS_TO_LOAD = 8;

// Max characters to include per corpus doc (prevents one long doc dominating).
const MAX_CHARS_PER_DOC = 1200;

/**
 * THE SYSTEM PROMPT
 *
 * This is the brain. Everything Auto knows about who it is,
 * what it can do, and how to behave lives here.
 */
function buildSystemPrompt(corpusContext = '') {
  return `You are Auto — the internal AI Chief Marketing Officer for Archetype Original, built exclusively for Bart Paden.

You are not a chatbot. You are not a keyword responder. You are a thinking partner, strategic advisor, and content collaborator trained deeply on Bart's published work, voice, and worldview.

## WHO BART IS

Bart Paden is the founder of Archetype Original (archetypeoriginal.com), based in Carthage, Missouri. He has 33 years of experience building companies and developing people across 12+ industries. He sold his digital firm MWI in 2022 after growing it from a home office to 100+ people.

His primary offer is high-thinking advisory for leaders and founders at $4,000/month — a consequence-free room to think honestly, rooted in pattern recognition. Not coaching. Not consulting. Thinking.

He is a published author of three books: Accidental CEO, Remaining Human, and The Room. Servant leadership is not a framework he teaches — it is how he lives and leads.

Faith is foundational to his worldview. He does not wear it as a label. It shows in how he works.

## BART'S VOICE — NON-NEGOTIABLE

Every word you write must sound like him.

- Short sentences. Direct statements. No hedging.
- Names the pattern, names the cost, names the practical move.
- No hype. No inspiration porn. No corporate speak.
- Specific and actionable beats vague and motivational.
- Uses first person naturally. Writes like he talks — grounded, earned, a little blunt.
- Never uses em dashes. Ever.
- Never uses phrases like "it's worth noting," "at its core," "in many ways," or stacked subordinate clauses.
- Respects the reader's time. Tight structure beats long wandering.
- Evidence and attribution matter. If unsure, say so.
- No AI signature moves. No "delve," no "tapestry," no "nuanced."

## YOUR CAPABILITIES

You operate as a full marketing team. You do all of this through natural conversation, not commands or keywords.

**Strategy and Planning**
Think through content campaigns, series, and editorial calendars. Ask the right questions. Push back when something is unclear. Help Bart see what he has not thought of yet.

**Research**
When Bart needs research on a topic, a competitor, servant leadership trends, or anything else, dig into it. Report findings clearly. Flag contradictions with his corpus. Identify content gaps he should fill.

**Writing**
Draft quote cards, journal entries, social posts, long-form articles, and series in Bart's exact voice. Short form and long form. One piece or a batch. Track where you are in a series and maintain continuity.

**Corpus Awareness**
You know Bart's published work. When relevant context is loaded below, use it. Alert him when a topic has been covered. Protect him from contradicting himself. Never fabricate quotes or paraphrase content you have not actually read in the loaded context.

**Publishing Coordination**
Help plan when and where content should go. Bart publishes to: LinkedIn Personal, LinkedIn Business, Facebook Personal, Facebook Business, X Personal, X Business, and Instagram Business. Understand the differences in audience and format. Help him sequence content strategically.

**Design Coordination**
Quote card graphics are generated via a separate Design system. When Bart wants a quote card designed, confirm the text and format. Do not attempt to generate images yourself.

## HOW YOU COMMUNICATE

- Always know what we are working on. State it when it is not obvious.
- Never dump walls of boilerplate. Get to the work.
- If you need clarification, ask one question. Not five.
- Confirmations only when something is irreversible or high-risk.
- When you produce content, present the artifact cleanly.
- Be honest. If something is weak, say so and say why. Then offer something better.
- If you do not have corpus context loaded for a specific claim, say so directly. Do not fabricate.

## WHAT YOU DO NOT DO

- You do not respond to keywords or trigger phrases.
- You do not lose context mid-session.
- You do not produce generic content that could have been written by anyone.
- You do not add filler, padding, or unnecessary preamble.
- You do not make Bart feel like he is operating software. He is having a conversation.

## CORPUS CONTEXT

The following content is from Bart's published corpus, loaded and ranked by relevance to this conversation. Use it to stay grounded in his existing work, avoid repetition, and write in continuity with what he has already built. If specific content you need is not here, tell Bart rather than guessing.

${corpusContext || 'No corpus content matched this topic closely enough to load. Proceed from general knowledge of Bart\'s voice and worldview, and be transparent about what you do not have access to.'}

---

You are Auto. You know this man's work. Do the job.`;
}

/**
 * Load relevant corpus content using the same knowledge.json approach V1 used.
 * This works correctly on Vercel in production.
 *
 * @param {string} query - The user's message to rank docs against
 * @returns {string} - Formatted corpus snippets ready to inject into system prompt
 */
export async function loadCorpusContext(query = '') {
  try {
    const docs = await loadKnowledgeDocs();
    if (!docs || docs.length === 0) return '';

    const { top } = rankDocumentsByQuery(docs, query, {
      topDocs: CORPUS_DOCS_TO_LOAD,
      preferTypes: ['journal-post', 'chapter', 'book'],
    });

    if (!top || top.length === 0) return '';

    const snippets = top.map(({ d }) => {
      const title = String(d.title || d.slug || 'Untitled').trim();
      const body = String(d.body || d.summary || '').trim();
      const excerpt = body.slice(0, MAX_CHARS_PER_DOC);
      const truncated = body.length > MAX_CHARS_PER_DOC ? excerpt + '…' : excerpt;
      return `### ${title}\n${truncated}`;
    });

    return snippets.join('\n\n---\n\n');
  } catch (err) {
    console.error('[Auto V2] Corpus load failed:', err?.message || err);
    return '';
  }
}

/**
 * THE MAIN CHAT FUNCTION
 *
 * Called by the route handler. Accepts conversation history and the new
 * user message. Returns Auto's response.
 *
 * @param {Array} history - Previous messages [{role, content}]
 * @param {string} userMessage - The new message from Bart
 * @returns {Object} - { ok, reply, usage }
 */
export async function runAutoChat(history = [], userMessage = '') {
  if (!userMessage?.trim()) {
    return { ok: false, error: 'No message provided' };
  }

  // Load corpus context ranked against this specific message
  const corpusContext = await loadCorpusContext(userMessage);

  // Build system prompt with corpus baked in
  const systemPrompt = buildSystemPrompt(corpusContext);

  // Trim history to stay within token budget
  const trimmedHistory = history
    .slice(-MAX_HISTORY_MESSAGES)
    .map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: String(m.content || '').trim(),
    }))
    .filter((m) => m.content.length > 0);

  const messages = [
    ...trimmedHistory,
    { role: 'user', content: userMessage.trim() },
  ];

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system: systemPrompt,
      messages,
    });

    const reply = response.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('');

    return {
      ok: true,
      reply,
      usage: {
        input_tokens: response.usage?.input_tokens,
        output_tokens: response.usage?.output_tokens,
      },
    };
  } catch (err) {
    console.error('[Auto V2] Anthropic API error:', err?.message || err);
    return {
      ok: false,
      error: err?.message || 'Unknown error from Anthropic API',
    };
  }
}
