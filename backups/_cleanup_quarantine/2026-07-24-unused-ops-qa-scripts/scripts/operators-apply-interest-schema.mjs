#!/usr/bin/env node
/**
 * Idempotent: applies database/OPERATORS_INTEREST_SCHEMA.sql to Supabase.
 * Safe to re-run.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runSqlFile, getSql, getConnectionLabel, close } from './lib/supabase-sql.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

const schemaFile = path.join(repoRoot, 'database', 'OPERATORS_INTEREST_SCHEMA.sql');

console.log('Applying schema:', schemaFile);
try {
  await runSqlFile(schemaFile);
} catch (err) {
  console.error('\n❌ DDL failed:', err.message);
  console.error(`
Fix (pick one):

1. In Supabase → your project → Connect → copy the Postgres URI (prefer "Session pooler"),
   paste into .env.local as:

      SUPABASE_DB_CONNECTION_URI='postgres://postgres.<YOUR_REF>:<PASSWORD>@...

   (quotes help if your password contains # or $.)

2. Or open Supabase SQL Editor and run:

      database/OPERATORS_INTEREST_SCHEMA.sql

Then re-run: node scripts/operators-apply-interest-schema.mjs

`);
  process.exit(2);
}

console.log('\n✓ DDL applied.');
console.log('Connected via:', getConnectionLabel());

const sql = await getSql();
const cols = await sql`
  SELECT column_name, data_type, is_nullable, column_default
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'operators_interest'
  ORDER BY ordinal_position
`;
console.log('\noperators_interest columns:');
for (const c of cols) {
  console.log(`  ${c.column_name.padEnd(14)} ${String(c.data_type).padEnd(28)} nullable=${c.is_nullable} default=${c.column_default || ''}`);
}

await close();
console.log('\nDone.');
