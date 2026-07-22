#!/usr/bin/env node
/**
 * Emit fully static HTML for every journal-post and devotional in public/knowledge.json.
 * Crawlers receive article body without executing JS. Runs after vite build + build-knowledge.
 */

import { mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { marked } from 'marked';
import { getJournalDevotionalSlugDocs } from './lib/public-url-inventory.mjs';

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

/** Find hashed main CSS from Vite output (Tailwind bundle). */
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

function articleJsonLd(doc, canonicalUrl, siteUrl) {
  const isBlogPosting = doc.type === 'journal-post';
  const schema = {
    '@context': 'https://schema.org',
    '@type': isBlogPosting ? 'BlogPosting' : 'Article',
    headline: doc.title,
    description: doc.summary || doc.email_summary || '',
    datePublished: doc.publish_date || doc.date || doc.created_at,
    author: {
      '@type': 'Person',
      name: 'Bart Paden',
      url: `${siteUrl}/meet-bart`,
    },
    publisher: {
      '@type': 'Organization',
      name: seoConfig.default.siteName,
      url: siteUrl,
      logo: {
        '@type': 'ImageObject',
        url: `${siteUrl}/og-default.jpg`,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': canonicalUrl,
    },
    url: canonicalUrl,
  };
  if (doc.image) {
    schema.image = doc.image.startsWith('http') ? doc.image : `${siteUrl}${doc.image}`;
  }
  return JSON.stringify(schema);
}

const STATIC_ARTICLE_CSS = `
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
.kicker { margin-bottom: 1rem; font-size: 0.75rem; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #C85A3C; }
h1.title { margin: 0; font-family: Georgia, ui-serif, serif; font-size: clamp(2rem, 5vw, 3rem); font-weight: 700; line-height: 1.15; color: #1A1A1A; }
time.pub { margin-top: 1rem; display: block; font-size: 0.875rem; color: #6B6B6B; }
.scripture { margin-top: 1.5rem; font-size: 1.125rem; font-style: italic; line-height: 1.6; color: rgba(26,26,26,0.8); }
.static-article { margin-top: 2.5rem; font-size: 1.125rem; line-height: 1.75; color: rgba(26,26,26,0.92); }
.static-article h2 { font-family: Georgia, ui-serif, serif; font-size: 1.75rem; font-weight: 700; margin-top: 2.5rem; margin-bottom: 1rem; color: #1A1A1A; }
.static-article h3 { font-family: Georgia, ui-serif, serif; font-size: 1.35rem; font-weight: 600; margin-top: 2rem; margin-bottom: 0.75rem; color: #1A1A1A; }
.static-article p { margin-bottom: 1rem; }
.static-article ul, .static-article ol { margin: 1rem 0 1rem 1.25rem; }
.static-article blockquote { border-left: 4px solid #C85A3C; padding-left: 1rem; margin: 1.5rem 0; font-style: italic; color: rgba(26,26,26,0.85); }
.static-article a { color: #C85A3C; text-decoration: underline; text-underline-offset: 2px; }
.static-article strong { font-weight: 600; }
.static-article hr { margin: 2rem 0; border: 0; border-top: 1px solid rgba(26,26,26,0.12); }
.footer-note { margin-top: 3rem; padding-top: 2rem; border-top: 1px solid rgba(26,26,26,0.1); text-align: center; font-size: 0.875rem; color: #6B6B6B; }
.footer-note a { color: #6B6B6B; text-decoration: underline; }
.footer-note a:hover { color: #1A1A1A; }
`;

function wrapPage({ doc, htmlBody, canonicalUrl, siteUrl, cssHref, jsHref }) {
  const title = `${escapeHtml(doc.title)} | ${seoConfig.default.siteName}`;
  const desc = escapeHtml((doc.summary || doc.email_summary || '').slice(0, 320));
  const kw = escapeHtml((doc.tags && doc.tags.join(', ')) || seoConfig.default.keywords);
  const badge = doc.type === 'devotional' ? 'Devotional' : 'Journal';
  const ogImage =
    doc.image && !String(doc.image).startsWith('http')
      ? `${siteUrl}${doc.image}`
      : `${siteUrl}/og-default.jpg`;

  const jsonLd = articleJsonLd(doc, canonicalUrl, siteUrl);

  const cssLink = cssHref
    ? `<link rel="stylesheet" crossorigin href="${escapeHtml(cssHref)}">`
    : '';

  const jsScript = jsHref
    ? `<script type="module" crossorigin src="${escapeHtml(jsHref)}"></script>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <meta name="description" content="${desc}" />
  <meta name="keywords" content="${kw}" />
  <link rel="canonical" href="${escapeHtml(canonicalUrl)}" />
  <meta property="og:title" content="${escapeHtml(doc.title)}" />
  <meta property="og:description" content="${desc}" />
  <meta property="og:image" content="${escapeHtml(ogImage)}" />
  <meta property="og:url" content="${escapeHtml(canonicalUrl)}" />
  <meta property="og:type" content="article" />
  <meta property="og:site_name" content="${escapeHtml(seoConfig.default.siteName)}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(doc.title)}" />
  <meta name="twitter:description" content="${desc}" />
  <meta name="twitter:image" content="${escapeHtml(ogImage)}" />
  ${cssLink}
  ${jsScript}
  <style>${STATIC_ARTICLE_CSS}</style>
  <script type="application/ld+json">${jsonLd}</script>
</head>
<body class="shell">
  <div id="root">
    <header class="hdr">
      <div class="hdr-inner">
        <a href="/" class="logo">${escapeHtml(seoConfig.default.siteName)}</a>
        <nav class="nav" aria-label="Primary">
          <a href="/journal">Journal</a>
          <a href="/meet-bart">Meet Bart</a>
          <a href="/contact">Contact</a>
        </nav>
      </div>
    </header>
    <main class="inner">
      <p class="kicker">${badge}</p>
      <article>
        <h1 class="title">${escapeHtml(doc.title)}</h1>
        ${doc.publish_date ? `<time class="pub" datetime="${escapeHtml(String(doc.publish_date).slice(0, 10))}">${escapeHtml(String(doc.publish_date).slice(0, 10))}</time>` : ''}
        ${doc.scripture_reference ? `<p class="scripture">${escapeHtml(doc.scripture_reference)}</p>` : ''}
        <div class="static-article">${htmlBody}</div>
      </article>
      <p class="footer-note">
        Part of Archetype Original — <a href="/journal">Journal</a>.
      </p>
    </main>
  </div>
</body>
</html>`;
}

async function main() {
  if (!existsSync(DIST)) {
    console.error('❌ dist/ missing. Run vite build first.');
    process.exit(1);
  }

  const knowledgePath = join(ROOT, 'public', 'knowledge.json');
  if (!existsSync(knowledgePath)) {
    console.error('❌ public/knowledge.json missing. Run build-knowledge first.');
    process.exit(1);
  }

  const siteUrl = seoConfig.default.siteUrl.replace(/\/$/, '');
  const cssHref = findMainCssHref();
  if (!cssHref) {
    console.warn('⚠️  No index-*.css in dist/assets — pages use inline article CSS only.');
  }

  const jsHref = findMainJsHref();
  if (!jsHref) {
    console.error('❌ No index-*.js in dist/assets — journal pages will NOT boot the app for direct/shared links. This must not ship silently broken.');
    process.exit(1);
  }

  const docs = getJournalDevotionalSlugDocs();
  let ok = 0;

  for (const doc of docs) {
    const slug = doc.slug;
    if (!slug) continue;
    const bodyMd = doc.body || '';
    const htmlBody = await marked.parse(bodyMd);
    const canonicalUrl = `${siteUrl}/journal/${slug}`;
    const page = wrapPage({
      doc,
      htmlBody,
      canonicalUrl,
      siteUrl,
      cssHref,
      jsHref,
    });

    const outDir = join(DIST, 'journal', slug);
    mkdirSync(outDir, { recursive: true });
    writeFileSync(join(outDir, 'index.html'), page, 'utf8');
    ok++;
  }

  console.log(`✅ Static journal/devotional HTML: ${ok} files → dist/journal/*/index.html`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
