import { requireAoSession } from '../../../../lib/ao/requireAoSession.js';
import { supabaseAdmin } from '../../../../lib/supabase-admin.js';

function safeText(v, maxLen = 0) {
  const s = String(v || '').trim();
  if (!s) return '';
  return maxLen ? s.slice(0, maxLen) : s;
}

export default async function handler(req, res) {
  const auth = requireAoSession(req, res);
  if (!auth) return;

  const id = req.query?.id;
  if (!id) return res.status(400).json({ ok: false, error: 'id required' });

  if (req.method !== 'PATCH') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const patch = { updated_at: new Date().toISOString() };
  if (req.body?.enabled != null) patch.enabled = !!req.body.enabled;
  if (req.body?.title != null) patch.title = safeText(req.body.title, 140) || null;
  if (req.body?.rule_text != null) patch.rule_text = safeText(req.body.rule_text, 1000) || '';

  const out = await supabaseAdmin
    .from('ao_auto_guardrails')
    .update(patch)
    .eq('id', id)
    .eq('created_by_email', auth.email)
    .select('*')
    .single();
  if (out.error) return res.status(500).json({ ok: false, error: out.error.message });
  return res.status(200).json({ ok: true, guardrail: out.data });
}
