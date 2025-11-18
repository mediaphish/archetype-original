import React from 'react';
import { Helmet } from 'react-helmet-async';
import seoConfig from '../config/seo.json';

export default function SEO({ pageKey = 'default' }) {
  const pageData = seoConfig.pages[pageKey] || seoConfig.default;
  const siteUrl = seoConfig.default.siteUrl;
  const canonicalUrl = pageKey === 'default' ? siteUrl : `${siteUrl}/${pageKey}`;

  return (
    <Helmet>
      <title>{pageData.title}</title>
      <meta name="description" content={pageData.description} />
      <meta name="keywords" content={pageData.keywords} />
      <link rel="canonical" href={canonicalUrl} />
      
      {/* Open Graph */}
      <meta property="og:title" content={pageData.title} />
      <meta property="og:description" content={pageData.description} />
      <meta property="og:image" content={`${siteUrl}${pageData.image}`} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={seoConfig.default.siteName} />
      
      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content={seoConfig.default.twitterHandle} />
      <meta name="twitter:title" content={pageData.title} />
      <meta name="twitter:description" content={pageData.description} />
      <meta name="twitter:image" content={`${siteUrl}${pageData.image}`} />
    </Helmet>
  );
}
