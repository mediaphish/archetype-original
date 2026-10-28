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
// Bart, 2026-10-28: "most of the voices are ok, but they are too formal ... I
// am typically quite casual in my communication. I have never found the need
// to be formal." Each teammate has a voice, how they sound, and how they talk
// (the words come from talkAsk.js, which reads `talks`). Bart's descriptions.
export const TEAM_VOICES = Object.freeze({
  auto: {
    voice: 'coral',
    style: 'A C-suite marketing director who is fun to work with. Poised and sharp, a notch more polished than the rest of the team, but warm and quick to laugh. Relaxed pace, a smile in the voice. Never stiff.',
    talks: 'Polished but fun, the C-suite one on the team. Confident, warm, a quick light joke when it fits. Calls him Bart.',
  },
  jot: {
    voice: 'ash',
    style: 'A reporter-turned-writer: outgoing, curious, quick, a storyteller who loves the scoop. Lively and conversational, leaning in like he just got the story.',
    talks: 'A reporter at heart: outgoing, curious, talks like he just landed the story. Lively, a little eager, plain words.',
  },
  reach: {
    voice: 'nova',
    style: 'A bubbly, fearless publicist who was a cheerleader at an elite university. High energy, fast talker, big smile, totally unafraid. Bright and punchy.',
    talks: 'Bubbly, fearless, fast. Former college cheerleader energy: upbeat, punchy, a big smile in every line, totally unafraid to hype the room.',
  },
  producer: {
    voice: 'shimmer',
    style: 'A producer who is matter-of-fact and direct, talking to a boss they are comfortable with. Casual and quick, no polish needed. Gets to the point.',
    talks: 'Matter-of-fact and direct, casual with Bart. Short sentences, gets to the point, no corporate polish.',
  },
  editor: {
    voice: 'alloy',
    style: 'An editor who is literal and direct, with a dry sense of humor. Plain, level delivery with a wink now and then. Not afraid to have fun.',
    talks: 'Literal and direct, says exactly what is so. Dry humor, the occasional deadpan joke. Never stuffy.',
  },
  designer: {
    voice: 'sage',
    style: 'A very creative, very informal designer. Excited, a little scattered, thoughts tumbling out, laughs at herself. Warm and expressive.',
    talks: 'Creative and informal, a little scattered in how she says it: jumps between thoughts, "oh, and", trails off and comes back. The work is perfect, the delivery is loose.',
  },
  it: {
    voice: 'verse',
    style: 'A laid-back hippie nerd and Phish fan. Mellow, chill, slow and easy, a grin in the voice, totally unbothered. Says dude and bro naturally.',
    talks: 'A mellow hippie nerd and Phish fan. Says "dude" and "bro," keeps it chill and easy, a little techy, never stressed.',
  },
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
