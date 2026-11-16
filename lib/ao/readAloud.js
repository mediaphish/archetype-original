/**
 * Read long-form work aloud (Bart, 2026-11-16: "Can we give Auto the ability to
 * read posts to me ... I could easily listen and make notes to the current
 * series while I drive." And: "I would want this on all long form work Auto does.").
 *
 * Claude writes every word; this only turns finished text into speech. Anthropic
 * sells no voices, so speech is one of the things OpenAI covers (same rule as the
 * talk voices in talkVoice.js). One calm narrator voice, not a teammate's
 * character voice. Audio is made once per version of the text and saved, so a
 * replay costs nothing.
 */
import crypto from 'node:crypto';
import { getOpenAiKey } from '../openaiKey.js';
import { SPEECH_MODEL } from './talkVoice.js';

export const NARRATOR = Object.freeze({
  voice: 'ash',
  style:
    'A warm, steady audiobook narrator reading a thoughtful leadership essay to one listener in a car. Natural and unhurried but never slow, clear diction, quiet confidence. Not formal, not dramatic. Read Scripture references naturally (for example "First Samuel twenty-five, verse thirty-three").',
});

// The speech model takes up to about 2,000 tokens per request; stay well under.
const CHUNK_CHARS = 3500;

/** Pure: markdown (with or without frontmatter) to plain text that reads well aloud. */
export function markdownToSpeech(md) {
  let t = String(md || '').replace(/\r\n/g, '\n');
  t = t.replace(/^---\n[\s\S]*?\n---\n?/, '');
  t = t.replace(/```[\s\S]*?```/g, '');
  t = t.replace(/!\[[^\]]*\]\([^)]*\)/g, '');
  t = t.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1');
  t = t.replace(/<[^>]+>/g, '');
  t = t.replace(/https?:\/\/\S+/g, '');
  t = t.replace(/^#{1,6}\s*(.+)$/gm, (_, h) => `${h.trim().replace(/[.:]$/, '')}.\n`);
  t = t.replace(/^\s*[-*+]\s+/gm, '');
  t = t.replace(/^\s*>\s?/gm, '');
  t = t.replace(/(\*\*|__|\*|_|`)/g, '');
  t = t.replace(/^\s*[-*_]{3,}\s*$/gm, '');
  t = t.replace(/\n{3,}/g, '\n\n');
  return t.trim();
}

/** Pure: split text into pieces the speech model accepts, at paragraph or sentence breaks. */
export function chunkForSpeech(text, max = CHUNK_CHARS) {
  const paras = String(text || '').split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const out = [];
  let cur = '';
  const push = () => { if (cur.trim()) out.push(cur.trim()); cur = ''; };
  for (const p of paras) {
    if (p.length > max) {
      push();
      let piece = '';
      for (const s of p.match(/[^.!?]+[.!?]+["')\]]*\s*|[^.!?]+$/g) || [p]) {
        if ((piece + s).length > max) { if (piece.trim()) out.push(piece.trim()); piece = ''; }
        piece += s;
      }
      if (piece.trim()) out.push(piece.trim());
      continue;
    }
    if ((cur + '\n\n' + p).length > max) push();
    cur = cur ? `${cur}\n\n${p}` : p;
  }
  push();
  return out;
}

/** Pure: the version key for a piece of text, so changed text gets new audio. */
export function audioKey(text) {
  return crypto.createHash('sha256').update(`${NARRATOR.voice}|${SPEECH_MODEL}|${text}`).digest('hex').slice(0, 24);
}

/** Pure: rough minutes of audio and the one-time cost in dollars. */
export function estimateListen(text) {
  const words = String(text || '').split(/\s+/).filter(Boolean).length;
  const minutes = words / 160;
  return { words, minutes: Math.round(minutes), dollars: Math.round(minutes * 0.015 * 100) / 100 };
}

async function speakChunk(key, input) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: SPEECH_MODEL, voice: NARRATOR.voice, input, instructions: NARRATOR.style, response_format: 'mp3' }),
    });
    if (res.ok) return Buffer.from(await res.arrayBuffer());
    if (res.status !== 429 && res.status < 500) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `Voice ${res.status}`);
    }
    await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
  }
  throw new Error('The voice service is busy. Try again in a minute.');
}

/** Spoken audio (one mp3) for a whole piece of markdown. */
export async function narrate(markdown, { title = '', concurrency = 4 } = {}) {
  const key = getOpenAiKey();
  if (!key) return { ok: false, error: 'The voice key is not set up.' };
  const body = markdownToSpeech(markdown);
  const text = title && !body.startsWith(title) ? `${title}.\n\n${body}` : body;
  if (!text) return { ok: false, error: 'Nothing to read.' };
  const chunks = chunkForSpeech(text);
  const parts = new Array(chunks.length);
  try {
    let next = 0;
    await Promise.all(Array.from({ length: Math.min(concurrency, chunks.length) }, async () => {
      while (next < chunks.length) {
        const i = next++;
        parts[i] = await speakChunk(key, chunks[i]);
      }
    }));
  } catch (e) {
    return { ok: false, error: e.message };
  }
  return { ok: true, audio: Buffer.concat(parts), key: audioKey(text), chunks: chunks.length, ...estimateListen(text) };
}
