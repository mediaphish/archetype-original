#!/usr/bin/env node
/**
 * Build-time integrity check for top-level journal markdown entries.
 * Catches missing images and broken frontmatter before deploy.
 */
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const JOURNAL_DIR = path.join(ROOT, 'ao-knowledge-hq-kit/journal');
const IMAGES_DIR = path.join(ROOT, 'public/images');

const FEATURED_IMAGE_RE = /^\.\.\/images\/[^/\\]+$/;

function listJournalEntryFiles() {
  if (!fs.existsSync(JOURNAL_DIR)) {
    throw new Error(`Journal directory not found: ${JOURNAL_DIR}`);
  }

  return fs
    .readdirSync(JOURNAL_DIR, { withFileTypes: true })
    .filter((ent) => {
      if (!ent.isFile() || !ent.name.endsWith('.md')) return false;
      const lower = ent.name.toLowerCase();
      if (lower.includes('template')) return false;
      if (ent.name.endsWith('.md.md')) return false;
      if (ent.name.startsWith('.')) return false;
      return true;
    })
    .map((ent) => path.join(JOURNAL_DIR, ent.name));
}

function extractFrontmatterBlock(raw) {
  if (!raw.startsWith('---')) return null;
  const end = raw.indexOf('\n---', 3);
  if (end === -1) return null;
  return raw.slice(0, end + 4);
}

function titleColonQuotedInYaml(frontmatterBlock) {
  if (!frontmatterBlock) return { ok: false, reason: 'missing or unclosed YAML frontmatter delimiters' };

  const titleLine = frontmatterBlock
    .split('\n')
    .find((line) => /^title\s*:/i.test(line.trim()));

  if (!titleLine) return { ok: false, reason: 'title field not found in frontmatter block' };

  const valuePart = titleLine.replace(/^title\s*:\s*/i, '').trim();
  if (!valuePart) return { ok: false, reason: 'title field is empty' };

  if (!valuePart.includes(':')) return { ok: true };

  const quoted =
    (valuePart.startsWith('"') && valuePart.endsWith('"')) ||
    (valuePart.startsWith("'") && valuePart.endsWith("'"));

  if (!quoted) {
    return {
      ok: false,
      reason: 'title contains a colon but is not wrapped in quotes (will break YAML parsing)',
    };
  }

  return { ok: true };
}

function isValidPublishDate(value) {
  if (value == null || value === '') return false;
  const str = String(value).trim();
  if (!str) return false;
  const d = new Date(str);
  return !Number.isNaN(d.getTime());
}

function verifyFile(filePath) {
  const rel = path.relative(ROOT, filePath).replace(/\\/g, '/');
  const failures = [];
  const raw = fs.readFileSync(filePath, 'utf8');

  if (!raw.trim()) {
    failures.push({ file: rel, check: 'file', reason: 'file is empty' });
    return failures;
  }

  const fmBlock = extractFrontmatterBlock(raw);
  const titleQuote = titleColonQuotedInYaml(fmBlock);
  if (!titleQuote.ok) {
    failures.push({ file: rel, check: 'title', reason: titleQuote.reason });
  }

  let frontmatter;
  try {
    ({ data: frontmatter } = matter(raw));
  } catch (err) {
    failures.push({ file: rel, check: 'frontmatter', reason: `YAML parse error: ${err.message}` });
    return failures;
  }

  const title = frontmatter?.title;
  if (!title || !String(title).trim()) {
    failures.push({ file: rel, check: 'title', reason: 'title is missing or empty after parsing' });
  }

  const featuredImage = frontmatter?.featured_image;
  if (!featuredImage || !String(featuredImage).trim()) {
    failures.push({ file: rel, check: 'featured_image', reason: 'featured_image is missing' });
  } else if (!FEATURED_IMAGE_RE.test(String(featuredImage).trim())) {
    failures.push({
      file: rel,
      check: 'featured_image',
      reason: `featured_image must match ../images/[filename], got "${featuredImage}"`,
    });
  } else {
    const filename = String(featuredImage).trim().replace(/^\.\.\/images\//, '');
    const imagePath = path.join(IMAGES_DIR, filename);
    if (!fs.existsSync(imagePath)) {
      failures.push({
        file: rel,
        check: 'featured_image',
        reason: `image file not found at public/images/${filename}`,
      });
    }
  }

  if (!isValidPublishDate(frontmatter?.publish_date)) {
    failures.push({
      file: rel,
      check: 'publish_date',
      reason: 'publish_date is missing or not a valid date',
    });
  }

  return failures;
}

function main() {
  const files = listJournalEntryFiles();
  const allFailures = [];

  for (const filePath of files) {
    allFailures.push(...verifyFile(filePath));
  }

  if (allFailures.length > 0) {
    console.error('Journal integrity check FAILED:\n');
    for (const f of allFailures) {
      console.error(`- ${f.file}`);
      console.error(`  [${f.check}] ${f.reason}\n`);
    }
    process.exit(1);
  }

  console.log(`All ${files.length} journal entries verified`);
  process.exit(0);
}

main();
