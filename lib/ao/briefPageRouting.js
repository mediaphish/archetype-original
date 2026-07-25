/**
 * Shared trigger language for routing pre-recording brief/page requests.
 * Used by both Auto's system prompt and the deterministic server backstop.
 */
export const BRIEF_PAGE_REQUEST_PHRASES = [
  'show brief',
  'show page',
  'brief',
  'guest brief',
  'create the brief',
  'approve the brief',
  'this is approved',
  'take me to the brief',
  'build the show page',
];

export const BRIEF_PAGE_REQUEST_PROMPT =
  '"show brief," "show page," "brief," "guest brief," "create the brief," ' +
  '"approve the brief," "this is approved," "take me to the brief," ' +
  '"build the show page," or similar';

const SPECIFIC_REQUEST_RE =
  /\b(?:show brief|show page|guest brief|create the brief|approve the brief|this is approved|take me to the brief|build the show page)\b/i;
const BARE_BRIEF_RE = /^\s*(?:the\s+)?brief[.!?]?\s*$/i;
const COPY_TEXT_RE =
  /\b(?:as (?:plain )?text|pasteable text|copy[- ]?paste|paste (?:it )?into|email (?:it )?myself|chat version(?: only)?)\b/i;

export function isBriefPageRequest(message) {
  const text = String(message || '').trim();
  if (!text || COPY_TEXT_RE.test(text)) return false;
  return SPECIFIC_REQUEST_RE.test(text) || BARE_BRIEF_RE.test(text);
}

export function extractGuestIdsFromMessages(messages = []) {
  const ids = [];
  const seen = new Set();
  const guestIdRe =
    /\[GUEST_ID:\s*([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\s*\]/gi;

  for (const message of messages) {
    const text = String(message?.content || '');
    let match;
    while ((match = guestIdRe.exec(text)) !== null) {
      const id = match[1].toLowerCase();
      if (!seen.has(id)) {
        seen.add(id);
        ids.push(id);
      }
    }
  }
  return ids;
}

/**
 * A guest has a real prep page only when both the research brief and the
 * question set are saved. suggested_questions is stored as jsonb, so it can
 * arrive as an object, an array, or a string depending on when it was written.
 */
export function isGuestPrepReady(guest) {
  if (!guest) return false;
  if (!String(guest.research_brief || '').trim()) return false;

  const questions = guest.suggested_questions;
  if (questions == null) return false;
  if (Array.isArray(questions)) return questions.length > 0;
  if (typeof questions === 'object') return Object.keys(questions).length > 0;
  return Boolean(String(questions).trim());
}

export function buildBriefNavigationPath(guestIds = []) {
  const ids = Array.from(
    new Set(guestIds.map((id) => String(id || '').trim().toLowerCase()).filter(Boolean))
  );
  if (ids.length === 0) return null;
  if (ids.length === 1) return `/ao/podcast/guest/${ids[0]}`;
  return `/ao/podcast/guest-combined/${ids.join(',')}`;
}
