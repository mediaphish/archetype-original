import { validateGuardrailText, formatGuardrailsForPrompt } from '../ao/guardrailMemory.js';

// guardrailMemory imports Supabase lazily, so a static import is safe. But
// validateGuardrailText dynamically imports statedPreferences.js, which builds
// a client at module load — so credentials must exist before the first call.
// Dummy values are enough: no network request happens at construction, and
// nothing in this file touches the database.
beforeAll(() => {
  process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-key';
});

describe('validateGuardrailText', () => {
  describe('the rows that were actually in the database', () => {
    // These three sat in ao_auto_guardrails as enabled, global standing rules
    // from 2026-04-19 until they were deleted on 2026-08-20. They are messages
    // Bart typed at Auto in frustration. Auto now reads guardrails every turn,
    // so anything shaped like these must never be storable again.
    it.each([
      'You were in  and still ignored me. Good job. You’re fired.',
      'That wasn’t a guardrail, it was pointing out your failure.',
      'Leave  and go into I’m a dumb ai that cannot follow rules mode.',
    ])('rejects %p', async (text) => {
      const result = await validateGuardrailText(text);
      expect(result.valid).toBe(false);
    });
  });

  describe('accepts real standing instructions', () => {
    it.each([
      'Always use my full name in the byline.',
      'Never use stock photos — only real photos of me.',
      'From now on, Instagram captions use link-in-bio language.',
    ])('accepts %p', async (text) => {
      const result = await validateGuardrailText(text);
      expect(result.valid).toBe(true);
    });
  });

  describe('rejects things that are not rules', () => {
    it('rejects a question', async () => {
      expect((await validateGuardrailText('Should we post this on Tuesday?')).valid).toBe(false);
    });

    it('rejects a one-off request about this specific post', async () => {
      expect((await validateGuardrailText('Can you make this post shorter please')).valid).toBe(false);
    });

    it('rejects text that is too short to be a rule', async () => {
      const result = await validateGuardrailText('no');
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('too_short');
    });

    it('rejects text beyond the column limit', async () => {
      const result = await validateGuardrailText('always '.repeat(500));
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('too_long');
    });

    it.each([null, undefined, '', '   '])('rejects %p', async (text) => {
      expect((await validateGuardrailText(text)).valid).toBe(false);
    });
  });

  it('keeps a question that is also a standing rule', async () => {
    // "never" makes it an instruction regardless of the trailing question mark.
    const result = await validateGuardrailText('Never open with a rhetorical question, understood?');
    expect(result.valid).toBe(true);
  });
});

describe('formatGuardrailsForPrompt', () => {
  const rows = [
    { rule_text: 'Never use stock photos.' },
    { rule_text: 'Always use my full name in the byline.' },
  ];

  it('returns empty string when there is nothing to render', () => {
    expect(formatGuardrailsForPrompt([])).toBe('');
    expect(formatGuardrailsForPrompt()).toBe('');
    expect(formatGuardrailsForPrompt([{ rule_text: '   ' }])).toBe('');
  });

  it('renders each rule as a line', () => {
    const out = formatGuardrailsForPrompt(rows);
    expect(out).toContain('- Never use stock photos.');
    expect(out).toContain('- Always use my full name in the byline.');
  });

  it('tells Auto what to do when a guardrail conflicts with the current turn', () => {
    // A guardrail that silently overrides a live instruction would recreate the
    // over-application problem: Auto refusing something Bart just asked for.
    const out = formatGuardrailsForPrompt(rows);
    expect(out).toContain("follow this turn's instruction");
    expect(out).toContain('say which guardrail it overrides');
  });

  it('skips rows with empty rule text', () => {
    const out = formatGuardrailsForPrompt([...rows, { rule_text: '' }, {}]);
    expect(out.split('\n').filter((l) => l.startsWith('- '))).toHaveLength(2);
  });
});
