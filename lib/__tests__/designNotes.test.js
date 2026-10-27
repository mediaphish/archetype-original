/**
 * @jest-environment node
 *
 * Bart, 2026-10-27, hiring Des: "the expectations I have for her are extremely
 * high. I will override a lot. She's hired, but build her the right way."
 */
jest.mock('../supabase-admin.js', () => ({ supabaseAdmin: { from: () => ({}) } }));
import { readFileSync } from 'node:fs';
import { AGENTS, personaPreamble, mentionedAgents, isImageAsk } from '../ao/team/agents.js';
import { formatDesignNotesForPrompt, validateDesignNote, DESIGN_NOTE_READERS } from '../ao/team/designNotes.js';

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
  expect(p).toMatch(/call save_design_note with his words/);
  expect(p).toMatch(/Before you generate anything, art-direct it/);
  expect(p).toMatch(/Judge every result before Bart sees it/);
  expect(p).toMatch(/use his words as the prompt/);
  expect(p).toMatch(/real photo of him, never a past AI image/);
});

test('design notes read as standing rules, and Des, Cam and Ada see them', () => {
  const text = formatDesignNotesForPrompt([{ note: 'A loading bar does nothing for the story.', applies_to: 'all', about: 'Who Signs for It?', created_at: '2026-10-27T20:38:00Z' }]);
  expect(text).toMatch(/## Bart's design notes/);
  expect(text).toMatch(/2026-10-27: A loading bar does nothing for the story\. \(on Who Signs for It\?\)/);
  expect(formatDesignNotesForPrompt([])).toMatch(/None saved yet/);
  expect(validateDesignNote('ok').ok).toBe(false);
  for (const k of ['designer', 'producer', 'auto']) expect(DESIGN_NOTE_READERS.has(k)).toBe(true);
  const v2 = readFileSync('lib/ao/autoV2.js', 'utf8');
  expect(v2).toMatch(/name: 'save_design_note'/);
  expect(v2).toMatch(/formatDesignNotesForPrompt\(await dn\.listDesignNotes\(owner\)\)/);
  expect(readFileSync('lib/ao/autoToolHandlers.js', 'utf8')).toMatch(/case 'save_design_note'/);
});
