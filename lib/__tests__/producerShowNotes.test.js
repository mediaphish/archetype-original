/**
 * @jest-environment node
 *
 * 2026-11-18: podcast_show_notes for Jaron Scott generated the run sheet, then
 * the save failed with "malformed array literal". show_notes on
 * ao_episode_drafts is a list column (TEXT[]) and the run sheet is one block of
 * text. The run sheet now lives in meta.run_sheet_md, and show_notes (the
 * public episode bullets) is left alone.
 */
const mockWrites = [];
let mockExisting = [];

jest.mock('../supabase-admin.js', () => {
  const table = () => {
    const q = {
      select: () => q,
      eq: () => q,
      order: () => q,
      limit: async () => ({ data: mockExisting, error: null }),
      insert: (row) => {
        mockWrites.push({ kind: 'insert', row });
        return { select: () => ({ single: async () => ({ data: { id: 'new-ep' }, error: null }) }) };
      },
      update: (row) => {
        mockWrites.push({ kind: 'update', row });
        return { eq: async () => ({ error: null }) };
      },
    };
    return q;
  };
  return { supabaseAdmin: { from: table } };
});

jest.mock('../ao/guestIntakeStore.js', () => ({
  getGuestById: jest.fn(),
  getGuestsByIds: jest.fn(async () => ({
    ok: true,
    guests: [{ id: 'g1', name: 'Jaron Scott', session_type: 'guest', producer_brief: '1. THE PERSON IN ONE PARAGRAPH\nJaron thinks out loud.\n\n2. NEXT\n...' }],
  })),
}));

jest.mock('../ao/textModel.js', () => ({ completeText: jest.fn(async () => 'THE THROUGH-LINE: one line.') }));

beforeEach(() => {
  mockWrites.length = 0;
  mockExisting = [];
});

function assertNoTextInListColumns(row) {
  for (const key of ['show_notes', 'key_takeaways', 'categories', 'tags', 'related']) {
    if (key in row) expect(Array.isArray(row[key])).toBe(true);
  }
}

test('a new run sheet saves as text in meta, never as a string in show_notes', async () => {
  const { writeShowNotes } = await import('../ao/team/producer.js');
  const out = await writeShowNotes({ guestIds: ['g1'] });
  expect(out.ok).toBe(true);
  expect(out.episode_draft_id).toBe('new-ep');
  const { row } = mockWrites.find((w) => w.kind === 'insert');
  assertNoTextInListColumns(row);
  expect(row.meta.run_sheet_md).toContain('Jaron thinks out loud.');
  expect(row.meta.run_sheet_md).toContain('THE THROUGH-LINE');
  expect(row.meta.stage).toBe('planned');
});

test('an existing draft keeps its other meta and gets the new run sheet', async () => {
  mockExisting = [{ id: 'ep1', guest_ids: ['g1'], status: 'draft', meta: { stage: 'planned', keep: 'me' } }];
  const { writeShowNotes } = await import('../ao/team/producer.js');
  const out = await writeShowNotes({ guestIds: ['g1'] });
  expect(out.ok).toBe(true);
  expect(out.episode_draft_id).toBe('ep1');
  const { row } = mockWrites.find((w) => w.kind === 'update');
  assertNoTextInListColumns(row);
  expect(row.meta.keep).toBe('me');
  expect(row.meta.run_sheet_md).toContain('THE THROUGH-LINE');
});

// 2026-11-18, second report: the brief listed the fifteen Archetype entries in
// order and the open items for the series close; the run sheet left both out.
const JARON_BRIEF = [
  '# PRODUCER BRIEF',
  '## 1. THE PERSON IN ONE PARAGRAPH',
  'Jaron thinks out loud.',
  '## 7. THE CLOSE',
  '### The facts to stand on',
  'In order: 1 Judas, 2 Joseph, 3 Saul, 4 Nehemiah, 5 Absalom, 6 Barnabas, 7 Ruth, 8 Jezebel, 9 Daniel, 10 Cain, 11 Jonathan, 12 Rehoboam, 13 Josiah, 14 Eli, 15 Abigail.',
  '### The moves, in order',
  '1. Bridge.',
  '### Open items for Bart to settle on air or before',
  'Not given yet: the series title, episode length, how many episodes, start date, and which figure goes first.',
  '### What to avoid in the close',
  '- Do not put words in his mouth.',
  '## 8. NEXT',
].join('\n');

test('the brief reference lists are found, word for word, and stop at the next heading', async () => {
  const { briefReferenceSections } = await import('../ao/team/producer.js');
  const secs = briefReferenceSections(JARON_BRIEF);
  expect(secs.map((s) => s.title)).toEqual(['The facts to stand on', 'Open items for Bart to settle on air or before']);
  expect(secs[0].text).toContain('1 Judas, 2 Joseph');
  expect(secs[0].text).toContain('15 Abigail.');
  expect(secs[0].text).not.toContain('Bridge');
  expect(secs[1].text).toContain('which figure goes first');
  expect(secs[1].text).not.toContain('words in his mouth');
  expect(briefReferenceSections('no headings here')).toEqual([]);
});

test('the run sheet carries the entry list and open items from the brief', async () => {
  const store = await import('../ao/guestIntakeStore.js');
  store.getGuestsByIds.mockResolvedValueOnce({
    ok: true,
    guests: [{ id: 'g1', name: 'Jaron Scott', session_type: 'guest', producer_brief: JARON_BRIEF }],
  });
  const { writeShowNotes } = await import('../ao/team/producer.js');
  const out = await writeShowNotes({ guestIds: ['g1'] });
  expect(out.ok).toBe(true);
  const md = mockWrites.find((w) => w.kind === 'insert').row.meta.run_sheet_md;
  expect(md).toContain('FROM THE PRODUCER BRIEF, WORD FOR WORD');
  expect(md).toContain('14 Eli, 15 Abigail.');
  expect(md).toContain('which figure goes first');
  expect(md.indexOf('THE THROUGH-LINE')).toBeLessThan(md.indexOf('FROM THE PRODUCER BRIEF'));
});
