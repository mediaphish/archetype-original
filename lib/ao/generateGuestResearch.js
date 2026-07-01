/**
 * AI guest research brief + suggested interview questions.
 */
import Anthropic from '@anthropic-ai/sdk';
import { rankDocumentsByQuery, loadKnowledgeDocs } from './corpusPullQuotes.js';
import { parseLooseJson } from './parseLooseJson.js';
import { normalizeSocialLinks } from './guestIntakeStore.js';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = process.env.AUTO_ANTHROPIC_MODEL || 'claude-sonnet-4-6';

const GUEST_QUESTION_LABELS = [
  "What's something people get wrong about you?",
  "Where are you right now that you didn't expect to be five years ago?",
  "What's a story from your life you think about more than people would guess?",
  "What are you into right now? Books, shows, hobbies, whatever.",
  'What else do you want us to know?',
];

function extractAssistantText(response) {
  if (!response?.content) return '';
  return response.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('\n')
    .trim();
}

function formatGuestContext(guest) {
  const social = normalizeSocialLinks(guest.social_links);
  const answers = GUEST_QUESTION_LABELS.map((q, i) => {
    const key = `question_${i + 1}`;
    const ans = String(guest[key] || '').trim();
    return ans ? `${q}\n${ans}` : null;
  })
    .filter(Boolean)
    .join('\n\n');

  return {
    name: guest.name || '',
    bio: guest.bio_md || '',
    website: guest.website || '',
    company: guest.company || '',
    socialText: social.map((s) => `${s.platform}: ${s.url}`).join('\n'),
    answers,
  };
}

async function callClaude({ prompt, useWebSearch = false }) {
  const params = {
    model: MODEL,
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  };

  if (useWebSearch) {
    params.tools = [{ type: 'web_search_20250305', name: 'web_search', max_uses: 5 }];
  }

  const response = await client.messages.create(params);
  return extractAssistantText(response);
}

/**
 * @param {object} guest — ao_podcast_guests row
 */
export async function generateGuestResearchBrief(guest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { ok: false, error: 'ANTHROPIC_API_KEY is not configured' };
  }

  const ctx = formatGuestContext(guest);
  const prompt = `You are preparing Bart Paden to interview ${ctx.name} on The Archetype Original Podcast.

Guest submitted:
- Bio: ${ctx.bio || '(none)'}
- Website: ${ctx.website || '(none)'}
- Company: ${ctx.company || '(none)'}
- Social links:
${ctx.socialText || '(none)'}
- Their answers to five questions:
${ctx.answers || '(none)'}

Search the web for reliable, current information about this person. Look for:
- Their professional background and what they're known for
- Recent work, projects, or public statements
- Any interviews, talks, or written pieces they've published
- What they care about most publicly

Then return a structured brief with:
1. WHO THEY ARE (3-4 sentences, factual, sourced only from what you found)
2. WHAT THEY'VE BUILT OR DONE (bullet list, specific)
3. WHAT THEY CARE ABOUT (patterns from their public work)
4. WHAT'S FINDABLE THAT MOST INTERVIEWERS MISS (one or two things worth knowing)
5. RELIABILITY NOTE (flag anything you couldn't verify or that seems thin)

Be direct. No filler. If you can't find reliable information, say so plainly.`;

  try {
    const brief = await callClaude({ prompt, useWebSearch: true });
    if (!brief) return { ok: false, error: 'Empty research response' };
    return { ok: true, research_brief: brief };
  } catch (e) {
    console.error('[generateGuestResearchBrief]', e);
    return { ok: false, error: e.message || 'Research generation failed' };
  }
}

function formatSuggestedQuestionsForPrompt(suggested) {
  if (!suggested || typeof suggested !== 'object') return '(none)';
  const sections = [];
  for (const [key, label] of [
    ['person_specific', 'Person-specific'],
    ['ao_theology', 'AO theology connections'],
  ]) {
    const items = Array.isArray(suggested[key]) ? suggested[key] : [];
    if (!items.length) continue;
    sections.push(
      `${label}:\n${items
        .map((item, i) => {
          const q = item?.question || '';
          const why = item?.why ? ` (${item.why})` : '';
          return `${i + 1}. ${q}${why}`;
        })
        .join('\n')}`
    );
  }
  return sections.length ? sections.join('\n\n') : '(none)';
}

/**
 * @param {object} guest — ao_podcast_guests row with research_brief and suggested_questions
 */
