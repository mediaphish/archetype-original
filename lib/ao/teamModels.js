/**
 * Which model each teammate thinks with in chat and background work.
 *
 * Bart, 2026-10-28, after API spend reached about $100 a day: "Where I need
 * high level work spend the budget. When I don't minimize it without killing
 * the quality." So the top model is kept for the writing that goes out under
 * his name (Jot) and for editing it (Red). Ada's reviews, Cam's coordinating,
 * Vox's scheduling, Des's design direction and Bit's checks run on Sonnet.
 * AUTO_ANTHROPIC_MODEL, when set, still overrides everyone.
 */
export const TOP_MODEL = 'claude-opus-5-5';
export const EVERYDAY_MODEL = 'claude-sonnet-5-5';
const TOP_MODEL_AGENTS = new Set(['jot', 'editor']);

export function teamModelFor(agent) {
  const override = String(process.env.AUTO_ANTHROPIC_MODEL || '').trim();
  if (override && /^claude-/i.test(override)) return override;
  return TOP_MODEL_AGENTS.has(String(agent || '').toLowerCase()) ? TOP_MODEL : EVERYDAY_MODEL;
}

/** Background research and checks that Bart reads but that never go out under his name. */
export function everydayModel() {
  const override = String(process.env.AUTO_ANTHROPIC_MODEL || '').trim();
  return override && /^claude-/i.test(override) ? override : EVERYDAY_MODEL;
}
