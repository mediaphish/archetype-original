/**
 * Public Archy: paid tier = deeper retrieval from the corpus (session-scoped).
 * Configure comma- or space-separated session IDs in ARCHY_PAID_SESSION_IDS.
 */

export function isArchyPaidSession(sessionId) {
  const id = String(sessionId || '').trim();
  if (!id) return false;
  const raw = String(process.env.ARCHY_PAID_SESSION_IDS || '');
  const paid = raw
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return paid.includes(id);
}

/**
 * @returns {{ isPaid: boolean, maxDocs: number, maxBodyChars: number, maxPassages: number }}
 */
export function getArchyRetrievalDepth(sessionId) {
  const paid = isArchyPaidSession(sessionId);
  return getArchyRetrievalDepthFromPaid(paid);
}

/**
 * Use when paid tier was resolved async (DB + env).
 *
 * maxDocs/maxBodyChars govern the legacy keyword path, which truncates each
 * document to maxBodyChars measured from its opening. maxPassages governs
 * chunked semantic retrieval (lib/ao/corpusChunks.js), where a passage is
 * already the relevant excerpt and is sent whole — there is no per-document
 * character cap to set, because capping is what made the old path shallow.
 */
export function getArchyRetrievalDepthFromPaid(isPaid) {
  return {
    isPaid: !!isPaid,
    maxDocs: isPaid ? 12 : 5,
    maxBodyChars: isPaid ? 1400 : 800,
    maxPassages: isPaid ? 20 : 8,
  };
}
