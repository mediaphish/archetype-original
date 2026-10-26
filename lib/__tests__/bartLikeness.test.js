/**
 * @jest-environment node
 *
 * Images with Bart in them (2026-10-25): "Auto cannot generate this quality of
 * images of me." Real photos for his face, a series photo for the look, his
 * words as written, the top quality. Of the result: "The second image is bang on."
 */
jest.mock('../supabase-admin.js', () => ({ supabaseAdmin: { from: () => ({}) } }));
import { featuresBart, likenessReferences, likenessPrompt, chooseStyleFor, REAL_BART_PHOTOS, LIKENESS_QUALITY } from '../ao/bartLikeness.js';
import { BACKGROUNDS } from '../ao/reshareBackgrounds.js';
import { readFileSync } from 'node:fs';

describe('when an image shows Bart', () => {
  test('Auto saying so decides it', () => {
    expect(featuresBart({ features_bart: true, prompt_description: 'a lake' })).toBe(true);
    expect(featuresBart({ features_bart: false, prompt_description: 'a photo of Bart' })).toBe(false);
  });
  test('only wording that plainly puts him in the frame counts', () => {
    expect(featuresBart({ prompt_description: 'A photograph of Bart in a library at dusk' })).toBe(true);
    expect(featuresBart({ prompt_description: 'Bart sits at a long table' })).toBe(true);
    expect(featuresBart({ prompt_description: 'Keep the man in the attached photo exactly as he is' })).toBe(true);
    // A passing mention must not put him into a scene (the 2026-08-31 battlefield incident).
    expect(featuresBart({ prompt_description: 'A painterly battlefield scene for Bart’s journal entry' })).toBe(false);
    expect(featuresBart({ prompt_description: 'Header for the post Bart wrote about Jonah' })).toBe(false);
  });
  test('resurface cards keep their own path', () => {
    expect(featuresBart({ content_type: 'resurface', prompt_description: 'a photo of Bart' })).toBe(false);
  });
});

describe('what goes with the request', () => {
  test('his likeness comes from four real photographs, then the series photo for the look', () => {
    const refs = likenessReferences({ styleId: 'bart-reshare-020' });
    expect(refs.filter((r) => r.role === 'real').map((r) => r.url)).toEqual(REAL_BART_PHOTOS);
    expect(REAL_BART_PHOTOS.every((u) => /^\/images\/Bart-\d+\.jpg$/.test(u))).toBe(true);
    expect(refs[refs.length - 1]).toEqual({ url: '/images/reshare-backgrounds/bart-reshare-020.png', role: 'style' });
  });
  test('a photo Bart attached is followed for the picture, never taken as his face', () => {
    const refs = likenessReferences({ attached: ['https://x/a.png'], previous: 'https://x/a.png' });
    expect(refs.map((r) => r.role)).toEqual(['real', 'real', 'real', 'real', 'attached']);
  });
  test('a previous version goes last, for its composition only', () => {
    const refs = likenessReferences({ previous: 'https://x/old.png', styleId: 'bart-reshare-003' });
    expect(refs.map((r) => r.role)).toEqual(['real', 'real', 'real', 'real', 'style', 'previous']);
    const p = likenessPrompt('Bart walks a lakeshore.', refs);
    expect(p).toMatch(/^The first 4 images are real photographs of Bart Paden/);
    expect(p).toMatch(/fifth image shows the photographic style/);
    expect(p).toMatch(/sixth image is the previous version: keep what works in its composition, but take his likeness only from the real photographs/);
  });
  test('Bart’s words go through exactly as written, after the line about the pictures', () => {
    const brief = 'Me at the train platform, checking my watch, cool blue light.';
    expect(likenessPrompt(brief, likenessReferences({})).endsWith(`\n\n${brief}`)).toBe(true);
  });
  test('the likeness cards can leave out the series photo', () => {
    expect(likenessReferences({ style: false }).map((r) => r.role)).toEqual(['real', 'real', 'real', 'real']);
  });
  test('top quality unless set otherwise', () => {
    expect(LIKENESS_QUALITY).toBe('max');
  });
  test('the style photo is one from his series, matched to the request, or the first if the matcher fails', async () => {
    expect(await chooseStyleFor('train platform', { complete: async () => ({ best: 'bart-reshare-014' }) })).toBe('bart-reshare-014');
    expect(await chooseStyleFor('x', { complete: async () => ({ best: 'made-up' }) })).toBe(BACKGROUNDS[0].id);
    expect(await chooseStyleFor('x', { complete: async () => { throw new Error('down'); } })).toBe(BACKGROUNDS[0].id);
  });
});

test('the image tool and likeness cards both go through this', () => {
  const tool = readFileSync('lib/ao/autoToolHandlers.js', 'utf8');
  expect(tool).toMatch(/featuresBart\(input\)/);
  expect(tool).toMatch(/verificationReferenceUrls = REAL_BART_PHOTOS/);
  const card = readFileSync('lib/ao/generateLikenessCard.js', 'utf8');
  expect(card).toMatch(/likenessReferences\(\{ style: false \}\)/);
});
