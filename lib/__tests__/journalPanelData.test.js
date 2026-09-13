/**
 * @jest-environment node
 *
 * The Captions and Schedule & Publish tab data, against the Cain post as it is
 * actually stored. CAIN_CAPTIONS_DRAFT is the captions draft body verbatim from
 * ao_content_drafts on 2026-09-13; both existing caption parsers returned
 * nothing for it.
 */
import {
  extractManualCaptionTexts,
  buildCaptionsPanel,
  buildSchedulePanel,
  isManualChannelKey,
} from '../ao/journalPanelData.js';

const CAIN_CAPTIONS_DRAFT = `**LinkedIn Personal**
10:30 AM CT — based on your last 88 posts' real engagement data
-

**Instagram Business**
3:30 PM CT — based on your last 79 posts' real engagement data
-

**Instagram Personal**
3:30 PM CT — based on your last 79 posts' real engagement data
-

**Facebook Business**
1:30 PM CT — based on your last 79 posts' real engagement data
- **X (Twitter)**: 10:30 AM CT — based on your last 38 posts' real engagement data

One thing worth flagging honestly since I pulled this from get_recommended_schedule: LinkedIn's engagement numbers are not syncing at all right now.

**Still manual, paste-ready (not auto-scheduled):**

**LinkedIn Business:**
Here's a distinction worth building into how your organization reviews near-misses: did the failure happen because no one raised it, or because someone did and was overridden.

Those are not the same problem, and they don't get fixed the same way.

Full piece: https://archetypeoriginal.com/journal/the-cain-archetype

#ServantLeadership #Leadership #ArchetypeOriginal #OrganizationalCulture

**Facebook Personal:**
Working through entry ten of the Archetype Series this week, Cain.

Have you ever watched someone override a warning given straight to their face? Tell me about it in the comments. Full piece: https://archetypeoriginal.com/journal/the-cain-archetype

#ServantLeadership #Leadership #ArchetypeOriginal #FaithAndLeadership

Everything is locked in for tomorrow. Nothing further needed from you unless you want changes.`;

const row = (channel_label, platform, scheduled_at, caption) => ({
  platform,
  scheduled_at,
  status: 'scheduled',
  caption,
  image_url: 'https://example.com/cain.png',
  intent: { channel_label, journal_slug: 'the-cain-archetype' },
});

const CAIN_ROWS = [
  row('linkedin_personal', 'linkedin', '2026-09-14T15:30:00+00:00', 'LinkedIn Personal caption text'),
  row('x', 'twitter', '2026-09-14T15:30:00+00:00', 'X caption text'),
  row('facebook_business', 'facebook', '2026-09-14T18:30:00+00:00', 'Facebook Business caption text'),
  row('instagram_business', 'instagram', '2026-09-14T20:30:00+00:00', 'Instagram Business caption text'),
  row('instagram_personal', 'instagram', '2026-09-14T20:30:00+00:00', 'Instagram Personal caption text'),
];

