/**
 * AO Automation — Brain Trust registry (single person).
 * PATCH /api/ao/brain-trust/[id]
 * DELETE /api/ao/brain-trust/[id]
 */
import { createClient } from '@supabase/supabase-js';
import { requireAoSession } from '../../../lib/ao/requireAoSession.js';

const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function safeText(v, max) {
  const s = String(v || '').trim();
  if (!s) return '';
  return s.slice(0, max);
}

function normArray(v, maxItems, maxLen) {
  if (!Array.isArray(v)) return [];
  const out = [];
  for (const item of v) {
    const s = safeText(item, maxLen);
    if (!s) continue;
    out.push(s);
    if (out.length >= maxItems) break;
  }
  return out;
}

export default async function handler(req, res) {
  const auth = requireAoSession(req, res);
  if (!auth) return;

  const id = req.query?.id;
  if (!id) return res.status(400).json({ ok: false, error: 'id required' });

  if (req.method === 'PATCH') {
    const updates = { updated_at: new Date().toISOString() };
    if (req.body?.name != null) {
      const name = safeText(req.body.name, 200);
      if (name) updates.name = name;
    }
    if (req.body?.categories != null) updates.categories = normArray(req.body.categories, 20, 60);
    if (req.body?.profile_urls != null) updates.profile_urls = normArray(req.body.profile_urls, 10, 400);
    if (req.body?.notes != null) updates.notes = safeText(req.body.notes, 800) || null;
    if (req.body?.active != null) updates.active = req.body.active === false ? false : true;

    try {
      const { data, error } = await supabaseAdmin
        .from('ao_brain_trust_sources')
        .update(updates)
        .eq('id', id)
        .select('*')
        .single();
      if (error) {
        if (error.code === 'PGRST116') return res.status(404).json({ ok: false, error: 'Not found' });
        return res.status(500).json({ ok: false, error: error.message });
      }
      return res.status(200).json({ ok: true, person: data });
    } catch (e) {
      console.error('[ao/brain-trust PATCH]', e);
      return res.status(500).json({ ok: false, error: e.message });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { error } = await supabaseAdmin
        .from('ao_brain_trust_sources')
        .delete()
        .eq('id', id);
      if (error) return res.status(500).json({ ok: false, error: error.message });
      return res.status(200).json({ ok: true });
    } catch (e) {
      console.error('[ao/brain-trust DELETE]', e);
      return res.status(500).json({ ok: false, error: e.message });
    }
  }

  return res.status(405).json({ ok: false, error: 'Method not allowed' });
}

