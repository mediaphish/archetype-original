/**
 * @jest-environment node
 *
 * Bart, 2026-10-04: "All 5 channels that let us post via API."
 *
 * His personal Instagram was quietly absent from both automatic senders. Its
 * connection had been dead since September 24 and nobody had put it back in the
 * lists even before that: the quote card and reshare flows had only ever named
 * four accounts, while the journal flow included five. That is why his personal
 * account received journal entries and no quote cards at all, which read as a
 * broken channel rather than a channel nothing was addressed to.
 *
 * It was reconnected on October 4 and renews itself weekly now.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const PERSONAL = 'ig_mediaphish';

/** The account ids named in a channel list, in source order. */
function accountsIn(source, listName) {
  const start = source.indexOf(`const ${listName} = [`);
  if (start < 0) return null;
  const end = source.indexOf('];', start);
  const block = source.slice(start, end);
  return [...block.matchAll(/account_id:\s*'([^']+)'/g)].map((m) => m[1]);
}

describe('both automatic senders address all five accounts', () => {
  test('the reshare engine', () => {
    const source = readFileSync(join(root, 'api/ao/auto/reshare-journal.js'), 'utf8');
    const accounts = accountsIn(source, 'RESHARE_CHANNELS');
    expect(accounts).toContain(PERSONAL);
    expect(accounts.length).toBe(5);
  });

  test('the weekly quote card bundle', () => {
    const source = readFileSync(join(root, 'api/ao/publishing/schedule-weekly-pull-bundle.js'), 'utf8');
    const accounts = accountsIn(source, 'BUNDLE_PLATFORMS');
    expect(accounts).toContain(PERSONAL);
    expect(accounts.length).toBe(5);
  });

  test('LinkedIn Business stays out, because it cannot post', () => {
    // 0 posted and 13 failed on "Organization Or Events permissions must be
    // used when using organization as author". It is manual until the second
    // developer app is approved, and adding it would only manufacture failures.
    const source = readFileSync(join(root, 'api/ao/auto/reshare-journal.js'), 'utf8');
    expect(accountsIn(source, 'RESHARE_CHANNELS')).not.toContain('page_1');
  });
});
