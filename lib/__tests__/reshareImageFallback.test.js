/**
 * @jest-environment node
 *
 * The reshares that could never post (2026-10-02).
 *
 * Six reshares had been waiting for approval since July 22, and five of the six
 * carried no image. Instagram will not accept a post without one, so those five
 * could not have published even if Bart had found and approved them.
 *
 * The fallback meant to supply the entry's own header image read image_url and
 * header_image. No journal file has ever carried either field. The field is
 * featured_image, and it holds a repo-relative path. So the fallback had never
 * returned an image in its life, and nothing noticed because a missing image is
 * not an error until the post reaches Instagram.
 */
import { readFileSync } from 'node:fs';
import { join, basename } from 'node:path';
import { readdirSync } from 'node:fs';

const source = readFileSync(join(process.cwd(), 'api/ao/auto/reshare-journal.js'), 'utf8');

describe('the reshare image fallback matches what journal files actually store', () => {
  test('it reads featured_image, which is the field the files use', () => {
    const body = source.slice(source.indexOf('function extractJournalImageUrl'));
    expect(body).toContain('featured_image');
  });

  test('it is given the slug so it can fall back to the published image name', () => {
    expect(source).toContain('extractJournalImageUrl(journal.frontmatter, entry.slug)');
  });

  test('featured_image is in fact the field journal entries carry', () => {
    const dir = join(process.cwd(), 'ao-knowledge-hq-kit/journal');
    const files = readdirSync(dir).filter((f) => f.endsWith('.md')).slice(0, 60);
    const withFeatured = files.filter((f) =>
      /^featured_image:/m.test(readFileSync(join(dir, f), 'utf8'))
    );
    const withOldFields = files.filter((f) =>
      /^(image_url|header_image):/m.test(readFileSync(join(dir, f), 'utf8'))
    );
    expect(withFeatured.length).toBeGreaterThan(0);
    expect(withOldFields.map(basename)).toEqual([]);
  });
});
