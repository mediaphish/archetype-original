#!/usr/bin/env node
/**
 * Mobile QA viewport audit — checks horizontal scroll and header overlap.
 * Usage: node scripts/mobile-qa-audit.mjs [baseUrl]
 */
import puppeteer from 'puppeteer';
import { getPublicStaticPaths } from './lib/public-static-routes.mjs';

const BASE = process.argv[2] || 'https://www.archetypeoriginal.com';
const VIEWPORTS = [
  { name: 'phone-375', width: 375, height: 812 },
  { name: 'phone-390', width: 390, height: 844 },
  { name: 'tablet-768', width: 768, height: 1024 },
  { name: 'tablet-1024', width: 1024, height: 768 },
  { name: 'desktop-1280', width: 1280, height: 800 },
];

const EXTRA_PATHS = [
  '/journal/ali-series-introducing-the-archetype-leadership-index',
  '/journal/understanding-in-everything',
  '/podcast/season-01-episode-00',
  '/culture-science/ali',
  '/ali/signup',
];

const paths = [...new Set([...getPublicStaticPaths(), ...EXTRA_PATHS])];

async function auditPage(page, path, viewport) {
  const url = `${BASE}${path}`;
  const issues = [];

  try {
    const response = await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });
    const status = response?.status() ?? 0;
    if (status >= 400) {
      issues.push({ severity: 'P0', type: 'http', detail: `HTTP ${status}` });
      return issues;
    }

    await new Promise((r) => setTimeout(r, 500));

    const layout = await page.evaluate(() => {
      const doc = document.documentElement;
      const body = document.body;
      const hScroll = Math.max(
        doc.scrollWidth - doc.clientWidth,
        body?.scrollWidth - body.clientWidth || 0
      );

      const header = document.querySelector('header');
      let headerOverlap = false;
      let overlapDetail = null;

      if (header) {
        const logoLink = header.querySelector('a[href="/"]');
        const logoRect = logoLink?.getBoundingClientRect();
        const desktopNav = header.querySelector('.lg\\:flex.items-center.justify-center')
          || [...header.querySelectorAll('div')].find((d) => {
            const cls = d.className || '';
            return cls.includes('lg:flex') && cls.includes('justify-center');
          });
        const navLinks = desktopNav
          ? [...desktopNav.querySelectorAll('button, a')].filter((el) => {
              const r = el.getBoundingClientRect();
              return r.width > 0 && r.height > 0;
            })
          : [];

        if (logoRect && navLinks.length > 0 && logoRect.width > 0) {
          for (const link of navLinks) {
            const r = link.getBoundingClientRect();
            const overlaps =
              r.left < logoRect.right - 8 &&
              r.right > logoRect.left + 8 &&
              r.top < logoRect.bottom &&
              r.bottom > logoRect.top;
            if (overlaps) {
              headerOverlap = true;
              overlapDetail = `Nav "${(link.textContent || '').trim().slice(0, 40)}" overlaps logo`;
              break;
            }
          }
        }
      }

      const offscreenButtons = [...document.querySelectorAll('button, a')].filter((el) => {
        const r = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden') return false;
        return r.right > window.innerWidth + 2 && r.width > 0;
      }).length;

      return { hScroll, headerOverlap, overlapDetail, offscreenButtons };
    });

    if (layout.hScroll > 2) {
      issues.push({ severity: 'P0', type: 'h-scroll', detail: `${layout.hScroll}px horizontal scroll` });
    }
    if (layout.headerOverlap) {
      issues.push({ severity: 'P0', type: 'header-overlap', detail: layout.overlapDetail });
    }
    if (layout.offscreenButtons > 3) {
      issues.push({ severity: 'P1', type: 'offscreen-interactive', detail: `${layout.offscreenButtons} elements past viewport edge` });
    }
  } catch (err) {
    issues.push({ severity: 'P0', type: 'error', detail: err.message?.slice(0, 120) });
  }

  return issues;
}

async function main() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const results = [];

  for (const vp of VIEWPORTS) {
    const page = await browser.newPage();
    await page.setViewport({ width: vp.width, height: vp.height });

    for (const path of paths) {
      const issues = await auditPage(page, path, vp);
      if (issues.length) {
        results.push({ path, viewport: vp.name, issues });
      }
      process.stdout.write(issues.length ? 'x' : '.');
    }
    await page.close();
  }

  await browser.close();

  console.log('\n\n=== Mobile QA Audit ===');
  console.log(`Base: ${BASE}`);
  console.log(`Pages: ${paths.length}, Viewports: ${VIEWPORTS.length}`);
  console.log(`Findings: ${results.length} page/viewport combos with issues\n`);

  const bySeverity = { P0: [], P1: [], P2: [] };
  for (const r of results) {
    for (const issue of r.issues) {
      bySeverity[issue.severity]?.push({ ...r, issue });
    }
  }

  for (const sev of ['P0', 'P1', 'P2']) {
    const items = bySeverity[sev];
    if (!items.length) continue;
    console.log(`\n## ${sev} (${items.length})`);
    for (const { path, viewport, issue } of items) {
      console.log(`- ${path} @ ${viewport}: [${issue.type}] ${issue.detail}`);
    }
  }

  // JSON for report generation
  const outPath = new URL('../notes/mobile-qa-audit-results.json', import.meta.url);
  const fs = await import('fs');
  fs.writeFileSync(outPath, JSON.stringify({ base: BASE, at: new Date().toISOString(), results }, null, 2));
  console.log(`\nWrote ${outPath.pathname}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
