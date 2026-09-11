/**
 * @jest-environment node
 *
 * Stage derivation. Everything in the staged workspace reads this, so a wrong
 * answer here opens the wrong tab and tells Auto the wrong thing about what
 * Bart is doing.
 */
import { deriveDraftStage, stageAdvanced, STAGES, STAGE_TABS } from '../ao/draftStage.js';

const approvedNoImage = {
  slug: 'the-cain-archetype',
  status: 'approved',
  approved_at: '2026-09-10T19:45:00Z',
  content: 'Cain did not fail because no one told him.',
  image_url: null,
};

describe('the Cain case', () => {
  it('is the image stage once the post is approved and has no image', () => {
    const out = deriveDraftStage({ draft: approvedNoImage, captions: [] });
    expect(out.stage).toBe('image');
    expect(out.tab).toBe('image');
    expect(out.next).toBe('captions');
  });

  it('moves to captions once an image is saved', () => {
    const out = deriveDraftStage({
      draft: { ...approvedNoImage, image_url: 'https://example.com/header.png' },
      captions: [],
    });
    expect(out.stage).toBe('captions');
  });
});

describe('earlier stages', () => {
  it('is brief with no draft at all', () => {
    expect(deriveDraftStage({}).stage).toBe('brief');
  });

  it('is brief when a draft row exists with no body', () => {
    // A row can exist with empty content when the title was saved before the
    // writing happened. That is not the Post stage.
    expect(deriveDraftStage({ draft: { status: 'draft', content: '' } }).stage).toBe('brief');
  });

  it('is post when there is a body and no approval', () => {
    expect(deriveDraftStage({ draft: { status: 'draft', content: 'Real body text.' } }).stage).toBe('post');
  });

  it('treats approved_at as approval even when status lags', () => {
    const out = deriveDraftStage({
      draft: { status: 'draft', approved_at: '2026-09-10T19:45:00Z', content: 'body' },
    });
    expect(out.stage).toBe('image');
  });
});

describe('captions and schedule', () => {
  it('is captions while rows are still pending review', () => {
    const out = deriveDraftStage({
      draft: { ...approvedNoImage, image_url: 'https://example.com/h.png' },
      captions: [{ platform: 'linkedin', status: 'pending_review' }],
    });
    expect(out.stage).toBe('captions');
  });

  it('is schedule once any caption row is committed to the queue', () => {
    const out = deriveDraftStage({
      draft: { ...approvedNoImage, image_url: 'https://example.com/h.png' },
      captions: [
        { platform: 'linkedin', status: 'scheduled' },
        { platform: 'instagram', status: 'pending_review' },
      ],
    });
    expect(out.stage).toBe('schedule');
  });

  it('is schedule when a publish time is set even with no caption rows', () => {
    const out = deriveDraftStage({
      draft: { ...approvedNoImage, image_url: 'https://example.com/h.png', scheduled_publish_at: '2026-09-20T12:00:00Z' },
      captions: [],
    });
    expect(out.stage).toBe('schedule');
  });

  it('is published once the draft is published', () => {
    const out = deriveDraftStage({
      draft: { ...approvedNoImage, published_at: '2026-09-20T12:00:00Z' },
      captions: [{ platform: 'linkedin', status: 'posted' }],
    });
    expect(out.stage).toBe('published');
    expect(out.tab).toBe('schedule_publish');
  });
});

describe('approvals are reported for the workflow strip', () => {
  it('marks everything up to the current stage', () => {
    const out = deriveDraftStage({
      draft: { ...approvedNoImage, image_url: 'https://example.com/h.png' },
      captions: [],
    });
    expect(out.approvals).toEqual({
      brief: true,
      post: true,
      image: true,
      captions: false,
      schedule: false,
    });
  });
});

describe('edges', () => {
  it('parks an abandoned draft rather than guessing a stage', () => {
    const out = deriveDraftStage({ draft: { status: 'abandoned', content: 'x' } });
    expect(out.stage).toBe('abandoned');
    expect(out.next).toBeNull();
  });

  it('every stage maps to a tab', () => {
    for (const stage of STAGES) expect(typeof STAGE_TABS[stage]).toBe('string');
  });

  it('tolerates junk captions', () => {
    expect(deriveDraftStage({ draft: approvedNoImage, captions: null }).stage).toBe('image');
  });
});

describe('stageAdvanced', () => {
  it('is true going forward and false going back', () => {
    // Only forward movement switches the open tab. A reopen must not yank the
    // panel around on its own.
    expect(stageAdvanced('post', 'image')).toBe(true);
    expect(stageAdvanced('image', 'post')).toBe(false);
    expect(stageAdvanced('image', 'image')).toBe(false);
  });

  it('is false for unknown stages', () => {
    expect(stageAdvanced('nonsense', 'image')).toBe(false);
    expect(stageAdvanced('image', 'abandoned')).toBe(false);
  });
});
