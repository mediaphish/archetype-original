#!/usr/bin/env node
/**
 * Emit fully static HTML for FAQ categories in public/knowledge.json.
 * Crawlers receive every Q&A without executing JS. Runs after vite build + build-knowledge.
 */

import { mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { marked } from 'marked';
import {
  getFaqCategoryLabel,
  groupFaqsByPrimaryCategory,
  faqCategoryKeysWithContent,
} from './lib/faq-categories.mjs';
import { loadPublishedFaqDocs } from './lib/faq-knowledge.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DIST = join(ROOT, 'dist');

const seoPath = join(ROOT, 'src', 'config', 'seo.json');
const seoConfig = JSON.parse(readFileSync(seoPath, 'utf8'));

marked.setOptions({ gfm: true, breaks: true });

function escapeHtml(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function findMainCssHref() {
  const assetsDir = join(DIST, 'assets');
  if (!existsSync(assetsDir)) return null;
  const files = readdirSync(assetsDir).filter((f) => /^index-.*\.css$/i.test(f));
  if (files.length === 0) return null;
  files.sort();
  return `/assets/${files[files.length - 1]}`;
}

/** Find hashed main entry JS from Vite output — this is what boots the React app. */
function findMainJsHref() {
  const assetsDir = join(DIST, 'assets');
  if (!existsSync(assetsDir)) return null;
  const files = readdirSync(assetsDir).filter((f) => /^index-.*\.js$/i.test(f));
  if (files.length === 0) return null;
  files.sort();
  return `/assets/${files[files.length - 1]}`;
}

const STATIC_FAQ_CSS = `
body.shell { margin: 0; font-family: ui-sans-serif, system-ui, sans-serif; background: #FAFAF9; color: #1A1A1A; -webkit-font-smoothing: antialiased; }
.hdr { border-bottom: 1px solid rgba(26,26,26,0.1); background: #fff; }
.hdr-inner { max-width: 72rem; margin: 0 auto; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 1rem; padding: 1rem 1rem; }
@media (min-width: 640px) { .hdr-inner { padding-left: 1.5rem; padding-right: 1.5rem; } }
.logo { font-weight: 600; color: #1A1A1A; text-decoration: none; }
.nav { display: flex; flex-wrap: wrap; gap: 1rem; font-size: 0.875rem; font-weight: 500; }
.nav a { color: #6B6B6B; text-decoration: none; }
.nav a:hover { color: #1A1A1A; }
main.inner { max-width: 48rem; margin: 0 auto; padding: 2.5rem 1rem 3rem; }
@media (min-width: 640px) { main.inner { padding: 3.5rem 1.5rem 4rem; } }
.kicker { margin-bottom: 1rem; font-size: 0.75rem; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #8B7D72; }
h1.title { margin: 0; font-family: Georgia, ui-serif, serif; font-size: clamp(2rem, 5vw, 3rem); font-weight: 700; line-height: 1.15; color: #1A1A1A; }
.lead { margin-top: 1rem; font-size: 1.0625rem; line-height: 1.7; color: #6B6B6B; }
.cat-nav { margin: 2rem 0; padding: 1.25rem; background: #E1DED8; border-radius: 2px; }
.cat-nav p { margin: 0 0 0.75rem; font-size: 0.6875rem; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: #8B7D72; }
.cat-nav ul { margin: 0; padding: 0; list-style: none; display: flex; flex-wrap: wrap; gap: 0.5rem 1rem; }
.cat-nav a { font-size: 0.875rem; color: #DB0812; text-decoration: none; }
.cat-nav a:hover { text-decoration: underline; }
.cat-nav a[aria-current="page"] { color: #2B2929; font-weight: 600; text-decoration: none; }
.faq-item { margin-top: 2.5rem; padding-top: 2rem; border-top: 1px solid rgba(26,26,26,0.1); }
.faq-item:first-of-type { margin-top: 2rem; padding-top: 0; border-top: 0; }
.faq-item h2 { margin: 0 0 1rem; font-family: Georgia, ui-serif, serif; font-size: 1.35rem; font-weight: 600; line-height: 1.35; color: #2B2929; }
.faq-answer { font-size: 1.0625rem; line-height: 1.75; color: rgba(26,26,26,0.92); }
.faq-answer h2 { font-family: Georgia, ui-serif, serif; font-size: 1.35rem; font-weight: 600; margin-top: 1.5rem; margin-bottom: 0.75rem; color: #1A1A1A; }
.faq-answer h3 { font-family: Georgia, ui-serif, serif; font-size: 1.15rem; font-weight: 600; margin-top: 1.25rem; margin-bottom: 0.5rem; color: #1A1A1A; }
.faq-answer p { margin-bottom: 1rem; }
.faq-answer ul, .faq-answer ol { margin: 1rem 0 1rem 1.25rem; }
.faq-answer blockquote { border-left: 4px solid #DB0812; padding-left: 1rem; margin: 1.5rem 0; font-style: italic; color: rgba(26,26,26,0.85); border-radius: 2px; }
.faq-answer a { color: #DB0812; text-decoration: underline; text-underline-offset: 2px; }
.faq-answer strong { font-weight: 600; }
.footer-note { margin-top: 3rem; padding-top: 2rem; border-top: 1px solid rgba(26,26,26,0.1); text-align: center; font-size: 0.875rem; color: #6B6B6B; }
.footer-note a { color: #6B6B6B; text-decoration: underline; }
.footer-note a:hover { color: #1A1A1A; }
`;

function faqPageJsonLd(faqs, answerHtmlBySlug) {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.title,
      acceptedAnswer: {
        '@type': 'Answer',
        text: answerHtmlBySlug.get(faq.slug) || '',
      },
    })),
  });
}

