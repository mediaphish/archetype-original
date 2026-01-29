/**
 * Shared helper for Super Admin email (URL or localStorage).
 * Used by SuperAdminNav, Deletions, Tenants, Intelligence.
 */
export function getSuperAdminEmail() {
  if (typeof window === 'undefined') return '';
  const params = new URLSearchParams(window.location.search);
  const fromUrl = params.get('email');
  if (fromUrl) return fromUrl.trim();
  try {
    const stored = localStorage.getItem('ali_email');
    if (stored) return stored.trim();
  } catch (_) {}
  return '';
}
