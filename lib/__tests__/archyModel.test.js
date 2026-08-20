import { extractJson, archyModelConfigured } from '../ao/archyModel.js';

describe('extractJson', () => {
  // The OpenAI calls this replaced did a bare JSON.parse on the reply. Claude
  // will sometimes wrap JSON in a sentence or a code fence, and a throw there
  // silently dropped the classifier result — so extraction has to be tolerant.
  it('parses a clean JSON object', () => {
    expect(extractJson('{"isNonsensical":true,"reason":"gibberish"}')).toEqual({
      isNonsensical: true,
      reason: 'gibberish',
    });
  });

  it('extracts JSON wrapped in prose', () => {
    const raw = 'Here is the classification:\n{"isValuable": false, "category": "neither"}\nHope that helps.';
    expect(extractJson(raw)).toEqual({ isValuable: false, category: 'neither' });
  });

  it('extracts JSON inside a fenced code block', () => {
    const raw = '```json\n{"isValuable": true, "category": "potential_client"}\n```';
    expect(extractJson(raw)).toEqual({ isValuable: true, category: 'potential_client' });
  });

  it('handles nested objects and arrays', () => {
    const raw = 'result: {"a":{"b":[1,2,3]},"c":"x"}';
    expect(extractJson(raw)).toEqual({ a: { b: [1, 2, 3] }, c: 'x' });
  });

  it('returns null rather than throwing on unparseable input', () => {
    expect(extractJson('no json here')).toBeNull();
    expect(extractJson('{not: valid json}')).toBeNull();
    expect(extractJson('')).toBeNull();
    expect(extractJson(null)).toBeNull();
    expect(extractJson(undefined)).toBeNull();
  });
});

describe('archyModelConfigured', () => {
  const original = process.env.ANTHROPIC_API_KEY;
  afterEach(() => {
    if (original === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = original;
  });

  it('is false without an API key, so callers fall back instead of throwing', () => {
    delete process.env.ANTHROPIC_API_KEY;
    expect(archyModelConfigured()).toBe(false);
  });

  it('is true with an API key', () => {
    process.env.ANTHROPIC_API_KEY = 'test-key';
    expect(archyModelConfigured()).toBe(true);
  });
});
