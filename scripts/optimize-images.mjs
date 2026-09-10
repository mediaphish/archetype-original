/**
 * Compress public/images in place.
 *
 * NOT part of the build. Run by hand, look at the results, then commit.
 *
 * Why this exists, measured 2026-09-10 (notes/DEPLOY_TIME_2026-09-10.md):
 * public/images is 126 MB and gets traced into seven serverless functions,
 * because three call sites join a static directory to a dynamic filename and
 * the tracer includes the whole directory. Those functions run 130 to 177 MB
 * each and account for most of the 1.87 GB Vercel packages and uploads on
 * every deploy.
 *
 * The page-weight side matters more. ali-hero.jpg is 5712x4284 and 5.1 MB,
 * served to browsers as-is. Core Web Vitals is a ranking input, so a hero that
 * size works against the discovery work rather than with it.
 *
 * Dry run by default. Nothing is written without --write.
 *
 *   node scripts/optimize-images.mjs              # report only
 *   node scripts/optimize-images.mjs --sample     # write 5 files to /tmp to eyeball
 *   node scripts/optimize-images.mjs --write      # modify public/images in place
 *
 * Commit on a branch and look at the sample before --write. Compression is a
 * judgement call about how the pictures look, and that judgement is Bart's.
 */

import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const SRC = path.join(process.cwd(), 'public', 'images');
const MAX_WIDTH = 2000;
const JPEG_QUALITY = 82;

const WRITE = process.argv.includes('--write');
const SAMPLE = process.argv.includes('--sample');
const SAMPLE_DIR = '/tmp/ao-image-sample';

/** Every image under public/images, including cards/ and other subfolders. */
function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(jpe?g|png)$/i.test(entry.name)) out.push(full);
  }
  return out;
}

/**
 * Re-encode one image.
 *
 * Returns the new buffer only when it is actually smaller. A naive pass makes
 * some files bigger: the-barnabas-archetype.jpg is 1536px wide, and resizing it
 * toward a 2000px cap re-encoded it 47% larger. 14 of 156 files are already
 * optimal and must be left alone.
 */
async function reencode(file) {
  const meta = await sharp(file).metadata();
  let pipe = sharp(file);
  if (meta.width > MAX_WIDTH) {
    pipe = pipe.resize({ width: MAX_WIDTH, withoutEnlargement: true });
  }
  return /\.png$/i.test(file)
    ? pipe.png({ compressionLevel: 9, palette: true }).toBuffer()
    : pipe.jpeg({ quality: JPEG_QUALITY, mozjpeg: true }).toBuffer();
}

const mb = (bytes) => (bytes / 1048576).toFixed(1);
const kb = (bytes) => Math.round(bytes / 1024);

const files = walk(SRC);
let before = 0;
let after = 0;
const wins = [];
const kept = [];
const failed = [];

for (const file of files) {
  const size = fs.statSync(file).size;
  before += size;
  let buf;
  try {
    buf = await reencode(file);
  } catch (err) {
    failed.push([file, err?.message || String(err)]);
    after += size;
    continue;
  }

  if (buf.length >= size) {
    kept.push(file);
    after += size;
    continue;
  }

  wins.push({ file, from: size, to: buf.length, buf });
  after += buf.length;
}

wins.sort((a, b) => b.from - b.to - (a.from - a.to));

console.log(`\npublic/images: ${files.length} image(s)\n`);
console.log(`  would shrink:     ${wins.length}`);
console.log(`  already optimal:  ${kept.length}`);
if (failed.length) console.log(`  errors:           ${failed.length}`);
console.log(`\n  current:  ${mb(before)} MB`);
console.log(`  after:    ${mb(after)} MB`);
console.log(`  saved:    ${mb(before - after)} MB (${Math.round((1 - after / before) * 100)}%)\n`);

console.log('  biggest wins:');
for (const w of wins.slice(0, 10)) {
  const pct = Math.round((1 - w.to / w.from) * 100);
  console.log(`    ${String(kb(w.from)).padStart(6)} KB -> ${String(kb(w.to)).padStart(6)} KB  (${String(pct).padStart(2)}%)  ${path.relative(SRC, w.file)}`);
}

for (const [f, msg] of failed) console.log(`  ERROR ${path.relative(SRC, f)}: ${msg}`);

if (SAMPLE) {
  fs.mkdirSync(SAMPLE_DIR, { recursive: true });
  for (const w of wins.slice(0, 5)) {
    const name = path.basename(w.file);
    fs.copyFileSync(w.file, path.join(SAMPLE_DIR, `before-${name}`));
    fs.writeFileSync(path.join(SAMPLE_DIR, `after-${name}`), w.buf);
  }
  console.log(`\n  wrote 5 before/after pairs to ${SAMPLE_DIR}`);
  console.log('  open them side by side before running --write.\n');
}

if (!WRITE) {
  console.log('\n  Dry run. Nothing was modified. Pass --write to apply.\n');
  process.exit(0);
}

for (const w of wins) fs.writeFileSync(w.file, w.buf);
console.log(`\n  Wrote ${wins.length} file(s). Check "git diff --stat" and look at a few before committing.\n`);
