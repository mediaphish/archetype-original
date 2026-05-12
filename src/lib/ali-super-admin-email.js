/**
 * Shared helper for Super Admin email (URL or localStorage).
 * Used by SuperAdminNav, Deletions, Tenants, Intelligence.
 */
import { getAliSessionEmail } from './magicLinkBrowserSession';

export function getSuperAdminEmail() {
  if (typeof window === 'undefined') return '';
  const params = new URLSearchParams(window.location.search);
  const fromUrl = params.get('email');
  if (fromUrl) return fromUrl.trim();
  const stored = getAliSessionEmail();
  if (stored) return stored;
  return '';
}
