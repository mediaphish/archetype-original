import { markdownToSpeech, chunkForSpeech, audioKey, estimateListen } from '../ao/readAloud.js';

jest.mock('../openaiKey.js', () => ({ getOpenAiKey: () => '' }));

describe('reading long-form work aloud (Bart, 2026-11-16)', () => {
  test('strips frontmatter, links, images and markup, keeps the words', () => {
    const md = '---\ntitle: "X"\n---\n## The Road\n\nShe **bowed** and said [this](https://a.b).\n\n![img](x.png)\n- one\n> quoted';
    const t = markdownToSpeech(md);
    expect(t).toMatch(/^The Road\./);
    expect(t).toContain('She bowed and said this.');
    expect(t).not.toMatch(/https|png|\*\*|title:/);
    expect(t).toContain('one');
    expect(t).toContain('quoted');
  });
  test('splits long text under the limit without losing words', () => {
    const para = 'A sentence that runs on. '.repeat(400);
    const text = `${para}\n\nShort one.`;
    const chunks = chunkForSpeech(text, 3500);
    expect(chunks.every((c) => c.length <= 3500)).toBe(true);
    expect(chunks.join(' ').split(/\s+/).length).toBe(text.split(/\s+/).filter(Boolean).length);
  });
  test('the same text keeps the same saved audio, changed text gets new audio', () => {
    expect(audioKey('a')).toBe(audioKey('a'));
    expect(audioKey('a')).not.toBe(audioKey('b'));
  });
  test('estimates minutes and cost', () => {
    const e = estimateListen('word '.repeat(1600));
    expect(e.minutes).toBe(10);
    expect(e.dollars).toBeCloseTo(0.15, 2);
  });
});