function breadcrumbJsonLd(categoryKey, categoryLabel, siteUrl) {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: siteUrl,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'FAQs',
        item: `${siteUrl}/faqs`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: categoryLabel,
        item: `${siteUrl}/faqs/${categoryKey}`,
      },
    ],
  });
}

function renderCategoryNav(activeKey, categoryKeys) {
  const items = categoryKeys
    .map((key) => {
      const label = getFaqCategoryLabel(key);
      const current = key === activeKey ? ' aria-current="page"' : '';
      return `<li><a href="/faqs/${escapeHtml(key)}"${current}>${escapeHtml(label)}</a></li>`;
    })
    .join('\n        ');
  return `<nav class="cat-nav" aria-label="FAQ categories">
      <p>All FAQ categories</p>
      <ul>
        <li><a href="/faqs"${activeKey === '' ? ' aria-current="page"' : ''}>All FAQs</a></li>
        ${items}
      </ul>
    </nav>`;
}

function wrapPage({
  categoryKey,
  categoryLabel,
  faqs,
  faqBlocksHtml,
  answerHtmlBySlug,
  canonicalUrl,
  siteUrl,
  cssHref,
  jsHref,
  categoryKeys,
}) {
  const pageTitle = `${categoryLabel} FAQs | ${seoConfig.default.siteName}`;
  const desc = escapeHtml(
    `Answers to frequently asked questions about ${categoryLabel} at ${seoConfig.default.siteName}. ${faqs.length} questions with full answers.`.slice(
      0,
      320
    )
  );
  const ogImage = `${siteUrl}/og-default.jpg`;
  const kw = escapeHtml(seoConfig.default.keywords);
  const cssLink = cssHref ? `<link rel="stylesheet" crossorigin href="${escapeHtml(cssHref)}">` : '';
  const jsScript = jsHref
    ? `<script type="module" crossorigin src="${escapeHtml(jsHref)}"></script>`
    : '';

  const faqJsonLd = faqPageJsonLd(faqs, answerHtmlBySlug);
  const breadJsonLd = breadcrumbJsonLd(categoryKey, categoryLabel, siteUrl);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(pageTitle)}</title>
  <meta name="description" content="${desc}" />
  <meta name="keywords" content="${kw}" />
  <link rel="canonical" href="${escapeHtml(canonicalUrl)}" />
  <meta property="og:title" content="${escapeHtml(`${categoryLabel} FAQs`)}" />
  <meta property="og:description" content="${desc}" />
  <meta property="og:image" content="${escapeHtml(ogImage)}" />
  <meta property="og:url" content="${escapeHtml(canonicalUrl)}" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="${escapeHtml(seoConfig.default.siteName)}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(`${categoryLabel} FAQs`)}" />
  <meta name="twitter:description" content="${desc}" />
  <meta name="twitter:image" content="${escapeHtml(ogImage)}" />
  ${cssLink}
  ${jsScript}
  <style>${STATIC_FAQ_CSS}</style>
  <script type="application/ld+json">${faqJsonLd}</script>
  <script type="application/ld+json">${breadJsonLd}</script>
