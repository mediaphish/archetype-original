/**
 * Load `.env` then `.env.local` from the project root without overriding
 * variables already set in the environment (CI / hosting wins).
 */
import fs from 'node:fs';
import path from 'node:path';

export function loadAliEnv() {
  for (const name of ['.env', '.env.local']) {
    const filePath = path.resolve(process.cwd(), name);
    if (!fs.existsSync(filePath)) continue;
    const raw = fs.readFileSync(filePath, 'utf8');
    for (let line of raw.split('\n')) {
      line = line.replace(/\r$/, '').trim();
      if (!line || line.startsWith('#')) continue;
      const eq = line.indexOf('=');
      if (eq <= 0) continue;
      const key = line.slice(0, eq).trim();
      let val = line.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (!key) continue;
      if (process.env[key] === undefined || process.env[key] === '') {
        process.env[key] = val;
      }
    }
  }
}
