/**
 * AO Automation — Corpus drafts (TL;DR / outlines / publish queue).
 * GET /api/ao/corpus/drafts  — list
 * POST /api/ao/corpus/drafts — create
 */

import { supabaseAdmin } from '../../../../lib/supabase-admin.js';
import { requireAoSession } from '../../../../lib/ao/requireAoSession.js';

export default async function handler(req, res) {
  const auth = requireAoSession(req, res);
  if (!auth) return;

  try {
    if (req.method === 'GET') {
      const { data, error } = await supabaseAdmin
        .from('ao_corpus_drafts')
        .select('*')
        .eq('created_by_email', auth.email)
        .order('updated_at', { ascending: false })
        .limit(80);

      if (error) {
        if (String(error.message || '').includes('ao_corpus_drafts')) {
          return res.status(500).json({
            ok: false,
            error: 'Corpus drafts table is not set up yet. Run database/ao_corpus_and_archy.sql in Supabase.',
          });
        }
        return res.status(500).json({ ok: false, error: error.message });
      }
      return res.status(200).json({ ok: true, drafts: data || [] });
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'object' && req.body ? req.body : {};
      const topic = String(body.topic || '').slice(0, 500);
      const tldr_markdown = body.tldr_markdown != null ? String(body.tldr_markdown) : null;
      const outline_markdown = body.outline_markdown != null ? String(body.outline_markdown) : null;
      const full_markdown = body.full_markdown != null ? String(body.full_markdown) : null;
      const status = ['draft', 'approved', 'rejected'].includes(body.status) ? body.status : 'draft';
      const tags = Array.isArray(body.tags) ? body.tags.map((t) => String(t).slice(0, 80)).filter(Boolean).slice(0, 24) : [];
      const target_path = body.target_path != null ? String(body.target_path).slice(0, 500) : null;
      const meta = body.meta && typeof body.meta === 'object' ? body.meta : {};

      const { data, error } = await supabaseAdmin
        .from('ao_corpus_drafts')
        .insert({
          created_by_email: auth.email,
          topic: topic || 'Untitled',
          status,
          tldr_markdown,
          outline_markdown,
          full_markdown,
          target_path,
          tags,
          meta,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select('*')
        .single();

      if (error) {
        if (String(error.message || '').includes('ao_corpus_drafts')) {
          return res.status(500).json({
            ok: false,
            error: 'Corpus drafts table is not set up yet. Run database/ao_corpus_and_archy.sql in Supabase.',
          });
        }
        return res.status(500).json({ ok: false, error: error.message });
      }
      return res.status(200).json({ ok: true, draft: data });
    }

    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  } catch (e) {
    console.error('[ao/corpus/drafts]', e);
    return res.status(500).json({ ok: false, error: e.message });
  }
}
