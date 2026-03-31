import { runBriefPrep } from '../../../lib/ao/runBriefPrep.js';

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

  const result = await runBriefPrep();
  if (!result.ok) {
    return res.status(500).json({ ok: false, error: result.error || 'Brief prep failed' });
  }

  return res.status(200).json(result);
}
