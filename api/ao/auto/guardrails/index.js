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

  if (req.method === 'GET') {
    const out = await supabaseAdmin
      .from('ao_auto_guardrails')
      .select('*')
      .eq('created_by_email', auth.email)
      .order('updated_at', { ascending: false });
    if (out.error) return res.status(500).json({ ok: false, error: out.error.message });
    return res.status(200).json({ ok: true, guardrails: out.data || [] });
  }

  if (req.method === 'POST') {
    const ruleText = safeText(req.body?.rule_text, 1000);
    if (!ruleText) return res.status(400).json({ ok: false, error: 'rule_text required' });
    const out = await supabaseAdmin
      .from('ao_auto_guardrails')
      .insert({
        created_by_email: auth.email,
        title: safeText(req.body?.title, 140) || 'Learned guardrail',
        rule_text: ruleText,
        enabled: req.body?.enabled !== false,
        scope: 'global',
        source: req.body?.source === 'system' ? 'system' : 'user',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select('*')
      .single();
    if (out.error) return res.status(500).json({ ok: false, error: out.error.message });
    return res.status(200).json({ ok: true, guardrail: out.data });
  }

  return res.status(405).json({ ok: false, error: 'Method not allowed' });
}
