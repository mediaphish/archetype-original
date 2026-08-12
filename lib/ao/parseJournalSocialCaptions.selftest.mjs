/**
 * Regression: partial [SOCIAL_CAPTIONS] must schedule well-formed rows
 * and report missing channels as data — never all-or-nothing throw/void.
 *
 * Run: node lib/ao/parseJournalSocialCaptions.selftest.mjs
 */
import {
  extractJournalSocialCaptionTexts,
  parseJournalSocialCaptions,
  buildCaptionsCoverageMessage,
  JOURNAL_LAUNCH_REQUIRED_CHANNELS,
} from './parseJournalSocialCaptions.js';

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const partialBody = `
[SOCIAL_CAPTIONS]
[CAPTION platform="linkedin_personal" scheduled_time="2026-08-05T14:00:00.000Z"]
Real LinkedIn Personal caption for They Still Call Him.
[/CAPTION]
[CAPTION platform="linkedin_business"]
Manual-only LinkedIn Business — should not count toward the automated four.
[/CAPTION]
[/SOCIAL_CAPTIONS]
`;

{
  const extracted = extractJournalSocialCaptionTexts(partialBody);
  assert(extracted.hasBlock === true, 'block detected');
  assert(
    extracted.found.linkedin_personal &&
      /They Still Call Him/.test(extracted.found.linkedin_personal),
    'well-formed linkedin_personal kept'
  );
  assert(!extracted.found.instagram_business, 'missing IG not invented');
  assert(
    extracted.missingChannels.includes('instagram_business') &&
      extracted.missingChannels.includes('facebook_business') &&
      extracted.missingChannels.includes('twitter'),
    'missing channels listed as data'
  );
  assert(
    !extracted.missingChannels.includes('linkedin_personal'),
    'present channel not listed as missing'
  );
}

{
  const parsed = await parseJournalSocialCaptions(
    partialBody,
    'they-still-call-him',
    'https://www.archetypeoriginal.com/journal/they-still-call-him',
    '/images/they-still-call-him.jpg'
  );

  assert(Array.isArray(parsed.rows), 'rows is an array');
  assert(parsed.rows.length === 1, `expected 1 row, got ${parsed.rows.length}`);
  assert(parsed.rows[0].platform === 'linkedin', 'scheduled platform is linkedin');
  assert(parsed.rows[0].account_id === 'personal', 'account is personal');
  assert(
    /They Still Call Him/.test(parsed.rows[0].text),
    'row text is the real caption, not voided'
  );
  assert(parsed.foundCount === 1, 'foundCount is 1');
  assert(parsed.requiredCount === JOURNAL_LAUNCH_REQUIRED_CHANNELS.length, 'requiredCount is 4');
  assert(parsed.incomplete === true, 'incomplete when channels missing');
  assert(
    parsed.missingChannels.includes('instagram_business') &&
      parsed.missingChannels.includes('facebook_business') &&
      parsed.missingChannels.includes('twitter'),
    'missingChannels returned as data, not thrown away'
  );
  // Must not throw — reaching here with rows is the regression assertion.
}

{
  const msg = buildCaptionsCoverageMessage({
    foundCount: 1,
    requiredCount: 4,
    missingChannels: ['instagram_business', 'facebook_business', 'twitter'],
    scheduledCount: 1,
  });
  assert(/Scheduled 1 of 4/.test(msg), 'coverage says 1 of 4');
  assert(/instagram_business/.test(msg), 'coverage names missing IG');
  assert(/Ask Auto/.test(msg), 'coverage tells Bart what to do next');
}

{
  // Full block still schedules all four (explicit times avoid scheduler/DB import).
  const t = '2026-08-05T15:00:00.000Z';
  const fullBody = `
[SOCIAL_CAPTIONS]
[CAPTION platform="linkedin_personal" scheduled_time="${t}"]LI personal copy[/CAPTION]
[CAPTION platform="instagram_business" scheduled_time="${t}"]IG copy with https://example.com/link[/CAPTION]
[CAPTION platform="facebook_business" scheduled_time="${t}"]FB copy[/CAPTION]
[CAPTION platform="twitter" scheduled_time="${t}"]X copy[/CAPTION]
[/SOCIAL_CAPTIONS]
`;
  const parsed = await parseJournalSocialCaptions(
    fullBody,
    'full-post',
    'https://www.archetypeoriginal.com/journal/full-post',
    ''
  );
  assert(parsed.rows.length === 4, `expected 4 rows, got ${parsed.rows.length}`);
  assert(parsed.incomplete === false, 'complete block is not incomplete');
  assert(parsed.missingChannels.length === 0, 'no missing when all present');
  const ig = parsed.rows.find((r) => r.platform === 'instagram');
  assert(ig && !/https?:\/\//.test(ig.text), 'IG strips URLs');
  assert(ig && /Link in bio/.test(ig.text), 'IG adds Link in bio');
}

{
  // Blank caption counts as incomplete, not as a scheduled row.
  const t = '2026-08-05T16:00:00.000Z';
  const blankBody = `
[SOCIAL_CAPTIONS]
[CAPTION platform="linkedin_personal" scheduled_time="${t}"]Real copy[/CAPTION]
[CAPTION platform="instagram_business" scheduled_time="${t}"]   [/CAPTION]
[CAPTION platform="facebook_business" scheduled_time="${t}"]FB[/CAPTION]
[CAPTION platform="twitter" scheduled_time="${t}"]X[/CAPTION]
[/SOCIAL_CAPTIONS]
`;
  const parsed = await parseJournalSocialCaptions(blankBody, 'blank-ig', 'https://example.com/j', '');
  assert(parsed.rows.length === 3, 'blank IG not scheduled');
  assert(parsed.blankChannels.includes('instagram_business'), 'blank listed');
  assert(parsed.incomplete === true, 'blank makes incomplete');
}

console.log('parseJournalSocialCaptions.selftest.mjs: ok');
