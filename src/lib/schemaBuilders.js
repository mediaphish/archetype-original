import seoConfig from '../config/seo.json';
import { SITE_BASE, orgRef, personRef } from './schemaIds.js';

function pageDescription(pageKey) {
  return seoConfig.pages[pageKey]?.description || seoConfig.default.description;
}

function absoluteUrl(path) {
  if (path.startsWith('http')) return path;
  return `${SITE_BASE}${path.startsWith('/') ? path : `/${path}`}`;
}

export function buildBookSchema({ name, pageKey, path, imagePath, bookFormat, offer }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Book',
    name,
    author: personRef,
    publisher: orgRef,
    url: absoluteUrl(path),
    image: absoluteUrl(imagePath),
    description: pageDescription(pageKey),
    inLanguage: 'en',
  };

  if (bookFormat) {
    schema.bookFormat = bookFormat;
  }

  if (offer) {
    schema.offers = {
      '@type': 'Offer',
      price: offer.price,
      priceCurrency: 'USD',
      url: offer.url,
    };
  }

  return schema;
}

export function buildServiceSchema({
  name,
  serviceType,
  pageKey,
  path,
  areaServed = 'US',
  offer,
}) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name,
    serviceType,
    description: pageDescription(pageKey),
    provider: orgRef,
    url: absoluteUrl(path),
    areaServed,
  };

  if (offer) {
    schema.offers = {
      '@type': 'Offer',
      price: offer.price,
      priceCurrency: 'USD',
      url: offer.url,
    };
  }

  return schema;
}

export function buildBooksItemListSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        url: `${SITE_BASE}/the-room`,
      },
      {
        '@type': 'ListItem',
        position: 2,
        url: `${SITE_BASE}/accidental-ceo`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        url: `${SITE_BASE}/remaining-human`,
      },
    ],
  };
}

export function buildProfilePageSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    url: `${SITE_BASE}/meet-bart`,
    mainEntity: personRef,
  };
}
