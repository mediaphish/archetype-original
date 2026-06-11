#!/usr/bin/env node
/**
 * Generate public/llms-full.txt from public/knowledge.json for AI crawlers.
 * Header is read from public/llms.txt (single source of truth).
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { filterPublishedScheduledDocs } from '../lib/publish-eligibility.mjs';
import {
  faqCategoryKeysWithContent,
  getFaqCategoryLabel,
  groupFaqsByPrimaryCategory,
} from './lib/faq-categories.mjs';
import { loadPublishedFaqDocs } from './lib/faq-knowledge.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const knowledgePath = join(root, 'public', 'knowledge.json');
const llmsPath = join(root, 'public', 'llms.txt');
const outputPath = join(root, 'public', 'llms-full.txt');
const baseUrl = 'https://www.archetypeoriginal.com';

function markdownToPlainText(markdown) {
  if (!markdown) return '';
  let text = String(markdown);

  text = text.replace(/```[\s\S]*?```/g, '');
  text = text.replace(/`([^`]+)`/g, '$1');
  text = text.replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1');
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  text = text.replace(/^#{1,6}\s+/gm, '');
  text = text.replace(/\*\*([^*]+)\*\*/g, '$1');
  text = text.replace(/\*([^*]+)\*/g, '$1');
  text = text.replace(/__([^_]+)__/g, '$1');
  text = text.replace(/_([^_]+)_/g, '$1');
  text = text.replace(/^\s*[-*+]\s+/gm, '');
  text = text.replace(/^\s*\d+\.\s+/gm, '');
  text = text.replace(/^[-*_]{3,}\s*$/gm, '');
  text = text.replace(/^\s*>\s?/gm, '');
  text = text.replace(/\r\n/g, '\n');
  text = text.replace(/\n{3,}/g, '\n\n');

  return text.trim();
}

function loadKnowledgeDocs() {
  if (!existsSync(knowledgePath)) {
    console.error('public/knowledge.json missing. Run build-knowledge first.');
    process.exit(1);
  }
  const raw = JSON.parse(readFileSync(knowledgePath, 'utf8'));
  return raw.docs || raw.documents || [];
}

function readLlmsHeader() {
  if (!existsSync(llmsPath)) {
    console.error('public/llms.txt missing.');
    process.exit(1);
  }
  return readFileSync(llmsPath, 'utf8').trimEnd();
}

function buildFaqSection(faqDocs) {
  const lines = ['', 'Frequently Asked Questions, full text', ''];
  const groups = groupFaqsByPrimaryCategory(faqDocs);
  const categoryKeys = faqCategoryKeysWithContent(faqDocs);

  for (const key of categoryKeys) {
    const items = groups.get(key) || [];
    if (!items.length) continue;
    lines.push(getFaqCategoryLabel(key));
    lines.push('');

    for (const faq of items) {
      const question = String(faq.title || faq.slug || 'Untitled').trim();
      const answer = markdownToPlainText(faq.body || faq.summary || '');
      lines.push(question);
      if (answer) {
        lines.push('');
        lines.push(answer);
      }
      lines.push('');
    }
  }

  return lines.join('\n').trimEnd();
}

function buildJournalIndexSection(docs) {
  const journalPosts = filterPublishedScheduledDocs(
    docs.filter((doc) => doc.type === 'journal-post')
  ).sort((a, b) => String(a.title || '').localeCompare(String(b.title || ''), undefined, { sensitivity: 'base' }));

  const lines = ['', 'Journal index', ''];

  for (const post of journalPosts) {
    const slug = post.slug;
    if (!slug) continue;
    lines.push(String(post.title || slug).trim());
    lines.push(`${baseUrl}/journal/${slug}`);
    const summary = String(post.summary || '').trim();
    if (summary) {
      lines.push(summary);
    }
    lines.push('');
  }

  return lines.join('\n').trimEnd();
}

function buildDevotionalSection(docs) {
  const devotionals = filterPublishedScheduledDocs(
    docs.filter((doc) => doc.type === 'devotional')
  );

  const lines = [
    '',
    'Devotional series',
    '',
    'The Servant Leadership Devotional Series publishes one entry per day, connecting Scripture to the real pressures of leadership. Formation for leaders who want clarity, restraint, and genuine care for people.',
    '',
    `Published devotional entries: ${devotionals.length}.`,
    `Browse the series at ${baseUrl}/faith.`,
    `Individual devotional URLs are listed in ${baseUrl}/sitemap.xml.`,
  ];

  return lines.join('\n');
}

function main() {
  const faqDocs = loadPublishedFaqDocs();
  if (!faqDocs.length) {
    console.error('No published FAQ docs in public/knowledge.json. Refusing to generate llms-full.txt.');
    process.exit(1);
  }

  const allDocs = loadKnowledgeDocs();
  const generatedAt = new Date().toISOString();
  const parts = [
    readLlmsHeader(),
    buildFaqSection(faqDocs),
    buildJournalIndexSection(allDocs),
    buildDevotionalSection(allDocs),
    '',
    `Generated at: ${generatedAt}`,
  ];

  const output = parts.join('\n\n').trimEnd() + '\n';
  writeFileSync(outputPath, output, 'utf8');

  const sizeKb = (Buffer.byteLength(output, 'utf8') / 1024).toFixed(1);
  console.log(
    `Generated public/llms-full.txt (${faqDocs.length} FAQs, ${sizeKb} KB)`
  );
}

main();
