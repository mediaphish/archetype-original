/**
 * The team's spoken voices for a live talk (2026-10-28, notes/PLAN-talk-mode.md).
 *
 * Bart: "Let's explore voice. I think that would blow them away." Claude
 * writes every word; this only reads Claude's words aloud. Anthropic sells no
 * voices, so speech is one of the things OpenAI covers, like pixels and vectors
 * (scripts/verify-no-openai-text.mjs).
 */
import { getOpenAiKey } from '../openaiKey.js';

export const SPEECH_MODEL = 'gpt-4o-mini-tts';

/** One distinct voice per teammate, so the room can tell them apart by ear. Bart picks. */
// Bart, 2026-10-28: "most of the voices are ok, but they are too formal. Can
// some personality be brought to them?" Each style is how that teammate
// actually sounds in a room, not a narrator.
export const TEAM_VOICES = Object.freeze({
  auto: { voice: 'coral', style: 'Relaxed and genuinely warm, with a little smile in the voice. Talks to Bart like a longtime colleague, enjoying the work. Natural rhythm, light emphasis, a hint of playfulness. Never stiff, never announcer-like.' },
  jot: { voice: 'sage', style: 'A thoughtful writer who loves words. Easygoing, a bit wry, speaks like telling a friend about something just written. Unhurried, conversational, a small laugh in it.' },
  reach: { voice: 'verse', style: 'Upbeat and quick, a publicist with real energy who is a little excited about the idea. Casual, confident, a grin you can hear. Keeps it moving.' },
  producer: { voice: 'shimmer', style: 'Friendly and on top of it, the producer everyone likes. Brisk but warm, a little playful, like she has the clipboard and the coffee. Casual phrasing.' },
  editor: { voice: 'ash', style: 'Dry wit, deadpan, a straight shooter who enjoys pushing back. Low key, a little teasing, never cold. Sounds like a smile is being held back.' },
  designer: { voice: 'ballad', style: 'Creative and animated, talks with her hands. Bright, expressive, a little dramatic about a good look. Warm and fun.' },
  it: { voice: 'echo', style: 'Laid back and reassuring, the IT person who has everything handled. Casual, a little dry humor, totally unbothered. Short and easy.' },
});

/** Pure: the request body for a line spoken by a teammate. */
export function speechRequest(agent, text) {
  const v = TEAM_VOICES[agent] || TEAM_VOICES.auto;
  return {
    model: SPEECH_MODEL,
    voice: v.voice,
    input: String(text || '').slice(0, 1500),
    instructions: v.style,
    response_format: 'mp3',
  };
}

/** Spoken audio (mp3) for one line, or an error. */
export async function speak(agent, text) {
  const key = getOpenAiKey();
  if (!key) return { ok: false, error: 'The voice key is not set up.' };
  if (!String(text || '').trim()) return { ok: false, error: 'Nothing to say.' };
  const res = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(speechRequest(agent, text)),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return { ok: false, error: err?.error?.message || `Voice ${res.status}` };
  }
  return { ok: true, audio: Buffer.from(await res.arrayBuffer()) };
}
