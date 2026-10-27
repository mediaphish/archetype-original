/**
 * @jest-environment node
 *
 * Bart, 2026-10-27, hiring Des: "the expectations I have for her are extremely
 * high. I will override a lot. She's hired, but build her the right way."
 */
jest.mock('../supabase-admin.js', () => ({ supabaseAdmin: { from: () => ({}) } }));
import { readFileSync } from 'node:fs';
import { AGENTS, personaPreamble, mentionedAgents, isImageAsk } from '../ao/team/agents.js';
import { formatDesignNotesForPrompt, validateDesignNote, designNotesForImagePrompt, designOnly, isDesignFeedback, feedbackAsNote } from '../ao/team/designNotes.js';
import { worthChecking, lastTeamWork, lessonFrom } from '../ao/team/correctionCapture.js';
import { parseDesignCheck, correctionFor } from '../ao/team/designCheck.js';

test('Des is on the team, owns the visuals, and Cam no longer makes them', () => {
  expect(AGENTS.designer).toMatchObject({ name: 'Des', role: 'Designer' });
  expect(AGENTS.designer.lane).toMatch(/Owns every visual/);
  expect(AGENTS.producer.lane).toMatch(/Des designs/);
  expect(personaPreamble('producer')).toMatch(/never make an image yourself/);
  expect(mentionedAgents('@Des redo the header')).toEqual(['designer']);
  expect(isImageAsk('Generate the image')).toBe(true);
});

test('Des knows the bar, keeps every override, art-directs first and judges her own work', () => {
  const p = personaPreamble('designer');
  expect(p).toMatch(/started as a designer/);
  expect(p).toMatch(/override you a lot/);
  expect(p).toMatch(/call save_note \(area "design"\) with his words/);
  expect(p).toMatch(/Before you generate anything, art-direct it/);
  expect(p).toMatch(/Judge every result before Bart sees it/);
  expect(p).toMatch(/use his words as the prompt/);
  expect(p).toMatch(/real photo of him, never a past AI image/);
});

test('every correction reads as training for the whole team, grouped by area', () => {
  const text = formatDesignNotesForPrompt([
    { note: 'A loading bar does nothing for the story.', area: 'design', applies_to: 'all', about: 'Who Signs for It?', created_at: '2026-10-27T20:38:00Z' },
    { note: 'Wordplay that makes the reader stop breaks the flow.', area: 'writing', applies_to: 'all', created_at: '2026-10-27T19:20:00Z' },
  ]);
  expect(text).toMatch(/## Bart's corrections/);
  expect(text).toMatch(/standing training for the whole team/);
  expect(text).toMatch(/### Design[\s\S]*A loading bar does nothing for the story\. \(on Who Signs for It\?\)/);
  expect(text).toMatch(/### Writing[\s\S]*Wordplay/);
  expect(formatDesignNotesForPrompt([])).toMatch(/None saved yet/);
  expect(validateDesignNote('ok').ok).toBe(false);
  // Every teammate gets the rule and the list.
  for (const k of ['jot', 'reach', 'producer', 'editor', 'designer']) expect(personaPreamble(k)).toMatch(/training for the whole team/);
  const v2 = readFileSync('lib/ao/autoV2.js', 'utf8');
  expect(v2).toMatch(/name: 'save_note'/);
  expect(v2).toMatch(/systemSections\.push\(dn\.formatDesignNotesForPrompt\(await dn\.listDesignNotes\(owner\)\)\)/);
  expect(readFileSync('lib/ao/autoToolHandlers.js', 'utf8')).toMatch(/case 'save_note'/);
});

test('design lessons go to the image model and are checked on every image', () => {
  const notes = [{ note: 'No current-day business clothes.', area: 'design', applies_to: 'AI & Leadership series' }, { note: 'Short paragraphs never.', area: 'writing' }];
  expect(designOnly(notes)).toHaveLength(1);
  expect(designNotesForImagePrompt(designOnly(notes))).toMatch(/STANDING DESIGN NOTES[\s\S]*\(AI & Leadership series\) No current-day business clothes\./);
  expect(parseDesignCheck('{"pass": false, "misses": ["modern suits"]}')).toEqual({ pass: false, misses: ['modern suits'] });
  expect(parseDesignCheck('{"pass": true, "misses": []}').pass).toBe(true);
  expect(correctionFor(['modern suits'])).toMatch(/modern suits/);
  const h = readFileSync('lib/ao/autoToolHandlers.js', 'utf8');
  expect(h).toMatch(/listDesignNotes\(ctx\.email, \{ area: 'design' \}\)/);
  expect(h).toMatch(/checkImageAgainstNotes/);
  expect(h).toMatch(/design_check,/);
});

test('Bart\'s corrections are caught even when no one saved them', () => {
  expect(worthChecking('Yes.')).toBe(false);
  expect(worthChecking('> Is it approved?\n\nYes.')).toBe(false);
  expect(worthChecking('[TEAM] Red, add your part.')).toBe(false);
  expect(worthChecking('The computer screen lacks real detail. A loading bar does nothing.')).toBe(true);
  const prior = [{ role: 'user', content: 'Make it.' }, { role: 'assistant', content: 'Here it is ![h](https://x/h.png)', meta: { tools_used: ['generate_image'] } }];
  expect(lastTeamWork(prior)).toMatch(/Here it is/);
  expect(isDesignFeedback('The computer screen lacks real detail, a loading bar does nothing.', prior)).toBe(true);
  expect(isDesignFeedback('Yes.', prior)).toBe(false);
  expect(isDesignFeedback('The computer screen lacks real detail, a loading bar does nothing.', [{ role: 'assistant', content: 'No image here.' }])).toBe(false);
  expect(feedbackAsNote('> quoted\n\nThe people wear modern suits.')).toBe('The people wear modern suits.');
  expect(lessonFrom({ correction: true, lesson: 'Never use a loading bar on a screen.', area: 'design' })).toMatchObject({ area: 'design' });
  expect(lessonFrom({ correction: false, lesson: 'x' })).toBeNull();
  expect(lessonFrom({ correction: true, lesson: 'Wordplay breaks flow.', area: 'nonsense' }).area).toBe('general');
  const chat = readFileSync('api/ao/auto/chat.js', 'utf8');
  expect(chat).toMatch(/captureCorrection\(\{/);
  expect(chat).toMatch(/!used\.includes\('save_note'\)/);
});
