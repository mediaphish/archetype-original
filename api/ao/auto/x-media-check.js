/**
 * GET /api/ao/auto/x-media-check
 *
 * Proves the X media-upload path works, without posting anything.
 *
 * X separates media upload from post creation. Uploading returns a media id
 * that stays private and expires unused after roughly 24 hours; nothing becomes
 * public until a post references it. So this exercises the whole image path —
 * token, scope, transport, X's decoder — and stops one step short of publishing.
 *
 * Why it exists: for eight days X image posts reported success while actually
 * posting a raw storage URL as body text. A green check that was inferred
 * rather than observed is what allowed that. preflight only reports whether
 * credentials are *present*; this endpoint observes whether they *work*.
 *
 * It earned its keep immediately. The first run returned "Could not
 * authenticate you", which looked like a key problem and was not: X retired the
 * v1.1 media endpoints on 2025-06-09 and the code was still calling them.
 *
 * Owner-gated, read-only, safe to run any time.
 */

import { requireAoSession } from '../../../lib/ao/requireAoSession.js';
import { getXAccessToken } from '../../../lib/social/xConnection.js';
import { uploadXMediaV2 } from '../../../lib/social/twitter.js';

// A 1x1 transparent PNG. Small enough to be free of consequence, real enough
// that X's image decoder has to accept it.
const PIXEL_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk' +
  'YPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

export default async function handler(req, res) {
  const auth = requireAoSession(req, res);
  if (!auth) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const token = await getXAccessToken();
  if (!token.ok || !token.accessToken) {
    return res.status(200).json({
      ok: false,
      stage: 'connection',
      error: 'No connected X account. Connect X from Auto settings.',
      posted: false,
    });
  }

  // Surfaced because a token issued before media.write was requested will fail
  // the upload with a 403, and the scope list says so before the call is made.
  const scopes = String(token.scope || '');
  const hasMediaWrite = scopes.split(/\s+/).includes('media.write');

  try {
    const up = await uploadXMediaV2(token.accessToken, PIXEL_PNG_BASE64, 'image/png');

    if (!up.ok) {
      return res.status(200).json({
        ok: false,
        stage: 'media_upload',
        error: up.error,
        scopes,
        hasMediaWrite,
        posted: false,
      });
    }

    return res.status(200).json({
      ok: true,
      stage: 'media_upload',
      mediaId: up.mediaId,
      scopes,
      hasMediaWrite,
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
      scopes,
      hasMediaWrite,
      posted: false,
    });
  }
}
