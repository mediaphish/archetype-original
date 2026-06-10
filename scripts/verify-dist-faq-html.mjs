#!/usr/bin/env node
/**
 * After static FAQ HTML generation: ensure each category page exists with visible answers and FAQPage JSON-LD.
 */

import { existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { faqCategoryKeysWithContent } from './lib/faq-categories.mjs';
import { loadPublishedFaqDocs } from './lib/faq-knowledge.mjs';
import { approxVisibleBodyText } from './lib/html-substance.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const dist = join(root, 'dist');

const MIN_FAQ_PAGE_TEXT = 200;

let errors = 0;

function fail(msg) {
  console.error(`verify-dist-faq-html: ${msg}`);
  errors++;
}

function main() {
  let faqDocs;
  try {
    faqDocs = loadPublishedFaqDocs();
  } catch (e) {
    fail(e.message);
    process.exit(1);
  }

  const categoryKeys = faqCategoryKeysWithContent(faqDocs);
  if (categoryKeys.length === 0) {
    fail('No FAQ categories with content expected from knowledge.json');
    process.exit(1);
  }

  console.log(`Verifying ${categoryKeys.length} static FAQ category pages in dist/...`);

  for (const key of categoryKeys) {
    const file = join(dist, 'faqs', key, 'index.html');
    if (!existsSync(file)) {
      fail(`Missing ${file}`);
      continue;
    }
    const html = readFileSync(file, 'utf8');
    if (!html.includes('"@type":"FAQPage"') && !html.includes('"@type": "FAQPage"')) {
      fail(`Missing FAQPage JSON-LD in ${file}`);
    }
    if (!html.includes('BreadcrumbList')) {
      fail(`Missing BreadcrumbList JSON-LD in ${file}`);
    }
    const visible = approxVisibleBodyText(html);
    if (visible < MIN_FAQ_PAGE_TEXT) {
      fail(`Too little visible body text (${visible} chars < ${MIN_FAQ_PAGE_TEXT}): ${file}`);
    }
    if (!html.includes('class="faq-item"')) {
      fail(`No faq-item blocks in ${file}`);
    }
  }

  if (errors > 0) {
    console.error(`\nverify-dist-faq-html: ${errors} error(s)`);
    process.exit(1);
  }

  console.log('verify-dist-faq-html: all FAQ category pages pass checks');
}

main();
