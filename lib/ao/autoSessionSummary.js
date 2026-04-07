/**
 * Rolling session summary on Auto thread state (Phase 3) — condenses turn-by-turn without replacing the transcript.
 */

function safeText(v, maxLen = 0) {
  const s = String(v || '').trim();
  if (!s) return '';
  return maxLen ? s.slice(0, maxLen) : s;
}

const DEFAULT_MAX = 2800;

/**
 * @param {string} [prev]
 * @param {{ userMessage?: string, receipts?: string[], assistantPreview?: string, mode?: string }} turn
 */
export function appendSessionSummary(prev, turn) {
  const um = safeText(turn?.userMessage, 200);
  const mode = safeText(turn?.mode, 24) || 'auto';
  const rec = Array.isArray(turn?.receipts) ? turn.receipts.filter(Boolean).slice(0, 4).join(' · ') : '';
  const ap = safeText(turn?.assistantPreview, 160);
  const tail = rec || ap;
  const line = `[${mode}] ${um}${tail ? ` → ${safeText(tail, 220)}` : ''}`.trim();
  if (!line || line === `[${mode}]`) return safeText(prev, DEFAULT_MAX);
  const block = [safeText(prev, DEFAULT_MAX), line].filter(Boolean).join('\n');
  return block.length > DEFAULT_MAX ? block.slice(block.length - DEFAULT_MAX) : block;
}