describe('extractManualCaptionTexts on the real Cain captions draft', () => {
  const out = extractManualCaptionTexts(CAIN_CAPTIONS_DRAFT);

  it('finds both manual captions under bold headers', () => {
    expect(out.linkedin_business).toMatch(/^Here's a distinction worth building/);
    expect(out.facebook_personal).toMatch(/^Working through entry ten/);
  });

  it('ends each caption at its hashtags, not at Auto\'s sign-off', () => {
    // Pasting "Everything is locked in for tomorrow" to Facebook would be a real mistake.
    expect(out.facebook_personal.endsWith('#FaithAndLeadership')).toBe(true);
    expect(out.facebook_personal).not.toContain('locked in for tomorrow');
    expect(out.linkedin_business.endsWith('#OrganizationalCulture')).toBe(true);
  });

  it('does not bleed one manual caption into the next', () => {
    expect(out.linkedin_business).not.toContain('Working through entry ten');
  });

  it('reads the documented tag format too', () => {
    const tagged =
      '[SOCIAL_CAPTIONS]\n[CAPTION platform="linkedin_business"]Tagged business caption[/CAPTION]\n[/SOCIAL_CAPTIONS]';
    expect(extractManualCaptionTexts(tagged).linkedin_business).toBe('Tagged business caption');
  });

  it('is empty for nothing', () => {
    expect(extractManualCaptionTexts('')).toEqual({});
  });
});

describe('buildCaptionsPanel', () => {
  const panel = buildCaptionsPanel({ scheduledRows: CAIN_ROWS, captionsDraftContent: CAIN_CAPTIONS_DRAFT });

  it('returns all seven channels in reading order', () => {
    expect(panel.map((c) => c.label)).toEqual([
      'LinkedIn Personal',
      'LinkedIn Business',
      'Facebook Business',
      'Facebook Personal',
      'Instagram Business',
      'Instagram Personal',
      'X',
    ]);
  });

  it('takes automated text from the scheduled row, which is what will post', () => {
    expect(panel.find((c) => c.key === 'linkedin_personal')).toMatchObject({
      text: 'LinkedIn Personal caption text',
      source: 'scheduled',
      manual: false,
    });
  });

  it('maps the stored "x" channel label to X', () => {
    expect(panel.find((c) => c.key === 'twitter').text).toBe('X caption text');
  });

  it('takes manual text from the captions draft', () => {
    const business = panel.find((c) => c.key === 'linkedin_business');
    expect(business).toMatchObject({ manual: true, source: 'captions_draft' });
    expect(business.chars).toBeGreaterThan(100);
  });

  it('reports a channel with no caption as missing rather than inventing one', () => {
    const partial = buildCaptionsPanel({ scheduledRows: CAIN_ROWS.slice(0, 1), captionsDraftContent: '' });
    expect(partial.find((c) => c.key === 'facebook_business')).toMatchObject({ text: null, source: null });
  });
});

describe('buildSchedulePanel', () => {
  const draft = {
    scheduled_publish_at: '2026-09-14T11:00:00+00:00',
    image_url: 'https://example.com/cain.png',
    published_at: null,
  };
  const captions = buildCaptionsPanel({ scheduledRows: CAIN_ROWS, captionsDraftContent: CAIN_CAPTIONS_DRAFT });

  it('lists scheduled posts in time order with the publish time', () => {
    const panel = buildSchedulePanel({ draft, scheduledRows: CAIN_ROWS, captions });
    expect(panel.publishAt).toBe('2026-09-14T11:00:00+00:00');
    expect(panel.rows.map((r) => r.label)).toEqual([
      'LinkedIn Personal',
      'X',
      'Facebook Business',
      'Instagram Business',
      'Instagram Personal',
    ]);
    expect(panel.rows.every((r) => r.hasImage)).toBe(true);
  });

  it('lists the manual posts with caption, image, and whether they are done', () => {
    const panel = buildSchedulePanel({
      draft,
      scheduledRows: CAIN_ROWS,
      captions,
      manualPosts: { linkedin_business: { posted_at: '2026-09-14T16:00:00Z' } },
    });
    expect(panel.manual.map((m) => m.key)).toEqual(['linkedin_business', 'facebook_personal']);
    expect(panel.manual[0]).toMatchObject({ postedAt: '2026-09-14T16:00:00Z', imageUrl: draft.image_url });
    expect(panel.manual[1].postedAt).toBeNull();
    expect(panel.manual[1].text).toMatch(/^Working through entry ten/);
  });

  it('tolerates missing inputs', () => {
    const panel = buildSchedulePanel({});
    expect(panel.rows).toEqual([]);
    expect(panel.manual).toHaveLength(2);
  });
});

describe('isManualChannelKey', () => {
  it('accepts only the two manual channels', () => {
    expect(isManualChannelKey('linkedin_business')).toBe(true);
    expect(isManualChannelKey('facebook_personal')).toBe(true);
    expect(isManualChannelKey('linkedin_personal')).toBe(false);
    expect(isManualChannelKey('')).toBe(false);
  });
});
