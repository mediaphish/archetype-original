/**
 * Second Archy pass: map episode transcript to AO corpus connections and thematic threads.
 */

import Anthropic from '@anthropic-ai/sdk';
import { rankDocumentsByQuery, loadKnowledgeDocs } from './corpusPullQuotes.js';
import { parseLooseJson } from './parseLooseJson.js';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = process.env.AUTO_ANTHROPIC_MODEL || 'claude-sonnet-4-6';

const VALID_TYPES = new Set(['journal_post', 'ali_condition', 'book_chapter', 'episode']);
const VALID_STRENGTH = new Set(['direct', 'thematic', 'tangential']);

async function buildCorpusIndexBlock(transcript, researchBrief) {
  const query = [transcript.slice(0, 2500), researchBrief?.slice(0, 800)].filter(Boolean).join(' ');
  const docs = await loadKnowledgeDocs();
  const { top } = rankDocumentsByQuery(docs, query, { topDocs: 20 });
  return (top || [])
    .map(({ d }) => {
      const typeHint =
        d.type === 'podcast-episode'
          ? 'episode'
          : d.type === 'journal-post'
            ? 'journal_post'
            : d.type === 'book' || String(d.slug || '').includes('chapter')
              ? 'book_chapter'
              : String(d.slug || '').includes('ali')
                ? 'ali_condition'
                : 'journal_post';
      return `- type: ${typeHint} | slug: ${d.slug} | title: ${d.title}\n  ${String(d.summary || d.body || '').slice(0, 280)}`;
    })
    .join('\n\n');
}

function sanitizeConnections(arr) {
  if (!Array.isArray(arr)) return [];
  return arr
    .map((row) => ({
      type: VALID_TYPES.has(String(row?.type || '').trim()) ? String(row.type).trim() : 'journal_post',
      slug: String(row?.slug || '').trim(),
      title: String(row?.title || '').trim(),
      connection: String(row?.connection || '').trim(),
      timestamp: String(row?.timestamp || '').trim(),
      strength: VALID_STRENGTH.has(String(row?.strength || '').trim())
        ? String(row.strength).trim()
        : 'thematic',
    }))
    .filter((row) => row.slug && row.title && row.connection);
}

function sanitizeThreads(arr) {
  if (!Array.isArray(arr)) return [];
  return arr
    .map((row) => ({
      thread: String(row?.thread || '').trim(),
      description: String(row?.description || '').trim(),
      suggested_follow_up: String(row?.suggested_follow_up || row?.suggestedFollowUp || '').trim(),
    }))
    .filter((row) => row.thread && row.description);
}

/**
 * @param {{
 *   transcript: string,
 *   research_brief?: string,
 *   episode_brief?: string,
 * }} input
 */
export async function mapEpisodeCorpusConnections(input) {
  const transcript = String(input?.transcript || '').trim();
  if (transcript.length < 200) {
    return { ok: false, error: 'transcript must be at least 200 characters' };
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return { ok: false, error: 'ANTHROPIC_API_KEY is not configured' };
  }

  const researchBrief = String(input?.research_brief || '').trim();
  const episodeBrief = String(input?.episode_brief || '').trim();
  const corpusBlock = await buildCorpusIndexBlock(transcript, researchBrief);

  const prompt = `You are the intelligence layer for Archetype Original, a servant leadership advisory practice built on 33 years of lived experience and 350,000+ words of published methodology.

Your job is to find genuine connections between this podcast episode and the existing AO corpus — not surface-level topic matches, but real thematic threads that extend the ecosystem.

The AO ideology: servant leadership is the most demanding form of leadership. Leadership is the burden you choose to pick up. If you grow people, you grow the organization. If you use people, you lose it. Culture is not a mission statement — it's the environment the leader's behavior produces.

Transcript:
${transcript.slice(0, 100000)}

Research brief:
${researchBrief || '(not provided)'}

Episode brief:
${episodeBrief || '(not provided)'}

Corpus index (use these slugs and types when citing connections):
${corpusBlock || '(no corpus matches)'}

Search the corpus context you have been given. Find:

1. CORPUS CONNECTIONS: Specific moments in this transcript that connect to specific existing AO content. Be precise — cite the timestamp and the specific content it connects to. Only include connections that are genuinely meaningful, not just topically adjacent.

2. THEMATIC THREADS: Broader themes in this episode that connect to the AO ecosystem in ways that could generate future content. Include a suggested follow-up for each thread.

Return only genuine connections. If a connection is thin, leave it out. Quality over quantity.

Return ONLY valid JSON with these keys:
- corpus_connections (array of objects with type, slug, title, connection, timestamp, strength)
- thematic_threads (array of objects with thread, description, suggested_follow_up)

type must be one of: journal_post, ali_condition, book_chapter, episode
strength must be one of: direct, thematic, tangential`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  });

  const textBlock = response.content?.find((b) => b.type === 'text');
  const raw = textBlock?.text?.trim() || '';
  const parsed = parseLooseJson(raw);
  if (!parsed) {
    return { ok: false, error: 'Archy returned invalid corpus mapping JSON' };
  }

  return {
    ok: true,
    corpus_connections: sanitizeConnections(parsed.corpus_connections),
    thematic_threads: sanitizeThreads(parsed.thematic_threads),
  };
}
