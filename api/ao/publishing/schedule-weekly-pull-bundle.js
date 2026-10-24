/**
 * Schedule social posts (image + caption) from a weekly corpus pull bundle row (Review inbox).
 * POST /api/ao/publishing/schedule-weekly-pull-bundle
 * Body: { quote_id, start_at?: ISO datetime (first slot), gap_days?: number (default 1) }
 * The scheduling itself lives in lib/ao/scheduleWeeklyBundle.js (shared with the Monday job).
 */
import { supabaseAdmin } from '../../../lib/supabase-admin.js';
import { requireAoSession } from '../../../lib/ao/requireAoSession.js';
import { QUOTE_CARD_GAP_DAYS } from '../../../lib/ao/postingCadence.js';
import { scheduleWeeklyBundleRow } from '../../../lib/ao/scheduleWeeklyBundle.js';

function parseIso(v) {
  if (!v) return null;
  const d = new Date(String(v));
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

export default async function handler(req, res) {
  const auth = requireAoSession(req, res);
  if (!auth) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const quoteId = req.body?.quote_id;
  if (!quoteId) return res.status(400).json({ ok: false, error: 'quote_id required' });

  const gapDays = Math.max(1, Math.min(14, Number.parseInt(String(req.body?.gap_days ?? QUOTE_CARD_GAP_DAYS), 10) || QUOTE_CARD_GAP_DAYS));
  let start = parseIso(req.body?.start_at);
  if (!start) {
    const t = new Date();
    t.setDate(t.getDate() + 1);
    t.setHours(10, 30, 0, 0);
    start = t;
  }

  try {
    const { data: row, error: fetchErr } = await supabaseAdmin
      .from('ao_quote_review_queue')
      .select('*')
      .eq('id', quoteId)
      .single();

    if (fetchErr) {
      if (fetchErr.code === 'PGRST116') return res.status(404).json({ ok: false, error: 'Not found' });
      return res.status(500).json({ ok: false, error: fetchErr.message });
    }

    if (String(row.created_by_email || '').toLowerCase() !== String(auth.email || '').toLowerCase()) {
      return res.status(403).json({ ok: false, error: 'Forbidden' });
    }

    const out = await scheduleWeeklyBundleRow(row, { start, gapDays });
    const { status, ...body } = out;
    return res.status(status).json(body);
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || 'Error' });
  }
}
