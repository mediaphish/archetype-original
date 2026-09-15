/**
 * @jest-environment node
 *
 * Stage derivation, with approval meaning approval.
 *
 * Corrected 2026-09-15. The first version treated existence as approval: a saved
 * image moved the panel to Captions before Bart had approved the image. Bart:
 * "I need to approve each step before it moves on." These tests assert that
 * nothing advances without an explicit approval record.
 */
import { deriveDraftStage, stageAdvanced, stageApprovals, canApproveGate, STAGES, STAGE_TABS } from '../ao/draftStage.js';

const approved = (gates) =>
  Object.fromEntries(gates.map((g) => [g, { approved_at: '2026-09-15T01:00:00Z' }]));

const tuesday = (extra = {}) => ({
  slug: 'your-tuesday',
  status: 'approved',
  approved_at: '2026-09-15T00:30:00Z',
  content: 'Nick Saban told a reporter his morning routine once.',
  image_url: 'https://example.com/tuesday.png',
  metadata: {},
  ...extra,
});

describe('the Your Tuesday regression', () => {
  it('stays on Image while the image exists but is not approved', () => {
    const out = deriveDraftStage({ draft: tuesday() });
    expect(out.stage).toBe('image');
    expect(out.approvals.image).toBe(false);
  });

  it('moves to Captions only once the image is approved', () => {
    const out = deriveDraftStage({ draft: tuesday({ metadata: { stage_approvals: approved(['image']) } }) });
    expect(out.stage).toBe('captions');
  });

  it('stays on Captions while captions exist but are not approved', () => {
    const out = deriveDraftStage({ draft: tuesday({ metadata: { stage_approvals: approved(['image']) } }) });
    expect(out.stage).toBe('captions');
    expect(out.approvals.captions).toBe(false);
  });

  it('moves to Schedule only once captions are approved', () => {
    const out = deriveDraftStage({ draft: tuesday({ metadata: { stage_approvals: approved(['image', 'captions']) } }) });
    expect(out.stage).toBe('schedule');
  });
});

describe('earlier stages', () => {
  it('is brief with no draft', () => {
    expect(deriveDraftStage({}).stage).toBe('brief');
  });

  it('is brief when a row has no body', () => {
    expect(deriveDraftStage({ draft: { status: 'draft', content: '' } }).stage).toBe('brief');
  });

  it('is post when there is a body and the post is not approved', () => {
    expect(deriveDraftStage({ draft: { status: 'draft', content: 'Body.' } }).stage).toBe('post');
  });

  it('does not skip to Image just because an image was generated early', () => {
    const out = deriveDraftStage({ draft: { status: 'draft', content: 'Body.', image_url: 'https://example.com/x.png' } });
    expect(out.stage).toBe('post');
  });
});

describe('later approvals imply earlier ones', () => {
  it('counts the brief as done once the post is approved', () => {
    expect(stageApprovals(tuesday()).brief).toBe(true);
  });

  it('counts image and post as done once captions are approved', () => {
    const a = stageApprovals({ status: 'draft', content: 'x', metadata: { stage_approvals: approved(['captions']) } });
    expect(a).toMatchObject({ brief: true, post: true, image: true, captions: true, schedule: false });
  });

  it('counts everything as done once published', () => {
    const out = deriveDraftStage({ draft: tuesday({ published_at: '2026-09-15T15:00:00Z' }) });
    expect(out.stage).toBe('published');
    expect(Object.values(out.approvals).every(Boolean)).toBe(true);
  });
});

describe('canApproveGate', () => {
  it('refuses to approve the image before the earlier steps, naming the first one missing', () => {
    // Nothing approved yet, so the first unapproved step is the brief, which
    // comes before the post in the workflow.
    const r = canApproveGate({ status: 'draft', content: 'x', metadata: {} }, 'image');
    expect(r.ok).toBe(false);
    expect(r.error).toBe('Approve the brief before the image.');
  });

  it('refuses to approve the image when only the brief is approved', () => {
    const r = canApproveGate(
      { status: 'draft', content: 'x', metadata: { stage_approvals: approved(['brief']) } },
      'image'
    );
    expect(r.ok).toBe(false);
    expect(r.error).toBe('Approve the post before the image.');
  });

  it('refuses to approve captions before the image', () => {
    const r = canApproveGate(tuesday(), 'captions');
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/image/);
  });

  it('allows the next gate in order', () => {
    expect(canApproveGate(tuesday(), 'image').ok).toBe(true);
    expect(canApproveGate(tuesday({ metadata: { stage_approvals: approved(['image']) } }), 'captions').ok).toBe(true);
  });

  it('refuses unknown steps and published posts', () => {
    expect(canApproveGate(tuesday(), 'nonsense').ok).toBe(false);
    expect(canApproveGate(tuesday({ status: 'published' }), 'image').ok).toBe(false);
  });
});

describe('edges', () => {
  it('parks an abandoned draft', () => {
    const out = deriveDraftStage({ draft: { status: 'abandoned', content: 'x' } });
    expect(out.stage).toBe('abandoned');
    expect(out.next).toBeNull();
  });

  it('every stage maps to a tab', () => {
    for (const stage of STAGES) expect(typeof STAGE_TABS[stage]).toBe('string');
  });
});

describe('stageAdvanced', () => {
  it('is true forward and false back', () => {
    expect(stageAdvanced('post', 'image')).toBe(true);
    expect(stageAdvanced('image', 'post')).toBe(false);
    expect(stageAdvanced('image', 'image')).toBe(false);
  });
});
