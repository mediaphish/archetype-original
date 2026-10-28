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
export const TEAM_VOICES = Object.freeze({
  auto: { voice: 'coral', style: 'Warm, confident and conversational, like a trusted colleague on stage. Unhurried.' },
  jot: { voice: 'sage', style: 'Thoughtful and clear, a writer explaining a draft. Calm pace.' },
  reach: { voice: 'verse', style: 'Bright and energetic, a publicist who knows the room. Brisk.' },
  producer: { voice: 'shimmer', style: 'Organized and steady, a producer running the show. Crisp.' },
  editor: { voice: 'ash', style: 'Direct and dry, an editor who pushes back. Measured.' },
  designer: { voice: 'ballad', style: 'Expressive and visual, a designer describing a look. Light.' },
  it: { voice: 'echo', style: 'Matter of fact and reassuring, IT confirming everything is connected. Short.' },
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
