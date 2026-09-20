/**
 * @jest-environment node
 *
 * The "(same content as above)" artifact, 2026-09-20.
 */
import {
  isPlaceholderArtifactBody,
  hasPlaceholderArtifact,
  replaceArtifactBody,
  extractArtifactBody,
  artifactTagSlug,
} from '../ao/artifactPlaceholder.js';

const TAG = '[ARTIFACT type="draft" label="The Org Chart Only Works Until It\'s Tested" slug="the-org-chart-only-works-until-its-tested"]';
const reply = (body) => `Saved. Full corrected draft:\n\n# The Org Chart...\n\n${TAG}\n${body}\n[/ARTIFACT]`;

describe('isPlaceholderArtifactBody', () => {
  it.each([
    '(same content as above)',
    'same content as above',
    '(unchanged from above)',
    '(see above)',
    '(full draft above)',
    '',
  ])('flags %p', (body) => {
    expect(isPlaceholderArtifactBody(body)).toBe(true);
  });

  it('does not flag a real draft', () => {
    const post = `# The Org Chart Only Works Until It's Tested\n\n${'Interactive EQ ran more than 5,000 simulations. '.repeat(20)}`;
    expect(isPlaceholderArtifactBody(post)).toBe(false);
  });

  it('does not flag a short devotional with structure', () => {
    expect(
      isPlaceholderArtifactBody('## Scripture\n\nMicah 7:18\n\n## Reflection\n\nHe delights in steadfast love, and the question is worth slowing down for.')
    ).toBe(false);
  });
});

describe('the reply', () => {
  it('finds the placeholder, the body and the slug', () => {
    const text = reply('(same content as above)');
    expect(hasPlaceholderArtifact(text)).toBe(true);
    expect(extractArtifactBody(text)).toBe('(same content as above)');
    expect(artifactTagSlug(text)).toBe('the-org-chart-only-works-until-its-tested');
  });

  it('is left alone when the artifact holds the real post', () => {
    const text = reply(`# Title\n\n${'Real body text here. '.repeat(30)}`);
    expect(hasPlaceholderArtifact(text)).toBe(false);
  });

  it('reports no placeholder when there is no artifact at all', () => {
    expect(hasPlaceholderArtifact('Just a chat reply with no artifact.')).toBe(false);
  });
});

describe('replaceArtifactBody', () => {
  it('puts the saved draft in and keeps the tag, label and slug', () => {
    const out = replaceArtifactBody(reply('(same content as above)'), '# Real Post\n\nFirst paragraph.');
    expect(out).toContain(`${TAG}\n# Real Post\n\nFirst paragraph.\n[/ARTIFACT]`);
    expect(out).not.toContain('same content as above');
  });

  it('changes nothing without content or without a block', () => {
    const text = reply('(same content as above)');
    expect(replaceArtifactBody(text, '')).toBe(text);
    expect(replaceArtifactBody('no artifact here', 'x')).toBe('no artifact here');
  });
});
