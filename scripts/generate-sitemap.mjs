#!/usr/bin/env node

/**
 * Generate sitemap.xml with all routes.
 * Journal + devotional URLs come from public/knowledge.json when present (after build-knowledge),
 * so devotionals subfolder and all published entries match the live corpus exactly.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { PUBLIC_STATIC_SITEMAP_ROUTES } from './lib/public-static-routes.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');
const knowledgePath = join(rootDir, 'public', 'knowledge.json');
const sitemapPath = join(rootDir, 'public', 'sitemap.xml');

const baseUrl = 'https://www.archetypeoriginal.com';
const today = new Date().toISOString().split('T')[0];

const staticRoutes = PUBLIC_STATIC_SITEMAP_ROUTES;

function journalRoutesFromKnowledge() {
  if (!existsSync(knowledgePath)) {
    console.warn(
      '⚠️  public/knowledge.json not found — journal URLs omitted from sitemap. Run after build-knowledge.'
    );
    return [];
  }
  const raw = JSON.parse(readFileSync(knowledgePath, 'utf8'));
  const docs = (raw.docs || []).filter((d) => d.type === 'journal-post' || d.type === 'devotional');

  const routes = [];
  for (const doc of docs) {
    const slug = doc.slug;
    if (!slug) continue;
    const publishDateRaw = doc.publish_date || doc.date || doc.updated_at || doc.created_at || today;
    let lastmod = today;
    if (typeof publishDateRaw === 'string') {
      lastmod = publishDateRaw.split('T')[0].split(' ')[0];
    }
    routes.push({
      path: `/journal/${slug}`,
      priority: doc.type === 'devotional' ? '0.75' : '0.8',
      changefreq: 'monthly',
      lastmod,
    });
  }
  return routes;
}

const jpRoutes = journalRoutesFromKnowledge();

function generateSitemapWithJournal(journalPosts) {
  const combined = [...staticRoutes, ...journalPosts];
  const seen = new Map();
  for (const r of combined) {
    if (!seen.has(r.path)) seen.set(r.path, r);
  }
  const allRoutes = [...seen.values()];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;

  for (const route of allRoutes) {
    const url = `${baseUrl}${route.path}`;
    const lastmod = route.lastmod || today;
    const priority = route.priority || '0.8';
    const changefreq = route.changefreq || 'monthly';

    xml += `  <url>
    <loc>${url}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>
`;
  }

  xml += `</urlset>`;

  return xml;
}

const sitemap = generateSitemapWithJournal(jpRoutes);
writeFileSync(sitemapPath, sitemap, 'utf-8');

console.log(`✅ Generated sitemap.xml with ${staticRoutes.length} static routes and ${jpRoutes.length} journal/devotional URLs`);
