/**
 * @jest-environment node
 *
 * Text generation is Claude. OpenAI is image creation only (Bart, 2026-09-23:
 * "The only thing we leave with OpenAI is image creation. Period.").
 */
import { resolveTextModel, extractJson, defaultEffortFor } from '../ao/textModel.js';

describe('resolveTextModel', () => {
  afterEach(() => {
    delete process.env.TEST_MODEL_VAR;
  });

  it('gives voice and drafting work the strong Claude model', () => {
    expect(resolveTextModel('voice')).toBe('claude-opus-5');
    expect(resolveTextModel('draft')).toBe('claude-opus-5');
  });

  it('gives a label-or-yes-no classification the small model', () => {
    expect(resolveTextModel('classify')).toBe('claude-haiku-4-5');
  });

  it('reads structure out of Bart\'s own paste with Sonnet, not the small model', () => {
    expect(resolveTextModel('extract')).toBe('claude-sonnet-5');
  });

  it('matches thinking effort to the task, not one setting for everything', () => {
    // Prose under his name thinks hard; a classification does not.
    expect(defaultEffortFor('voice')).toBe('high');
    expect(defaultEffortFor('draft')).toBe('high');
    expect(defaultEffortFor('analysis')).toBe('medium');
    expect(defaultEffortFor('extract')).toBe('low');
    expect(defaultEffortFor('classify')).toBe('low');
  });

  it('honours an override that names a Claude model', () => {
    process.env.TEST_MODEL_VAR = 'claude-sonnet-5';
    expect(resolveTextModel('classify', { overrideEnv: 'TEST_MODEL_VAR' })).toBe('claude-sonnet-5');
  });

  it('throws rather than switching vendor, which is the fault this exists to stop', () => {
    process.env.TEST_MODEL_VAR = 'gpt-4o-mini';
    expect(() => resolveTextModel('voice', { overrideEnv: 'TEST_MODEL_VAR' })).toThrow(/not a Claude model/);
  });

  it('falls back to the task default when the variable is empty', () => {
    process.env.TEST_MODEL_VAR = '';
    expect(resolveTextModel('analysis', { overrideEnv: 'TEST_MODEL_VAR' })).toBe('claude-sonnet-5');
  });
});

describe('extractJson', () => {
  it('reads a bare object, a fenced one, and an array', () => {
    expect(extractJson('{"ok":true}')).toEqual({ ok: true });
    expect(extractJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(extractJson('Here you go: [1,2,3]')).toEqual([1, 2, 3]);
  });

  it('returns null for nothing parseable', () => {
    expect(extractJson('no json here')).toBeNull();
    expect(extractJson('')).toBeNull();
  });
});
