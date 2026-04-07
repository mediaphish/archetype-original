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

const RECEIPT_LOG_MAX = 48;
const RECEIPT_LINE_MAX = 400;

/**
 * Append system activity lines to thread.state.receipt_log (not shown as chat bubbles).
 * @param {unknown} prev
 * @param {string[]} newLines
 * @returns {Array<{ at: string, text: string }>}
 */
export function appendReceiptLog(prev, newLines) {
  const prevArr = Array.isArray(prev) ? prev : [];
  const at = new Date().toISOString();
  const lines = (Array.isArray(newLines) ? newLines : [])
    .map((t) => String(t || '').trim())
    .filter(Boolean)
    .map((text) => ({ at, text: text.length > RECEIPT_LINE_MAX ? `${text.slice(0, RECEIPT_LINE_MAX)}…` : text }));
  if (!lines.length) return prevArr.slice(-RECEIPT_LOG_MAX);
  const merged = [...prevArr, ...lines];
  return merged.length > RECEIPT_LOG_MAX ? merged.slice(merged.length - RECEIPT_LOG_MAX) : merged;
}
