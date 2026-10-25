/**
 * A very short brief on why a journal entry is worth resharing now.
 *
 * Bart, 2026-10-24, reviewing reshares in the Queue: "I need to see the actual
 * image with the pull quote and the captions. Also I need a very short brief
 * that explains why this is a good reshare. I need a few weeks of this
 * workflow before I go full auto."
 *
 * Two plain sentences for Bart, not for the public: what in the piece lands,
 * and why it is worth putting in front of people again. Written once and kept
 * on the reshare.
 */

import { completeText } from './textModel.js';
import { stripProseDashes } from './archyVoice.js';

export function briefPrompt({ title, pullQuote, selectionReason, caption }) {
  return `Bart Paden is reviewing a reshare of his journal entry "${title}" before it goes to social media.

Pull quote on the image: ${pullQuote || 'none'}
Why it was picked: ${selectionReason || 'it had not been shared in a while'}
The LinkedIn post: ${String(caption || '').slice(0, 1500)}

In two short sentences for Bart, say why this is a good reshare right now: the idea in it that lands, and who it will help or why it is timely. Plain words, no hype, no em dashes, no lists. Do not repeat the quote.`;
}

export async function writeReshareBrief(parts, { complete = completeText } = {}) {
  const text = await complete({ prompt: briefPrompt(parts), task: 'analysis', maxTokens: 600, timeoutMs: 45000 });
  const clean = stripProseDashes(String(text || '').trim()).replace(/\s+/g, ' ');
  return clean.slice(0, 400) || null;
}
