#!/usr/bin/env node

/**
 * Pre-rendering script for SEO
 * 
 * This script builds the site, starts a local server, uses Puppeteer to visit
 * all routes and capture the fully-rendered HTML, then saves it as static files.
 * 
 * This makes the site crawlable by Google without requiring SSR.
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import http from 'http';
import { readdirSync, statSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');
const distDir = join(rootDir, 'dist');

// Routes to pre-render
const routes = [
  '/',
  '/journal',
  '/meet-bart',
  '/archy',
  '/philosophy',
  '/methods',
  '/methods/mentorship',
  '/methods/consulting',
  '/methods/fractional-roles',
  '/methods/fractional-roles/cco',
  '/methods/speaking-seminars',
  '/methods/training-education',
  '/culture-science',
  '/culture-science/ali',
  '/culture-science/ali/why-ali-exists',
  '/culture-science/ali/method',
  '/culture-science/ali/early-warning',
  '/culture-science/ali/dashboard',
  '/culture-science/ali/six-leadership-conditions',
  '/culture-science/scoreboard-leadership',
  '/culture-science/bad-leader-project',
  '/culture-science/research',
  '/culture-science/industry-reports',
  '/culture-science/ethics',
  '/faqs',
  '/contact',
  '/engagement-inquiry',
  '/privacy-policy',
  '/terms-and-conditions',
  '/what-i-do',
];

// Get all journal post slugs
function getJournalSlugs() {
  const journalDir = join(rootDir, 'ao-knowledge-hq-kit', 'journal');
  const slugs = [];
  
  try {
    const files = readdirSync(journalDir);
    for (const file of files) {
      if (file.endsWith('.md') && !file.endsWith('.md.md')) {
        // Read frontmatter to get slug
        const content = readFileSync(join(journalDir, file), 'utf-8');
        const slugMatch = content.match(/slug:\s*["']([^"']+)["']/);
        if (slugMatch) {
          slugs.push(`/journal/${slugMatch[1]}`);
        } else {
          // Fallback: use filename without extension
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

// Add journal posts to routes
const journalSlugs = getJournalSlugs();
routes.push(...journalSlugs);

console.log(`📋 Found ${journalSlugs.length} journal posts to pre-render`);
console.log(`📋 Total routes to pre-render: ${routes.length}`);

// Check if Puppeteer is available
let puppeteer;
let useSystemChrome = false;

try {
  puppeteer = await import('puppeteer');
} catch (err) {
  // Try puppeteer-core with system Chrome
  try {
    puppeteer = await import('puppeteer-core');
    useSystemChrome = true;
    console.log('📦 Using puppeteer-core with system Chrome');
  } catch (coreErr) {
    console.error('❌ Puppeteer not found. Installing...');
    try {
      execSync('npm install --save-dev puppeteer', { cwd: rootDir, stdio: 'inherit' });
      puppeteer = await import('puppeteer');
    } catch (installErr) {
      console.error('❌ Failed to install Puppeteer:', installErr);
      process.exit(1);
    }
  }
}

// Start a simple HTTP server to serve the built site
function startServer(port) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let filePath = join(distDir, req.url === '/' ? 'index.html' : req.url);
      
      // Handle routes - serve index.html for all routes
      if (!filePath.endsWith('.html') && !filePath.includes('.')) {
        filePath = join(distDir, 'index.html');
      }
      
      // Check if file exists
      if (!existsSync(filePath)) {
        filePath = join(distDir, 'index.html');
      }
      
      try {
        const content = readFileSync(filePath);
        const ext = filePath.split('.').pop();
        const contentType = {
          'html': 'text/html',
          'js': 'application/javascript',
          'css': 'text/css',
          'json': 'application/json',
          'png': 'image/png',
          'jpg': 'image/jpeg',
          'svg': 'image/svg+xml',
        }[ext] || 'text/plain';
        
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
      } catch (err) {
        res.writeHead(404);
        res.end('Not found');
      }
    });
    
    server.listen(port, () => {
      console.log(`🚀 Server started on http://localhost:${port}`);
      resolve(server);
    });
  });
}

// Pre-render a single route
async function prerenderRoute(browser, route, port) {
  const url = `http://localhost:${port}${route}`;
  console.log(`  📄 Pre-rendering: ${route}`);
  
  const page = await browser.newPage();
  
  try {
    // Wait for the page to fully load
    await page.goto(url, { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });
    
    // Wait a bit more for any async content
    await page.waitForTimeout(1000);
    
    // Get the fully rendered HTML
    const html = await page.content();
    
    // Extract the body content (we'll inject it into index.html structure)
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
    const headMatch = html.match(/<head[^>]*>([\s\S]*)<\/head>/i);
    
    if (bodyMatch && headMatch) {
      // Read the original index.html
      const indexPath = join(distDir, 'index.html');
      let indexHtml = readFileSync(indexPath, 'utf-8');
      
      // Replace head content with rendered head (to get meta tags)
      indexHtml = indexHtml.replace(
        /<head[^>]*>[\s\S]*<\/head>/i,
        headMatch[0]
      );
      
      // Replace body content with rendered body
      indexHtml = indexHtml.replace(
        /<body[^>]*>[\s\S]*<\/body>/i,
        bodyMatch[0]
      );
      
      // Save to appropriate path
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

// Main pre-rendering function
async function prerender() {
  console.log('🔨 Building site...');
  try {
    // Use build:no-prerender to avoid infinite loop
    execSync('npm run build:no-prerender', { cwd: rootDir, stdio: 'inherit' });
  } catch (err) {
    console.error('❌ Build failed:', err);
    process.exit(1);
  }
  
  console.log('✅ Build complete');
  console.log('🌐 Starting pre-rendering...');
  
  const port = 4173; // Vite preview default port
  const server = await startServer(port);
  
  const launchOptions = {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  };
  
  // If using puppeteer-core, try to find system Chrome
  if (useSystemChrome) {
    const chromePaths = [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/usr/bin/google-chrome',
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser'
    ];
    
    for (const chromePath of chromePaths) {
      if (existsSync(chromePath)) {
        launchOptions.executablePath = chromePath;
        console.log(`✅ Using system Chrome: ${chromePath}`);
        break;
      }
    }
    
    if (!launchOptions.executablePath) {
      console.error('❌ Could not find system Chrome. Please install Google Chrome or use full Puppeteer.');
      process.exit(1);
    }
  }
  
  const browser = await puppeteer.default.launch(launchOptions);
  
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

// Run pre-rendering
prerender().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

