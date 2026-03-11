/**
 * AO Automation — External sources allowlist.
 * GET /api/ao/external-sources
 * POST /api/ao/external-sources
 *
 * This is the allowlist used by /api/ao/scan-external (RSS/article sources).
 */

import { createClient } from '@supabase/supabase-js';
import { requireAoSession } from '../../../lib/ao/requireAoSession.js';

const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function normType(v) {
  const t = String(v || '').trim().toLowerCase();
  return t === 'article' ? 'article' : 'rss';
}

function normUrl(v) {
  const s = String(v || '').trim();
  if (!s) return '';
  try {
    const u = new URL(s);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return '';
    return u.toString();
  } catch (_) {
    return '';
  }
}

export default async function handler(req, res) {
  const auth = requireAoSession(req, res);
  if (!auth) return;

  if (req.method === 'GET') {
    try {
      const { data, error } = await supabaseAdmin
        .from('ao_external_sources')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) {
        if (String(error.message || '').includes('ao_external_sources')) {
          return res.status(500).json({
            ok: false,
            error: 'External sources table is not set up yet. Run database/ao_queue_and_scan_schema.sql in Supabase.',
          });
        }
        return res.status(500).json({ ok: false, error: error.message });
      }
      return res.status(200).json({ ok: true, sources: data || [] });
    } catch (e) {
      console.error('[ao/external-sources GET]', e);
      return res.status(500).json({ ok: false, error: e.message });
    }
  }

  if (req.method === 'POST') {
    const url = normUrl(req.body?.url);
    const name = req.body?.name ? String(req.body.name).trim().slice(0, 120) : null;
    const source_type = normType(req.body?.source_type);
    if (!url) {
      return res.status(400).json({ ok: false, error: 'Valid url required (http/https)' });
    }

    try {
      const { data, error } = await supabaseAdmin
        .from('ao_external_sources')
        .insert({
          url,
          name,
          source_type,
          created_at: new Date().toISOString(),
        })
        .select('*')
        .single();
      if (error) {
        if (String(error.message || '').includes('ao_external_sources')) {
          return res.status(500).json({
            ok: false,
            error: 'External sources table is not set up yet. Run database/ao_queue_and_scan_schema.sql in Supabase.',
          });
        }
        return res.status(500).json({ ok: false, error: error.message });
      }
      return res.status(200).json({ ok: true, source: data });
    } catch (e) {
      console.error('[ao/external-sources POST]', e);
      return res.status(500).json({ ok: false, error: e.message });
    }
  }

  return res.status(405).json({ ok: false, error: 'Method not allowed' });
}

