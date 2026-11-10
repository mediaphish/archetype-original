/**
 * The edit loop (Bart, 2026-11-09): one note at a time, only the passage in
 * question, no full post in the chat, and nothing saved until every note is
 * settled.
 */
import { stripPostBlocks } from '../../src/components/ao/draftArtifactSync.js';
import { appendDraftArtifactFromSaveResults } from '../ao/appendDraftArtifactFromSaveResults.js';
import { openNotesRefusal } from '../ao/noteQueue.js';

const POST = 'It is Monday morning at a mid-sized distributor.\n\n'.repeat(80);

describe('the chat never shows the post', () => {
  test('a closed post block comes out of the chat text', () => {
    const reply = `Note 3 is done.\n\nDo you want the 31 percent cut?\n\n[ARTIFACT type="draft" label="X" slug="x"]\n${POST}\n[/ARTIFACT]`;
    expect(stripPostBlocks(reply)).toBe('Note 3 is done.\n\nDo you want the 31 percent cut?');
  });

  test('an unclosed post block comes out too', () => {
    expect(stripPostBlocks(`Saved.\n\n[ARTIFACT type="draft" label="X"]\n${POST}`)).toBe('Saved.');
  });

  test('a reply that is only a post leaves nothing in the chat', () => {
    expect(stripPostBlocks(`[ARTIFACT type="draft" label="X"]\n${POST}\n[/ARTIFACT]`)).toBe('');
  });
});

describe('a line edit does not attach the post', () => {
  const result = (name) => ({ name, result: { ok: true, kind: 'journal', slug: 'x', title: 'X', content: POST } });

  test('edit_draft_lines adds no post block', () => {
    const out = appendDraftArtifactFromSaveResults('Note 2 is settled.', [result('edit_draft_lines')]);
    expect(out.appended).toBe(false);
    expect(out.reply).toBe('Note 2 is settled.');
  });

  test('a full save still puts the post in the panel', () => {
    expect(appendDraftArtifactFromSaveResults('Saved.', [result('save_draft')]).appended).toBe(true);
  });
});

describe('nothing is saved while notes are open', () => {
  test('open notes refuse the edit and name them', () => {
    const r = openNotesRefusal({ notes: [{ id: 1, status: 'agreed' }, { id: 2, status: 'pending' }, { id: 3, status: 'pending' }] });
    expect(r.ok).toBe(false);
    expect(r.gate).toBe('note_queue_open');
    expect(r.error).toMatch(/note 2, 3/);
    expect(r.error).toMatch(/never the post/);
  });

  test('every note settled lets the changes go in', () => {
    expect(openNotesRefusal({ notes: [{ id: 1, status: 'agreed' }, { id: 2, status: 'declined' }] })).toBeNull();
  });

  test('no notes, no hold', () => {
    expect(openNotesRefusal(null)).toBeNull();
  });
});
