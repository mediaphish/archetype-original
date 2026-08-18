/**
 * Image attach must not swallow failures into a silent text-only post.
 * Run: node lib/social/imageAttachNoSwallow.selftest.mjs
 */
import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const linkedin = fs.readFileSync(path.join(ROOT, 'lib/social/linkedin.js'), 'utf8');
assert.ok(!/posting text only/.test(linkedin), 'LinkedIn must not post text-only after an image failure');
assert.ok(/LinkedIn image attach failed/.test(linkedin), 'LinkedIn returns a real error when image attach fails');

const twitter = fs.readFileSync(path.join(ROOT, 'lib/social/twitter.js'), 'utf8');
assert.ok(!/Fall through: OAuth2 text \+ link/.test(twitter), 'X must not fall through to text-only after an image failure');
assert.ok(/X image attach failed/.test(twitter), 'X returns a real error when image attach fails');

const facebook = fs.readFileSync(path.join(ROOT, 'lib/social/facebook.js'), 'utf8');
assert.ok(
  /if \(res\.ok && data\.id\) return \{ success: true/.test(facebook) &&
    /return \{ success: false, error: data\.error/.test(facebook),
  'Facebook photo posts already fail instead of swallowing'
);

const instagram = fs.readFileSync(path.join(ROOT, 'lib/social/instagram.js'), 'utf8');
assert.ok(/Instagram feed posts require an image/.test(instagram), 'Instagram still requires an image');

console.log('imageAttachNoSwallow.selftest: PASS');
