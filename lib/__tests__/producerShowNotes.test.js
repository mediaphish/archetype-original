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