export async function generateGuestProducerBrief(guest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { ok: false, error: 'ANTHROPIC_API_KEY is not configured' };
  }
  if (!String(guest.research_brief || '').trim()) {
    return { ok: false, error: 'Generate research brief first.' };
  }

  const ctx = formatGuestContext(guest);
  const questionsText = formatSuggestedQuestionsForPrompt(guest.suggested_questions);

  const prompt = `You are a senior podcast producer preparing Bart Paden for a recording session with ${ctx.name} on The Archetype Original Podcast.

The show's ideology: servant leadership is the most demanding form of leadership. The burden you choose to pick up. If you grow people you grow the organization. The show is for anyone who carries responsibility for other people — not just executives, everyone.

Guest record:
- Name: ${ctx.name}
- Company: ${ctx.company || '(none)'}
- Bio: ${ctx.bio || '(none)'}
- Website: ${ctx.website || '(none)'}
- Social links:
${ctx.socialText || '(none)'}
- Intake answers:
${ctx.answers || '(none)'}

Research brief:
${guest.research_brief}

Suggested questions:
${questionsText}

Generate a producer brief Bart reads the morning of recording. Structure it as:

1. THE PERSON IN ONE PARAGRAPH
Who this guest actually is, in plain language. Not their resume. What makes them worth talking to.

2. WHERE THE BEST MATERIAL PROBABLY LIVES
Two or three specific areas in their story or expertise where the conversation is likely to go somewhere real. Be specific to this guest.

3. WHAT TO PUSH ON
One or two things they said in their intake answers or that appear in the research that most interviewers would let slide. Questions that could open something they haven't been asked before.

4. THE AO CONNECTION TO WATCH FOR
Where their story is most likely to connect to servant leadership, the burden of leadership, or the cost of carrying something for someone else. Not forced. Genuine.

5. CONVERSATION SHAPE
A suggested rhythm: what to open with, where to go deep, how to close. Not a script. A shape.

6. ONE THING TO AVOID
Something that would make this conversation feel like every other interview this guest has done.

Be direct. Bart doesn't need encouragement. He needs clarity.`;

  try {
    const brief = await callClaude({ prompt, useWebSearch: false });
    if (!brief) return { ok: false, error: 'Empty producer brief response' };
    return { ok: true, producer_brief: brief };
  } catch (e) {
    console.error('[generateGuestProducerBrief]', e);
    return { ok: false, error: e.message || 'Producer brief generation failed' };
  }
}

async function buildCorpusContext(guest) {
  const ctx = formatGuestContext(guest);
  const query = [ctx.name, ctx.company, ctx.bio.slice(0, 500), ctx.answers.slice(0, 500)]
    .filter(Boolean)
    .join(' ');
  const docs = await loadKnowledgeDocs();
  const { top } = rankDocumentsByQuery(docs, query, { topDocs: 8 });
  return (top || [])
    .map(({ d }) => {
      const url =
        d.type === 'podcast-episode'
          ? `/podcast/${d.slug}`
          : d.type === 'devotional' || d.type === 'journal-post'
            ? `/journal/${d.slug}`
            : '';
      return `- [${d.type}] ${d.title} (slug: ${d.slug})${url ? ` ${url}` : ''}\n  ${String(d.summary || d.body || '').slice(0, 280)}`;
    })
    .join('\n\n');
}

/**
 * @param {object} guest — ao_podcast_guests row with research_brief
 */
export async function generateGuestSuggestedQuestions(guest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { ok: false, error: 'ANTHROPIC_API_KEY is not configured' };
  }
  if (!String(guest.research_brief || '').trim()) {
    return { ok: false, error: 'Generate research brief first.' };
  }

  const ctx = formatGuestContext(guest);
  const corpusBlock = await buildCorpusContext(guest);

  const prompt = `You are helping Bart Paden prepare interview questions for ${ctx.name} on The Archetype Original Podcast.

The show's ideology: servant leadership is not a soft philosophy. It is the most demanding form of leadership that exists. Leadership is the burden you choose to pick up for the people around you. If you grow people, you grow the organization. If you use people, you lose it.

Guest bio and intake answers:
- Bio: ${ctx.bio || '(none)'}
- Website: ${ctx.website || '(none)'}
- Company: ${ctx.company || '(none)'}
- Social links:
${ctx.socialText || '(none)'}
- Question answers:
${ctx.answers || '(none)'}

Research brief:
${guest.research_brief}

AO corpus context (for theology connections):
${corpusBlock || '(no matches)'}

Generate two sets of questions:

SET 1 — PERSON-SPECIFIC (5 questions)
Questions drawn entirely from who this guest is and what they've done. Not generic. Not leadership-themed unless it emerges naturally from their specific story. These should make the guest feel genuinely seen.

SET 2 — AO THEOLOGY CONNECTIONS (5 questions)
Questions that connect this guest's specific story or expertise to servant leadership, culture, the burden of leadership, or the cost of carrying something for someone else. These should feel like a natural extension of the conversation, not a pivot to a different topic.

Format each question as:
- The question itself
- One sentence on why this question matters for this guest specifically

Return ONLY valid JSON in this shape:
{
  "person_specific": [{ "question": "...", "why": "..." }],
  "ao_theology": [{ "question": "...", "why": "..." }]
}

Return 10 questions total (5 per set). Be direct. No preamble.`;

  try {
    const raw = await callClaude({ prompt, useWebSearch: false });
    const parsed = parseLooseJson(raw);
    const person = Array.isArray(parsed?.person_specific) ? parsed.person_specific : [];
    const theology = Array.isArray(parsed?.ao_theology) ? parsed.ao_theology : [];
    if (!person.length && !theology.length) {
      return { ok: false, error: 'Could not parse suggested questions' };
    }
    return {
      ok: true,
      suggested_questions: {
        person_specific: person.slice(0, 5),
        ao_theology: theology.slice(0, 5),
      },
    };
  } catch (e) {
    console.error('[generateGuestSuggestedQuestions]', e);
    return { ok: false, error: e.message || 'Question generation failed' };
  }
}
