/**
 * @jest-environment node
 *
 * Captions are approved before anything is scheduled, and the two channels Bart
 * posts by hand are never dropped quietly.
 *
 * 2026-09-21: five caption rows went into the queue for captions he had never
 * seen ("you never had approval to schedule them. That's a breach of the
 * rules"), and LinkedIn Business and Facebook Personal were missing from every
 * caption list in the session ("At what point do you begin understanding that I
 * need LinkedIn Business and Facebook Personal captions so I can post them?").
 */
import { stageApprovals } from '../ao/draftStage.js';
import { cleanCaptions } from '../ao/stageApprovalRules.js';
import { buildCaptionsPanel } from '../ao/journalPanelData.js';

const approvedAt = '2026-09-21T15:00:00Z';

const draft = (stage_approvals) => ({
  slug: 'the-org-chart-only-works-until-its-tested',
  status: 'approved',
  approved_at: approvedAt,
  content: 'Body.',
  image_url: 'https://example.com/header.jpg',
  metadata: { stage_approvals },
});

describe('the gate schedule_captions consults', () => {
  it('is closed when captions have not been approved', () => {
    expect(stageApprovals(draft({ image: { approved_at: approvedAt } })).captions).toBe(false);
  });

  it('opens once the captions approval is recorded', () => {
    expect(
      stageApprovals(draft({ image: { approved_at: approvedAt }, captions: { approved_at: approvedAt } })).captions
    ).toBe(true);
  });
});

describe('missing hand-posted channels', () => {
  const allKeys = buildCaptionsPanel({}).map((c) => c.key);

  it('names the two Bart pastes when a five-channel set is approved', () => {
    const approved = cleanCaptions({
      linkedin_personal: 'a',
      instagram_business: 'b',
      instagram_personal: 'c',
      facebook_business: 'd',
      twitter: 'e',
    });
    const missing = allKeys.filter((key) => !approved[key]);
    expect(missing).toEqual(['linkedin_business', 'facebook_personal']);
  });

  it('names nothing when all seven are there', () => {
    const approved = cleanCaptions(Object.fromEntries(allKeys.map((k) => [k, 'text'])));
    expect(allKeys.filter((key) => !approved[key])).toEqual([]);
  });
});
