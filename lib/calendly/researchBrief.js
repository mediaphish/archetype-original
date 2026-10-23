/**
 * A real brief on the person Bart is about to sit down with.
 *
 * Bart, 2026-10-23: "I think the one piece that needs to be included in this
 * part of the system is research and writing a real brief on these people."
 *
 * Before the call, Claude searches the public web for the person and their
 * company, then writes a short brief alongside what they wrote when booking.
 * Same approach as the podcast guest research (lib/ao/generateGuestResearch.js).
 *
 * Boundaries, because this is a person who asked for help, not a target:
 *   - Professional and public only: their work, their company, what they have
 *     published or said publicly. No family, health, politics, religion, home
 *     address, finances, or anything found by digging past public pages.
 *   - Names collide. The brief says how sure it is that it found the right
 *     person, and why, and never presents a guess as fact.
 *   - Every claim about them comes from a source listed at the end.
 */

import Anthropic from '@anthropic-ai/sdk';

const MODEL = process.env.AUTO_ANTHROPIC_MODEL || 'claude-opus-5';
const FREE_MAIL = /@(gmail|googlemail|yahoo|hotmail|outlook|live|icloud|me|mac|aol|proton(mail)?|msn|comcast|att|verizon)\./i;

export function emailDomain(email) {
  const e = String(email || '').toLowerCase().trim();
  if (!e.includes('@') || FREE_MAIL.test(e)) return null;
  return e.split('@')[1] || null;
}

export function researchPrompt(row) {
  const a = row.answers || {};
  const qa = (Array.isArray(a.questions_and_answers) ? a.questions_and_answers : [])
    .filter((x) => String(x.answer || '').trim())
    .map((x) => `${x.question}\n${x.answer}`)
    .join('\n\n');
  const domain = emailDomain(row.email);
  return `Bart Paden has a free first conversation (up to ninety minutes) booked with ${row.name}. Bart is a business owner and leadership advisor with 34 years of building companies. Prepare him.

What we know:
- Name: ${row.name}
- Email domain: ${domain || '(personal email, no company domain)'}
- Role they gave: ${row.role || '(not given)'}
- Organization size they gave: ${row.org_size || '(not given)'}
- What they wrote when booking:
${qa || '(nothing beyond the booking)'}

Search the public web for this person and their organization. Start from the email domain when there is one; it is the best way to find the right person.

Stay inside these limits:
- Professional and public information only: their work history, current role, their company (what it does, size, recent news), and anything they have published or said publicly about their work.
- Nothing about family, health, politics, religion, home address, personal finances, or legal matters about them personally. If you come across it, leave it out.
- Many people share names. Only use a source if you are confident it is the same person, and say what made you confident.

Write the brief in plain sentences, no em dashes and no markdown symbols, with each section name on its own line in capitals:

WHO THEY ARE
Two to four sentences. Say how confident you are this is the right person (high, medium, low) and why.

THEIR ORGANIZATION
What it does, roughly how big, anything recent that matters. Say so if you found nothing.

WHAT THEY ARE CARRYING
Read what they wrote when booking closely. What it suggests is going on, in two to four sentences. Mark anything that is your inference.

WORTH ASKING
Three questions Bart could open with, specific to them.

WHAT I COULD NOT CONFIRM
Anything thin, uncertain, or missing.

SOURCES
One line per source you used: title and URL.

If you cannot find them with confidence, say that plainly, skip the guessing, and base the brief on what they wrote.`;
}

/**
 * With web search on, the answer arrives as many text blocks, split wherever a
 * citation starts or ends. Joined with newlines, sentences broke mid-phrase in
 * the first live brief (2026-10-23); they belong together as written.
 */
function textOf(response) {
  return (response?.content || [])
    .filter((b) => b?.type === 'text')
    .map((b) => b.text)
    .join('')
    .trim();
}

/** Plain text for an email: markdown headings, rules and bold markers removed. */
export function plainBrief(text) {
  return String(text || '')
    .replace(/\u2014/g, ',')
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/^\s*-{3,}\s*$/gm, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Every URL the search actually returned, as a backstop for the SOURCES list. */
export function searchedUrls(response) {
  const urls = [];
  for (const block of response?.content || []) {
    if (block?.type !== 'web_search_tool_result' || !Array.isArray(block.content)) continue;
    for (const r of block.content) if (r?.url) urls.push({ title: r.title || r.url, url: r.url });
  }
  return urls;
}

/**
 * @returns {Promise<{ok: boolean, brief?: string, sources?: Array<{title,url}>, error?: string}>}
 */
export async function researchBooking(row, { client = null } = {}) {
  if (!process.env.ANTHROPIC_API_KEY && !client) return { ok: false, error: 'ANTHROPIC_API_KEY is not configured' };
  const anthropic = client || new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4000,
      messages: [{ role: 'user', content: researchPrompt(row) }],
      tools: [{ type: 'web_search_20260209', name: 'web_search', max_uses: 6 }],
    });
    if (response.stop_reason === 'refusal') return { ok: false, error: 'research declined' };
    const brief = plainBrief(textOf(response));
    if (!brief) return { ok: false, error: 'empty research' };
    return { ok: true, brief, sources: searchedUrls(response) };
  } catch (err) {
    return { ok: false, error: err?.message || String(err) };
  }
}
