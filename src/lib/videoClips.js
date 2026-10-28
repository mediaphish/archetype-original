/**
 * How a video clip Bart uploads travels in a chat message (2026-10-28).
 * The clip goes to storage; the message carries one line naming it, which the
 * chat draws as a player and the team reads as the clip to post.
 */
const TAG = /^\[Video clip uploaded: (https:\/\/[^\s\]]+)\]$/;

export function videoClipTag(url) {
  return `[Video clip uploaded: ${url}]`;
}

/** Pure: { clips: [url], text } with the tag lines taken out of the text. */
export function splitVideoClips(text) {
  const clips = [];
  const rest = [];
  for (const line of String(text || '').split('\n')) {
    const m = TAG.exec(line.trim());
    if (m) clips.push(m[1]);
    else rest.push(line);
  }
  return { clips, text: rest.join('\n').trim() };
}
