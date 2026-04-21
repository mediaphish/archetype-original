#!/usr/bin/env node

/**
 * Pre-rendering: visit each public route with headless Chrome, save fully rendered HTML to dist.
 * On Linux (including Vercel's build machines), uses puppeteer-core + @sparticuz/chromium — the
 * stock Chromium bundled with `puppeteer` expects host libraries (e.g. NSS) that minimal Linux
 * images often lack. On macOS/Windows, uses full `puppeteer`. Set PRERENDER_USE_PUPPETEER=1 on
 * Linux to force the bundled browser (e.g. desktop Linux with deps installed).
 *
 * When PRERENDER_SKIP_INNER_BUILD=1, skips npm run build:no-prerender (used after build:prerender / prerender:local).
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import http from 'http';
import { getPublicStaticPaths } from './lib/public-static-routes.mjs';
import { filterPublishedScheduledDocs } from '../lib/publish-eligibility.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');
const distDir = join(rootDir, 'dist');

const staticPaths = getPublicStaticPaths();
/** Individual /journal/[slug] pages are static HTML from generate-static-journal-html.mjs — do not puppeteer them. */
const routes = [...staticPaths];

console.log(`📋 Static marketing routes (pre-render): ${staticPaths.length}`);
console.log(`📋 Journal posts are emitted as static HTML separately (not counted here)`);
console.log(`📋 Total routes to pre-render: ${routes.length}`);

function filterKnowledgeDocs(corpus, searchParams) {
  const q = searchParams.get('q') || '';
  const tag = searchParams.get('tag') || '';
  const typeRaw = searchParams.get('type') || '';
  const type = String(typeRaw).toLowerCase();

  let filteredDocs = filterPublishedScheduledDocs(corpus.docs || []);

  if (tag) {
    filteredDocs = filteredDocs.filter(
      (doc) =>
        doc.tags &&
        doc.tags.some((t) => t.toLowerCase().includes(tag.toLowerCase()))
    );
  }

  if (type && type !== 'all') {
    filteredDocs = filteredDocs.filter(
      (doc) =>
        doc.type && doc.type.toLowerCase().includes(type)
    );
  }

  if (q) {
    const query = q.toLowerCase();
    filteredDocs = filteredDocs.filter((doc) => {
      const title = (doc.title || '').toLowerCase();
      const summary = (doc.summary || '').toLowerCase();
      const body = (doc.body || '').toLowerCase();
      return (
        title.includes(query) ||
        summary.includes(query) ||
        body.includes(query)
      );
    });
  }

  return {
    generated_at: corpus.generated_at,
    count: filteredDocs.length,
    docs: filteredDocs,
  };
}

function startServer(port) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const host = `http://127.0.0.1:${port}`;
      const u = new URL(req.url, host);
      const pathname = u.pathname;

      // Mirror production /api/knowledge for Journal / Faith / JournalPost
      if (pathname === '/api/knowledge' || pathname.startsWith('/api/knowledge')) {
        try {
          const knowledgePath = join(rootDir, 'public', 'knowledge.json');
          if (!existsSync(knowledgePath)) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(
              JSON.stringify({
                error: 'Knowledge corpus not found',
                generated_at: new Date().toISOString(),
                count: 0,
                docs: [],
              })
            );
            return;
          }
          const rawData = readFileSync(knowledgePath, 'utf8');
          const corpus = JSON.parse(rawData);
          const searchParams = u.searchParams;
          const body = JSON.stringify(filterKnowledgeDocs(corpus, searchParams));
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(body);
          return;
        } catch (e) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: String(e.message) }));
          return;
        }
      }

      let filePath = join(distDir, pathname === '/' ? 'index.html' : pathname);

      if (!filePath.endsWith('.html') && !filePath.includes('.')) {
        filePath = join(distDir, 'index.html');
      }

      if (!existsSync(filePath)) {
        filePath = join(distDir, 'index.html');
      }

      try {
        const content = readFileSync(filePath);
        const ext = filePath.split('.').pop();
        const contentType = {
          html: 'text/html',
          js: 'application/javascript',
          css: 'text/css',
          json: 'application/json',
          png: 'image/png',
          jpg: 'image/jpeg',
          jpeg: 'image/jpeg',
          svg: 'image/svg+xml',
        }[ext] || 'text/plain';

        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
      } catch {
        res.writeHead(404);
        res.end('Not found');
      }
    });

    server.listen(port, '127.0.0.1', () => {
      console.log(`🚀 Server started on http://127.0.0.1:${port}`);
      resolve(server);
    });
  });
}

