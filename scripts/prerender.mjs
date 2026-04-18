#!/usr/bin/env node

/**
 * Pre-rendering: visit each public route with headless Chrome, save fully rendered HTML to dist.
 * Runs on Vercel builds (puppeteer-core + @sparticuz/chromium) and locally (puppeteer).
 *
 * When PRERENDER_SKIP_INNER_BUILD=1, skips npm run build:no-prerender (used after build:prerender / prerender:local).
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import http from 'http';
import { readdirSync } from 'fs';
import { getPublicStaticPaths } from './lib/public-static-routes.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');
const distDir = join(rootDir, 'dist');

const staticPaths = getPublicStaticPaths();
const routes = [...staticPaths];

function getJournalSlugs() {
  const journalDir = join(rootDir, 'ao-knowledge-hq-kit', 'journal');
  const slugs = [];

  try {
    const files = readdirSync(journalDir);
    for (const file of files) {
      if (file.endsWith('.md') && !file.endsWith('.md.md')) {
        const content = readFileSync(join(journalDir, file), 'utf-8');
        const slugMatch = content.match(/slug:\s*["']([^"']+)["']/);
        if (slugMatch) {
          slugs.push(`/journal/${slugMatch[1]}`);
        } else {
          const slug = file.replace(/\.md$/, '');
          slugs.push(`/journal/${slug}`);
        }
      }
    }
  } catch (err) {
    console.error('Error reading journal directory:', err);
  }

  return slugs;
}

routes.push(...getJournalSlugs());

console.log(`📋 Static marketing routes: ${staticPaths.length}`);
console.log(`📋 Journal routes: ${routes.length - staticPaths.length}`);
console.log(`📋 Total routes to pre-render: ${routes.length}`);

function filterKnowledgeDocs(corpus, searchParams) {
  const q = searchParams.get('q') || '';
  const tag = searchParams.get('tag') || '';
  const typeRaw = searchParams.get('type') || '';
  const type = String(typeRaw).toLowerCase();

  let filteredDocs = corpus.docs || [];

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
  if (process.env.VERCEL) {
    const puppeteer = await import('puppeteer-core');
    const chromium = (await import('@sparticuz/chromium')).default;
    return puppeteer.default.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });
  }

  // Local dev: full puppeteer bundles Chromium (works on macOS/Windows).

  try {
    const puppeteer = await import('puppeteer');
    return puppeteer.default.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  } catch (e) {
    console.error(
      '❌ Install devDependencies: puppeteer (local) or use Vercel for @sparticuz/chromium build.'
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
    } else {
      console.warn(`  ⚠️  Could not extract body/head from ${route}`);
    }
  } catch (err) {
    console.error(`  ❌ Error pre-rendering ${route}:`, err.message);
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
    for (const route of routes) {
      await prerenderRoute(browser, route, port);
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
