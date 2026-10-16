/**
 * @jest-environment node
 *
 * LinkedIn, reviewing the Community Management application (2026-10-16):
 * "Does your organization have the capability to securely delete all data
 * obtained via our community management APIs if required by LinkedIn?"
 *
 * Until this, the honest answer was no. Not because anything was being hoarded,
 * but because nobody had written the function. "No" to that question sinks the
 * application, so it had to become true before it could be answered.
 *
 * These check the two things that make the answer defensible: that every store
 * holding LinkedIn data is covered, and that Bart's own writing is not deleted
 * along with it.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const source = readFileSync(join(root, 'lib/social/linkedinDataDeletion.js'), 'utf8');
const endpoint = readFileSync(join(root, 'api/ao/linkedin-data.js'), 'utf8');
const vercel = JSON.parse(readFileSync(join(root, 'vercel.json'), 'utf8'));

/**
 * Read as text rather than imported: the module opens a Supabase client at load
 * time, which needs credentials this suite has no business holding.
 */
const LINKEDIN_DATA_STORES = [...source.matchAll(/\{ table: '([a-z_]+)'/g)].map((m) => ({ table: m[1] }));

/** Every table the codebase actually puts LinkedIn-derived data into. */
const STORES_IN_THE_CODEBASE = ['ao_linkedin_tokens', 'ao_scheduled_post_metrics', 'ao_scheduled_posts'];

describe('it covers everything LinkedIn data lands in', () => {
  test('each known store is named', () => {
    const covered = LINKEDIN_DATA_STORES.map((s) => s.table);
    for (const table of STORES_IN_THE_CODEBASE) {
      expect(covered).toContain(table);
    }
  });

  test('each store is actually acted on, not merely listed', () => {
    // A list that something forgot to delete from is worse than no list: it
    // reads as coverage while leaving data behind.
    for (const table of STORES_IN_THE_CODEBASE) {
      expect(source).toContain(`.from('${table}')`);
    }
  });

  test('the metrics it removes are only LinkedIn\'s', () => {
    // The same table holds Instagram, Facebook and X counts. Deleting those
    // would be destroying Bart's data to satisfy LinkedIn.
    expect(source).toMatch(/ao_scheduled_post_metrics[\s\S]{0,400}?\.eq\('platform', 'linkedin'\)/);
  });
});

describe('it does not delete Bart\'s own work', () => {
  test('published posts are cleared of the LinkedIn id, not removed', () => {
    const block = source.slice(source.indexOf("3. The post URNs"));
    expect(block).toContain('external_id: null');
    // The captions and images are his, written by him, and are not LinkedIn's
    // data to reclaim.
    expect(block).not.toMatch(/from\('ao_scheduled_posts'\)\s*\.delete\(\)/);
  });
});

describe('it can be shown without being fired', () => {
  test('a dry run reports what is held and changes nothing', () => {
    expect(source).toContain('dryRun');
    expect(source).toMatch(/if \(!dryRun && count\)/);
  });

  test('deleting takes a deliberate confirmation', () => {
    expect(endpoint).toMatch(/confirm[\s\S]{0,80}DELETE/);
  });
});

describe('the screen exists and can be reached', () => {
  test('it is routed, without which it is a 404 on this project', () => {
    expect(vercel.routes.some((r) => r.src === '/api/ao/linkedin-data')).toBe(true);
  });

  test('only the owner can see or erase it', () => {
    expect(endpoint).toContain('requireAoSession');
  });
});

describe('the claim that no member identities are held', () => {
  test('nothing in the LinkedIn integration requests them', () => {
    // This is the whole basis for answering "none" to LinkedIn's question
    // about what member details a Page admin sees. It must stay true.
    const linkedinFiles = [
      'lib/social/linkedin.js',
      'api/cron/ao/sync-post-metrics.js',
    ].map((f) => readFileSync(join(root, f), 'utf8'));

    for (const file of linkedinFiles) {
      // socialActions totals are fine. Fetching the actors behind them is not.
      expect(file).not.toMatch(/socialActions\/[^`'"]*\/(comments|likes)\b/);
      expect(file).not.toMatch(/reactions\?q=|commenters|actor~|projection=\(.*actor/);
    }
  });
});
