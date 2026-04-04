/**
 * Cron placeholder: pull per-post metrics from channel APIs and upsert ao_scheduled_post_metrics.
 * Wire Meta / LinkedIn / X insights here when OAuth + scopes are ready.
 * Secured with CRON_SECRET when set (same pattern as other crons).
 */

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.authorization || req.query?.secret || '';
    const provided = auth.replace(/^Bearer\s+/i, '') || (req.query?.secret ?? '');
    if (provided !== cronSecret) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }
  }

  return res.status(200).json({
    ok: true,
    synced: 0,
    message:
      'No channel API sync implemented yet. Use POST /api/ao/publishing/post-metrics for manual metrics, or extend this job to call provider insights APIs.',
  });
}