async function launchBrowser() {
  const forceBundledPuppeteer = process.env.PRERENDER_USE_PUPPETEER === '1';
  const useSparticuz =
    process.platform === 'linux' && !forceBundledPuppeteer;

  if (useSparticuz) {
    const puppeteer = await import('puppeteer-core');
    const chromium = (await import('@sparticuz/chromium')).default;
    return puppeteer.default.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });
  }

  // macOS / Windows / Linux with PRERENDER_USE_PUPPETEER=1: full puppeteer bundles Chromium.

  try {
    const puppeteer = await import('puppeteer');
    return puppeteer.default.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  } catch (e) {
    console.error(
      '❌ Install devDependencies: puppeteer (macOS/Windows) or puppeteer-core + @sparticuz/chromium (Linux).'
    );
    throw e;
  }
}

async function prerenderRoute(browser, route, port) {
  const url = `http://127.0.0.1:${port}${route}`;
  console.log(`  📄 Pre-rendering: ${route}`);

  const page = await browser.newPage();

  try {
    await page.goto(url, {
      waitUntil: 'networkidle0',
      timeout: 60000,
    });

    await new Promise((r) => setTimeout(r, 1000));

    const html = await page.content();
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
    const headMatch = html.match(/<head[^>]*>([\s\S]*)<\/head>/i);

    if (bodyMatch && headMatch) {
      const indexPath = join(distDir, 'index.html');
      let indexHtml = readFileSync(indexPath, 'utf-8');

      indexHtml = indexHtml.replace(/<head[^>]*>[\s\S]*<\/head>/i, headMatch[0]);
      indexHtml = indexHtml.replace(
        /<body[^>]*>[\s\S]*<\/body>/i,
        bodyMatch[0]
      );

      let filePath;
      if (route === '/') {
        filePath = join(distDir, 'index.html');
      } else {
        filePath = join(distDir, route, 'index.html');
        mkdirSync(dirname(filePath), { recursive: true });
      }

      writeFileSync(filePath, indexHtml);
      console.log(`  ✅ Saved: ${filePath}`);
      return true;
    }
    console.error(`  ❌ Could not extract body/head from ${route}`);
    return false;
  } catch (err) {
    console.error(`  ❌ Error pre-rendering ${route}:`, err.message);
    return false;
  } finally {
    await page.close();
  }
}

async function prerender() {
  if (process.env.PRERENDER_SKIP_INNER_BUILD === '1') {
    console.log('⏭️  Skipping inner build (PRERENDER_SKIP_INNER_BUILD=1)');
  } else {
    console.log('🔨 Building site...');
    try {
      execSync('npm run build:no-prerender', { cwd: rootDir, stdio: 'inherit' });
    } catch (err) {
      console.error('❌ Build failed:', err);
      process.exit(1);
    }
    console.log('✅ Build complete');
  }

  if (!existsSync(join(distDir, 'index.html'))) {
    console.error('❌ dist/index.html missing. Run a full build first.');
    process.exit(1);
  }

  console.log('🌐 Starting pre-rendering...');

  const port = 4173;
  const server = await startServer(port);
  const browser = await launchBrowser();

  try {
    let failed = 0;
    for (const route of routes) {
      const ok = await prerenderRoute(browser, route, port);
      if (!ok) failed++;
    }
    if (failed > 0) {
      console.error(`\n❌ Pre-render failed for ${failed} route(s). Build aborted.`);
      process.exit(1);
    }
    console.log(`\n✅ Pre-rendering complete! ${routes.length} routes processed.`);
  } catch (err) {
    console.error('❌ Pre-rendering failed:', err);
    process.exit(1);
  } finally {
    await browser.close();
    server.close();
  }
}

prerender().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
