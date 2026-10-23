/**
 * The one OpenAI image model every image call uses.
 *
 * OpenAI shut down gpt-image-1 on 2026-10-23 (deprecations page, "2026-04-22:
 * Legacy GPT model snapshots"), naming gpt-image-2.5-sunburst or -flare as the
 * replacement. Sunburst is OpenAI's "most capable model for image generation
 * and editing", and nearly every edit here is anchored on a real photo of
 * Bart, so likeness quality wins over speed.
 *
 * Tested live 2026-10-22 against the parameters this codebase sends:
 * generations and edits (image[] form field) work at 1024x1024, 1536x1024,
 * 1024x1536 and auto; input_fidelity is rejected ("does not support the
 * 'input_fidelity' parameter"), so it is only sent to models that take it.
 *
 * OPENAI_IMAGE_MODEL overrides this without a code change.
 */
export const OPENAI_IMAGE_MODEL = String(process.env.OPENAI_IMAGE_MODEL || 'gpt-image-2.5-sunburst').trim();

/** gpt-image-1 took input_fidelity; the 2.5 models reject it outright. */
export function supportsInputFidelity(model = OPENAI_IMAGE_MODEL) {
  return /^gpt-image-1(\b|-)/.test(String(model));
}
