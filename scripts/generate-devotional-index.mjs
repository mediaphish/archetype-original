#!/usr/bin/env node
/**
 * Generate a shareable index of devotionals.
 *
 * Output: notes/DEVOTIONAL_INDEX.md
 * Includes:
 * - Date, title, scripture reference, slug, filename
 * - Quick “possible duplicates” report (date / scripture / slug)
 */

import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const ROOT_DIR = path.join(process.cwd());
const DEVOTIONALS_DIR = path.join(ROOT_DIR, 'ao-knowledge-hq-kit', 'journal', 'devotionals');
const OUTPUT_PATH = path.join(ROOT_DIR, 'notes', 'DEVOTIONAL_INDEX.md');

function toArray(v) {
  if (Array.isArray(v)) return v;
  return v ? [v] : [];
}

function safeString(v) {
  return String(v ?? '').trim();
}

function normalizeDate(s) {
  // Accept YYYY-MM-DD or ISO; return YYYY-MM-DD when possible.
  const raw = safeString(s);
  if (!raw) return '';
  const dateOnly = raw.split('T')[0].split(' ')[0];
  return /^\d{4}-\d{2}-\d{2}$/.test(dateOnly) ? dateOnly : raw;
}

function normalizeScriptureRef(s) {
  // For duplicate detection only.
  const raw = safeString(s);
  if (!raw) return '';
  return raw
    .replace(/\(ESV\)\s*$/i, '')
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function mdEscape(s) {
  return safeString(s).replaceAll('|', '\\|');
}

function listDevotionalFiles() {
  if (!fs.existsSync(DEVOTIONALS_DIR)) return [];
  return fs
    .readdirSync(DEVOTIONALS_DIR)
    .filter((f) => f.endsWith('.md'))
    .filter((f) => !f.endsWith('.md.md'))
    .filter((f) => f.toLowerCase() !== 'template.md')
    .map((f) => path.join(DEVOTIONALS_DIR, f));
}

function parseDevotional(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const { data } = matter(content);

  const filename = path.basename(filePath);
  const fallbackDateFromName = (filename.match(/^(\d{4}-\d{2}-\d{2})-/) || [])[1] || '';

  const title = safeString(data?.title);
  const slug = safeString(data?.slug);
  const publishDate = normalizeDate(data?.publish_date || data?.date || fallbackDateFromName);
  const scriptureReference = safeString(data?.scripture_reference);

  return {
    filename,
    title,
    slug,
    publishDate,
    scriptureReference,
    _normScripture: normalizeScriptureRef(scriptureReference),
  };
}

function groupBy(items, keyFn) {
  const map = new Map();
  for (const item of items) {
    const key = keyFn(item);
    if (!key) continue;
    const k = String(key);
    const list = map.get(k) || [];
    list.push(item);
    map.set(k, list);
  }
  return map;
}

function renderDuplicatesSection({ label, groups, showKey = true }) {
  const dupes = [...groups.entries()].filter(([, items]) => items.length > 1);
  if (dupes.length === 0) return `- None found.\n`;

  dupes.sort((a, b) => a[0].localeCompare(b[0]));
  let out = '';
  for (const [key, items] of dupes) {
    out += `- ${showKey ? `**${mdEscape(key)}**` : '**(group)**'}\n`;
    for (const it of items.sort((x, y) => (x.publishDate || '').localeCompare(y.publishDate || '') || (x.filename || '').localeCompare(y.filename || ''))) {
      out += `  - ${mdEscape(it.publishDate)} — ${mdEscape(it.title || '(missing title)')} (\`${it.filename}\`, slug: \`${it.slug || '(missing)'}\`)\n`;
    }
  }
  return out;
}

function ensureNotesDir() {
  const notesDir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(notesDir)) fs.mkdirSync(notesDir, { recursive: true });
}

function generate() {
  const files = listDevotionalFiles();
  const devotionals = files.map(parseDevotional);

  devotionals.sort((a, b) => {
    const da = a.publishDate || '';
    const db = b.publishDate || '';
    if (da !== db) return da.localeCompare(db);
    return (a.title || '').localeCompare(b.title || '') || (a.filename || '').localeCompare(b.filename || '');
  });

  const byDate = groupBy(devotionals, (d) => d.publishDate);
  const bySlug = groupBy(devotionals, (d) => d.slug);
  const byScripture = groupBy(devotionals, (d) => d._normScripture);

  const missing = devotionals.filter((d) => !d.publishDate || !d.title || !d.slug || !d.scriptureReference);

  const now = new Date().toISOString();
  let md = '';
  md += `# Devotional index (for planning / duplicate checks)\n\n`;
  md += `Generated: \`${now}\`\n\n`;
  md += `This file is auto-generated from the devotionals folder. It’s meant to be copy/paste friendly for sharing with other tools while you plan new devotionals.\n\n`;
  md += `## Devotionals (date, topic, scripture)\n\n`;
  md += `| Date | Topic (title) | Scripture reference | Slug | File |\n`;
  md += `|---|---|---|---|---|\n`;
  for (const d of devotionals) {
    md += `| ${mdEscape(d.publishDate)} | ${mdEscape(d.title)} | ${mdEscape(d.scriptureReference)} | \`${mdEscape(d.slug)}\` | \`${mdEscape(d.filename)}\` |\n`;
  }

  md += `\n## Possible duplicates (review before writing new devotionals)\n\n`;

  md += `### Same publish date\n\n`;
  md += renderDuplicatesSection({ label: 'Same publish date', groups: byDate, showKey: true });

  md += `\n### Same scripture reference (normalized)\n\n`;
  md += renderDuplicatesSection({ label: 'Same scripture reference', groups: byScripture, showKey: true });

  md += `\n### Same slug\n\n`;
  md += renderDuplicatesSection({ label: 'Same slug', groups: bySlug, showKey: true });

  md += `\n## Missing key fields (needs attention)\n\n`;
  if (missing.length === 0) {
    md += `- None.\n`;
  } else {
    for (const d of missing) {
      const missingBits = [];
      if (!d.publishDate) missingBits.push('publish_date/date');
      if (!d.title) missingBits.push('title');
      if (!d.slug) missingBits.push('slug');
      if (!d.scriptureReference) missingBits.push('scripture_reference');
      md += `- ${mdEscape(d.publishDate)} — ${mdEscape(d.title || '(missing title)')} (\`${d.filename}\`): missing ${missingBits.join(', ')}\n`;
    }
  }

  ensureNotesDir();
  fs.writeFileSync(OUTPUT_PATH, md, 'utf8');

  console.log(`✅ Wrote ${path.relative(ROOT_DIR, OUTPUT_PATH)} (${devotionals.length} devotionals)`);
}

generate();

