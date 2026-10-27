/**
 * Every image is held to Bart's design notes before he sees it (2026-10-27).
 *
 * Bart: "Make sure my notes are not just saved, but used to train her." Des is
 * told to judge her own work, but an instruction can be skipped. This check
 * runs in the image tool itself: a vision read of the finished image against
 * every saved note, and a remake with the misses named when it fails.
 */
import Anthropic from '@anthropic-ai/sdk';
import { createCompleteMessage } from '../anthropicCompleteMessage.js';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const CHECK_MODEL = process.env.AUTO_ANTHROPIC_MODEL || 'claude-sonnet-5';

/** Pure: read the checker's answer. */
export function parseDesignCheck(text) {
  const raw = String(text || '').trim().replace(/^```json\s*|\s*```$/g, '').trim();
  const parsed = JSON.parse(raw);
  const misses = (Array.isArray(parsed.misses) ? parsed.misses : []).map((m) => String(m || '').trim()).filter(Boolean).slice(0, 8);
  return { pass: parsed.pass === true && misses.length === 0, misses };
}

/** Pure: the correction added to the prompt for a remake. */
export function correctionFor(misses) {
  return `IMPORTANT CORRECTION: the previous attempt broke the client's standing design notes: ${misses.join('; ')}. Fix each of these specifically while keeping everything else the same.`;
}

/**
 * @returns {Promise<{ ok: boolean, pass: boolean|null, misses: string[], reason?: string }>}
 */
export async function checkImageAgainstNotes({ imageUrl, notes, brief = '' }) {
  const list = (Array.isArray(notes) ? notes : []).filter((n) => n?.note);
  if (!list.length) return { ok: true, pass: true, misses: [] };
  try {
    const res = await fetch(imageUrl);
    if (!res.ok) return { ok: false, pass: null, misses: [], reason: `could not load the image (${res.status})` };
    const data = Buffer.from(await res.arrayBuffer()).toString('base64');
    const media_type = res.headers.get('content-type') || 'image/png';
    const text =
      'You are the art director for a demanding client who started as a designer. Below are the client\'s standing design notes, then the brief for this image, then the image. ' +
      'Check the image against every note that applies to this piece (a note marked for a series or kind of piece applies only when the brief is that series or kind). ' +
      'Be strict: a note only partly honored is a miss. Ignore notes that clearly do not apply.\n\n' +
      `DESIGN NOTES:\n${list.map((n, i) => `${i + 1}. ${n.applies_to && n.applies_to !== 'all' ? `(${n.applies_to}) ` : ''}${n.note}`).join('\n')}\n\n` +
      `BRIEF:\n${String(brief || '').slice(0, 4000)}\n\n` +
      'Respond with ONLY a JSON object: {"pass": true|false, "misses": ["one short line per note the image breaks, naming what is wrong in the picture"]}.';
    const result = await createCompleteMessage(client, {
      model: CHECK_MODEL,
      max_tokens: 400,
      messages: [{ role: 'user', content: [{ type: 'text', text }, { type: 'image', source: { type: 'base64', media_type, data } }] }],
    });
    if (!result.ok) return { ok: false, pass: null, misses: [], reason: result.message || 'check failed' };
    return { ok: true, ...parseDesignCheck(result.text) };
  } catch (err) {
    return { ok: false, pass: null, misses: [], reason: err?.message || 'check failed' };
  }
}
