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
    try {
      const qText = safeText(req.query?.q, 160);
      let query = supabaseAdmin
        .from('ao_auto_bundles')
        .select('*')
        .eq('created_by_email', auth.email)
        .order('updated_at', { ascending: false })
        .limit(50);
      if (qText) {
        const pat = `%${qText.replace(/%/g, '\\%').replace(/_/g, '\\_')}%`;
        query = query.or(`title.ilike.${pat},summary.ilike.${pat},series_name.ilike.${pat},original_input.ilike.${pat}`);
      }
      const out = await query;
      if (out.error) throw out.error;
      return res.status(200).json({ ok: true, bundles: out.data || [] });
    } catch (e) {
      return res.status(500).json({ ok: false, error: e.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const payload = {
        created_by_email: auth.email,
        thread_id: req.body?.thread_id || null,
        source_idea_id: req.body?.source_idea_id || null,
        title: safeText(req.body?.title, 160) || null,
        summary: safeText(req.body?.summary, 300) || null,
        original_input: typeof req.body?.original_input === 'string' ? req.body.original_input : null,
        original_input_frozen: req.body?.original_input_frozen !== false,
        journal_markdown: typeof req.body?.journal_markdown === 'string' ? req.body.journal_markdown : null,
        channel_drafts: req.body?.channel_drafts && typeof req.body.channel_drafts === 'object' ? req.body.channel_drafts : null,
        pull_quote_companions: req.body?.pull_quote_companions && typeof req.body.pull_quote_companions === 'object' ? req.body.pull_quote_companions : null,
        schedule_suggestion: req.body?.schedule_suggestion && typeof req.body.schedule_suggestion === 'object' ? req.body.schedule_suggestion : null,
        attachment_refs: req.body?.attachment_refs && typeof req.body.attachment_refs === 'object' ? req.body.attachment_refs : null,
        rating: safeText(req.body?.rating, 10).toLowerCase() || null,
        rating_reason: safeText(req.body?.rating_reason, 500) || null,
        bundle_dna: req.body?.bundle_dna && typeof req.body.bundle_dna === 'object' ? req.body.bundle_dna : null,
        series_name: safeText(req.body?.series_name, 120) || null,
        tags: Array.isArray(req.body?.tags) ? req.body.tags.map((x) => safeText(x, 40)).filter(Boolean).slice(0, 12) : null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_used_at: req.body?.last_used_at || null,
      };
      const inserted = await supabaseAdmin
        .from('ao_auto_bundles')
        .insert(payload)
        .select('*')
        .single();
      if (inserted.error) throw inserted.error;
      return res.status(200).json({ ok: true, bundle: inserted.data });
    } catch (e) {
      return res.status(500).json({ ok: false, error: e.message });
    }
  }

  return res.status(405).json({ ok: false, error: 'Method not allowed' });
}
