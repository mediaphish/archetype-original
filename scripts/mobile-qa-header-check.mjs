#!/usr/bin/env node
/**
 * Header overlap check at tablet width (works on live + local).
 */
import puppeteer from 'puppeteer';

const BASE = process.argv[2] || 'https://www.archetypeoriginal.com';
const PATHS = ['/', '/podcast/guest-intake', '/culture-science/ali'];

async function checkHeader(page, path) {
  await page.setViewport({ width: 768, height: 1024 });
  await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle2', timeout: 45000 });
  await new Promise((r) => setTimeout(r, 600));

  return page.evaluate(() => {
    const header = document.querySelector('nav.sticky, header, nav');
    if (!header) return { overlap: false, reason: 'no header' };

    const logo = header.querySelector('a[href="/"] svg, a[href="/"] img, a[href="/"]');
    if (!logo) return { overlap: false, reason: 'no logo' };

    const logoRect = logo.getBoundingClientRect();
    const links = [...header.querySelectorAll('a, button')].filter((el) => {
      const t = (el.textContent || '').trim();
      if (!t || t === 'Toggle menu') return false;
      const r = el.getBoundingClientRect();
      return r.width > 20 && r.height > 10 && window.getComputedStyle(el).display !== 'none';
    });

    for (const el of links) {
      const r = el.getBoundingClientRect();
      if (
        r.left < logoRect.right - 6 &&
        r.right > logoRect.left + 6 &&
        r.top < logoRect.bottom &&
        r.bottom > logoRect.top &&
        !el.contains(logo) &&
        !logo.contains(el)
      ) {
        return {
          overlap: true,
          detail: `"${(el.textContent || '').trim().slice(0, 50)}" overlaps logo`,
          logoRight: logoRect.right,
          linkLeft: r.left,
        };
      }
    }
    return { overlap: false, visibleNavCount: links.length };
  });
}

async function main() {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();

  console.log(`Header overlap check @ 768px — ${BASE}\n`);
  for (const path of PATHS) {
    const result = await checkHeader(page, path);
    console.log(`${path}: ${result.overlap ? 'OVERLAP — ' + result.detail : 'OK'}`, result);
  }

  await browser.close();
}

main();
