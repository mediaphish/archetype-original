/**
 * @jest-environment node
 *
 * 2026-10-25: Cam's prep "ran three times and mockSaved nothing." getGuestById
 * returns { ok, guest }, and the prep treated that wrapper as the guest, so
 * research ran without the guest and every save went nowhere.
 */
jest.mock('../supabase-admin.js', () => ({ supabaseAdmin: { from: () => ({}) } }));

const mockRow = { id: 'g1', name: 'Keri Kirby', session_type: 'guest', research_brief: null, suggested_questions: null, producer_brief: null };
const mockSaved = { ...mockRow };

jest.mock('../ao/guestIntakeStore.js', () => ({
  getGuestById: jest.fn(async (id) => (id === 'g1' ? { ok: true, guest: { ...mockRow } } : { ok: false, error: 'guest_not_found' })),
  getGuestsByIds: jest.fn(async () => ({ ok: true, guests: [] })),
  updateGuestResearch: jest.fn(async (id, { research_brief }) => {
    if (id !== 'g1') return { ok: false, error: 'no id' };
    mockSaved.research_brief = research_brief;
    return { ok: true, guest: { ...mockSaved } };
  }),
  updateGuestQuestions: jest.fn(async (id, { suggested_questions }) => {
    mockSaved.suggested_questions = suggested_questions;
    return { ok: true, guest: { ...mockSaved } };
  }),
  updateGuestProducerBrief: jest.fn(async (id, { producer_brief }) => {
    mockSaved.producer_brief = producer_brief;
    return { ok: true, guest: { ...mockSaved } };
  }),
}));

const mockSeen = [];
jest.mock('../ao/generateGuestResearch.js', () => ({
  generateGuestResearchBrief: jest.fn(async (g) => {
    mockSeen.push(g.name);
    return { ok: true, research_brief: 'WHO THEY ARE ...' };
  }),
  generateGuestSuggestedQuestions: jest.fn(async (g) => (g.research_brief ? { ok: true, suggested_questions: { person_specific: [] } } : { ok: false, error: 'Generate research brief first.' })),
  generateGuestProducerBrief: jest.fn(async () => ({ ok: true, producer_brief: '1. THE PERSON IN ONE PARAGRAPH\nKeri opens up once she knows you.\n\n2. WHERE THE BEST MATERIAL PROBABLY LIVES\n...' })),
}));

test('prep runs on the real guest and saves all three steps', async () => {
  const { prepareGuest } = await import('../ao/team/producer.js');
  const out = await prepareGuest('g1');
  expect(out.ok).toBe(true);
  expect(mockSeen).toEqual(['Keri Kirby']);
  expect(out.steps_run).toEqual(['research', 'questions', 'producer brief']);
  expect(out.opening).toBe('Keri opens up once she knows you.');
});

test('an unknown guest says so plainly', async () => {
  const { prepareGuest } = await import('../ao/team/producer.js');
  expect(await prepareGuest('nope')).toEqual({ ok: false, error: 'Guest not found' });
});
