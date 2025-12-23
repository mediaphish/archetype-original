#!/usr/bin/env node

/**
 * Generate sitemap.xml with all routes
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');
const journalDir = join(rootDir, 'ao-knowledge-hq-kit', 'journal');
const sitemapPath = join(rootDir, 'public', 'sitemap.xml');

const baseUrl = 'https://www.archetypeoriginal.com';
const today = new Date().toISOString().split('T')[0];

// Static routes with priorities
const staticRoutes = [
  { path: '/', priority: '1.0', changefreq: 'weekly' },
  { path: '/meet-bart', priority: '0.9', changefreq: 'monthly' },
  { path: '/archy', priority: '0.9', changefreq: 'monthly' },
  { path: '/philosophy', priority: '0.9', changefreq: 'monthly' },
  { path: '/methods', priority: '0.9', changefreq: 'monthly' },
  { path: '/methods/mentorship', priority: '0.8', changefreq: 'monthly' },
  { path: '/methods/consulting', priority: '0.8', changefreq: 'monthly' },
  { path: '/methods/fractional-roles', priority: '0.8', changefreq: 'monthly' },
  { path: '/methods/fractional-roles/cco', priority: '0.7', changefreq: 'monthly' },
  { path: '/methods/speaking-seminars', priority: '0.8', changefreq: 'monthly' },
  { path: '/methods/training-education', priority: '0.8', changefreq: 'monthly' },
  { path: '/culture-science', priority: '0.9', changefreq: 'monthly' },
  { path: '/culture-science/ali', priority: '0.9', changefreq: 'monthly' },
  { path: '/culture-science/ali/why-ali-exists', priority: '0.8', changefreq: 'monthly' },
  { path: '/culture-science/ali/method', priority: '0.8', changefreq: 'monthly' },
  { path: '/culture-science/ali/early-warning', priority: '0.8', changefreq: 'monthly' },
  { path: '/culture-science/ali/dashboard', priority: '0.8', changefreq: 'monthly' },
  { path: '/culture-science/ali/six-leadership-conditions', priority: '0.8', changefreq: 'monthly' },
  { path: '/culture-science/scoreboard-leadership', priority: '0.7', changefreq: 'monthly' },
  { path: '/culture-science/bad-leader-project', priority: '0.7', changefreq: 'monthly' },
  { path: '/culture-science/research', priority: '0.7', changefreq: 'monthly' },
  { path: '/culture-science/industry-reports', priority: '0.7', changefreq: 'monthly' },
  { path: '/culture-science/ethics', priority: '0.7', changefreq: 'monthly' },
  { path: '/journal', priority: '0.9', changefreq: 'weekly' },
  { path: '/faqs', priority: '0.8', changefreq: 'weekly' },
  { path: '/contact', priority: '0.7', changefreq: 'monthly' },
  { path: '/engagement-inquiry', priority: '0.8', changefreq: 'monthly' },
  { path: '/what-i-do', priority: '0.8', changefreq: 'monthly' },
  { path: '/privacy-policy', priority: '0.3', changefreq: 'yearly' },
  { path: '/terms-and-conditions', priority: '0.3', changefreq: 'yearly' },
];

// Get all journal post slugs
function getJournalPosts() {
  const posts = [];
  
  try {
    const files = readdirSync(journalDir);
    for (const file of files) {
      if (file.endsWith('.md') && !file.endsWith('.md.md')) {
        const content = readFileSync(join(journalDir, file), 'utf-8');
        
        // Extract frontmatter
        const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
        if (frontmatterMatch) {
          const frontmatter = frontmatterMatch[1];
          const slugMatch = frontmatter.match(/slug:\s*["']([^"']+)["']/);
          const publishDateMatch = frontmatter.match(/publish_date:\s*["']([^"']+)["']/);
          
          if (slugMatch) {
            const slug = slugMatch[1];
            const publishDate = publishDateMatch ? publishDateMatch[1].split('T')[0] : today;
            
            // Only include published posts (not future-dated)
            const postDate = new Date(publishDate);
            const now = new Date();
            if (postDate <= now) {
              posts.push({
                path: `/journal/${slug}`,
                priority: '0.8',
                changefreq: 'monthly',
                lastmod: publishDate
              });
            }
          }
        }
      }
    }
  } catch (err) {
    console.error('Error reading journal directory:', err);
  }
  
  return posts;
}

// Generate sitemap XML
function generateSitemap() {
  const journalPosts = getJournalPosts();
  const allRoutes = [...staticRoutes, ...journalPosts];
  
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

// Write sitemap
const sitemap = generateSitemap();
writeFileSync(sitemapPath, sitemap, 'utf-8');

const journalPosts = getJournalPosts();
console.log(`✅ Generated sitemap.xml with ${staticRoutes.length} static routes and ${journalPosts.length} journal posts`);
console.log(`   Total: ${staticRoutes.length + journalPosts.length} URLs`);

