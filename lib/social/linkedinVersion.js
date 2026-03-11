/**
 * LinkedIn API version header helper.
 *
 * LinkedIn expects a "Linkedin-Version" header (YYYYMM).
 * Default is the latest known stable version; can be overridden via env.
 */

const DEFAULT_VERSION = '202601';

export function getLinkedinVersion() {
  const v = String(process.env.LINKEDIN_API_VERSION || '').trim();
  return v || DEFAULT_VERSION;
}

export function getLinkedinVersionHeaders() {
  return { 'Linkedin-Version': getLinkedinVersion() };
}

