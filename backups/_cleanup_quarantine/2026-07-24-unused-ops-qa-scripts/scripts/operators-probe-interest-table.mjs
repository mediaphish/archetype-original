#!/usr/bin/env node
/**
 * One-off probe: try inserting a row into operators_interest with the same
 * shape api/operators/interest/submit.js writes, and report the exact error.
 *
 * Reads SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from .env.local (or the
 * environment), so it can run locally without hosting access.
 *
 * Usage:
 *   node scripts/operators-probe-interest-table.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

function loadDotenvLocal() {
  const file = path.join(repoRoot, '.env.local');
  if (!fs.existsSync(file)) return;
  const text = fs.readFileSync(file, 'utf8');
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const k = line.slice(0, eq).trim();
    const v = line.slice(eq + 1).trim();
    if (!process.env[k]) process.env[k] = v;
  }
}

loadDotenvLocal();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const probeEmail = `probe.interest.${Date.now()}@archetypeoriginal.com`;

const payload = {
  name: 'Probe User',
  email: probeEmail,
  role_title: 'CEO',
  company_size: '5-25',
  bio: 'This is a probe submission from scripts/operators-probe-interest-table.mjs to verify the operators_interest table accepts inserts and to surface any schema or policy errors that the live form is hitting. It is at least one hundred characters long.',
  status: 'pending',
};

console.log('Probing operators_interest insert with payload:');
console.log(JSON.stringify({ ...payload, bio: `${payload.bio.slice(0, 40)}…` }, null, 2));

const { data, error } = await supabase
  .from('operators_interest')
  .insert(payload)
  .select()
  .single();

if (error) {
  console.error('\nINSERT FAILED:');
  console.error(JSON.stringify(error, null, 2));
  console.error('\nDetails:');
  console.error('  message :', error.message);
  console.error('  details :', error.details);
  console.error('  hint    :', error.hint);
  console.error('  code    :', error.code);
  process.exit(2);
}

console.log('\nINSERT OK. Inserted row:');
console.log(JSON.stringify(data, null, 2));

const { error: delError } = await supabase
  .from('operators_interest')
  .delete()
  .eq('email', probeEmail);

if (delError) {
  console.warn('\nWARN: probe row insert succeeded but cleanup delete failed:', delError.message);
} else {
  console.log('\nCleanup OK: probe row removed.');
}

process.exit(0);
