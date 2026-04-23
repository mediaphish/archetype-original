import React from 'react';
import { Helmet } from 'react-helmet-async';
import seoConfig from '../config/seo.json';

const siteBase = seoConfig.default.siteUrl.replace(/\/$/, '');

const orgJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: seoConfig.default.siteName,
  url: siteBase,
  logo: `${siteBase}/og-default.jpg`,
  sameAs: [
    'https://www.facebook.com/archetypeoriginal',
    'https://www.instagram.com/archetypeoriginal',
    'https://www.linkedin.com/company/archetypeoriginal',
  ],
};

const personJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Person',
  name: 'Bart Paden',
  url: `${siteBase}/meet-bart`,
  jobTitle: 'Founder',
  worksFor: {
    '@type': 'Organization',
    name: seoConfig.default.siteName,
    url: siteBase,
  },
};

/** Canonical URL follows the real browser path when available (fixes nested routes like /journal/x, /culture-science/ali). */
function resolveCanonical(pageKey) {
  if (typeof window !== 'undefined' && window.location?.pathname) {
    let p = window.location.pathname;
    if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
    if (p === '/') return siteBase;
    return `${siteBase}${p}`;
  }
  if (pageKey === 'default' || pageKey === 'home') return siteBase;
  return `${siteBase}/${pageKey}`;
}

export default function SEO({ pageKey = 'default' }) {
  const pageData = seoConfig.pages[pageKey] || seoConfig.default;
  const canonicalUrl = resolveCanonical(pageKey);

  return (
    <Helmet>
      <title>{pageData.title}</title>
      <meta name="description" content={pageData.description} />
      <meta name="keywords" content={pageData.keywords} />
      <link rel="canonical" href={canonicalUrl} />

      {/* Open Graph */}
      <meta property="og:title" content={pageData.title} />
      <meta property="og:description" content={pageData.description} />
      <meta property="og:image" content={`${siteBase}${pageData.image}`} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={seoConfig.default.siteName} />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content={seoConfig.default.twitterHandle} />
      <meta name="twitter:title" content={pageData.title} />
      <meta name="twitter:description" content={pageData.description} />
      <meta name="twitter:image" content={`${siteBase}${pageData.image}`} />

      <script type="application/ld+json">{JSON.stringify(orgJsonLd)}</script>
      <script type="application/ld+json">{JSON.stringify(personJsonLd)}</script>
    </Helmet>
  );
}
