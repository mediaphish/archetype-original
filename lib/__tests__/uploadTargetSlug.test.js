/**
 * @jest-environment node
 *
 * An uploaded image knows which post it belongs to (2026-09-20).
 */
import { resolveUploadTargetSlug, latestSlugInMessages } from '../ao/uploadTargetSlug.js';

const msg = (content) => ({ role: 'assistant', content });

describe('resolveUploadTargetSlug', () => {
  it('uses the post open in the panel', () => {
    expect(
      resolveUploadTargetSlug({
        artifactSlug: 'the-org-chart-only-works-until-its-tested',
        messages: [msg('[ARTIFACT type="draft" slug="an-older-post"]body[/ARTIFACT]')],
      })
    ).toEqual({ slug: 'the-org-chart-only-works-until-its-tested', source: 'panel' });
  });

  it('falls back to the newest slug in the thread, artifact tags included', () => {
    const messages = [
      msg('[ARTIFACT type="draft" slug="an-older-post"]body[/ARTIFACT]'),
      msg('[ARTIFACT type="draft" label="The Org Chart" slug="the-org-chart-only-works-until-its-tested"]body[/ARTIFACT]'),
    ];
    expect(resolveUploadTargetSlug({ artifactSlug: null, messages })).toEqual({
      slug: 'the-org-chart-only-works-until-its-tested',
      source: 'thread',
    });
  });

  it('still reads the publish and fetch signals', () => {
    expect(latestSlugInMessages([msg('[PUBLISH_JOURNAL slug="your-tuesday"]')])).toBe('your-tuesday');
    expect(latestSlugInMessages([msg('[DRAFT_FETCH_FULL_TEXT slug="the-cain-archetype"]')])).toBe('the-cain-archetype');
  });

  it('reports none when the thread names no post', () => {
    expect(resolveUploadTargetSlug({ messages: [msg('Just a chat reply.')] })).toEqual({ slug: '', source: 'none' });
    expect(resolveUploadTargetSlug({})).toEqual({ slug: '', source: 'none' });
  });
});
