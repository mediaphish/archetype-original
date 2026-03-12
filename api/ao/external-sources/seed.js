/**
 * AO Automation — Rebuild external sources allowlist using Scout prompt.
 * POST /api/ao/external-sources/seed
 *
 * Historical endpoint name. This now rebuilds the allowlist with AI + validation.
 */

import { requireAoSession } from '../../../lib/ao/requireAoSession.js';
import handlerRebuild from './rebuild.js';

export default async function handler(req, res) {
  const auth = requireAoSession(req, res);
  if (!auth) return;

  // Delegate to rebuild behavior (keeps old endpoint stable).
  return handlerRebuild(req, res);
}

