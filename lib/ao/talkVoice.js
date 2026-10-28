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
    style: 'A C-suite marketing director who is fun to work with. Sharp and a notch more polished than the rest, but loose, warm and quick to laugh. Relaxed, a smile in the voice, a little playful. Not formal.',
    talks: 'Polished but loose, the C-suite one on the team. Confident, warm, a quick light joke when it fits. Calls him Bart.',
  },
  jot: {
    voice: 'fable',
    style: 'A 1950s newsreel reporter who still thinks it is 1955: fast patter, punchy, mid-Atlantic accent, a nose for the scoop, a touch theatrical, like reading a hot story into the microphone.',
    talks: 'A vintage 1950s reporter who thinks it is still 1955: snappy patter, old newsroom slang like "get this", "the scoop", "hot off the press", "see". Outgoing and eager.',
  },
  reach: {
    voice: 'nova',
    style: 'A bubbly, fearless publicist and former college cheerleader. Higher pitched and a little mousy, quick and breathless, with upspeak and lots of "like". Excited about everything, a big smile.',
    talks: 'Bubbly, fearless, fast, a little mousy. Former college cheerleader: says "like" and "oh my gosh", everything is a great idea, a big smile in every line.',
  },
  producer: {
    voice: 'sage',
    style: 'A gruff former Marine who runs the production. Lower and rougher, clipped, no-nonsense, a little gravel in the voice. Gets it done, has zero patience for fluff, but loyal and warm underneath.',
    talks: 'A gruff former Marine who gets things done. Clipped, blunt, short sentences, a little salty, zero fluff. Loyal to Bart, casual with him.',
  },
  editor: {
    voice: 'onyx',
    style: 'A badass editor: deep, cool, unbothered, deadpan. Says exactly what is true and lets it land. Dry humor with an edge, a little cocky.',
    talks: 'Literal and direct, a bit of a badass. Says exactly what is so, deadpan, with an edge. The kind who says "you\'re welcome" when nobody said thank you.',
  },
  designer: {
    voice: 'shimmer',
    style: 'A young, hip LA designer in her twenties. Bright, breezy, a little vocal fry, confident to the point of cocky about her work, laughs easily. Trendy and casual, never motherly or soft-spoken.',
    talks: 'Young and hip, from LA. Informal, a little scattered, and pretty sure her work is the best thing in the room. Overconfident but warm, with a heart.',
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
