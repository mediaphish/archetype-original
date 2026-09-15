/**
 * A pitch that repeats published work never reaches Bart.
 *
 * 2026-09-15. Bart, after Auto pitched a rerun of "Twenty Points Apart": "I want
 * it to go away if it's already been done or has overlap." A note under the pitch
 * was not enough. When a pitch-shaped reply matches a published post, chat.js
 * discards it and asks the model for a different angle, excluding every post
 * matched so far, and checks that one too. If no clear angle comes back within
 * the attempts allowed, Bart gets a short plain message instead of a repeat.
 */
export const MAX_PITCH_RETRIES = 2;

/** Every matched post so far, once each. */
export function mergeMatches(seen, matches) {
  const bySlug = new Map((seen || []).map((m) => [m.slug, m]));
  for (const m of matches || []) if (!bySlug.has(m.slug)) bySlug.set(m.slug, m);
  return [...bySlug.values()];
}

function describe(m) {
  const when = m.published_at ? `, published ${String(m.published_at).slice(0, 10)}` : '';
  return `"${m.title}" (${m.url}${when})`;
}

/** System instruction for the retry. */
export function buildPitchRetryInstruction(matches) {
  return (
    '## REPLACE THE PITCH: IT REPEATS PUBLISHED WORK\n\n' +
    'Your previous pitch was discarded before Bart saw it. It makes an argument he has already published in:\n' +
    `${(matches || []).map((m) => `- ${describe(m)}`).join('\n')}\n\n` +
    'Write a different pitch. Its central claim must not be the argument of any post above, and it must not ' +
    'restate that argument with new data. You may still link back to one of them if the new claim genuinely ' +
    'extends it. Do not mention the discarded pitch or this check. Do not call tools; reply with the pitch only, ' +
    'in the same format Bart asked for.'
  );
}

/** What Bart sees when every attempt overlapped. */
export function overlapExhaustedReply(matches) {
  return (
    'Every angle I found for this is already covered in what you have published:\n' +
    `${(matches || []).map((m) => `- ${describe(m)}`).join('\n')}\n\n` +
    'Give me a topic, a finding or a direction you want and I will build the pitch from there.'
  );
}
