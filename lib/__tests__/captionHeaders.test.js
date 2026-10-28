/**
 * @jest-environment node
 *
 * 2026-10-27: once each caption carried its time (Schedule before Captions),
 * the Captions tab read none of them, and a caption set sent as its own panel
 * item replaced the post's tabs. Bart: "The used to be dropped into the
 * Captions tab on the artifact panel. What happened?"
 */
import { channelOfHeader, captionsFromChatText, extractCaptionTextsFromMarkdown } from '../ao/journalPanelData.js';
import { resolveArtifactPanelState, keepPostTabs } from '../../src/components/ao/draftArtifactSync.js';

test('every way the team names a channel is read', () => {
  expect(channelOfHeader('**LinkedIn Personal:**')).toBe('linkedin_personal');
  expect(channelOfHeader('**10:30am · LinkedIn, personal (automatic)**')).toBe('linkedin_personal');
  expect(channelOfHeader('**12:30pm · LinkedIn, business (you post by hand)**')).toBe('linkedin_business');
  expect(channelOfHeader('## 1:30pm Central, Wed Nov 4 · Facebook (company)')).toBe('facebook_business');
  expect(channelOfHeader('**11:30am · Instagram company (automatic)**')).toBe('instagram_business');
  expect(channelOfHeader('**9:30am · X (automatic)**')).toBe('twitter');
  expect(channelOfHeader('**Twitter**')).toBe('twitter');
  expect(channelOfHeader('**Recommended times:**')).toBeNull();
  expect(channelOfHeader('**LinkedIn**')).toBeNull();
});

test('a timed caption set reads into every channel, cleanly', () => {
  const text = [
    'Jot: Here are the captions for "Who Signs for It?".',
    '',
    '---',
    '',
    '**9:30am · X (automatic)**',
    '',
    'The system scored it. https://archetypeoriginal.com/journal/who-signs-for-it #Leadership',
    '',
    '---',
    '',
    '**2:30pm · Facebook, personal (you post by hand)**',
    '',
    'In 2003 I was in marketing.',
    '',
    '#ServantLeadership',
    '',
    'Are these approved?',
  ].join('\n');
  const c = captionsFromChatText(text);
  expect(c.twitter).toBe('The system scored it. https://archetypeoriginal.com/journal/who-signs-for-it #Leadership');
  expect(c.facebook_personal).toBe('In 2003 I was in marketing.\n\n#ServantLeadership');
  // The old exact headers still work.
  expect(extractCaptionTextsFromMarkdown('**LinkedIn Business:**\nHello there.\n#Tag\nAll set!').linkedin_business).toBe('Hello there.\n#Tag');
});

test('a caption set never replaces the post\'s tabs', () => {
  const msgs = [
    { role: 'assistant', content: 'Saved.\n[ARTIFACT type="draft" label="Who Signs for It?" slug="who-signs-for-it"]Her raise came in lower.[/ARTIFACT]' },
    { role: 'user', content: 'Captions please.' },
    { role: 'assistant', content: 'Cam: here.\n[ARTIFACT type="captions" label="Captions"]**9:30am · X**\nText[/ARTIFACT]' },
  ];
  const r = resolveArtifactPanelState(msgs);
  expect(r.artifact).toMatchObject({ type: 'draft', slug: 'who-signs-for-it' });
  // With no post in the thread, captions still show on their own.
  expect(keepPostTabs({ type: 'captions', content: 'x' }, [msgs[2]])).toMatchObject({ type: 'captions' });
});

// 2026-10-27: the engagement check read 1,200 characters of an approved LinkedIn
// caption, called it cut off, and refused to queue it.
test('approved captions are read whole, and the engagement check never blocks them', () => {
  const { readFileSync } = require('node:fs');
  expect(readFileSync('lib/ao/captionEngagementQuality.js', 'utf8')).toMatch(/caption: String\(text\)\.slice\(0, 6000\)/);
  const h = readFileSync('lib/ao/autoToolHandlers.js', 'utf8');
  expect(h).not.toMatch(/gate: 'caption_engagement_quality'/);
  expect(h).toMatch(/scheduled\.quality_notes = \{/);
});

// 2026-10-27, Bart: "When I read the captions the first time, I copy and paste
// them into those channels and schedule a post at the proper time."
test('approving captions counts the hand-posted channels as scheduled by Bart', async () => {
  const { buildSchedulePanel } = await import('../ao/journalPanelData.js');
  const panel = buildSchedulePanel({
    draft: { scheduled_publish_at: '2026-11-04T12:00:00Z' },
    manualPosts: { linkedin_business: { posted_at: '2026-10-27T22:18:37Z', how: 'scheduled_by_bart', goes_out_at: '2026-11-04T18:30:00Z' } },
  });
  expect(panel.manual.find((m) => m.key === 'linkedin_business')).toMatchObject({ scheduledByBart: true, goesOutAt: '2026-11-04T18:30:00Z' });
  expect(panel.manual.find((m) => m.key === 'facebook_personal')).toMatchObject({ scheduledByBart: false, postedAt: null });
  const { readFileSync } = require('node:fs');
  expect(readFileSync('lib/ao/stageApproval.js', 'utf8')).toMatch(/how: 'scheduled_by_bart'/);
  expect(readFileSync('lib/ao/team/agents.js', 'utf8')).toMatch(/Never remind him, never ask whether he posted them/);
});

// 2026-10-28: quote card captions for Nov 5, 10 and 12 were swapped for The
// Josiah Archetype, a post worked on earlier in the same chat.
test('captions for other posts stand on their own in the panel', () => {
  const { captionsAreForOtherPosts } = require('../../src/components/ao/draftArtifactSync.js');
  const josiah = { type: 'draft', slug: 'the-josiah-archetype', label: 'The Josiah Archetype', content: '' };
  const cards = { type: 'captions', label: 'Captions: quick-hit quote cards Nov 5, Nov 10, Nov 12', content: '## X, 9:30\nText https://archetypeoriginal.com/journal/who-signs-for-it\nhttps://www.archetypeoriginal.com/faith?slug=before-the-sun-sets' };
  expect(captionsAreForOtherPosts(cards, josiah)).toBe(true);
  const msgs = [
    { role: 'assistant', content: 'Done.', meta: { tool_results: [{ name: 'approve_stage', result: { ok: true, slug: 'the-josiah-archetype', title: 'The Josiah Archetype' } }] } },
    { role: 'assistant', content: `Jot: saved.\n[ARTIFACT type="captions" title="${cards.label}"]${cards.content}[/ARTIFACT]` },
    { role: 'assistant', content: 'Bit: looking into it.' },
  ];
  expect(resolveArtifactPanelState(msgs).artifact).toMatchObject({ type: 'captions' });
  // A post's own captions still go in its Captions tab.
  expect(captionsAreForOtherPosts({ type: 'captions', content: 'https://archetypeoriginal.com/journal/the-josiah-archetype' }, josiah)).toBe(false);
  expect(captionsAreForOtherPosts({ type: 'captions', content: 'No links here' }, josiah)).toBe(false);
});
