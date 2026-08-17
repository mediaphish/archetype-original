/**
 * Auto page hides the site bottom nav so Auto's New/Chat/Artifact/Chats bar is reachable (#136).
 *
 * Run: node src/components/ao/hideBottomNav.selftest.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse } from '@babel/parser';

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const headerPath = path.join(ROOT, 'src/components/ao/AOHeader.jsx');
const reviewPath = path.join(ROOT, 'src/pages/ao/Review.jsx');
const autoV2Path = path.join(ROOT, 'lib/ao/autoV2.js');
const pagesDir = path.join(ROOT, 'src/pages/ao');

const header = fs.readFileSync(headerPath, 'utf8');
const review = fs.readFileSync(reviewPath, 'utf8');
const autoV2 = fs.readFileSync(autoV2Path, 'utf8');

assert(
  /hideBottomNav\s*=\s*false/.test(header),
  'AOHeader accepts hideBottomNav and defaults it off'
);
assert(
  /\{!hideBottomNav && \(/.test(header),
  'AOHeader skips AOBottomNav when hideBottomNav is true'
);
assert(
  /<AOHeader[^>]*hideBottomNav/.test(review),
  'Review.jsx (Auto page) passes hideBottomNav'
);

const pageFiles = fs.readdirSync(pagesDir).filter((f) => f.endsWith('.jsx') && f !== 'Review.jsx');
for (const file of pageFiles) {
  const src = fs.readFileSync(path.join(pagesDir, file), 'utf8');
  if (!/AOHeader/.test(src)) continue;
  assert(
    !/hideBottomNav/.test(src),
    `${file} must not pass hideBottomNav (only the Auto page hides the site bottom bar)`
  );
}

assert(
  /tap Artifact at the bottom of the screen/.test(autoV2),
  'Auto system prompt knows the mobile Artifact button'
);
const mobileIdx = autoV2.indexOf('On mobile, the current draft');
assert(mobileIdx > 0, 'mobile Artifact guidance is present');
const mobilePara = autoV2.slice(mobileIdx, autoV2.indexOf('\n\n', mobileIdx));
assert(!mobilePara.includes('`'), 'new prompt text must not contain backticks');
assert(!mobilePara.includes('${'), 'new prompt text must not contain ${');

function parseJsx(filePath) {
  parse(fs.readFileSync(filePath, 'utf8'), {
    sourceType: 'module',
    plugins: ['jsx'],
  });
}
parseJsx(headerPath);
parseJsx(reviewPath);

console.log('hideBottomNav.selftest.mjs: ok');
