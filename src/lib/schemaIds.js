import seoConfig from '../config/seo.json';

export const SITE_BASE = seoConfig.default.siteUrl.replace(/\/$/, '');
export const ORG_ID = `${SITE_BASE}/#organization`;
export const PERSON_ID = `${SITE_BASE}/#person`;

/** Best available raster AO logo in public/images */
export const ORG_LOGO_URL = `${SITE_BASE}/images/ao-logo-black.png`;

/** Company profiles from Footer.jsx Connect links */
export const ORG_SAME_AS = [
  'https://www.facebook.com/archetypeoriginal',
  'https://www.instagram.com/archetypeoriginal',
  'https://www.linkedin.com/company/archetypeoriginal',
  'https://www.youtube.com/@aovideolibrary',
  'https://x.com/archetypeog',
];

export const orgRef = { '@id': ORG_ID };
export const personRef = { '@id': PERSON_ID };

export function getOrganizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': ORG_ID,
    name: seoConfig.default.siteName,
    url: SITE_BASE,
    logo: ORG_LOGO_URL,
    sameAs: ORG_SAME_AS,
  };
}

export function getPersonJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': PERSON_ID,
    name: 'Bart Paden',
    url: `${SITE_BASE}/meet-bart`,
    description:
      'Founder of Archetype Original with thirty-three years building companies, including building and selling Midwestern Interactive. Author of three books on leadership.',
    jobTitle: 'Founder',
    worksFor: orgRef,
    knowsAbout: [
      'servant leadership',
      'organizational culture',
      'leadership advisory',
      'company building',
    ],
    // Footer social links are company profiles only. Bart can supply personal profile URLs later.
  };
}
