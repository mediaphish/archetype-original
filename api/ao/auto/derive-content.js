/**
 * POST /api/ao/auto/derive-content
 *
 * Takes a published journal slug, reads the full post from disk,
 * and uses the Anthropic API to generate a structured content derivation plan.
 *
 * The derivation plan identifies:
 * - LinkedIn standalone post chunks (full arguments, not teasers)
 * - Quote card seeds (Power says / Servant leadership says pairs or attributed lines)
 * - Instagram post takes
 * - X post one-liners
 * - Carousel candidates
 *
 * Returns the full derivation plan as structured JSON that Auto presents
 * in chat for Bart's review and approval.
 *
 * Body: { slug: string }
 */

import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import Anthropic from '@anthropic-ai/sdk';
import { requireAoSession } from '../../../lib/ao/requireAoSession.js';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function readJournalFile(slug) {
  const filePath = path.join(process.cwd(), 'ao-knowledge-hq-kit/journal', `${slug}.md`);
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, 'utf8');
  const { data, content } = matter(raw);
  return { frontmatter: data, body: content };
}

export default async function handler(req, res) {
  const auth = requireAoSession(req, res);
  if (!auth) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const { slug } = req.body || {};
  if (!slug) {
    return res.status(400).json({ ok: false, error: 'slug is required' });
  }

  const safeSlug = String(slug)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  const journal = readJournalFile(safeSlug);
  if (!journal) {
    return res.status(404).json({ ok: false, error: `Journal file not found: ${safeSlug}` });
  }

  const title = journal.frontmatter?.title || safeSlug;
  const journalUrl = `https://www.archetypeoriginal.com/journal/${safeSlug}`;

  const systemPrompt = `You are Auto, the AI CMO for Archetype Original. You are analyzing a published journal post to generate a content derivation plan.

Bart Paden's voice rules — apply to all derived content:
- Short sentences. Direct. No hedging.
- Never em dashes (— or --)
- No AI filler phrases
- First person where appropriate
- Earned, grounded, a little blunt

You will produce a JSON content derivation plan with these keys:

{
  "linkedin_chunks": [
    {
      "title": "Short descriptor of the argument",
      "body": "Full standalone LinkedIn post text (150-300 words). This is the complete argument, not a teaser. Does not require reading the full post to make sense. Ends with a direct question or statement. Include 3-5 hashtags at end.",
      "source_section": "The section or argument from the original post this comes from"
    }
  ],
  "quote_card_seeds": [
    {
      "format": "power_servant | attributed | standalone",
      "power_line": "Power says: ...",
      "servant_line": "Servant leadership says: ...",
      "or_quote": "Direct line from the post that works as a standalone quote card",
      "source": "The exact line from the post"
    }
  ],
  "instagram_posts": [
    {
      "body": "1-3 sentences max. Punchy. Ends with: Link in bio. Include 5-7 hashtags.",
      "angle": "What specific idea this surfaces"
    }
  ],
  "x_posts": [
    {
      "body": "One sentence under 240 characters including URL space. No hashtags.",
      "source_line": "The line from the post this comes from"
    }
  ],
  "carousel_candidate": {
    "exists": true,
    "section": "The section that works as a carousel",
    "reason": "Why this works as a carousel",
    "slides": ["Slide 1 text", "Slide 2 text", "..."]
  }
}

Return ONLY the JSON object. No preamble. No explanation. No markdown fences.`;

  const userPrompt = `Title: ${title}
URL: ${journalUrl}

Full post:
${journal.body}

Generate the content derivation plan for this post. Identify 3-5 LinkedIn chunks, 4-6 quote card seeds, 2-3 Instagram posts, 3-4 X posts, and evaluate whether a carousel candidate exists. Every piece of derived content must trace back to something actually in the post.`;

  try {
    const response = await client.messages.create({
      model: process.env.AUTO_ANTHROPIC_MODEL || 'claude-sonnet-4-6',
      max_tokens: 4000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const text = response.content?.[0]?.text || '';
    const clean = text.replace(/```json|```/g, '').trim();

    let plan;
    try {
      plan = JSON.parse(clean);
    } catch (e) {
      console.error('[derive-content] Failed to parse derivation JSON:', e.message);
      return res.status(500).json({
        ok: false,
        error: 'Derivation plan generation returned invalid JSON',
        raw: text.slice(0, 500),
      });
    }

    return res.status(200).json({
      ok: true,
      slug: safeSlug,
      title,
      journal_url: journalUrl,
      plan,
    });
  } catch (err) {
    console.error('[derive-content] Anthropic API error:', err?.message || err);
    return res.status(500).json({
      ok: false,
      error: err?.message || 'Content derivation failed',
    });
  }
}
