/**
 * AO Automation — Ideas inbox
 * GET /api/ao/ideas?status=&path=&limit=&offset=&q=
 * POST /api/ao/ideas
 */

import { supabaseAdmin } from '../../../lib/supabase-admin.js';
import { requireAoSession } from '../../../lib/ao/requireAoSession.js';

function clampInt(v, fallback, min, max) {
  const n = Number.parseInt(String(v ?? ''), 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function normUrl(v) {
  const s = String(v || '').trim();
  if (!s) return null;
  try {
    const u = new URL(s);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
    return u.toString();
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  const auth = requireAoSession(req, res);
  if (!auth) return;

  if (req.method === 'GET') {
    const status = String(req.query?.status || 'active').trim().toLowerCase();
    const pathFilter = String(req.query?.path || '').trim().toLowerCase(); // idea_seed | ready_post | all
    const limit = clampInt(req.query?.limit, 10, 1, 200);
    const offset = clampInt(req.query?.offset, 0, 0, 100000);
    const qText = String(req.query?.q || '').trim();

    const statusMap = {
      active: ['new', 'brief_ready'],
      held: ['held'],
      archived: ['archived'],
      all: null,
    };

    try {
      let q = supabaseAdmin
        .from('ao_ideas')
        .select('*', { count: 'exact' })
        .eq('created_by_email', auth.email)
        .order('created_at', { ascending: false });

      const statuses = statusMap[status] ?? statusMap.active;
      if (statuses) q = q.in('status', statuses);

      if (pathFilter && pathFilter !== 'all') {
        const allowed = new Set(['idea_seed', 'ready_post']);
        if (allowed.has(pathFilter)) {
          q = q.eq('path', pathFilter);
        }
      }

      if (qText) {
        const pat = `%${qText.replace(/%/g, '\\%').replace(/_/g, '\\_')}%`;
        q = q.or(`title.ilike.${pat},raw_input.ilike.${pat},markdown_content.ilike.${pat}`);
      }

      q = q.range(offset, offset + limit - 1);

      const { data, error, count } = await q;
      if (error) return res.status(500).json({ ok: false, error: error.message });

      return res.status(200).json({
        ok: true,
        ideas: data || [],
        page: { status, path: pathFilter || 'all', limit, offset, total: typeof count === 'number' ? count : null },
      });
    } catch (e) {
      console.error('[ao/ideas GET]', e);
      return res.status(500).json({ ok: false, error: e.message });
    }
  }

  if (req.method === 'POST') {
    const path = String(req.body?.path || 'idea_seed').trim().toLowerCase();
    const isReadyPost = path === 'ready_post';

    const raw_input = req.body?.raw_input ? String(req.body.raw_input).trim() : '';
    const markdown_content = req.body?.markdown_content ? String(req.body.markdown_content) : '';
    const title = req.body?.title ? String(req.body.title).trim().slice(0, 120) : null;
    const source_url = normUrl(req.body?.source_url);

    const ready_target_site = req.body?.ready_target_site == null ? true : !!req.body.ready_target_site;
    const ready_target_social = req.body?.ready_target_social == null ? true : !!req.body.ready_target_social;
    const ready_social_channels = Array.isArray(req.body?.ready_social_channels) ? req.body.ready_social_channels : null;
    const featured = req.body?.featured_image || null; // { filename, mime_type, content_base64 }

    if (isReadyPost) {
      const text = markdown_content.trim() || raw_input;
      if (!text || text.trim().length < 20) {
        return res.status(400).json({ ok: false, error: 'markdown_content required (or raw_input) for ready_post' });
      }
      if (!ready_target_site && !ready_target_social) {
        return res.status(400).json({ ok: false, error: 'Select at least one target (site and/or social)' });
      }
    } else if (!raw_input || raw_input.length < 5) {
      return res.status(400).json({ ok: false, error: 'raw_input required' });
    }

    try {
      const insertPayload = {
        path: isReadyPost ? 'ready_post' : 'idea_seed',
        title,
        raw_input: isReadyPost ? (raw_input || markdown_content || '').trim() : raw_input,
        source_url,
        status: 'new',
        created_by_email: auth.email,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (isReadyPost) {
        insertPayload.markdown_content = (markdown_content || raw_input || '').toString();
        insertPayload.ready_target_site = !!ready_target_site;
        insertPayload.ready_target_social = !!ready_target_social;
        if (Array.isArray(ready_social_channels) && ready_social_channels.length) {
          insertPayload.ready_social_channels = ready_social_channels.map((x) => String(x || '').trim().toLowerCase()).filter(Boolean).slice(0, 10);
        }
        if (featured?.filename) {
          insertPayload.ready_featured_image_filename = String(featured.filename).slice(0, 200);
        }
        if (featured?.mime_type) {
          insertPayload.ready_featured_image_mime_type = String(featured.mime_type).slice(0, 80);
        }
      }

      const { data, error } = await supabaseAdmin
        .from('ao_ideas')
        .insert(insertPayload)
        .select('*')
        .single();

      if (error) {
        if (String(error.message || '').includes('ao_ideas')) {
          return res.status(500).json({
            ok: false,
            error: 'Ideas table is not set up yet. Run database/ao_ideas.sql (and database/ao_ideas_ready_posts.sql) in Supabase.',
          });
        }
        return res.status(500).json({ ok: false, error: error.message });
      }

      if (isReadyPost && featured?.content_base64 && featured?.filename && featured?.mime_type) {
        try {
          await supabaseAdmin.from('ao_idea_assets').insert({
            idea_id: data.id,
            kind: 'featured_image',
            filename: String(featured.filename).slice(0, 200),
            mime_type: String(featured.mime_type).slice(0, 80),
            content_base64: String(featured.content_base64),
            created_at: new Date().toISOString(),
          });
        } catch (_) {
          // best-effort; the UI can retry upload later if needed
        }
      }

      return res.status(200).json({ ok: true, idea: data });
    } catch (e) {
      console.error('[ao/ideas POST]', e);
      return res.status(500).json({ ok: false, error: e.message });
    }
  }

  return res.status(405).json({ ok: false, error: 'Method not allowed' });
}

