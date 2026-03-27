/**
 * Meta (Facebook) Pixel — supplemental PageView for in-app (SPA) navigation.
 * Initial load is handled in index.html; this fires when the URL changes via history + popstate.
 */
export const META_PIXEL_ID = '2797928414134351';

export function trackMetaPixelPageView() {
  if (typeof window === 'undefined') return;
  const { fbq } = window;
  if (typeof fbq === 'function') {
    fbq('track', 'PageView');
  }
}
