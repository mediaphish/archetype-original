#!/usr/bin/env node
/**
 * Prints crawl-target counts from the same inventory module used by sitemap + verification.
 * Run after: npm run build-knowledge
 */

import { getInventorySummary, getExpectedCrawlPaths } from './lib/public-url-inventory.mjs';

const s = getInventorySummary();
console.log(JSON.stringify(s, null, 2));
console.log('\nFirst and last paths (sorted):');
const paths = getExpectedCrawlPaths();
console.log(paths.slice(0, 3).join(', '), '...');
console.log('...', paths.slice(-3).join(', '));
