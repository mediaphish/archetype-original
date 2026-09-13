/**
 * Identifying a draft artifact.
 *
 * The staged tabs shipped and never appeared, because the panel could only find
 * a draft's slug in YAML front matter and Auto-written drafts have none. The
 * Cain cases below use the real tag and opening line from the thread.
 */
import { parseArtifact } from '../draftArtifactSync.js';
import { resolveDraftArtifactSlug, slugifyTitle } from '../draftArtifactSlug.js';

const CAIN_REAL =
  '[ARTIFACT type="draft" label="The Cain Archetype"]\n*The Archetype Series, Entry Ten*\n\nCain did not fail because no one told him.\n[/ARTIFACT]';

describe('parseArtifact', () => {
  it('reads a slug written on the tag', () => {
    const { artifact } = parseArtifact(
      '[ARTIFACT type="draft" label="The Cain Archetype" slug="the-cain-archetype"]\nBody\n[/ARTIFACT]'
    );
    expect(artifact.slug).toBe('the-cain-archetype');
  });

  it('leaves slug absent on the real Cain tag, which never had one', () => {
    const { artifact } = parseArtifact(CAIN_REAL);
    expect(artifact.slug).toBeUndefined();
    expect(artifact.label).toBe('The Cain Archetype');
  });
});

describe('resolveDraftArtifactSlug', () => {
  it('resolves the real Cain artifact from its label', () => {
    // The regression: no tag slug, no front matter. This returned null and the
    // tabs never engaged.
    expect(resolveDraftArtifactSlug(parseArtifact(CAIN_REAL).artifact)).toBe('the-cain-archetype');
  });

  it('prefers the slug on the tag over the label', () => {
    expect(
      resolveDraftArtifactSlug({ type: 'draft', label: 'A Different Title', slug: 'real-slug', content: '' })
    ).toBe('real-slug');
  });

  it('uses front matter when present and no tag slug', () => {
    const content = '---\ntitle: X\nslug: from-front-matter\n---\nBody';
    expect(resolveDraftArtifactSlug({ type: 'draft', label: 'X', content })).toBe('from-front-matter');
  });

  it('is null for anything that is not a draft', () => {
    expect(resolveDraftArtifactSlug({ type: 'captions', label: 'The Cain Archetype', content: '' })).toBeNull();
    expect(resolveDraftArtifactSlug(null)).toBeNull();
  });

  it('does not invent a slug from the default "Artifact" label', () => {
    expect(resolveDraftArtifactSlug({ type: 'draft', label: 'Artifact', content: 'Body' })).toBeNull();
  });
});

describe('slugifyTitle', () => {
  it('matches the server canonical slug rule', () => {
    expect(slugifyTitle("The Cain Archetype")).toBe('the-cain-archetype');
    expect(slugifyTitle("  Jezebel's  Table!  ")).toBe('jezebel-s-table');
  });
});
