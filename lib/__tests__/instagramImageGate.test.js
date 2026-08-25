/**
 * @jest-environment node
 *
 * "The Standard That Held" published on 2026-08-19 with both Instagram rows
 * scheduled and both dead on arrival: "Instagram feed posts require an image
 * (image_url)". X, LinkedIn and Facebook went out fine, so the post looked
 * successful, and the two missing channels were later reported as never having
 * been scheduled at all. They had been scheduled. They were scheduled without an
 * image, which Instagram will never accept.
 *
 * These lock the rule that prevents a guaranteed-to-fail row being queued.
 */
// Imported from its own module. scheduleJournalLaunchCaptions.js reaches
// supabase-admin transitively through the scheduler, so importing the rule from
// there would need a database connection to test array filtering.
import { assertInstagramHasImage } from '../ao/instagramImageGate.js';

const IG = [
  { platform: 'instagram', account_id: 'meta' },
  { platform: 'instagram', account_id: 'ig_mediaphish' },
];
const NON_IG = [
  { platform: 'twitter', account_id: 'personal' },
  { platform: 'linkedin', account_id: 'personal' },
  { platform: 'facebook', account_id: 'meta' },
];
const IMAGE = 'https://www.archetypeoriginal.com/images/twenty-points-apart.jpg';

describe('assertInstagramHasImage', () => {
  it('blocks Instagram when the draft has no image', () => {
    const out = assertInstagramHasImage({ channels: IG, imageUrl: null, slug: 'the-standard-that-held' });
    expect(out.ok).toBe(false);
    expect(out.gate).toBe('instagram_requires_image');
  });

  it('names the slug and the fix in the error', () => {
    // The Part 3 failure went undiagnosed for days because the message arrived
    // at post time and said nothing about what to do. This one has to be
    // actionable on its own.
    const out = assertInstagramHasImage({ channels: IG, imageUrl: '', slug: 'some-post' });
    expect(out.error).toContain('some-post');
    expect(out.error).toMatch(/attach and approve the header/i);
  });

  it('treats a whitespace-only image url as missing', () => {
    expect(assertInstagramHasImage({ channels: IG, imageUrl: '   ', slug: 's' }).ok).toBe(false);
  });

  it('allows Instagram once an image is attached', () => {
    expect(assertInstagramHasImage({ channels: IG, imageUrl: IMAGE, slug: 's' }).ok).toBe(true);
  });

  it('does not block a launch with no Instagram channel', () => {
    // X, LinkedIn and Facebook post fine without an image. Blocking them too
    // would turn a two-channel problem into a five-channel outage.
    expect(assertInstagramHasImage({ channels: NON_IG, imageUrl: null, slug: 's' }).ok).toBe(true);
  });

  it('blocks when Instagram is one channel among several', () => {
    const mixed = [...NON_IG, IG[0]];
    expect(assertInstagramHasImage({ channels: mixed, imageUrl: null, slug: 's' }).ok).toBe(false);
  });

  it('handles an empty or missing channel list without throwing', () => {
    expect(assertInstagramHasImage({ channels: [], imageUrl: null, slug: 's' }).ok).toBe(true);
    expect(assertInstagramHasImage({ imageUrl: null, slug: 's' }).ok).toBe(true);
  });
});
