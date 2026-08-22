/**
 * @jest-environment node
 *
 * Bart: "I do need a clear 'this post is done' process so the issue with Auto
 * thinking they aren't goes away."
 */
import {
  classifyDraft,
  isWorkingArtifact,
  looksConversational,
  selectOutstandingDrafts,
} from '../ao/draftLifecycle.js';

const live = new Set([
  'the-barnabas-archetype',
  'the-absalom-archetype',
  'the-nehemiah-archetype',
  'the-pipeline-isnt-draining-its-refusing-to-fill',
  'they-still-call-him',
]);

describe('classifyDraft', () => {
  it('treats a live post as done even when the row says draft', () => {
    // The five real posts that were on the site while their rows said otherwise.
    // The corpus is the source of truth for done; the row is only a work order.
    for (const slug of live) {
      expect(classifyDraft({ slug, status: 'draft' }, live)).toBe('published');
    }
    expect(classifyDraft({ slug: 'they-still-call-him', status: 'approved' }, live)).toBe(
      'published'
    );
  });

  it('leaves a scheduled post as scheduled, not outstanding', () => {
    // Jezebel: approved and queued for 2026-08-24. Genuinely not published yet.
    expect(
      classifyDraft(
        { slug: 'the-jezebel-archetype', status: 'approved', scheduled_publish_at: '2026-08-24' },
        live
      )
    ).toBe('scheduled');
  });

  it('flags slugified chat messages as conversational', () => {
    const real = [
      'ok-were-going-to-try-this-again-you-wrote-the-entire-post-deleted-it-because-of-',
      'do-we-have-any-examples-that-have-been-published-of-the-hazing-it-would-add-good',
      'named-individuals-have-taken-the-dispute-to-court-rather-than-a-hearing-room-wha',
      'another-angle-we-could-explore-is-that-paul-was-sent-back-to-tarsus-for-his-own-',
      'continuing-the-accuracy-issue-i-just-flagged-in-the-current-condition-section-th',
    ];
    for (const slug of real) {
      expect(classifyDraft({ slug, status: 'draft' }, live)).toBe('conversational');
    }
  });

  it('flags system bookkeeping rows as artifacts', () => {
    for (const slug of [
      'captions-2026-08-14',
      'handoff-prompt-for-auto-part-2-scoreboard-leadership',
      'image-prompt-the-ruth-archetype',
      'draft-identity-selftest-1786666022829',
      'constraint-active-draft-1786301519187',
      'session-brief-15a4b6a2',
    ]) {
      expect(classifyDraft({ slug, status: 'approved' }, live)).toBe('artifact');
    }
  });

  it('keeps a genuine unfinished post in progress', () => {
    expect(classifyDraft({ slug: 'the-ruth-archetype', status: 'draft' }, live)).toBe(
      'in_progress'
    );
  });
});

describe('looksConversational', () => {
  it('never flags a real post title', () => {
    // Excluding a real post from Auto's list is worse than leaving an artifact
    // in it, so this must stay conservative.
    for (const slug of [
      'the-jezebel-archetype',
      'scoreboard-leadership',
      'the-pipeline-isnt-draining-its-refusing-to-fill',
      'leadership-is-not-a-clenched-fist-but-a-guiding-hand-part-1',
      'why-servant-leadership-disrupts-unaccountable-power',
    ]) {
      expect(looksConversational(slug)).toBe(false);
    }
  });

  it('requires length, not just a stem', () => {
    expect(looksConversational('ok-fine')).toBe(false);
    expect(looksConversational('more-notes')).toBe(false);
  });
});

describe('selectOutstandingDrafts', () => {
  it('returns only real unfinished posts', () => {
    const rows = [
      { slug: 'the-barnabas-archetype', status: 'draft' },
      { slug: 'captions-2026-08-14', status: 'draft' },
      { slug: 'ok-were-going-to-try-this-again-you-wrote-the-entire-post-deleted-it-because-of-', status: 'approved' },
      { slug: 'the-jezebel-archetype', status: 'approved', scheduled_publish_at: '2026-08-24' },
      { slug: 'the-ruth-archetype', status: 'draft' },
    ];
    expect(selectOutstandingDrafts(rows, live).map((r) => r.slug)).toEqual([
      'the-jezebel-archetype',
      'the-ruth-archetype',
    ]);
  });

  it('handles an empty list', () => {
    expect(selectOutstandingDrafts([], live)).toEqual([]);
    expect(selectOutstandingDrafts(null, live)).toEqual([]);
  });
});

describe('isWorkingArtifact', () => {
  it('keys on kind as well as slug', () => {
    expect(isWorkingArtifact({ slug: 'anything', kind: 'session_brief' })).toBe(true);
    expect(isWorkingArtifact({ slug: 'anything', kind: 'content_constraint' })).toBe(true);
    expect(isWorkingArtifact({ slug: 'the-ruth-archetype', kind: 'journal' })).toBe(false);
  });
});
