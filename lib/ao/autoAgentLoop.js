/**
 * Phase 4 — optional OpenAI tool-calling agent loop for Auto.
 * Disabled by default. When enabled, future work can route through structured tool proposals + server validation.
 */

export function isAutoAgentToolsEnabled() {
  return String(process.env.AO_AUTO_AGENT_TOOLS || '').trim() === '1';
}

/** Documented tool names for future agent loop (server-side execution only). */
export const AUTO_AGENT_TOOL_NAMES = [
  'corpus_pull_quotes',
  'corpus_theme_search',
  'quote_cards_from_paste',
  'quote_cards_from_corpus_selection',
  'publish_quote_cards_plan',
  'confirm_publish_queue',
  'package_bundle',
];

/**
 * @returns {Promise<{ ok: boolean, skipped?: boolean, reason?: string }>}
 */
export async function runAutoAgentToolLoop() {
  return { ok: false, skipped: true, reason: 'AO_AUTO_AGENT_TOOLS is not enabled or loop not implemented yet' };
}
