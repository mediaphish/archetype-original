/**
 * @jest-environment node
 */
jest.mock('../supabase-admin.js', () => ({ supabaseAdmin: { from: () => ({}) } }));

const { promoPostRows, schedulePromoPost } = require('../ao/schedulePromoPost.js');

const IMG = 'https://abc.supabase.co/storage/v1/object/public/ao-auto-attachments/ao-design-images/wide.jpg';
const SQ = 'https://abc.supabase.co/storage/v1/object/public/ao-auto-attachments/ao-design-images/square.jpg';
const URL = 'https://www.archetypeoriginal.com/podcast/season-01-episode-04';
const caps = {
  linkedin_personal: `New episode. ${URL}`,
  linkedin_business: `Company copy. ${URL}`,
  facebook_business: `Facebook copy. ${URL}`,
  instagram_business: 'IG copy, link in bio',
  instagram_personal: 'IG personal, link in bio',
  twitter: `Short one. ${URL}`,
};
const now = Date.parse('2026-11-19T20:00:00Z');
const later = '2026-11-19T21:00:00Z';

describe('promoPostRows', () => {
  test('builds six rows, square image on Instagram, wide elsewhere', () => {
    const r = promoPostRows({ image_url: IMG, image_url_square: SQ, captions: caps, scheduled_at: later, now });
    expect(r.ok).toBe(true);
    expect(r.rows).toHaveLength(6);
    for (const row of r.rows) {
      expect(row.image_url).toBe(row.platform === 'instagram' ? SQ : IMG);
      expect(row.status).toBe('scheduled');
    }
    expect(r.rows.find((x) => x.account_id === 'page_1')).toBeTruthy();
  });

  test('per-channel times win over the default', () => {
    const r = promoPostRows({ image_url: IMG, captions: caps, scheduled_at: later, times: { twitter: '2026-11-19T22:00:00Z' }, now });
    expect(r.rows.find((x) => x.platform === 'twitter').scheduled_at).toBe('2026-11-19T22:00:00.000Z');
  });

  test('refuses outside images, missing captions, links on Instagram, long X, past times', () => {
    expect(promoPostRows({ image_url: 'https://evil.example/x.jpg', captions: caps, scheduled_at: later, now }).ok).toBe(false);
    expect(promoPostRows({ image_url: IMG, captions: { ...caps, twitter: '' }, scheduled_at: later, now }).ok).toBe(false);
    expect(promoPostRows({ image_url: IMG, captions: { ...caps, instagram_business: URL }, scheduled_at: later, now }).ok).toBe(false);
    expect(promoPostRows({ image_url: IMG, captions: { ...caps, twitter: 'x'.repeat(300) }, scheduled_at: later, now }).ok).toBe(false);
    expect(promoPostRows({ image_url: IMG, captions: caps, scheduled_at: '2026-11-19T19:00:00Z', now }).ok).toBe(false);
  });
});

describe('schedulePromoPost approval gate', () => {
  test('nothing is scheduled without Bart approving this turn', async () => {
    const out = await schedulePromoPost({ image_url: IMG, captions: caps, scheduled_at: later }, { userMessage: 'Can you change the X caption?' });
    expect(out.ok).toBe(false);
    expect(out.gate).toBe('promo_not_approved');
  });
});

describe('promoConflicts', () => {
  const { promoConflicts } = require('../ao/schedulePromoPost.js');
  const row = (at) => ({ platform: 'linkedin', account_id: 'personal', scheduled_at: at });
  test('a follow-up the same afternoon as the launch is refused', () => {
    expect(promoConflicts([row('2026-11-19T21:30:00Z')], [row('2026-11-19T21:00:00Z')])).toHaveLength(1);
  });
  test('a follow-up on its own day is fine', () => {
    expect(promoConflicts([row('2026-11-23T19:30:00Z')], [row('2026-11-19T21:00:00Z')])).toHaveLength(0);
  });
  test('other channels at the same time are fine', () => {
    expect(promoConflicts([{ platform: 'twitter', account_id: 'personal', scheduled_at: '2026-11-19T21:00:00Z' }], [row('2026-11-19T21:00:00Z')])).toHaveLength(0);
  });
});
