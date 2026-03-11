import { getVoiceAnchors } from './voiceAnchors.js';

function safeText(v, maxLen) {
  const s = String(v || '').trim();
  if (!s) return '';
  return maxLen ? s.slice(0, maxLen) : s;
}

function pickSchedulingHint(objectivesByChannel) {
  const ig = objectivesByChannel?.instagram?.objective;
  const x = objectivesByChannel?.x?.objective;
  const li = objectivesByChannel?.linkedin?.objective;

  if (ig === 'reach') return 'Use the morning slot when you want maximum shares.';
  if (x === 'engagement') return 'Use the midday slot when you want replies and discussion.';
  if (li === 'authority') return 'Use the morning slot when leaders are scanning for clarity.';
  if (li === 'leads') return 'Use the midday slot when people are more likely to click and DM.';
  return 'Use the morning slot for reach or midday for conversation.';
}

/**
 * Librarian: “we’ve said this before” + light scheduling hint.
 */
export async function librarianAnnotate({ candidateRow, decision }) {
  const query = [decision?.pull_quote, decision?.why_it_matters, candidateRow?.source_title, candidateRow?.raw_content]
    .filter(Boolean)
    .map((x) => safeText(x, 900))
    .join(' ');

  const matches = await getVoiceAnchors({ queryText: query, limit: 3 });

  const note = matches.length
    ? `We’ve touched this pattern before. These are the closest AO posts: ${matches.map((m) => m.title).join(', ')}.`
    : 'No close match found in AO corpus (may be a fresh angle).';

  return {
    ok: true,
    similarity_notes: {
      note,
      matches: matches.map((m) => ({
        title: m.title,
        url: m.url,
        excerpt: m.excerpt,
      })),
      scheduling_hint: pickSchedulingHint(decision?.objectives_by_channel || {}),
    },
  };
}

