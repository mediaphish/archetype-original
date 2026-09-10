/**
 * @jest-environment node
 *
 * The Archy funnel endpoint, checked at its edges.
 *
 * This exists because the numbers it produces will be used to decide what to do
 * about Archy, and a silently miscounting funnel is worse than no funnel: it
 * produces a confident wrong answer. The specific ways it could lie:
 *
 *   An unknown event name accepted would pollute the denominator.
 *   A query string kept on the path would fragment one page into many rows and
 *   quietly leak campaign and referrer detail nobody asked to store.
 *   A wrong page_type would put devotional readers and consulting prospects in
 *   one bucket, which is what makes a single conversion number meaningless.
 */
import fs from 'fs';
import path from 'path';
import { ARCHY_EVENTS, cleanPath, pageTypeOf } from '../ao/archyEngagement.js';

const ROOT = process.cwd();
const SRC = fs.readFileSync(path.join(ROOT, 'api/chat/engagement.js'), 'utf8');

describe('the endpoint is reachable', () => {
  it('has a route in vercel.json', () => {
    // A missing route does not 404 here. It falls through to the SPA catch-all
    // and returns the homepage with a 200, so every event would be silently
    // discarded while the client saw success. x-media-check, linkedin-check and
    // draft-versions all shipped that way.
    const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8'));
    const hit = (cfg.routes || []).some((r) => r.dest === '/api/chat/engagement.js');
    expect(hit).toBe(true);
  });
});

describe('event and path handling', () => {
  it('accepts exactly the five funnel events', () => {
    expect([...ARCHY_EVENTS].sort()).toEqual([
      'asked',
      'closed',
      'opened',
      'prompt_clicked',
      'shown',
    ]);
  });

  it('never reports failure to the page', () => {
    // Two 204s: one after a failed insert, one in the catch. A visitor's page
    // must not care whether analytics worked.
    expect(SRC.match(/status\(204\)/g)?.length).toBeGreaterThanOrEqual(2);
  });
});

describe('page types separate the surfaces that matter', () => {
  it.each([
    ['/journal/twenty-points-apart', 'journal-post'],
    // The index must not be typed as a post. If the prefix rule ran first it
    // would be, and the denominator for the pages search actually sends people
    // to would be inflated by the listing page.
    ['/journal', 'journal-index'],
    ['/faqs', 'faq'],
    ['/faqs/leadership', 'faq'],
    ['/culture-science/ali', 'culture-science'],
    ['/fractional-roles/cto', 'fractional-roles'],
    ['/', 'home'],
    ['/consulting', 'other'],
  ])('%s is %s', (p, expected) => {
    expect(pageTypeOf(p)).toBe(expected);
  });

  it('has no type for a missing path', () => {
    expect(pageTypeOf(null)).toBeNull();
  });
});

describe('cleanPath', () => {
  it.each([
    ['/journal/x?utm_source=newsletter&utm_campaign=aug', '/journal/x'],
    ['/journal/x#section-2', '/journal/x'],
    ['/journal/x?a=1#b', '/journal/x'],
    ['  /journal/x  ', '/journal/x'],
  ])('%s becomes %s', (input, expected) => {
    expect(cleanPath(input)).toBe(expected);
  });

  it.each([['https://evil.example/steal'], ['javascript:alert(1)'], [''], [null], [undefined]])(
    'rejects %s',
    (input) => {
      // Only same-origin paths. The client supplies this value, so an absolute
      // URL here would let a caller write arbitrary strings into the table.
      expect(cleanPath(input)).toBeNull();
    }
  );

  it('caps length so a long path cannot bloat a row', () => {
    expect(cleanPath(`/${'a'.repeat(1000)}`).length).toBe(300);
  });
});
