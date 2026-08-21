/**
 * GET /api/ao/auto/x-media-check
 *
 * Proves the X media-upload path works, without posting anything.
 *
 * preflight only reports whether the four TWITTER_* variables are *present*.
 * Present is not the same as working: the OAuth 1.0a token has to carry write
 * permission, the signature has to validate, and the project tier has to allow
 * media upload. Those fail in ways that look identical to a missing variable
 * from the outside.
 *
 * X separates media upload from tweet creation. Uploading returns a media_id
 * that stays private and expires unused after roughly 24 hours; nothing becomes
 * public until a tweet references it. So this exercises every part of the image
 * path — credentials, signature, permission, tier, transport — and stops one
 * step short of publishing.
 *
 * That matters here specifically. For eight days X image posts reported success
 * while actually posting a raw storage URL as body text. The lesson is not to
 * trust a green check that was inferred rather than observed, and that includes
 * the green check this endpoint's sibling prints.
 *
 * Owner-gated, read-only, and safe to run any time.
 */

import { requireAoSession } from '../../../lib/ao/requireAoSession.js';
import { getSocialCredentials } from '../../../lib/social/config.js';
import { uploadTwitterMediaOAuth1 } from '../../../lib/social/twitter.js';

// A 1x1 transparent PNG. Small enough to be free of consequence, real enough
// that X's decoder has to accept it.
const PIXEL_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk' +
  'YPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

export default async function handler(req, res) {
  const auth = requireAoSession(req, res);
  if (!auth) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const creds = getSocialCredentials('twitter', 'personal');
  if (!creds) {
    const missing = [
      'TWITTER_API_KEY',
      'TWITTER_API_SECRET',
      'TWITTER_ACCESS_TOKEN',
      'TWITTER_ACCESS_TOKEN_SECRET',
    ].filter((name) => !process.env[name]);
    return res.status(200).json({
      ok: false,
      stage: 'credentials',
      error: `Missing ${missing.join(', ')}`,
      posted: false,
    });
  }

  try {
    const up = await uploadTwitterMediaOAuth1(creds, PIXEL_PNG_BASE64);
    if (!up.ok) {
      // The common causes, in the order they are worth checking: the access
      // token was generated while the app was still read-only (regenerate it
      // after setting Read and write), the consumer key and secret are from a
      // different app than the access token, or the project tier does not
      // include media upload.
      return res.status(200).json({
        ok: false,
        stage: 'media_upload',
        error: up.error,
        posted: false,
      });
    }

    return res.status(200).json({
      ok: true,
      stage: 'media_upload',
      mediaId: up.mediaId,
      posted: false,
      message:
        'X accepted a media upload. Image posts can attach. Nothing was published — ' +
        'this media id expires unused in about 24 hours.',
    });
  } catch (err) {
    return res.status(200).json({
      ok: false,
      stage: 'exception',
      error: err.message,
      posted: false,
    });
  }
}
