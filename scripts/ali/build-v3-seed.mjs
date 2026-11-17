#!/usr/bin/env node
/**
 * Writes database/ALI_V3_BANK_SEED.sql from lib/ali-v3-bank.js, so the database
 * and the code always hold the same questions.
 *
 *   node scripts/ali/build-v3-seed.mjs          write the seed file
 *   node scripts/ali/build-v3-seed.mjs --check  fail if the seed file is out of date
 *
 * Writes nothing to the database. Apply the output by hand after
 * database/ALI_V3_INSTRUMENT.sql.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildSeedSql } from '../../lib/ali-v3-seed.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = path.join(ROOT, 'database', 'ALI_V3_BANK_SEED.sql');

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const sql = buildSeedSql();
  if (process.argv.includes('--check')) {
    const current = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
    if (current !== sql) {
      console.error('database/ALI_V3_BANK_SEED.sql is out of date. Run: node scripts/ali/build-v3-seed.mjs');
      process.exit(1);
    }
    console.log('ALI v3 seed is current.');
  } else {
    fs.writeFileSync(OUT, sql);
    console.log(`Wrote ${path.relative(ROOT, OUT)}`);
  }
}
