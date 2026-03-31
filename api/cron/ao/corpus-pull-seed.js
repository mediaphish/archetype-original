import { seedCorpusPullQuotesToQueue } from '../../../lib/ao/seedCorpusPullQuotes.js';

function authorizeCron(req, res) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return true;
  const auth = req.headers.authorization || req.query?.secret || '';
  const provided = auth.replace(/^Bearer\s+/i, '') || (req.query?.secret ?? '');
  if (provided !== cronSecret) {
    res.status(401).json({ ok: false, error: 'Unauthorized' });
    return false;
  }
  return true;
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }
  if (!authorizeCron(req, res)) return;

  const email = String(process.env.AO_CORPUS_SEED_EMAIL || '').trim().toLowerCase();
  if (!email) {
    return res.status(200).json({
      ok: true,
      skipped: true,
      message: 'Set AO_CORPUS_SEED_EMAIL to seed corpus pull quotes into the Inbox.',
    });
  }

  const queryText = String(process.env.AO_CORPUS_SEED_QUERY || 'leadership accountability culture').trim();
  const limit = Math.min(5, Math.max(1, parseInt(process.env.AO_CORPUS_SEED_LIMIT || '3', 10) || 3));

  const result = await seedCorpusPullQuotesToQueue({ email, queryText, limit });
  if (!result.ok) {
    return res.status(500).json({ ok: false, error: result.error || 'Seed failed' });
  }

  return res.status(200).json(result);
}
