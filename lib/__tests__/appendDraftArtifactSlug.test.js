/**
 * @jest-environment node
 *
 * The draft artifact tag carries the slug.
 *
 * Found 2026-09-13: the tag was written as type + label only, so the panel had
 * no way to identify an Auto-written draft and the staged tabs never appeared.
 */
import { appendDraftArtifactFromSaveResults } from '../ao/appendDraftArtifactFromSaveResults.js';

const body = 'Cain did not fail because no one told him. '.repeat(120);

function saveResult(result) {
  return [{ name: 'save_draft', result: { ok: true, kind: 'journal', content: body, ...result } }];
}

describe('appendDraftArtifactFromSaveResults', () => {
  it('writes the slug onto the artifact tag', () => {
    const out = appendDraftArtifactFromSaveResults(
      'Saved.',
      saveResult({ title: 'The Cain Archetype', slug: 'the-cain-archetype' })
    );
    expect(out.appended).toBe(true);
    expect(out.reply).toContain('[ARTIFACT type="draft" label="The Cain Archetype" slug="the-cain-archetype"]');
  });

  it('omits the attribute rather than writing an empty one when there is no slug', () => {
    const out = appendDraftArtifactFromSaveResults('Saved.', saveResult({ title: 'Untitled', slug: null }));
    expect(out.reply).toContain('[ARTIFACT type="draft" label="Untitled"]');
    expect(out.reply).not.toContain('slug=""');
  });
});
