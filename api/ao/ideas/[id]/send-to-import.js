/**
 * AO Automation — Ready Posts: send to Import (journal post + featured image).
 * POST /api/ao/ideas/:id/send-to-import
 */

import matter from 'gray-matter';
import { supabaseAdmin } from '../../../../lib/supabase-admin.js';
import { requireAoSession } from '../../../../lib/ao/requireAoSession.js';

function slugify(input) {
  const s = String(input || '').toLowerCase().trim();
  const cleaned = s
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return cleaned || `ready-post-${Date.now()}`;
}

function guessExtFromMime(mime) {
  const m = String(mime || '').toLowerCase();
  if (m.includes('png')) return 'png';
  if (m.includes('webp')) return 'webp';
  return 'jpg';
}

function extractSummaryFromMarkdown(md) {
  const text = String(md || '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/!\[[^\]]*\]\([^)]+\)/g, '')
    .replace(/\[[^\]]+\]\([^)]+\)/g, (m) => m.replace(/\(([^)]+)\)/g, ''))
    .replace(/[#>*_`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return '';
  return text.length > 220 ? `${text.slice(0, 217).trim()}...` : text;
}

export default async function handler(req, res) {
  const auth = requireAoSession(req, res);
  if (!auth) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const id = req.query?.id;
  if (!id) return res.status(400).json({ ok: false, error: 'id required' });

  try {
    const { data: idea, error: fetchErr } = await supabaseAdmin
      .from('ao_ideas')
      .select('*')
      .eq('id', id)
      .eq('created_by_email', auth.email)
      .single();

    if (fetchErr) {
      if (fetchErr.code === 'PGRST116') return res.status(404).json({ ok: false, error: 'Not found' });
      return res.status(500).json({ ok: false, error: fetchErr.message });
    }

    if (idea.path !== 'ready_post') {
      return res.status(400).json({ ok: false, error: 'This idea is not a Ready Post' });
    }
    if (!idea.ready_target_site) {
      return res.status(400).json({ ok: false, error: 'Website target is not enabled for this Ready Post' });
    }

    const md = String(idea.markdown_content || idea.raw_input || '').trim();
    if (!md) return res.status(400).json({ ok: false, error: 'Missing markdown content' });

    // Best-effort: if user pasted frontmatter, keep body only and prefer frontmatter title/slug/summary when present.
    let parsed;
    try {
      parsed = matter(md);
    } catch {
      parsed = { data: {}, content: md };
    }
    const fm = parsed.data && typeof parsed.data === 'object' ? parsed.data : {};
    const body = String(parsed.content || '').trim();

    const title = String(idea.title || fm.title || '').trim() || 'Untitled';
    const slug = String(fm.slug || '').trim() || slugify(title);
    const publishDate = (typeof fm.publish_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(fm.publish_date))
      ? fm.publish_date
      : new Date().toISOString().slice(0, 10);
    const summary = String(fm.summary || '').trim() || extractSummaryFromMarkdown(body);

    // Featured image asset (optional but recommended).
    let featuredImage = null;
    const { data: assets } = await supabaseAdmin
      .from('ao_idea_assets')
      .select('*')
      .eq('idea_id', idea.id)
      .eq('kind', 'featured_image')
      .order('created_at', { ascending: false })
      .limit(1);
    if (assets && assets[0]) featuredImage = assets[0];

    const ext = featuredImage ? guessExtFromMime(featuredImage.mime_type) : 'jpg';
    const imageFilename = `${slug}.${ext}`;

    const featuredImagePath = `../images/${imageFilename}`;
    const journalFrontmatter = {
      title,
      slug,
      publish_date: publishDate,
      created_at: fm.created_at || publishDate,
      updated_at: new Date().toISOString().slice(0, 10),
      summary,
      categories: Array.isArray(fm.categories) ? fm.categories : [],
      featured_image: featuredImagePath,
      takeaways: Array.isArray(fm.takeaways) ? fm.takeaways : [],
      applications: Array.isArray(fm.applications) ? fm.applications : [],
      related: Array.isArray(fm.related) ? fm.related : [],
      status: 'published',
      original_source: fm.original_source || null,
      original_url: fm.original_url || null,
    };

    const journalMarkdown = matter.stringify(body, journalFrontmatter);

    const nowIso = new Date().toISOString();
    const { data: batch, error: batchErr } = await supabaseAdmin
      .from('ao_import_batches')
      .insert({
        kind: 'journal',
        status: 'uploaded',
        created_by_email: auth.email || null,
        notes: `Ready Post from Ideas (${idea.id})`,
        created_at: nowIso,
        updated_at: nowIso,
      })
      .select('*')
      .single();

    if (batchErr) {
      if (String(batchErr.message || '').includes('ao_import_batches')) {
        return res.status(500).json({
          ok: false,
          error: 'Import inbox is not set up yet. Run database/ao_imports.sql (and database/ao_imports_binary_items.sql) in Supabase, then retry.',
        });
      }
      return res.status(500).json({ ok: false, error: batchErr.message });
    }

    const items = [];
    items.push({
      batch_id: batch.id,
      kind: 'journal',
      filename: `${slug}.md`,
      target_path: `ao-knowledge-hq-kit/journal/${slug}.md`,
      status: 'validated',
      frontmatter: journalFrontmatter,
      validation_errors: [],
      content: journalMarkdown,
      is_binary: false,
      mime_type: null,
      content_base64: null,
      created_at: nowIso,
      updated_at: nowIso,
    });

    if (featuredImage?.content_base64) {
      items.push({
        batch_id: batch.id,
        kind: 'journal',
        filename: imageFilename,
        target_path: `public/images/${imageFilename}`,
        status: 'validated',
        frontmatter: null,
        validation_errors: [],
        content: '',
        is_binary: true,
        mime_type: featuredImage.mime_type || null,
        content_base64: featuredImage.content_base64,
        created_at: nowIso,
        updated_at: nowIso,
      });
    }

    const { data: inserted, error: itemsErr } = await supabaseAdmin
      .from('ao_import_items')
      .insert(items)
      .select('*');

    if (itemsErr) {
      return res.status(500).json({ ok: false, error: itemsErr.message });
    }

    return res.status(200).json({
      ok: true,
      import_batch_id: batch.id,
      items: inserted || [],
      next_url: '/ao/import',
    });
  } catch (e) {
    console.error('[ao/ideas send-to-import]', e);
    return res.status(500).json({ ok: false, error: e.message });
  }
}

