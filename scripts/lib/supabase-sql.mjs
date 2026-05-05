/**
 * Helper for running raw SQL against the project's Supabase Postgres database.
 *
 * Reads SUPABASE_PROJECT_REF and SUPABASE_DB_PASSWORD from .env.local (or env).
 * Tries common connection patterns in order until one works:
 *   1. Direct connection: db.<ref>.supabase.co:5432  (IPv4 may be unavailable on free tier)
 *   2. Session pooler:    aws-0-<region>.pooler.supabase.com:5432 (per supplied region)
 *   3. Transaction pooler: aws-0-<region>.pooler.supabase.com:6543
 *
 * Exposes:
 *   - getSql() -> postgres-js client (lazily connected)
 *   - runSqlFile(path) -> executes a .sql file (splits on semicolons safely for our schema files)
 *   - close()
 */

import fs from 'node:fs';
import path from 'node:path';
import dns from 'node:dns/promises';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');

export function loadDotenvLocal() {
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

const POOLER_REGIONS = [
  'us-east-1', 'us-east-2', 'us-west-1', 'us-west-2',
  'eu-west-1', 'eu-west-2', 'eu-west-3', 'eu-central-1', 'eu-central-2', 'eu-north-1',
  'ap-southeast-1', 'ap-southeast-2', 'ap-northeast-1', 'ap-northeast-2', 'ap-south-1',
  'sa-east-1', 'ca-central-1',
];

/** Direct db.<ref>.supabase.co is often IPv6-only; resolve AAAA and connect by IP. */
async function buildIpv6DirectCandidates(ref, rawPassword) {
  const host = `db.${ref}.supabase.co`;
  let addrs = [];
  try {
    addrs = await dns.resolve6(host);
  } catch {
    return [];
  }
  return addrs.map((ip) => ({
    label: `direct via IPv6 literal [${ip}]:5432`,
    config: {
      host: ip,
      port: 5432,
      database: 'postgres',
      username: 'postgres',
      password: rawPassword,
      ssl: 'require',
    },
  }));
}

function buildCandidateUrls() {
  const ref = process.env.SUPABASE_PROJECT_REF;
  const pw = process.env.SUPABASE_DB_PASSWORD;
  if (!ref || !pw) {
    throw new Error('Missing SUPABASE_PROJECT_REF or SUPABASE_DB_PASSWORD in .env.local');
  }
  const encPw = encodeURIComponent(pw);
  const urls = [];
  for (const region of POOLER_REGIONS) {
    const poolHost = `aws-0-${region}.pooler.supabase.com`;
    // Transaction mode (shared pooler): postgres.<project_ref> @ :6543 — works on IPv4.
    urls.push({
      label: `shared pooler transaction ${region}:6543`,
      url: `postgres://postgres.${ref}:${encPw}@${poolHost}:6543/postgres`,
      options: { ssl: 'require' },
    });
  }
  for (const region of POOLER_REGIONS) {
    const poolHost = `aws-0-${region}.pooler.supabase.com`;
    urls.push({
      label: `shared pooler session ${region}:5432`,
      url: `postgres://postgres.${ref}:${encPw}@${poolHost}:5432/postgres`,
      options: { ssl: 'require' },
    });
  }
  return urls;
}

let _sql = null;
let _label = null;

export async function getSql() {
  if (_sql) return _sql;
  const explicitUri = (process.env.SUPABASE_DB_CONNECTION_URI || '').trim();
  const ref = process.env.SUPABASE_PROJECT_REF;
  const pw = process.env.SUPABASE_DB_PASSWORD;
  const ipv6Direct = ref && pw ? await buildIpv6DirectCandidates(ref, pw) : [];

  const candidates = [];

  if (explicitUri) {
    candidates.push({
      label: 'SUPABASE_DB_CONNECTION_URI (from .env.local)',
      url: explicitUri,
      options: { ssl: 'require' },
    });
  }
  candidates.push(...ipv6Direct, ...buildCandidateUrls());
  const verbose = process.env.SUPABASE_SQL_VERBOSE === '1';
  const errors = [];
  for (const c of candidates) {
    let sql;
    try {
      if (c.config) {
        sql = postgres({
          ...c.config,
          max: 1,
          idle_timeout: 5,
          connect_timeout: 12,
          prepare: false,
        });
      } else {
        sql = postgres(c.url, {
          ...c.options,
          max: 1,
          idle_timeout: 5,
          connect_timeout: 12,
          prepare: false,
        });
      }
      await sql`select 1`;
      _sql = sql;
      _label = c.label;
      return sql;
    } catch (err) {
      errors.push({ label: c.label, message: err && err.message });
      if (verbose) console.error(`  [try] ${c.label}: ${err && err.message}`);
      try { if (sql) await sql.end({ timeout: 1 }); } catch { /* noop */ }
    }
  }
  const summary = errors.map((e) => `  - ${e.label}: ${e.message}`).join('\n');
  throw new Error(`Could not connect to Supabase Postgres. Tried:\n${summary}`);
}

export function getConnectionLabel() {
  return _label;
}

export async function close() {
  if (_sql) {
    try { await _sql.end({ timeout: 5 }); } catch { /* noop */ }
    _sql = null;
    _label = null;
  }
}

export async function runSqlFile(filePath) {
  const sql = await getSql();
  const text = fs.readFileSync(filePath, 'utf8');
  await sql.unsafe(text);
}
