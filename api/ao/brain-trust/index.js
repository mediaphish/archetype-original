/**
 * AO Automation — Brain Trust registry (people we follow).
 * GET /api/ao/brain-trust
 * POST /api/ao/brain-trust
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

  if (req.method === 'GET') {
    try {
      const { data, error } = await supabaseAdmin
        .from('ao_brain_trust_sources')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(300);
      if (error) {
        if (String(error.message || '').includes('ao_brain_trust_sources')) {
          return res.status(500).json({
            ok: false,
            error: 'Brain Trust table is not set up yet. Run database/ao_brain_trust_sources.sql in Supabase.',
          });
        }
        return res.status(500).json({ ok: false, error: error.message });
      }
      return res.status(200).json({ ok: true, people: data || [] });
    } catch (e) {
      console.error('[ao/brain-trust GET]', e);
      return res.status(500).json({ ok: false, error: e.message });
    }
  }

  if (req.method === 'POST') {
    const name = safeText(req.body?.name, 200);
    if (!name) return res.status(400).json({ ok: false, error: 'name required' });
    const categories = normArray(req.body?.categories, 20, 60);
    const profile_urls = normArray(req.body?.profile_urls, 10, 400);
    const notes = req.body?.notes != null ? safeText(req.body.notes, 800) : null;
    const active = req.body?.active === false ? false : true;

    try {
      const { data, error } = await supabaseAdmin
        .from('ao_brain_trust_sources')
        .insert({
          name,
          categories,
          profile_urls,
          notes,
          active,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select('*')
        .single();
      if (error) {
        if (String(error.message || '').includes('ao_brain_trust_sources')) {
          return res.status(500).json({
            ok: false,
            error: 'Brain Trust table is not set up yet. Run database/ao_brain_trust_sources.sql in Supabase.',
          });
        }
        return res.status(500).json({ ok: false, error: error.message });
      }
      return res.status(200).json({ ok: true, person: data });
    } catch (e) {
      console.error('[ao/brain-trust POST]', e);
      return res.status(500).json({ ok: false, error: e.message });
    }
  }

  return res.status(405).json({ ok: false, error: 'Method not allowed' });
}

