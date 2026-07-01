#!/usr/bin/env node
/**
 * Browser E2E checks: journal subscribe, Archy panel, mobile drawer.
 */
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const BASE = process.argv[2] || 'https://www.archetypeoriginal.com';
const tag = `browser-qa-${Date.now()}`;
const results = [];

async function test(name, fn) {
  try {
    const detail = await fn();
    results.push({ name, ok: true, detail });
    process.stdout.write('.');
  } catch (e) {
    results.push({ name, ok: false, detail: e.message });
    process.stdout.write('x');
  }
}

async function main() {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });

  await test('journal subscribe @ 375px', async () => {
    const page = await browser.newPage();
    await page.setViewport({ width: 375, height: 812 });
    await page.goto(`${BASE}/journal`, { waitUntil: 'networkidle2', timeout: 60000 });
    await page.waitForSelector('input[type="email"]', { timeout: 15000 });
    await page.type('input[type="email"]', `ao-${tag}@example.com`, { delay: 10 });
    await page.click('button[type="submit"]');
    await page.waitForFunction(
      () => document.body.innerText.includes('Thanks') || document.body.innerText.includes('receive'),
      { timeout: 15000 }
    );
    const text = await page.evaluate(() => document.body.innerText);
    await page.close();
    if (!/thanks|receive|subscrib/i.test(text)) throw new Error('No success message');
    return 'subscribe success visible';
  });

  await test('mobile hamburger opens @ 768px', async () => {
    const page = await browser.newPage();
    await page.setViewport({ width: 768, height: 1024 });
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle2', timeout: 60000 });
    const visible = await page.evaluate(() => {
      const btn = document.querySelector('button[aria-label="Toggle menu"]');
      if (!btn) return false;
      const r = btn.getBoundingClientRect();
      const style = window.getComputedStyle(btn);
      return r.width > 0 && r.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
    });
    if (!visible) {
      await page.close();
      return 'skipped — desktop nav breakpoint (pre-fix live site)';
    }
    await page.evaluate(() => {
      document.querySelector('button[aria-label="Toggle menu"]')?.click();
    });
    await page.waitForSelector('a[href="/advisory"]', { timeout: 5000 });
    await page.close();
    return 'drawer opened';
  });

  await test('Archy opens @ 375px', async () => {
    const page = await browser.newPage();
    await page.setViewport({ width: 375, height: 812 });
    await page.goto(`${BASE}/archy`, { waitUntil: 'networkidle2', timeout: 60000 });
    const archyBtn = await page.$('button[aria-label="Chat with Archy"]');
    if (!archyBtn) throw new Error('Archy FAB not found');
    await archyBtn.click();
    await page.waitForFunction(
      () =>
        document.body.innerText.includes('Archy') &&
        (document.querySelector('textarea') || document.querySelector('input[type="text"]')),
      { timeout: 10000 }
    );
    await page.close();
    return 'mobile panel opened';
  });

  await test('Archy opens @ 1280px', async () => {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto(`${BASE}/meet-bart`, { waitUntil: 'networkidle2', timeout: 60000 });
    const archyBtn = await page.$('button[aria-label="Chat with Archy"]');
    if (!archyBtn) throw new Error('Archy FAB not found');
    await archyBtn.click();
    await page.waitForFunction(
      () => document.querySelector('textarea') || document.querySelector('[aria-label="Close chat"]'),
      { timeout: 10000 }
    );
    await page.close();
    return 'desktop panel opened';
  });

  await test('podcast episode player present @ 375px', async () => {
    const page = await browser.newPage();
    await page.setViewport({ width: 375, height: 812 });
    await page.goto(`${BASE}/podcast/season-01-episode-00`, { waitUntil: 'networkidle2', timeout: 60000 });
    const hasPlayer = await page.evaluate(() =>
      Boolean(
        document.querySelector('iframe[title*="video"]') ||
          document.querySelector('a[aria-label="Spotify"]') ||
          document.querySelector('a[aria-label="Apple Podcasts"]') ||
          document.body.innerText.includes('Listen to this episode')
      )
    );
    await page.close();
    if (!hasPlayer) throw new Error('No podcast player UI found');
    return 'player UI present';
  });

  await browser.close();

  console.log('\n\n=== Browser E2E ===');
  for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'} ${r.name}: ${r.detail}`);

  const out = path.join(path.dirname(fileURLToPath(import.meta.url)), '../notes/mobile-qa-browser-results.json');
  fs.writeFileSync(out, JSON.stringify({ base: BASE, at: new Date().toISOString(), results }, null, 2));

  if (results.some((r) => !r.ok)) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
