/**
 * One-time / batch: remove Unicode em dashes (U+2014) from journal markdown.
 * Replaces with commas, colons (in date-style titles), or hyphens (attribution) as appropriate.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..', 'ao-knowledge-hq-kit', 'journal');

function stripEmDashes(text) {
  const lines = text.split('\n');
  const out = [];

  for (let line of lines) {
    // title: "April 6 — Topic" → title: "April 6: Topic"
    if (line.startsWith('title: "') && line.endsWith('"') && line.includes('—')) {
      const inner = line.slice('title: "'.length, -1);
      const fixed = inner.replace(/\s+—\s+/, ': ');
      line = `title: "${fixed}"`;
    }
    out.push(line);
  }
  let s = out.join('\n');

  // summary: "… — …" often works as comma
  s = s.replace(/(\bsummary:\s*"[^"]*)\s+—\s+([^"]*")/g, '$1, $2');

  while (s.includes(' — ')) {
    s = s.replace(' — ', ', ');
  }

  s = s.replace(/\.\s*—\s+/g, '. ');

  for (let i = 0; i < 8; i++) {
    const n = s.replace(/(\w)—(\w)/g, '$1, $2');
    if (n === s) break;
    s = n;
  }

  s = s.replace(/(\w)—\s*\n/g, '$1,\n');

  s = s.replace(/^(\s*>\s*)—\s+/gm, '$1- ');

  s = s.replace(/—/g, ', ');

  s = s.replace(/,\s*,/g, ', ');
  s = s.replace(/\.\s*,/g, '. ');
  s = s.replace(/,\s*\./g, '.');
  s = s.replace(/,\s*:/g, ':');

  return s;
}

function walk(dir, acc = []) {
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, name.name);
    if (name.isDirectory()) walk(p, acc);
    else if (name.isFile() && name.name.endsWith('.md')) acc.push(p);
  }
  return acc;
}

const files = walk(ROOT);
let n = 0;
for (const f of files) {
  const raw = fs.readFileSync(f, 'utf8');
  if (!raw.includes('\u2014')) continue;
  const next = stripEmDashes(raw);
  if (next !== raw) {
    fs.writeFileSync(f, next, 'utf8');
    n++;
  }
}
console.log(`strip-em-dashes-journal: updated ${n} files`);
