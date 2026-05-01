/**
 * Single source of truth for public marketing paths (sitemap + prerender).
 * Excludes product consoles: /ali/*, /ao/*, /operators/*.
 */

export const PUBLIC_STATIC_SITEMAP_ROUTES = [
  { path: '/', priority: '1.0', changefreq: 'weekly' },
  { path: '/meet-bart', priority: '0.9', changefreq: 'monthly' },
  { path: '/archy', priority: '0.9', changefreq: 'monthly' },
  { path: '/consulting', priority: '0.8', changefreq: 'monthly' },
  { path: '/fractional-roles', priority: '0.8', changefreq: 'monthly' },
  { path: '/fractional-roles/cco', priority: '0.7', changefreq: 'monthly' },
  { path: '/operators', priority: '0.65', changefreq: 'monthly' },
  { path: '/ali-eula', priority: '0.25', changefreq: 'yearly' },
  { path: '/culture-science', priority: '0.9', changefreq: 'monthly' },
  { path: '/culture-science/ali', priority: '0.9', changefreq: 'monthly' },
  { path: '/culture-science/ali/dashboard', priority: '0.8', changefreq: 'monthly' },
  { path: '/culture-science/scoreboard-leadership', priority: '0.7', changefreq: 'monthly' },
  { path: '/culture-science/bad-leader-project', priority: '0.7', changefreq: 'monthly' },
  { path: '/journal', priority: '0.9', changefreq: 'weekly' },
  { path: '/faith', priority: '0.9', changefreq: 'weekly' },
  { path: '/faqs', priority: '0.8', changefreq: 'weekly' },
  { path: '/contact', priority: '0.7', changefreq: 'monthly' },
  { path: '/engagement-inquiry', priority: '0.8', changefreq: 'monthly' },
  { path: '/the-room', priority: '0.85', changefreq: 'monthly' },
  { path: '/books', priority: '0.85', changefreq: 'monthly' },
  { path: '/advisory', priority: '0.9', changefreq: 'monthly' },
  { path: '/what-i-do', priority: '0.8', changefreq: 'monthly' },
  { path: '/accidental-ceo', priority: '0.9', changefreq: 'monthly' },
  { path: '/remaining-human', priority: '0.8', changefreq: 'monthly' },
  { path: '/privacy-policy', priority: '0.3', changefreq: 'yearly' },
  { path: '/terms-and-conditions', priority: '0.3', changefreq: 'yearly' },
];

/** Paths only, for prerender (deduped order preserved). */
export function getPublicStaticPaths() {
  return PUBLIC_STATIC_SITEMAP_ROUTES.map((r) => r.path);
}