</head>
<body class="shell">
  <div id="root">
    <header class="hdr">
      <div class="hdr-inner">
        <a href="/" class="logo">${escapeHtml(seoConfig.default.siteName)}</a>
        <nav class="nav" aria-label="Primary">
          <a href="/faqs">FAQs</a>
          <a href="/journal">Journal</a>
          <a href="/meet-bart">Meet Bart</a>
          <a href="/contact">Contact</a>
        </nav>
      </div>
    </header>
    <main class="inner">
      <p class="kicker">Frequently Asked Questions</p>
      <h1 class="title">${escapeHtml(categoryLabel)}</h1>
      <p class="lead">${faqs.length} question${faqs.length === 1 ? '' : 's'} in this category.</p>
      ${renderCategoryNav(categoryKey, categoryKeys)}
      <div class="faq-list">
        ${faqBlocksHtml}
      </div>
      <p class="footer-note">
        <a href="/faqs">All FAQs</a> · <a href="/">Home</a>
      </p>
    </main>
  </div>
</body>
</html>`;
}

async function main() {
  if (!existsSync(DIST)) {
    console.error('dist/ missing. Run vite build first.');
    process.exit(1);
  }

  const faqDocs = loadPublishedFaqDocs();
  if (faqDocs.length === 0) {
    console.error('No FAQ docs found in public/knowledge.json (type "faq", published). Build aborted.');
    process.exit(1);
  }

  const siteUrl = seoConfig.default.siteUrl.replace(/\/$/, '');
  const cssHref = findMainCssHref();
  if (!cssHref) {
    console.warn('No index-*.css in dist/assets. Pages use inline FAQ CSS only.');
  }

  const jsHref = findMainJsHref();
  if (!jsHref) {
    console.error('No index-*.js in dist/assets — FAQ pages will NOT boot the app for direct/shared links. This must not ship silently broken.');
    process.exit(1);
  }

  const groups = groupFaqsByPrimaryCategory(faqDocs);
  const categoryKeys = faqCategoryKeysWithContent(faqDocs);

  if (categoryKeys.length === 0) {
    console.error('FAQ docs exist but none have a primary category. Build aborted.');
    process.exit(1);
  }

  let totalQuestions = 0;

  for (const categoryKey of categoryKeys) {
    const faqs = groups.get(categoryKey) || [];
    if (faqs.length === 0) continue;

    const categoryLabel = getFaqCategoryLabel(categoryKey);
    const answerHtmlBySlug = new Map();
    const blocks = [];

    for (const faq of faqs) {
      const htmlBody = await marked.parse(faq.body || '');
      answerHtmlBySlug.set(faq.slug, htmlBody);
      blocks.push(`<article class="faq-item" id="${escapeHtml(faq.slug)}">
        <h2>${escapeHtml(faq.title)}</h2>
        <div class="faq-answer">${htmlBody}</div>
      </article>`);
    }

    const canonicalUrl = `${siteUrl}/faqs/${categoryKey}`;
    const page = wrapPage({
      categoryKey,
      categoryLabel,
      faqs,
      faqBlocksHtml: blocks.join('\n      '),
      answerHtmlBySlug,
      canonicalUrl,
      siteUrl,
      cssHref,
      jsHref,
      categoryKeys,
    });

    const outDir = join(DIST, 'faqs', categoryKey);
    mkdirSync(outDir, { recursive: true });
    writeFileSync(join(outDir, 'index.html'), page, 'utf8');
    totalQuestions += faqs.length;
  }

  console.log(
    `Static FAQ HTML: ${categoryKeys.length} categories, ${totalQuestions} questions -> dist/faqs/*/index.html`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
