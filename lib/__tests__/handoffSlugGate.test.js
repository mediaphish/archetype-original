/**
 * @jest-environment node
 *
 * Six handoff briefs had accumulated in the drafts table by 2026-08-25, two of
 * them marked approved. The newest would have published Part 4 of the Scoreboard
 * Leadership series to:
 *
 *   archetypeoriginal.com/journal/handoff-post-4-the-account-under-fire
 *
 * Bart's rule: when a handoff opens a new session, the slug is not set until
 * later in the process, once the post has its real title.
 */
import { assertNotHandoffSlug } from '../ao/handoffSlugGate.js';

describe('assertNotHandoffSlug', () => {
  it('blocks the exact slug that would have shipped', () => {
    const out = assertNotHandoffSlug({ slug: 'handoff-post-4-the-account-under-fire' });
    expect(out.ok).toBe(false);
    expect(out.gate).toBe('handoff_is_not_a_post');
  });

  it('blocks every handoff slug already in the table', () => {
    const found = [
      'handoff-archetype-series-next-entry',
      'handoff-archetype-series-next-entry-negative-archetype',
      'handoff-archetype-series-ruth-entry',
      'handoff-prompt-for-auto-part-2-scoreboard-leadership',
      'handoff-post-4-the-account-under-fire',
    ];
    for (const slug of found) {
      expect(assertNotHandoffSlug({ slug }).ok).toBe(false);
    }
  });

  it('blocks a handoff title even when the slug looks clean', () => {
    // Auto titled the Part 4 row "The Account Under Fire" while giving it a
    // handoff slug. The reverse happens too, so both are checked.
    const out = assertNotHandoffSlug({ slug: 'the-account-under-fire', title: 'HANDOFF: Post 4' });
    expect(out.ok).toBe(false);
  });

  it('sees through markdown bolding on the title', () => {
    // Two rows in the table are literally titled "**HANDOFF: ...**".
    expect(assertNotHandoffSlug({ title: '**HANDOFF: Archetype Series, next entry**' }).ok).toBe(false);
  });

  it('tells Auto what to do instead, naming the correct slug', () => {
    const out = assertNotHandoffSlug({ slug: 'handoff-post-4-the-account-under-fire' });
    expect(out.error).toContain('the-account-under-fire');
    expect(out.error).toMatch(/set the slug later/i);
  });

  it('allows the real post slug', () => {
    expect(assertNotHandoffSlug({ slug: 'the-account-under-fire', title: 'The Account Under Fire' }).ok).toBe(true);
  });

  it('allows a post that merely mentions a handoff in its title', () => {
    // "handoff" as a word inside a sentence is not the same as a slug that is a
    // handoff. Only a leading title token or a whole slug segment counts.
    expect(assertNotHandoffSlug({ slug: 'the-quiet-handoff-problem', title: 'The Quiet Handoff Problem' }).ok).toBe(false);
    expect(assertNotHandoffSlug({ slug: 'what-a-good-handover-looks-like' }).ok).toBe(true);
  });

  it('allows an empty slug, which is the state a handoff should leave behind', () => {
    expect(assertNotHandoffSlug({}).ok).toBe(true);
    expect(assertNotHandoffSlug({ slug: '', title: '' }).ok).toBe(true);
  });
});
