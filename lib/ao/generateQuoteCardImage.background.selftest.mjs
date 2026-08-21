/**
 * Renders quote cards with and without background artwork so the result can be
 * looked at, not just asserted about.
 *
 * Run: node lib/ao/generateQuoteCardImage.background.selftest.mjs [outDir]
 *
 * Quote cards have been solid colour + text + AO mark since they were built.
 * Bart asked for "nice images with the quotes in front of them," and stylized
 * likeness images when the quote is his. This exercises the artwork path,
 * including the case that matters most for unattended posting: artwork that
 * fails to load must still produce a postable card.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnvLocal() {
  try {
    const raw = fs.readFileSync(path.join(__dirname, '../../.env.local'), 'utf8');
    for (const line of raw.split('\n')) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const eq = t.indexOf('=');
      if (eq <= 0) continue;
      const key = t.slice(0, eq).trim();
      let val = t.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = val;
    }
  } catch {
    /* optional */
  }
}
loadEnvLocal();

const OUT = process.argv[2] || path.join(__dirname, '../../.tmp-cards');
fs.mkdirSync(OUT, { recursive: true });

const mod = await import('./generateQuoteCardImage.js');
const render = mod.__renderCardBufferForTest || mod.renderCardBuffer;
if (typeof render !== 'function') {
  console.error('generateQuoteCardImage must export renderCardBuffer for this selftest.');
  process.exit(1);
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const QUOTE = 'Leadership is not a clenched fist, but a guiding hand.';
const localPhoto = path.join(__dirname, '../../public/images/Bart-78.jpg');
const photoDataUri = fs.existsSync(localPhoto)
  ? `data:image/jpeg;base64,${fs.readFileSync(localPhoto).toString('base64')}`
  : null;

const cases = [
  {
    name: 'plain-no-artwork',
    card: `[CARD bg="#0a0a0a" text="#ffffff" mark="offwhite"]
[LINE size="62"]${QUOTE}[/LINE]
[LINE size="34" opacity="0.6"]Bart Paden[/LINE]
[/CARD]`,
  },
  {
    name: 'with-artwork',
    card: photoDataUri
      ? `[CARD bg="#0a0a0a" text="#ffffff" mark="offwhite" bg_image="${photoDataUri}" scrim="0.55"]
[LINE size="62"]${QUOTE}[/LINE]
[LINE size="34" opacity="0.6"]Bart Paden[/LINE]
[/CARD]`
      : null,
  },
  {
    name: 'artwork-fetch-fails',
    // The case that decides whether the cadence survives unattended: a broken
    // artwork URL must still yield a postable card, not an exception.
    card: `[CARD bg="#12233a" text="#ffffff" mark="offwhite" bg_image="https://example.invalid/missing.png"]
[LINE size="62"]${QUOTE}[/LINE]
[LINE size="34" opacity="0.6"]Bart Paden[/LINE]
[/CARD]`,
  },
];

let ran = 0;
for (const c of cases) {
  if (!c.card) {
    console.log(`  skip ${c.name} (reference photo not present)`);
    continue;
  }
  const buf = await render(c.card);
  assert(Buffer.isBuffer(buf) && buf.length > 5000, `${c.name}: no PNG produced`);
  assert(buf.subarray(1, 4).toString() === 'PNG', `${c.name}: not a PNG`);
  const file = path.join(OUT, `${c.name}.png`);
  fs.writeFileSync(file, buf);
  console.log(`  ${c.name.padEnd(22)} ${String(buf.length).padStart(8)} bytes  ${file}`);
  ran++;
}

assert(ran >= 2, 'expected at least two rendered cases');
console.log('\ngenerateQuoteCardImage.background.selftest: all checks passed');
