/**
 * Run a podcast transcript through Archy with AO corpus context.
 */

import Anthropic from '@anthropic-ai/sdk';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { AO_VOICE_MANIFESTO } from './voiceManifesto.js';
import { getVoiceAnchors } from './voiceAnchors.js';
import { rankDocumentsByQuery, loadKnowledgeDocs } from './corpusPullQuotes.js';
import { parseLooseJson } from './parseLooseJson.js';
import { sanitizeEpisodeFields } from './episodeVoiceSanitize.js';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = process.env.AUTO_ANTHROPIC_MODEL || 'claude-sonnet-4-6';

async function loadExistingCategories() {
  try {
    const path = join(process.cwd(), 'public', 'knowledge.json');
    const raw = await readFile(path, 'utf-8');
    const data = JSON.parse(raw);
    const docs = Array.isArray(data.docs) ? data.docs : [];
    const counts = {};
    for (const d of docs) {
      if (!['journal-post', 'podcast-episode', 'devotional'].includes(d.type)) continue;
      for (const c of d.categories || []) {
        const slug = String(c || '')
          .trim()
          .toLowerCase();
        if (!slug || slug === 'podcast' || slug === 'devotional') continue;
        counts[slug] = (counts[slug] || 0) + 1;
      }
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([cat]) => cat);
  } catch {
    return ['clarity', 'trust', 'communication', 'alignment', 'consistency', 'stability', 'drift'];
  }
}

async function buildCorpusContext(transcript, guest) {
  const query = [transcript.slice(0, 2000), guest?.name, guest?.title].filter(Boolean).join(' ');
  const docs = await loadKnowledgeDocs();
  const { top } = rankDocumentsByQuery(docs, query, { topDocs: 10 });
  const blocks = (top || []).map(({ d }) => {
    const url =
      d.type === 'podcast-episode'
        ? `/podcast/${d.slug}`
        : d.type === 'devotional' || d.type === 'journal-post'
          ? `/journal/${d.slug}`
          : '';
    return `- [${d.type}] ${d.title} (slug: ${d.slug})${url ? ` ${url}` : ''}\n  ${String(d.summary || d.body || '').slice(0, 320)}`;
  });
  return blocks.join('\n\n');
}

/**
 * @param {{
 *   transcript: string,
 *   episode_type?: 'solo' | 'guest',
 *   guest?: { name?: string, title?: string, bio?: string } | null,
 *   recorded_date?: string,
 * }} input
 */
export async function processEpisodeTranscript(input) {
  const transcript = String(input?.transcript || '').trim();
  if (transcript.length < 200) {
    return { ok: false, error: 'transcript must be at least 200 characters' };
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return { ok: false, error: 'ANTHROPIC_API_KEY is not configured' };
  }

  const episodeType = input?.episode_type === 'guest' ? 'guest' : 'solo';
  const guest = input?.guest && typeof input.guest === 'object' ? input.guest : null;
  const existingCategories = await loadExistingCategories();
  const corpusBlock = await buildCorpusContext(transcript, guest);
  const anchors = await getVoiceAnchors({ queryText: transcript.slice(0, 1500), limit: 4 });
  const manifesto = AO_VOICE_MANIFESTO.map((x) => `- ${x}`).join('\n');
  const anchorBlock = anchors.length
    ? anchors.map((a) => `- ${a.title}${a.url ? ` (${a.url})` : ''}: "${a.excerpt}"`).join('\n')
    : '- (no anchors found)';

  const guestBlock =
    episodeType === 'guest' && guest?.name
      ? `Guest: ${guest.name}${guest.title ? `, ${guest.title}` : ''}${guest.bio ? `\nBio: ${guest.bio}` : ''}`
      : 'Guest: none (solo episode)';

  const prompt = `You are Archy processing a podcast transcript for The Archetype Original Podcast.

Write in Bart Paden's voice:
${manifesto}

Voice anchors from the AO corpus:
${anchorBlock}

Hard rules (non-negotiable):
- No em dashes. Use periods or commas instead.
- No AI filler ("it's worth noting," "at its core," "in many ways," "delve," "tapestry").
- Short sentences. Direct statements.
- Ground claims in the transcript and corpus. Do not invent stories not in the transcript.
- related slugs must be real slugs from the corpus index below when possible.

Episode type: ${episodeType}
Recorded date: ${input?.recorded_date || 'unknown'}
${guestBlock}

Existing category slugs (prefer these before proposing new ones):
${existingCategories.join(', ')}

Corpus index (relevant docs):
${corpusBlock || '(no matches)'}

Return ONLY valid JSON with these keys:
- title (string, suggested episode title)
- summary (string, one paragraph for the episode page callout)
- body_md (string, markdown writeup in Bart's voice with ## Summary section and optional blockquote)
- show_notes (array of 3-5 bullet strings)
- key_takeaways (array of 2-4 strings)
- categories (array of slug strings, prefer existing categories)
- tags (array of tag strings, include "podcast")
- related (array of corpus slug strings genuinely connected to this episode)

Transcript:
${transcript.slice(0, 120000)}`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  });

  const textBlock = response.content?.find((b) => b.type === 'text');
  const raw = textBlock?.text?.trim() || '';
  const parsed = parseLooseJson(raw);
  if (!parsed || !parsed.title || !parsed.summary) {
    return { ok: false, error: 'Archy returned invalid episode JSON' };
  }

  const cleaned = sanitizeEpisodeFields({
    title: String(parsed.title || '').trim(),
    summary: String(parsed.summary || '').trim(),
    body_md: String(parsed.body_md || parsed.body || '').trim(),
    show_notes: Array.isArray(parsed.show_notes) ? parsed.show_notes : [],
    key_takeaways: Array.isArray(parsed.key_takeaways) ? parsed.key_takeaways : [],
    categories: Array.isArray(parsed.categories) ? parsed.categories : [],
    tags: Array.isArray(parsed.tags) ? parsed.tags : ['podcast'],
    related: Array.isArray(parsed.related) ? parsed.related : [],
  });

  if (!cleaned.tags.includes('podcast')) cleaned.tags.unshift('podcast');

  return { ok: true, processed: cleaned };
}
